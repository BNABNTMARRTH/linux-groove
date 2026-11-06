"""Spec 013: generated XFWM/GTK defaults. Never writes into an existing HOME."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import xml.etree.ElementTree as ET

PREFIX = '/opt/groove-graphics'
TOKENS = Path(__file__).parent / 'window-design/tokens.json'


def svg(w, h, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'


def assets(t):
    """Opaque button backing keeps antialiased glyphs intact in XFWM's masks."""
    h, size, radius = t['title_height'], t['button_size'], t['radius']
    glyphs = {
        'close': '<path d="M12 12l8 8m0-8l-8 8"/>',
        'hide': '<path d="M11 19h10"/>',
        'maximize': '<rect x="11.5" y="11.5" width="9" height="9"/>',
        'maximize-toggled': '<path d="M14 11h7v7M11 14h7v7h-7z"/>',
        'menu': '<path d="M11 12h10m-10 4h10m-10 4h10"/>',
        'shade': '<path d="M11 19l5-6 5 6"/>',
        'shade-toggled': '<path d="M11 13l5 6 5-6"/>',
        'stick': '<circle cx="16" cy="16" r="4"/>',
        'stick-toggled': '<circle cx="16" cy="16" r="4" fill="currentColor"/>',
    }
    result = {}
    for state in ('active', 'inactive'):
        bg = f'<rect width="100%" height="100%" fill="{t["title"]}"/>'
        top = f'<path d="M0 .5H32" stroke="{t["border"]}"/>'
        for n in range(1, 6):
            result[f'title-{n}-{state}'] = svg(32, h, bg + top)
        for side in ('left', 'right'):
            path = f'M{radius} .5Q.5 .5 .5 {radius}V{h}H{radius}Z'
            transform = f'translate({radius},0) scale(-1,1)' if side == 'right' else ''
            result[f'top-{side}-{state}'] = svg(radius, h,
                f'<g transform="{transform}"><path d="{path}" fill="{t["title"]}"/>'
                f'<path d="M{radius} .5Q.5 .5 .5 {radius}V{h}" fill="none" stroke="{t["border"]}"/></g>')
            result[f'{side}-{state}'] = svg(1, 16, f'<rect width="1" height="16" fill="{t["border"]}"/>')
            result[f'bottom-{side}-{state}'] = svg(radius, 1, f'<rect width="{radius}" height="1" fill="{t["border"]}"/>')
        result[f'bottom-{state}'] = svg(32, 1, f'<rect width="32" height="1" fill="{t["border"]}"/>')
    for name, glyph in glyphs.items():
        for state in ('active', 'inactive', 'prelight', 'pressed'):
            fg = t['muted'] if state == 'inactive' else t['text']
            body = f'<rect width="{size}" height="{h}" fill="{t["title"]}"/>'
            body += f'<path d="M0 .5H{size}" stroke="{t["border"]}"/>'
            body += f'<g transform="translate(0,{(h-size)/2})">'
            if state in ('prelight', 'pressed'):
                color = t['hover'] if state == 'prelight' else t['pressed']
                body += f'<circle cx="16" cy="16" r="{t["hover_diameter"]/2}" fill="{color}"/>'
            body += f'<g fill="none" color="{fg}" stroke="{fg}" stroke-width="1.5">{glyph}</g></g>'
            result[f'{name}-{state}'] = svg(size, h, body)
    return result


