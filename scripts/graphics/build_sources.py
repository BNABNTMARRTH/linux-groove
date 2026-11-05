#!/usr/bin/env python3
"""Build audited source recipes in a disposable native ARM64 Linux builder.

Build tools may come from the builder OS. Runtime dependencies must be compiled
in PREFIX or supplied by the existing LFS libc/libgcc/libstdc++ base.
"""
import argparse, concurrent.futures, hashlib, json, os, shutil, subprocess, tarfile, time, urllib.request
from pathlib import Path

def main():
    ap=argparse.ArgumentParser();ap.add_argument('manifest',type=Path);ap.add_argument('--work',type=Path,default=Path('/tmp/groove-graphics-build'));ap.add_argument('--prefix',default='/opt/groove-graphics');ap.add_argument('--base-prefix',default='');ap.add_argument('--jobs',type=int,default=3);ap.add_argument('--only',action='append',default=[]);a=ap.parse_args()
    a.work.mkdir(parents=True,exist_ok=True)
    for d in ('sources','logs','stamps','build'): (a.work/d).mkdir(exist_ok=True)
    doc=json.loads(a.manifest.read_text());rows=doc['packages']
    if a.only:
        unknown=set(a.only)-{r['name'] for r in rows}
        if unknown:ap.error('Unknown packages: '+', '.join(sorted(unknown)))
        rows=[r for r in rows if r['name'] in a.only]
    def fetch(row):
        target=a.work/'sources'/row['filename']
        if not target.exists():
            for attempt in range(4):
                try:
                    req=urllib.request.Request(row['url'],headers={'User-Agent':'LinuxGroove-source-builder/0.1'})
                    with urllib.request.urlopen(req,timeout=120) as response, target.with_suffix(target.suffix+'.part').open('wb') as out: shutil.copyfileobj(response,out)
                    target.with_suffix(target.suffix+'.part').replace(target);break
                except Exception:
                    if attempt==3: raise
                    time.sleep(2+attempt)
        data=target.read_bytes();md5=hashlib.md5(data).hexdigest();sha=hashlib.sha256(data).hexdigest()
        if row.get('upstream_md5') and row['upstream_md5']!=md5: raise ValueError(f'upstream MD5 mismatch: {row["name"]}')
        if row.get('sha256') and row['sha256']!=sha: raise ValueError(f'SHA256 mismatch: {row["name"]}')
        row['sha256']=sha
        return row
    # Build can start while independent downloads continue; inspect every future.
    pool=concurrent.futures.ThreadPoolExecutor(max_workers=5)
    inputs=rows+[s for r in rows for s in r.get('bundled_sources',[])]
    futures={r['name']:pool.submit(fetch,r) for r in inputs}
    env=os.environ.copy();prefix=a.prefix
    env.update(PREFIX=prefix,JOBS=str(a.jobs),XDG_DATA_DIRS=f'{prefix}/share:/usr/share',GDK_PIXBUF_MODULE_FILE=f'{prefix}/lib/gdk-pixbuf-2.0/2.10.0/loaders.cache',PATH=f'{prefix}/bin:'+env['PATH'],PKG_CONFIG_PATH=f'{prefix}/lib/pkgconfig:{prefix}/share/pkgconfig',PKG_CONFIG_LIBDIR=f'{prefix}/lib/pkgconfig:{prefix}/share/pkgconfig',LD_LIBRARY_PATH=f'{prefix}/lib',CFLAGS='-O2 -fPIC',CXXFLAGS='-O2 -fPIC',CPPFLAGS=f'-I{prefix}/include',LDFLAGS=f'-L{prefix}/lib -Wl,-rpath,{prefix}/lib',PYTHONPATH=f'{prefix}/lib/python3.11/site-packages',ACLOCAL_PATH=f'{prefix}/share/aclocal',XORG_PREFIX=prefix)
    env.setdefault('GROOVE_SOURCE_ROOT','/workspace')
    Path(prefix).mkdir(parents=True,exist_ok=True)
    if a.base_prefix:
        base=a.base_prefix
        env['PATH']=f'{prefix}/bin:{base}/bin:'+os.environ['PATH']
        for key,suffix in [('PKG_CONFIG_PATH','lib/pkgconfig'),('PKG_CONFIG_LIBDIR','lib/pkgconfig')]:
            env[key]+=f':{base}/{suffix}:{base}/share/pkgconfig'
        env['LD_LIBRARY_PATH']+=f':{base}/lib'
        env['CPPFLAGS']+=f' -I{base}/include'
        env['LDFLAGS']+=f' -L{base}/lib -Wl,-rpath,{base}/lib'
        env['XDG_DATA_DIRS']=f'{prefix}/share:{base}/share:/usr/share'
        env['ACLOCAL_PATH']+=f':{base}/share/aclocal'
    started=time.time()
    try:
        for row in rows:
            futures[row['name']].result()
            for bundled in row.get('bundled_sources',[]): futures[bundled['name']].result()
            for patch in row.get('patches',[]):
                data=(Path(os.environ.get('GROOVE_SOURCE_ROOT','/workspace'))/patch['path']).read_bytes()
                if hashlib.sha256(data).hexdigest()!=patch['sha256']:raise ValueError('patch SHA256 mismatch: '+patch['path'])
            (a.work/'sources.lock.json').write_text(json.dumps(doc,indent=2)+'\n')
            fingerprint=hashlib.sha256(json.dumps(row,sort_keys=True).encode()).hexdigest()
            stamp=a.work/'stamps'/row['name']
            if stamp.exists() and stamp.read_text().strip()==fingerprint: print('CACHED',row['name'],flush=True);continue
            build=a.work/'build'/row['name'];shutil.rmtree(build,ignore_errors=True);build.mkdir()
            with tarfile.open(a.work/'sources'/row['filename']) as archive:
                # Sources are hash-verified upstream archives; reject traversal.
                for member in archive.getmembers():
                    dest=(build/member.name).resolve()
                    if not dest.is_relative_to(build.resolve()): raise ValueError('unsafe archive path')
                archive.extractall(build,filter='data') if hasattr(tarfile,'data_filter') else archive.extractall(build)
            children=list(build.iterdir());src=children[0] if len(children)==1 and children[0].is_dir() else build
            for bundled in row.get('bundled_sources',[]):
                dest=(src/bundled['destination']).resolve()
                if not dest.is_relative_to(src.resolve()):raise ValueError('unsafe bundled source destination')
                unpack=build/('.bundle-'+bundled['name']);unpack.mkdir()
                with tarfile.open(a.work/'sources'/bundled['filename']) as archive:
                    for member in archive.getmembers():
                        if not (unpack/member.name).resolve().is_relative_to(unpack.resolve()):raise ValueError('unsafe bundled archive path')
                        if member.issym() and not (unpack/member.name).parent.joinpath(member.linkname).resolve().is_relative_to(unpack.resolve()):raise ValueError('unsafe bundled symlink')
                    archive.extractall(unpack,filter='data') if hasattr(tarfile,'data_filter') else archive.extractall(unpack)
                contents=list(unpack.iterdir())
                if dest.exists():shutil.rmtree(dest)
                dest.parent.mkdir(parents=True,exist_ok=True)
                shutil.move(str(contents[0]),dest)
            kind=row.get('build','auto');options=row.get('options','')
            if kind=='meson': cmd=f'meson setup _build --prefix="$PREFIX" --libdir=lib --buildtype=release --wrap-mode=nodownload {options}\nninja -C _build -j "$JOBS"\nninja -C _build install'
            elif kind=='cmake': cmd=f'cmake -S . -B _build -DCMAKE_INSTALL_PREFIX="$PREFIX" -DCMAKE_INSTALL_LIBDIR="$PREFIX/lib" -DCMAKE_BUILD_TYPE=Release {options}\ncmake --build _build -j "$JOBS"\ncmake --install _build'
            elif kind=='custom': cmd=row['commands']
            else: cmd=f'./configure --prefix="$PREFIX" --libdir="$PREFIX/lib" --disable-static {options}\nmake -j "$JOBS"\nmake install'
            cmd=row.get('pre','')+'\n'+cmd+'\n'+row.get('post','')
            print('BUILD',row['name'],row['version'],flush=True)
            with (a.work/'logs'/(row['name']+'.log')).open('w') as log:
                result=subprocess.run(['/bin/bash','-euc',cmd],cwd=src,env=env,stdout=log,stderr=subprocess.STDOUT)
            if result.returncode:
                print((a.work/'logs'/(row['name']+'.log')).read_text()[-7000:],flush=True)
                raise RuntimeError('build failed: '+row['name'])
            stamp.write_text(fingerprint+'\n');shutil.rmtree(build)
            print('DONE',row['name'],f'{time.time()-started:.0f}s total',flush=True)
    finally:
        pool.shutdown(wait=True)
        for row in inputs:
            try: futures[row['name']].result()
            except Exception as e: print('DOWNLOAD FAILED',row['name'],str(e),flush=True)
        (a.work/'sources.lock.json').write_text(json.dumps(doc,indent=2)+'\n')
if __name__=='__main__': main()
