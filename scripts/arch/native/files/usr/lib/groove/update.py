#!/usr/bin/env python3
"""Conservative A/B controller. Mutations require a signed installed-image feed."""
import argparse, fcntl, hashlib, json, os, pathlib, re, shutil, subprocess, tempfile
P=pathlib.Path
STATE=P('/state/groove-update')
KEYRING=P('/etc/groove/update-keyring.gpg')
SYSUPDATE='/usr/lib/systemd/systemd-sysupdate'
VERSION=re.compile(r'[0-9][a-zA-Z0-9.]{0,24}\Z')
def run(*args):
 return subprocess.run(args,check=True,text=True,capture_output=True).stdout.strip()
def atomic(path,data):
 path.parent.mkdir(parents=True,exist_ok=True)
 with tempfile.NamedTemporaryFile(mode='w',dir=path.parent,delete=False) as f:
  json.dump(data,f,indent=2); f.flush(); os.fsync(f.fileno()); temp=f.name
 os.replace(temp,path)
 d=os.open(path.parent,os.O_DIRECTORY); os.fsync(d); os.close(d)
def os_release():
 values={}
 for line in P('/usr/lib/os-release').read_text().splitlines():
  if '=' in line:
   k,v=line.split('=',1); values[k]=v.strip('"')
 return values

def validate_manifest(manifest,current):
 v=manifest.get('version','')
 if not VERSION.fullmatch(v): raise ValueError('Invalid version identifier')
 if manifest.get('architecture')!='aarch64': raise ValueError('Wrong architecture')
 if manifest.get('state_schema')!=current.get('state_schema',1): raise ValueError('Unresolved state migration')
 if manifest.get('root_bytes')!=16*1024**3: raise ValueError('Root must be exactly 16 GiB')
 expected={f'groove_{v}.root.raw', f'groove_{v}.efi'}
 files=manifest.get('files',{})
 if set(files)!=expected: raise ValueError('Unexpected files or unsafe paths')
 for name,entry in files.items():
  if not re.fullmatch(r'[0-9a-f]{64}',entry.get('sha256','')): raise ValueError('Invalid hash')
  size=entry.get('bytes')
  if type(size)!=int or size<=0: raise ValueError('Invalid size')
  if name.endswith('.root.raw') and size!=manifest['root_bytes']: raise ValueError('Root size mismatch')
  if name.endswith('.efi') and size>512*1024**2: raise ValueError('UKI too large')
 return v

def installed():
 release=os_release(); version=release.get('IMAGE_VERSION','')
 if release.get('IMAGE_ID')!='groove' or not VERSION.fullmatch(version): raise RuntimeError('Not an installed Groove image')
 root=run('findmnt','-n','-o','SOURCE','/')
 if not root.startswith('/dev/'): raise RuntimeError('A/B is unavailable in Live/overlay sessions')
 root=os.path.realpath(root)
 if run('lsblk','-n','-o','PARTLABEL',root)!=f'groove_{version}': raise RuntimeError('Active root/version mismatch')
 if 'ro' not in run('findmnt','-n','-o','OPTIONS','/').split(','): raise RuntimeError('Active root is not read-only')
 if not os.path.ismount('/state') or not os.path.ismount('/efi'): raise RuntimeError('Persistent state or ESP is not mounted')
 parent=run('lsblk','-n','-o','PKNAME',root)
 disk='/dev/'+parent
 layout=json.loads(run('lsblk','-b','-J','-o','PATH,PARTTYPE,PARTLABEL,SIZE,MOUNTPOINTS',disk))['blockdevices'][0]['children']
 roots=[p for p in layout if p.get('parttype')=='b921b045-1df0-41c3-af44-4c6f280d3fae']
 if len(roots)!=2 or any(p['size']!=16*1024**3 for p in roots): raise RuntimeError('Unexpected A/B partition layout')
 other=[p for p in roots if p['path']!=root]
 if len(other)!=1 or any(other[0].get('mountpoints') or []): raise RuntimeError('Inactive root is mounted')
 return version,disk

def transfers(directory,source,disk,current):
 for name,kind,pattern,target in [
  ('50-root','partition','groove_@v.root.raw',f'Path={disk}\nMatchPattern=groove_@v\nMatchPartitionType=root\nReadOnly=1'),
  ('90-uki','regular-file','groove_@v.efi','Path=/efi/EFI/Linux\nMatchPattern=groove_@v+@l-@d.efi groove_@v+@l.efi groove_@v.efi\nTriesLeft=3\nTriesDone=0')]:
  (directory/(name+'.transfer')).write_text(f'[Transfer]\nProtectVersion={current}\n[Source]\nType=regular-file\nPath={source}\nMatchPattern={pattern}\n[Target]\nType={kind}\n{target}\nInstancesMax=2\n')

