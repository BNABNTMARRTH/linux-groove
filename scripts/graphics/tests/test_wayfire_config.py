"""Linux-builder regression checks for repackaging and session isolation."""
import configparser
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

GRAPHICS=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(GRAPHICS))
from configure_wayfire import install

class DesktopConfiguration(unittest.TestCase):
    def test_wallpaper_replaces_stale_default_on_repackaging(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);(root/'etc').mkdir();(root/'etc/os-release').write_text('ID=groove\n')
            dest=root/'usr/share/backgrounds/groove-default.png'
            dest.parent.mkdir(parents=True);dest.write_bytes(b'old wallpaper')
            # This skeleton test has no compiled renderer/fonts. Production
            # packaging requires both; their contract has separate tests.
            configure = (
                f'import sys; sys.path.insert(0, {str(GRAPHICS)!r}); '
                'import configure_window_design as w; original=w.install; '
                'w.install=lambda root: original(root, render=False); '
                'import configure_rootfs; configure_rootfs.main()'
            )
            subprocess.run([sys.executable,'-c',configure,str(root)],check=True,capture_output=True)
            original=GRAPHICS.parents[1]/'backgrouds_groove/groove-piano-background-4k.png'
            self.assertEqual(hashlib.sha256(dest.read_bytes()).digest(),hashlib.sha256(original.read_bytes()).digest())
            self.assertEqual(dest.stat().st_mode & 0o777,0o644)
            self.assertIn('background-image=/usr/share/backgrounds/groove-default.png',(root/'etc/xdg/weston/weston.ini').read_text())
            self.assertFalse((root/'usr/share/wayland-sessions/groove-wayfire.desktop').exists())

    def test_optional_session_and_reduced_motion(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            css=root/'usr/share/themes/GrooveBlueNote/gtk-3.0/gtk.css';css.parent.mkdir(parents=True);css.touch()
            services=root/'etc/groove/wayland-services';services.mkdir(parents=True)
            (services/'seatd.toml').write_text('seatd')
            (services/'weston.toml').write_text('weston')
            install(root,'export LIBGL_ALWAYS_SOFTWARE=1\n',lambda *a,**kw:json.dumps(kw))
            reduced=configparser.ConfigParser();reduced.read(root/'etc/xdg/wayfire/reduced.ini')
            plugins=reduced['core']['plugins'].split()
            self.assertTrue({'blur','animate','cube','wrot'}.isdisjoint(plugins))
            self.assertEqual(reduced['vswitch']['duration'],'0')
            graph=root/'etc/groove/wayfire-services'
            self.assertTrue((graph/'seatd.toml').exists());self.assertFalse((graph/'weston.toml').exists())
            coordinator=json.loads((graph/'wayfire.toml').read_text())
            self.assertEqual(coordinator['user'],'root')
            self.assertEqual(coordinator['requires'],['dbus','device-trigger','seatd'])
            self.assertNotIn('pipewire',(graph/'wayfire.toml').read_text())
            wrapper=(root/'usr/libexec/groove-wayfire').read_text()
            self.assertNotIn('export LIBGL_ALWAYS_SOFTWARE=1',wrapper)
            for script in (root/'usr/libexec').iterdir():subprocess.run(['sh','-n',str(script)],check=True)
            cfg=json.loads((root/'etc/xdg/waybar/config.json').read_text());self.assertEqual(cfg['height'],34)

if __name__=='__main__':unittest.main()
