#!/usr/bin/env python3
"""Generate package-owned defaults; never edits an existing user's home."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent / 'files'
t = json.loads((ROOT/'usr/share/groove/design.json').read_text())
def put(name, data):
    p = ROOT/name; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(data)
def rgb(key):
    h=t['colors'][key].lstrip('#'); return ','.join(str(int(h[i:i+2],16)) for i in (0,2,4))
put('usr/share/color-schemes/Groove.colors', f'''[General]
Name=Groove
ColorScheme=Groove
[Colors:Window]
BackgroundNormal={rgb('header')}
ForegroundNormal={rgb('text')}
[Colors:View]
BackgroundNormal={rgb('content')}
ForegroundNormal={rgb('text')}
[Colors:Button]
BackgroundNormal={rgb('toolbar')}
ForegroundNormal={rgb('text')}
[Colors:Selection]
BackgroundNormal={rgb('accent')}
ForegroundNormal={rgb('content')}
[WM]
activeBackground={rgb('header')}
activeForeground={rgb('text')}
inactiveBackground={rgb('toolbar')}
inactiveForeground={rgb('text')}
''')
put('etc/xdg/kdeglobals', f'''[General]
ColorScheme=Groove
font={t['font']['family']},{t['font']['points']},-1,5,50,0,0,0,0,0
[Breeze]
[Icons]
Theme=breeze-dark
[KDE]
widgetStyle=Breeze
LookAndFeelPackage=org.groove.desktop
''')
put('etc/xdg/kwinrc', '''[org.kde.kdecoration2]
library=org.kde.breeze
ButtonsOnLeft=XIA
ButtonsOnRight=
[Plugins]
blurEnabled=false
wobblywindowsEnabled=false
[Windows]
BorderlessMaximizedWindows=false
''')
put('etc/fonts/conf.d/65-groove-fonts.conf', f'''<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
 <alias><family>sans-serif</family><prefer><family>Inter</family><family>DejaVu Sans</family></prefer></alias>
 <match target="font"><edit name="antialias" mode="assign"><bool>true</bool></edit><edit name="rgba" mode="assign"><const>none</const></edit><edit name="hintstyle" mode="assign"><const>hintslight</const></edit></match>
</fontconfig>
''')
put('etc/xdg/gtk-3.0/settings.ini', '''[Settings]
gtk-theme-name=Breeze-Dark
gtk-icon-theme-name=breeze-dark
gtk-font-name=Inter 11
gtk-application-prefer-dark-theme=true
gtk-decoration-layout=close,minimize,maximize:
gtk-xft-antialias=1
gtk-xft-hinting=1
gtk-xft-hintstyle=hintslight
gtk-xft-rgba=none
''')
put('etc/pipewire/pipewire.conf.d/20-groove-defaults.conf', '''context.properties = {
    default.clock.rate = 48000
    default.clock.quantum = 1024
    default.clock.min-quantum = 64
    default.clock.max-quantum = 2048
}
''')
