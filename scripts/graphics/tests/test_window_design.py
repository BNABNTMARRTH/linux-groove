"""Spec 013: session isolation, user preference preservation and theme contract."""
import configparser
import json
from pathlib import Path
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from configure_window_design import install, assets, TOKENS

class WindowDesign(unittest.TestCase):
    def test_production_rejects_missing_renderer(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(RuntimeError, 'rsvg-convert'):
                install(Path(folder))

    def test_defaults_preserve_users_and_alternative_sessions(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            preserved = ['home/groove/.config/gtk-3.0/gtk.css',
                         'home/groove/.config/xfce4/xfconf/xfce-perchannel-xml/xsettings.xml',
                         'home/groove/.config/onlyoffice/DesktopEditors.conf',
                         'etc/xdg/wayfire/expressive.ini',
                         'usr/share/themes/WhiteSur-Dark/gtk-3.0/gtk.css']
            for name in preserved:
                p=root/name; p.parent.mkdir(parents=True,exist_ok=True); p.write_text('user preference')
            install(root, render=False)
            before={str(p.relative_to(root)):p.read_bytes() for p in root.rglob('*') if p.is_file()}
            install(root, render=False)
            self.assertEqual(before, {str(p.relative_to(root)):p.read_bytes() for p in root.rglob('*') if p.is_file()})
            for name in preserved: self.assertEqual((root/name).read_text(), 'user preference')
            conf=root/'etc/xdg/groove-xfce'
            xfwm=ET.parse(conf/'xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml')
            props={p.get('name'):p.get('value') for p in xfwm.iter('property')}
            self.assertEqual(props['show_dock_shadow'], 'false')
            self.assertEqual(props['use_compositing'], 'true')
            self.assertEqual(props['button_layout'], 'CHM|')
            settings=ET.parse(conf/'xfce4/xfconf/xfce-perchannel-xml/xsettings.xml')
            self.assertIsNone(settings.find(".//property[@name='DPI']"))
            oo=configparser.ConfigParser();oo.read(conf/'onlyoffice/DesktopEditors.conf')
            self.assertEqual(oo['General']['UITheme'], 'theme-dark')
            self.assertFalse((root/'etc/xdg/autostart/groove-picom.desktop').exists())
            # XFWM loads SVG before PNG: both formats must have the same scale.
            vector=ET.parse(root/'usr/share/themes/GrooveWindow-2x/xfwm4/close-active.svg').getroot()
            self.assertEqual((vector.get('width'),vector.get('height')), ('64','72'))

    def test_complete_theme_and_restore_states(self):
        t=json.loads(TOKENS.read_text()); pictures=assets(t)
        for state in ('active','inactive','prelight','pressed'):
            for button in ('close','hide','maximize','maximize-toggled','menu','shade','shade-toggled','stick','stick-toggled'):
                xml=ET.fromstring(pictures[f'{button}-{state}'])
                self.assertEqual(xml.get('height'), '36')
                self.assertEqual(xml.get('width'), '32')
            self.assertNotEqual(pictures[f'maximize-{state}'],pictures[f'maximize-toggled-{state}'])
        for state in ('active','inactive'):
            for part in ('top-left','top-right','left','right','bottom-left','bottom-right','bottom',*(f'title-{n}' for n in range(1,6))):
                ET.fromstring(pictures[f'{part}-{state}'])

if __name__ == '__main__': unittest.main()
