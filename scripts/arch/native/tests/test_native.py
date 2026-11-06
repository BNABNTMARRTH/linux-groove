import copy, importlib.util, json, pathlib, tempfile, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('update',ROOT/'files/usr/lib/groove/update.py')
update=importlib.util.module_from_spec(spec); spec.loader.exec_module(update)
class ManifestTests(unittest.TestCase):
 def setUp(self):
  self.m={'version':'0.4.1rc2','architecture':'aarch64','state_schema':1,'root_bytes':16*1024**3,'files':{
   'groove_0.4.1rc2.root.raw':{'bytes':16*1024**3,'sha256':'a'*64},
   'groove_0.4.1rc2.efi':{'bytes':100,'sha256':'b'*64}}}
 def test_valid(self): self.assertEqual(update.validate_manifest(self.m,{'state_schema':1}),'0.4.1rc2')
 def test_architecture(self):
  self.m['architecture']='x86_64'
  with self.assertRaises(ValueError): update.validate_manifest(self.m,{})
 def test_traversal(self):
  self.m['files']['../../etc/passwd']=self.m['files'].pop('groove_0.4.1rc2.efi')
  with self.assertRaises(ValueError): update.validate_manifest(self.m,{})
 def test_migration(self):
  self.m['state_schema']=2
  with self.assertRaises(ValueError): update.validate_manifest(self.m,{})
 def test_size_and_hash(self):
  for key,value in [('bytes',-1),('bytes',True),('sha256','incorrect')]:
   m=copy.deepcopy(self.m); m['files']['groove_0.4.1rc2.efi'][key]=value
   with self.assertRaises(ValueError): update.validate_manifest(m,{})
 def test_boot_attempts_and_protection(self):
  with tempfile.TemporaryDirectory() as t:
   p=pathlib.Path(t); update.transfers(p,'/state/staging','/dev/vda','0.4.1rc1')
   for f in p.glob('*.transfer'):
    self.assertIn('ProtectVersion=0.4.1rc1',f.read_text()); self.assertIn('InstancesMax=2',f.read_text())
   self.assertIn('TriesLeft=3',(p/'90-uki.transfer').read_text())
class ConfigurationTests(unittest.TestCase):
 def test_one_compositor(self):
  session=(ROOT/'files/usr/bin/groove-wayfire-session').read_text()
  self.assertIn('exec wayfire',session)
  for forbidden in ('seatd -','picom','groove-init','LIBGL_ALWAYS_SOFTWARE'):
   self.assertNotIn(forbidden,session)
 def test_stable_and_studio(self):
  t=json.loads((ROOT/'files/usr/share/groove/design.json').read_text())
  self.assertEqual(t['profiles']['stable']['quantum'],1024)
  self.assertEqual(t['profiles']['studio']['quantum'],256)
  self.assertFalse(t['profiles']['stable']['kwin']['blur'])
  self.assertEqual(t['profiles']['studio']['wayfire'],[])
 def test_package_payload_checksum_required(self):
  s=(ROOT/'packages/groove-platform/PKGBUILD').read_text(); self.assertNotIn("'SKIP'",s)
if __name__=='__main__': unittest.main()