def prepare(feed):
 current,disk=installed()
 if (STATE/'pending.json').exists(): raise RuntimeError('Resolve the pending update first')
 feed=feed.resolve(strict=True)
 if not feed.is_dir(): raise RuntimeError('Expected a local signed image repository')
 # Copy signed metadata before verification, eliminating source metadata races.
 with tempfile.TemporaryDirectory(prefix='groove-verify-') as tmp:
  tmp=P(tmp)
  for name in ('manifest.json','manifest.json.sig'): shutil.copyfile(feed/name,tmp/name)
  run('gpgv','--keyring',str(KEYRING),str(tmp/'manifest.json.sig'),str(tmp/'manifest.json'))
  manifest=json.loads((tmp/'manifest.json').read_text())
 version=validate_manifest(manifest,{'state_schema':1})
 if version==current: raise RuntimeError('Version already active')
 run('systemd-analyze','compare-versions',version,'gt',current)
 need=sum(x['bytes'] for x in manifest['files'].values())
 if shutil.disk_usage('/state').free<need+1024**3: raise RuntimeError('Insufficient staging space')
 uki=manifest['files'][f'groove_{version}.efi']['bytes']
 if shutil.disk_usage('/efi').free<uki+64*1024**2: raise RuntimeError('Insufficient ESP space')
 stage=STATE/'staging'
 if stage.exists(): raise RuntimeError('Interrupted staging exists; inspect it before retrying')
 stage.mkdir(mode=0o700)
 try:
  for name,entry in manifest['files'].items():
   digest=hashlib.sha256(); count=0
   with (feed/name).open('rb') as src,(stage/name).open('xb') as dst:
    while block:=src.read(4*1024**2):
     count+=len(block)
     if count>entry['bytes']: raise RuntimeError('Oversized image')
     digest.update(block); dst.write(block)
    dst.flush(); os.fsync(dst.fileno())
   if count!=entry['bytes'] or digest.hexdigest()!=entry['sha256']: raise RuntimeError('Image verification failed')
  config=STATE/'transfers'; config.mkdir(exist_ok=True)
  transfers(config,stage,disk,current)
  # Carry only administrator/user overrides; /var and pacman DB come from the new root.
  old_upper=P('/state/slots')/current/'etc-upper'
  new_slot=P('/state/slots')/version
  if new_slot.exists(): raise RuntimeError('Target slot state already exists; inspect before retrying')
  new_slot.mkdir()
  shutil.copytree(old_upper,new_slot/'etc-upper',symlinks=True)
  for identity in ('passwd','group','shadow','gshadow'):
   shutil.copy2(P('/etc')/identity,new_slot/'etc-upper'/identity)
  atomic(STATE/'pending.json',{'version':version,'previous':current,'phase':'writing'})
  run(SYSUPDATE,'--definitions='+str(config),'update',version)
  run('bootctl','set-default',f'groove_{version}*.efi')
  atomic(STATE/'pending.json',{'version':version,'previous':current,'phase':'ready'})
 finally:
  shutil.rmtree(stage)
 print('Prepared. Reboot to test; confirm only after checking the desktop.')

def confirm():
 current,_=installed(); pending=json.loads((STATE/'pending.json').read_text())
 if pending['version']!=current or pending['phase']!='ready': raise RuntimeError('Not running the prepared version')
 for service in ('NetworkManager','sddm','systemd-logind'):
  run('systemctl','is-active',service)
 boot=P('/proc/sys/kernel/random/boot_id').read_text().strip()
 ready=False
 for marker in P('/run/user').glob('*/groove-graphical-ready'):
  uid=marker.parent.name
  if marker.read_text().strip()==boot and run('loginctl','show-user',uid,'-p','State','--value')=='active': ready=True
 if not ready: raise RuntimeError('No active graphical session readiness evidence')
 run('/usr/lib/systemd/systemd-bless-boot','good')
 atomic(STATE/'confirmed.json',pending); (STATE/'pending.json').unlink()
 print('Confirmed. Previous root retained.')

def rollback():
 current,_=installed()
 path=STATE/'pending.json' if (STATE/'pending.json').exists() else STATE/'confirmed.json'
 entry=json.loads(path.read_text()); previous=entry['previous']
 if not VERSION.fullmatch(previous): raise RuntimeError('Invalid previous version')
 uki=P('/efi/EFI/Linux')/f'groove_{previous}.efi'
 if not uki.is_file(): raise RuntimeError('No confirmed previous UKI')
 run('bootctl','set-default',uki.name)
 if path.name=='pending.json':
  # Prevent a later automatic selection of the rejected candidate.
  for candidate in P('/efi/EFI/Linux').glob(f"groove_{entry['version']}+*.efi"):
   candidate.rename(candidate.with_suffix('.rejected'))
  path.unlink()
 print('Previous version selected for next boot. User documents are unchanged.')

def main():
 p=argparse.ArgumentParser(); p.add_argument('action',choices=['status','prepare','confirm','rollback']); p.add_argument('--repository',type=P); a=p.parse_args()
 if a.action=='status':
  print(json.dumps({'release':os_release(),'pending':json.loads((STATE/'pending.json').read_text()) if (STATE/'pending.json').exists() else None},indent=2)); return
 if os.geteuid()!=0: raise RuntimeError('Root privileges required')
 installed()
 STATE.mkdir(parents=True,exist_ok=True,mode=0o700)
 with (STATE/'lock').open('w') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
  if a.action=='prepare':
   if not a.repository: raise RuntimeError('--repository is required')
   prepare(a.repository)
  elif a.action=='confirm': confirm()
  else: rollback()
if __name__=='__main__':
 try: main()
 except (OSError,RuntimeError,ValueError,KeyError,subprocess.CalledProcessError) as e: raise SystemExit(str(e))