def gtk_css(t):
    return '''@import url("resource:///org/gtk/libgtk/theme/Adwaita/gtk-contained-dark.css");
''' + f'''
@define-color theme_bg_color {t['tools']};
@define-color theme_fg_color {t['text']};
@define-color theme_base_color {t['content']};
@define-color theme_text_color {t['text']};
@define-color theme_selected_bg_color {t['accent']};
@define-color theme_selected_fg_color {t['content']};
window.background, dialog {{ background-color: rgba(21, 24, 30, 0.94); color: {t['text']}; }}
headerbar {{ background: rgba(32, 33, 36, 0.96); color: {t['text']}; min-height: {t['title_height']}px;
  padding: 0 8px; border: 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08); box-shadow: none; border-radius: 10px 10px 0 0; }}
headerbar:backdrop {{ color: {t['muted']}; }}
headerbar button.titlebutton {{ min-width: {t['hover_diameter']}px; min-height: {t['hover_diameter']}px;
  padding: 0; margin: 2px; border: 0; border-radius: 50%; background: transparent;
  box-shadow: none; color: {t['text']}; }}
headerbar button.titlebutton:hover {{ background: {t['hover']}; }}
headerbar button.titlebutton:active {{ background: {t['pressed']}; }}
headerbar button.titlebutton:backdrop {{ color: {t['muted']}; }}
window.maximized headerbar, window.fullscreen headerbar {{ border-radius: 0; }}
menubar, toolbar, .toolbar {{ background: rgba(45, 48, 55, 0.95); color: {t['text']}; border: 0; box-shadow: none; }}
menu, popover, popover.background {{ background: rgba(30, 33, 40, 0.97); color: {t['text']}; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.12); }}
.view, .view:backdrop, textview.view text, textview.view:backdrop text, textview text:backdrop, entry, entry:backdrop {{ background-color: {t['content']}; color: {t['text']}; }}
selection, menuitem:hover {{ background-color: {t['accent']}; color: {t['content']}; }}
button:focus, entry:focus {{ outline: 1px solid {t['accent']}; outline-offset: -2px; }}
decoration {{ border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 10px 10px 0 0; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.40); margin: 10px; }}
window.maximized decoration, window.fullscreen decoration {{ border-radius: 0; border: 0; margin: 0; box-shadow: none; }}
.groove-header-card {{ background-color: rgba(32, 33, 36, 0.85); border: 1px solid rgba(255, 255, 255, 0.10); border-radius: 8px; padding: 12px; }}
.groove-action-btn {{ background-image: none; background-color: rgba(35, 38, 45, 0.90); color: {t['text']}; border: 1px solid rgba(255, 255, 255, 0.10); border-radius: 8px; box-shadow: none; }}
.groove-action-btn:hover {{ background-color: {t['hover']}; border-color: {t['accent']}; }}
.groove-action-btn:active {{ background-color: {t['pressed']}; }}
.groove-primary-btn {{ background-image: none; background-color: {t['accent']}; color: {t['content']}; border: 1px solid {t['accent']}; border-radius: 8px; font-weight: bold; box-shadow: none; }}
.groove-primary-btn:hover {{ background-color: #e2be47; }}
.dim-label {{ color: {t['muted']}; }}
'''


def install(root, render=True, font_source=Path('/backup/sources/fonts/inter/extras/ttf')):
    root = Path(root)
    t = json.loads(TOKENS.read_text())
    def put(path, data):
        dest = root / path.lstrip('/')
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(data)
        return dest
    put('/usr/share/groove/window-design/tokens.json', TOKENS.read_text())
    # A separate 2x raster theme is explicit; never override a user's DPI/scale.
    renderer = root / PREFIX.lstrip('/') / 'bin/rsvg-convert'
    renderer_cmd = [str(renderer)]
    env = dict(os.environ, LD_LIBRARY_PATH=str(root / PREFIX.lstrip('/') / 'lib'))
    if render and not renderer.is_file():
        arch_renderer = root / 'usr/bin/rsvg-convert'
        if arch_renderer.is_file():
            ld_so = root / 'usr/lib/ld-linux-aarch64.so.1'
            renderer_cmd = ([str(ld_so), '--library-path', str(root / 'usr/lib'), str(arch_renderer)]
                            if ld_so.is_file() else [str(arch_renderer)])
            env = dict(os.environ)
        else:
            raise RuntimeError('GrooveWindow requires rsvg-convert')
    for scale in (1, 2):
        name = t['name'] + ('-2x' if scale == 2 else '')
        base = f'/usr/share/themes/{name}'
        for stem, data in assets(t).items():
            # XFWM prefers SVG to PNG when both exist. Scale the SVG viewport
            # too, otherwise the 2x PNG is silently bypassed by its 1x source.
            vector = ET.fromstring(data)
            vector.set('width', str(int(vector.get('width')) * scale))
            vector.set('height', str(int(vector.get('height')) * scale))
            data = ET.tostring(vector, encoding='unicode')
            source = put(f'{base}/xfwm4/{stem}.svg', data)
            if render:
                subprocess.run(renderer_cmd + [str(source), '-o', str(source.with_suffix('.png'))], env=env, check=True)
        put(f'{base}/xfwm4/themerc', f'''button_offset={8*scale}
button_spacing=0
maximized_offset={8*scale}
full_width_title=true
title_alignment=center
title_shadow_active=false
title_shadow_inactive=false
active_text_color={t['text']}
inactive_text_color={t['muted']}
show_app_icon=false
''')
        put(f'{base}/gtk-3.0/gtk.css', gtk_css(t))
        put(f'{base}/gtk-3.0/gtk-dark.css', gtk_css(t))
    put('/usr/share/themes/GrooveBlueNote/gtk-3.0/gtk.css', gtk_css(t))
    put('/usr/share/themes/GrooveBlueNote/gtk-3.0/gtk-dark.css', gtk_css(t))
    for conf in ('/etc/xdg/groove-xfce', '/etc/xdg'):
        # QSettings UserScope falls back to XDG_CONFIG_DIRS. A saved user UITheme
        # wins; no launcher flag, document setting or application patch is needed.
        put(conf + '/onlyoffice/DesktopEditors.conf', '[General]\nUITheme=theme-dark\n')
        put(conf + '/gtk-3.0/settings.ini', f'''[Settings]
gtk-theme-name={t['name']}
gtk-icon-theme-name=WhiteSur
gtk-font-name={t['font']}
gtk-application-prefer-dark-theme=true
gtk-decoration-layout=close,minimize,maximize:menu
gtk-dialogs-use-header=true
gtk-xft-antialias=1
gtk-xft-hinting=1
gtk-xft-hintstyle=hintslight
gtk-xft-rgba=rgb
gtk-xft-lcdfilter=lcddefault
''')
        def channel(name, groups, base_conf=conf):
            node = ET.Element('channel', name=name, version='1.0')
            for group, props in groups.items():
                parent = ET.SubElement(node, 'property', name=group, type='empty')
                for key, kind, value in props:
                    ET.SubElement(parent, 'property', name=key, type=kind, value=str(value))
            put(base_conf + f'/xfce4/xfconf/xfce-perchannel-xml/{name}.xml', ET.tostring(node, encoding='unicode'))
        channel('xfwm4', {'general': [
            ('theme', 'string', t['name']), ('button_layout', 'string', 'CHM|'),
            ('button_offset', 'int', 8), ('button_spacing', 'int', 4),
            ('title_font', 'string', t['title_font']), ('title_alignment', 'string', 'center'),
            ('use_compositing', 'bool', 'true'), ('show_dock_shadow', 'bool', 'false'),
            ('show_frame_shadow', 'bool', 'true'), ('show_popup_shadow', 'bool', 'true'),
            ('frame_opacity', 'int', 94), ('inactive_opacity', 'int', 90),
            ('move_opacity', 'int', 88), ('resize_opacity', 'int', 88),
            ('shadow_opacity', 'int', 40), ('box_move', 'bool', 'false'),
            ('box_resize', 'bool', 'false'), ('workspace_count', 'int', 4),
            ('double_click_action', 'string', 'maximize'), ('scroll_workspaces', 'bool', 'false')]})
        channel('xsettings', {
            'Net': [('ThemeName','string',t['name']), ('IconThemeName','string','WhiteSur')],
            'Gtk': [('FontName','string',t['font']), ('DecorationLayout','string','close,minimize,maximize:menu'),
                    ('DialogsUseHeader','bool','true')],
            'Xft': [('Antialias','int',1), ('Hinting','int',1), ('HintStyle','string','hintslight'),
                    ('RGBA','string','rgb'), ('Lcdfilter','string','lcddefault')],
            'Xfce': [('SyncThemes','bool','true')]})
    fonts = root / 'usr/share/fonts/inter'
    fonts.mkdir(parents=True, exist_ok=True)
    if font_source.is_dir():
        for source in font_source.glob('*.ttf'):
            dest_font = fonts / source.name
            shutil.copy2(source, dest_font)
            dest_font.chmod(0o644)
    if render and not (fonts / 'Inter-Regular.ttf').is_file():
        raise RuntimeError('Inter-Regular.ttf missing; refusing a silently substituted font')
    fontconf = '''<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig><dir>/usr/share/fonts</dir><dir>/opt/groove-graphics/share/fonts</dir>
<match target="font">
<edit name="antialias" mode="assign"><bool>true</bool></edit>
<edit name="hinting" mode="assign"><bool>true</bool></edit>
<edit name="hintstyle" mode="assign"><const>hintslight</const></edit>
<edit name="rgba" mode="assign"><const>rgb</const></edit>
<edit name="lcdfilter" mode="assign"><const>lcddefault</const></edit>
</match>
<alias><family>sans-serif</family><prefer><family>Inter</family><family>DejaVu Sans</family></prefer></alias>
<alias><family>system-ui</family><prefer><family>Inter</family><family>DejaVu Sans</family></prefer></alias>
</fontconfig>
'''
    for prefix in ('', PREFIX):
        put(prefix + '/etc/fonts/local.conf', fontconf)
        (root / (prefix + '/etc/fonts/conf.d/10-sub-pixel-rgb.conf').lstrip('/')).unlink(missing_ok=True)
    (root / 'etc/xdg/autostart/groove-picom.desktop').unlink(missing_ok=True)
    # Retire distro-owned dead configuration; no user configuration is touched.
    (root / 'etc/xdg/picom.conf').unlink(missing_ok=True)
    (root / 'usr/libexec/groove-picom').unlink(missing_ok=True)


if __name__ == '__main__':
    import sys
    install(Path(sys.argv[1]))
