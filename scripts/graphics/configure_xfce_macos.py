"""Configure macOS WhiteSur + Blue Note Glass appearance for XFCE, xfwm4, picom, and groove-dock."""
import os
from pathlib import Path
import shutil
import subprocess
import textwrap

PREFIX = '/opt/groove-graphics'
CUSTOM_ICONS_DIR = Path(__file__).resolve().parent / 'custom-icons'
THEMES_ARCHIVE_DIR = Path('/backup/sources/themes')
FONTS_ARCHIVE_DIR = Path('/backup/sources/fonts')
APPS_ARCHIVE_DIR = Path('/backup/sources/apps')
WALLPAPERS_SOURCE_DIR = Path('/tmp/groove-wayfire-inputs/backgrouds_groove')

def create_svg_button(color, border_color, glyph=None, glyph_color=None):
    svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="32" viewBox="0 0 20 32">',
        f'  <circle cx="10" cy="16" r="6.2" fill="{color}" stroke="{border_color}" stroke-width="0.8"/>'
    ]
    if glyph == 'x':
        svg.append(f'  <path d="M7.8 13.8l4.4 4.4m0-4.4l-4.4 4.4" fill="none" stroke="{glyph_color}" stroke-width="1.2" stroke-linecap="round"/>')
    elif glyph == '-':
        svg.append(f'  <path d="M7.4 16h5.2" fill="none" stroke="{glyph_color}" stroke-width="1.3" stroke-linecap="round"/>')
    elif glyph == '+':
        svg.append(f'  <path d="M10 13.4v5.2m-2.6-2.6h5.2" fill="none" stroke="{glyph_color}" stroke-width="1.2" stroke-linecap="round"/>')
    svg.append('</svg>')
    return '\n'.join(svg)

def write_rounded_xpm(path, width, height, radius, is_left=True):
    lines = [
        "/* XPM */",
        f"static char * {path.stem}[] = {{",
        f'"{width} {height} 2 1",',
        '"  c None",',
        '". c #000000",'
    ]
    for y in range(height):
        row = []
        for x in range(width):
            check_x = (radius - 1 - x) if is_left else (x - (width - radius))
            check_y = radius - 1 - y
            if check_x >= 0 and check_y >= 0:
                dist_sq = (check_x + 0.5)**2 + (check_y + 0.5)**2
                if dist_sq > (radius - 0.2)**2:
                    row.append(' ')
                else:
                    row.append('.')
            else:
                row.append('.')
        lines.append(f'"{ "".join(row) }",')
    lines.append("};")
    path.write_text('\n'.join(lines) + '\n')

def install(root):
    def put(rel_path, body, mode=0o644):
        target = root / rel_path.lstrip('/')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(textwrap.dedent(body).lstrip())
        target.chmod(mode)

    converter = root / PREFIX.lstrip('/') / 'bin/rsvg-convert'
    icon_cache_bin = root / PREFIX.lstrip('/') / 'bin/gtk-update-icon-cache'
    fc_cache_bin = root / PREFIX.lstrip('/') / 'bin/fc-cache'
    env = os.environ.copy()
    env['LD_LIBRARY_PATH'] = str(root / PREFIX.lstrip('/') / 'lib')

    # 0. Extract precompiled WhiteSur-Dark GTK theme & WhiteSur Icon Pack
    themes_root = root / 'usr/share/themes'
    icons_root = root / 'usr/share/icons'
    themes_root.mkdir(parents=True, exist_ok=True)
    icons_root.mkdir(parents=True, exist_ok=True)

    ws_gtk_tar = THEMES_ARCHIVE_DIR / 'WhiteSur-Dark.tar.xz'
    if ws_gtk_tar.exists():
        subprocess.run(['tar', '-xJf', str(ws_gtk_tar), '-C', str(themes_root)], check=True)

    ws_icons_tar = THEMES_ARCHIVE_DIR / 'WhiteSur-icons-installed.tar.xz'
    if ws_icons_tar.exists():
        ws_icon_dir = icons_root / 'WhiteSur'
        if ws_icon_dir.exists():
            shutil.rmtree(ws_icon_dir)
        subprocess.run(['tar', '-xJf', str(ws_icons_tar), '-C', str(icons_root)], check=True)
        index_theme = ws_icon_dir / 'index.theme'
        if index_theme.exists():
            idx_txt = index_theme.read_text()
            idx_txt = idx_txt.replace('Inherits=hicolor,breeze', 'Inherits=Adwaita,hicolor')
            index_theme.write_text(idx_txt)
        # Recolor monochrome #363636 action/status/symbolic icons to #dedede for dark theme legibility
        recolor_dirs = [
            'actions/16', 'actions/22', 'actions/24', 'actions/32', 'actions/symbolic',
            'devices/16', 'devices/22', 'devices/24', 'devices/32', 'devices/symbolic',
            'places/16', 'places/22', 'places/24', 'places/symbolic',
            'apps/16', 'apps/22', 'apps/32', 'apps/symbolic',
            'categories/22', 'categories/symbolic',
            'emblems/symbolic', 'mimes/symbolic', 'status/symbolic',
        ]
        for rel_d in recolor_dirs:
            dpath = ws_icon_dir / rel_d
            if not dpath.is_dir():
                continue
            for svg_file in dpath.glob('*.svg'):
                if svg_file.is_symlink():
                    continue
                try:
                    txt = svg_file.read_text()
                    if '#363636' in txt:
                        svg_file.write_text(txt.replace('#363636', '#dedede'))
                except Exception:
                    pass
        ws_dark_link = icons_root / 'WhiteSur-dark'
        if not ws_dark_link.exists() and not ws_dark_link.is_symlink():
            ws_dark_link.symlink_to('WhiteSur')

    # 0b. Install Inter Font Family for macOS Typography & Fontconfig Subpixel Anti-Aliasing
    inter_target = root / 'usr/share/fonts/inter'
    inter_target.mkdir(parents=True, exist_ok=True)
    inter_src = FONTS_ARCHIVE_DIR / 'inter/extras/ttf'
    if inter_src.is_dir():
        for ttf in inter_src.glob('*.ttf'):
            shutil.copy2(ttf, inter_target / ttf.name)

    # Enable Fontconfig Subpixel RGB and LCD Filter for ultra-smooth fonts
    fonts_conf_d = root / PREFIX.lstrip('/') / 'etc/fonts/conf.d'
    if fonts_conf_d.is_dir():
        (fonts_conf_d / '10-sub-pixel-none.conf').unlink(missing_ok=True)
        subpixel_avail = root / PREFIX.lstrip('/') / 'share/fontconfig/conf.avail/10-sub-pixel-rgb.conf'
        if subpixel_avail.exists():
            (fonts_conf_d / '10-sub-pixel-rgb.conf').unlink(missing_ok=True)
            (fonts_conf_d / '10-sub-pixel-rgb.conf').symlink_to('../../../share/fontconfig/conf.avail/10-sub-pixel-rgb.conf')

    font_local_conf = '''<?xml version="1.0"?>
    <!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
    <fontconfig>
      <dir>/usr/share/fonts</dir>
      <dir>/opt/groove-graphics/share/fonts</dir>
      <match target="font">
        <edit mode="assign" name="antialias"><bool>true</bool></edit>
        <edit mode="assign" name="hinting"><bool>true</bool></edit>
        <edit mode="assign" name="hintstyle"><const>hintslight</const></edit>
        <edit mode="assign" name="rgba"><const>rgb</const></edit>
        <edit mode="assign" name="lcdfilter"><const>lcddefault</const></edit>
      </match>
      <alias>
        <family>sans-serif</family>
        <prefer><family>Inter</family><family>DejaVu Sans</family></prefer>
      </alias>
      <alias>
        <family>system-ui</family>
        <prefer><family>Inter</family><family>DejaVu Sans</family></prefer>
      </alias>
    </fontconfig>
    '''
    put('/etc/fonts/local.conf', font_local_conf)
    put(PREFIX + '/etc/fonts/local.conf', font_local_conf)

    if fc_cache_bin.exists():
        subprocess.run([str(fc_cache_bin), '-f', str(inter_target)], env=env, check=False)

    # 0c. Install Groove Wallpapers Gallery & Portal welcome.html
    bg_groove_dir = root / 'usr/share/backgrounds/groove'
    bg_groove_dir.mkdir(parents=True, exist_ok=True)
    if WALLPAPERS_SOURCE_DIR.is_dir():
        for wp in WALLPAPERS_SOURCE_DIR.glob('*.*'):
            if wp.suffix.lower() in ('.png', '.jpg', '.jpeg'):
                target_wp = bg_groove_dir / wp.name
                shutil.copy2(wp, target_wp)
                target_wp.chmod(0o644)
    # Default wallpaper: Piano 4k (matches package_iso.sh audit contract)
    piano_wp = WALLPAPERS_SOURCE_DIR / 'groove-piano-background-4k.png'
    default_wp = root / 'usr/share/backgrounds/groove-default.png'
    if piano_wp.exists():
        shutil.copy2(piano_wp, default_wp)
        default_wp.chmod(0o644)

    welcome_src = Path(__file__).resolve().parent / 'welcome.html'
    if welcome_src.exists():
        put('/usr/share/groove/welcome.html', welcome_src.read_text())

    # 0d. Install Brave Browser (ARM64) and OnlyOffice Desktop Editors (ARM64)
    brave_zip = APPS_ARCHIVE_DIR / 'brave-browser-1.99.55-linux-arm64.zip'
    if brave_zip.exists():
        brave_target = root / PREFIX.lstrip('/') / 'opt/brave'
        brave_target.mkdir(parents=True, exist_ok=True)
        subprocess.run(['unzip', '-q', '-o', str(brave_zip), '-d', str(brave_target)], check=True)
        (brave_target / 'brave').chmod(0o755)

    onlyoffice_tar = APPS_ARCHIVE_DIR / 'onlyoffice-desktopeditors-aarch64.tar.xz'
    if onlyoffice_tar.exists():
        oo_parent = root / PREFIX.lstrip('/')
        subprocess.run(['tar', '-xJf', str(onlyoffice_tar), '-C', str(oo_parent)], check=True)
        oo_bin = oo_parent / 'opt/onlyoffice/desktopeditors/DesktopEditors'
        if oo_bin.exists():
            oo_bin.chmod(0o755)

    dst_apps_lib = root / 'opt/groove-apps/lib'
    dst_apps_lib.mkdir(parents=True, exist_ok=True)
    for sdir in (Path('/opt/groove-apps/lib'), Path('/backup/sources/apps/lib')):
        if sdir.is_dir():
            for lib_file in sdir.iterdir():
                dest_file = dst_apps_lib / lib_file.name
                if not dest_file.exists():
                    shutil.copy2(lib_file, dest_file)

    theme_dir = root / 'usr/share/themes/GrooveBlueNote/xfwm4'
    theme_dir.mkdir(parents=True, exist_ok=True)

    # 1. xfwm4 themerc (macOS Traffic Light style on the left, perfectly smoothed)
    themerc = '''
    button_layout=CHM|
    button_offset=10
    button_spacing=2
    full_width_title=false
    title_alignment=center
    title_shadow_active=false
    title_shadow_inactive=false
    active_text_color=#e8e6e0
    inactive_text_color=#7a8089
    active_color_1=#20242b
    active_color_2=#1b1e24
    inactive_color_1=#1a1d23
    inactive_color_2=#15181e
    show_app_icon=false
    '''
    put('/usr/share/themes/GrooveBlueNote/xfwm4/themerc', themerc)

    # 2. Render native macOS monochrome buttons via rsvg-convert with 100% alpha transparency
    button_specs = [
        # Close: Monochromatic slate / graphite
        ('close-active', '#64748b', '#475569', None, None),
        ('close-prelight', '#94a3b8', '#64748b', 'x', '#0f172a'),
        ('close-pressed', '#475569', '#334155', 'x', '#020617'),
        ('close-inactive', '#334155', '#1e293b', None, None),
        # Hide/Minimize: Monochromatic slate / graphite
        ('hide-active', '#64748b', '#475569', None, None),
        ('hide-prelight', '#94a3b8', '#64748b', '-', '#0f172a'),
        ('hide-pressed', '#475569', '#334155', '-', '#020617'),
        ('hide-inactive', '#334155', '#1e293b', None, None),
        # Maximize: Monochromatic slate / graphite
        ('maximize-active', '#64748b', '#475569', None, None),
        ('maximize-prelight', '#94a3b8', '#64748b', '+', '#0f172a'),
        ('maximize-pressed', '#475569', '#334155', '+', '#020617'),
        ('maximize-inactive', '#334155', '#1e293b', None, None),
    ]

    tmp_dir = root / 'tmp/groove-xfwm4-svg'
    tmp_dir.mkdir(parents=True, exist_ok=True)

    for name, col, border, glyph, glyph_col in button_specs:
        svg_content = create_svg_button(col, border, glyph=glyph, glyph_color=glyph_col)
        svg_path = tmp_dir / f'{name}.svg'
        svg_path.write_text(svg_content)
        png_path = theme_dir / f'{name}.png'
        if converter.exists():
            subprocess.run([str(converter), '-w', '20', '-h', '32',
                            str(svg_path), '-o', str(png_path)], env=env, check=True)
            png_path.chmod(0o644)

    # 3. Window Top Corners (12px rounded corner) and XPM masks
    corner_svg_left = '''<svg xmlns="http://www.w3.org/2000/svg" width="12" height="32" viewBox="0 0 12 32">
      <path d="M12 0H12v32H0V12A12 12 0 0 1 12 0z" fill="#20242b"/>
      <path d="M12 0H12v1H0v31" fill="none" stroke="#2e3849" stroke-width="1"/>
    </svg>'''
    corner_svg_right = '''<svg xmlns="http://www.w3.org/2000/svg" width="12" height="32" viewBox="0 0 12 32">
      <path d="M0 0h0A12 12 0 0 1 12 12v20H0V0z" fill="#20242b"/>
      <path d="M0 0h0v1h12v31" fill="none" stroke="#2e3849" stroke-width="1"/>
    </svg>'''
    (tmp_dir / 'top-left-active.svg').write_text(corner_svg_left)
    (tmp_dir / 'top-right-active.svg').write_text(corner_svg_right)

    if converter.exists():
        for state in ('active', 'inactive'):
            subprocess.run([str(converter), '-w', '12', '-h', '32',
                            str(tmp_dir / 'top-left-active.svg'),
                            '-o', str(theme_dir / f'top-left-{state}.png')], env=env, check=True)
            subprocess.run([str(converter), '-w', '12', '-h', '32',
                            str(tmp_dir / 'top-right-active.svg'),
                            '-o', str(theme_dir / f'top-right-{state}.png')], env=env, check=True)
            (theme_dir / f'top-left-{state}.png').chmod(0o644)
            (theme_dir / f'top-right-{state}.png').chmod(0o644)

    # XPM transparency masks for rounded corners
    for state in ('active', 'inactive'):
        write_rounded_xpm(theme_dir / f'top-left-{state}.xpm', 12, 32, 12, is_left=True)
        write_rounded_xpm(theme_dir / f'top-right-{state}.xpm', 12, 32, 12, is_left=False)

    # 4. Title and Border 1px strips
    title_svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="1" height="32" viewBox="0 0 1 32">
      <rect width="1" height="32" fill="#20242b"/>
      <rect width="1" height="1" fill="#2e3849"/>
      <rect y="31" width="1" height="1" fill="#141720"/>
    </svg>'''
    (tmp_dir / 'title.svg').write_text(title_svg)
    if converter.exists():
        for state in ('active', 'inactive'):
            for i in range(1, 6):
                dest = theme_dir / f'title-{i}-{state}.png'
                subprocess.run([str(converter), '-w', '1', '-h', '32',
                                str(tmp_dir / 'title.svg'), '-o', str(dest)], env=env, check=True)
                dest.chmod(0o644)

    # Border strips (left, right, bottom)
    border_svg_side = '''<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"><rect width="1" height="1" fill="#20242b"/></svg>'''
    (tmp_dir / 'border.svg').write_text(border_svg_side)
    if converter.exists():
        for name in ('left', 'right', 'bottom', 'bottom-left', 'bottom-right'):
            for state in ('active', 'inactive'):
                dest = theme_dir / f'{name}-{state}.png'
                subprocess.run([str(converter), '-w', '1', '-h', '1',
                                str(tmp_dir / 'border.svg'), '-o', str(dest)], env=env, check=True)
                dest.chmod(0o644)

    # Mirror xfwm4 assets into WhiteSur-Dark/xfwm4 so both themes have 12px XPM corner masks and CHM| layout
    ws_xfwm4 = root / 'usr/share/themes/WhiteSur-Dark/xfwm4'
    if ws_xfwm4.parent.exists():
        ws_xfwm4.mkdir(parents=True, exist_ok=True)
        for item in theme_dir.iterdir():
            if item.is_file():
                shutil.copy2(item, ws_xfwm4 / item.name)

    # 4b. Populate Dock Icons from WhiteSur + Custom Icons Override Pipeline
    dock_icon_dir = root / 'usr/share/icons/groove-glass'
    dock_icon_dir.mkdir(parents=True, exist_ok=True)
    ws_apps_scalable = root / 'usr/share/icons/WhiteSur/apps/scalable'
    whitesur_dock_mapping = {
        'terminal': 'utilities-terminal.svg',
        'files': 'system-file-manager.svg',
        'editor': 'org.xfce.mousepad.svg',
        'browser': 'brave.svg',
        'office': 'onlyoffice-desktopeditors.svg',
        'system': 'utilities-system-monitor.svg',
        'settings': 'preferences-system.svg',
        'installer': 'system-installer.svg',
    }
    if ws_apps_scalable.is_dir() and converter.exists():
        for dock_name, ws_svg_name in whitesur_dock_mapping.items():
            src_svg = ws_apps_scalable / ws_svg_name
            if src_svg.exists():
                dst_svg = dock_icon_dir / f'{dock_name}.svg'
                dst_svg.write_text(src_svg.read_text())
                dst_svg.chmod(0o644)
                for size, suffix in ((48, ''), (96, '@2x')):
                    dest_png = dock_icon_dir / f'{dock_name}{suffix}.png'
                    subprocess.run([str(converter), '-w', str(size), '-h', str(size),
                                    str(dst_svg), '-o', str(dest_png)], env=env, check=True)
                    dest_png.chmod(0o644)

    # Process user's custom icons in scripts/graphics/custom-icons/ (overrides WhiteSur defaults)
    hicolor_root = root / 'usr/share/icons/hicolor'
    if CUSTOM_ICONS_DIR.is_dir() and converter.exists():
        for custom_svg in sorted(CUSTOM_ICONS_DIR.glob('*.svg')):
            stem = custom_svg.stem
            svg_text = custom_svg.read_text()
            # 1) groove-glass dock directory
            dst_dock_svg = dock_icon_dir / f'{stem}.svg'
            dst_dock_svg.write_text(svg_text)
            dst_dock_svg.chmod(0o644)
            for size, suffix in ((48, ''), (96, '@2x')):
                dest_png = dock_icon_dir / f'{stem}{suffix}.png'
                subprocess.run([str(converter), '-w', str(size), '-h', str(size),
                                str(dst_dock_svg), '-o', str(dest_png)], env=env, check=True)
                dest_png.chmod(0o644)

            # 2) Install into WhiteSur & hicolor (plus panel menu aliases for groove-logo)
            alias_stems = [stem]
            if stem == 'groove-logo':
                alias_stems.extend(['org.xfce.panel.applicationsmenu', 'xfce4-panel-menu', 'start-here'])

            for target_stem in alias_stems:
                if ws_apps_scalable.is_dir():
                    ws_target = ws_apps_scalable / f'{target_stem}.svg'
                    if ws_target.is_symlink() or ws_target.exists():
                        ws_target.unlink()
                    ws_target.write_text(svg_text)
                    ws_target.chmod(0o644)

                hc_scalable = hicolor_root / 'scalable/apps'
                hc_scalable.mkdir(parents=True, exist_ok=True)
                hc_svg = hc_scalable / f'{target_stem}.svg'
                hc_svg.write_text(svg_text)
                hc_svg.chmod(0o644)

                for px in (16, 22, 24, 32, 48):
                    hc_px_dir = hicolor_root / f'{px}x{px}/apps'
                    hc_px_dir.mkdir(parents=True, exist_ok=True)
                    hc_png = hc_px_dir / f'{target_stem}.png'
                    subprocess.run([str(converter), '-w', str(px), '-h', str(px),
                                    str(dst_dock_svg), '-o', str(hc_png)], env=env, check=True)
                    hc_png.chmod(0o644)
                    # Also place 16/22/24/32 px PNG/SVG in WhiteSur/apps/<px> so panel lookup finds it immediately
                    ws_px_dir = root / f'usr/share/icons/WhiteSur/apps/{px}'
                    if ws_px_dir.is_dir():
                        ws_px_svg = ws_px_dir / f'{target_stem}.svg'
                        if ws_px_svg.is_symlink() or ws_px_svg.exists():
                            ws_px_svg.unlink()
                        ws_px_svg.write_text(svg_text)
                        ws_px_svg.chmod(0o644)

        for custom_png in sorted(CUSTOM_ICONS_DIR.glob('*.png')):
            shutil.copy2(custom_png, dock_icon_dir / custom_png.name)

    # Refresh GTK icon caches so WhiteSur and hicolor icons resolve instantaneously
    if icon_cache_bin.exists():
        for ic_dir in (root / 'usr/share/icons/WhiteSur', root / 'usr/share/icons/hicolor'):
            if ic_dir.is_dir():
                subprocess.run([str(icon_cache_bin), '-f', '-t', str(ic_dir)], env=env, check=False)

    # 5. Picom Configuration (Glassmorphism translucency for menus, panel, and windows)
    put('/etc/xdg/picom.conf', '''
    experimental-backends = true;
    backend = "xrender";
    vsync = false;

    corner-radius = 12;
    rounded-corners-exclude = [
      "window_type = 'dock'",
      "window_type = 'desktop'",
      "class_g = 'xfce4-panel'"
    ];

    shadow = true;
    shadow-radius = 16;
    shadow-opacity = 0.42;
    shadow-offset-x = -12;
    shadow-offset-y = -12;
    shadow-exclude = [
      "class_g = 'xfce4-screenshooter'",
      "window_type = 'dock'",
      "window_type = 'desktop'",
      "_GTK_FRAME_EXTENTS@:c"
    ];

    fading = true;
    fade-in-step = 0.08;
    fade-out-step = 0.08;
    fade-delta = 10;

    inactive-opacity = 0.94;
    active-opacity = 0.98;
    frame-opacity = 0.92;

    opacity-rule = [
      "80:class_g = 'xfce4-panel'",
      "80:class_g = 'Xfce4-panel'",
      "100:class_g = 'groove-dock'",
      "100:class_g = 'Brave-browser'",
      "100:class_g = 'brave-browser'",
      "100:class_g = 'DesktopEditors'",
      "100:class_g = 'Firefox'",
      "100:class_g = 'firefox'",
      "88:class_g = 'Xfce4-terminal'",
      "88:class_g = 'xfce4-terminal'",
      "92:class_g = 'Thunar'",
      "92:class_g = 'thunar'",
      "93:class_g = 'Mousepad'",
      "93:class_g = 'mousepad'",
      "92:class_g = 'Groove-control-center'",
      "92:class_g = 'groove-control-center'",
      "92:class_g = 'Xfce4-settings-manager'"
    ];

    wintypes:
    {
      tooltip = { fade = true; shadow = true; opacity = 0.88; focus = true; full-shadow = false; };
      dock = { shadow = false; clip-shadow-above = true; };
      dnd = { shadow = false; };
      popup_menu = { opacity = 0.86; shadow = true; fade = true; };
      dropdown_menu = { opacity = 0.86; shadow = true; fade = true; };
      menu = { opacity = 0.86; shadow = true; fade = true; };
    };
    ''')

    put('/usr/libexec/groove-picom', '''#!/bin/sh
    set -eu
    exec /opt/groove-graphics/bin/picom --experimental-backends --config /etc/xdg/picom.conf "$@"
    ''', 0o755)

    # 6. Autostart Picom and Groove Dock
    put('/etc/xdg/autostart/groove-picom.desktop', '''
    [Desktop Entry]
    Type=Application
    Name=Picom Compositor
    Comment=macOS Glass Compositor
    Exec=/usr/libexec/groove-picom -b
    OnlyShowIn=XFCE;
    RunHook=0
    ''')

    put('/etc/xdg/autostart/groove-dock.desktop', '''
    [Desktop Entry]
    Type=Application
    Name=Groove macOS Dock
    Comment=macOS Glass Floating Dock
    Exec=/opt/groove-graphics/bin/groove-dock
    OnlyShowIn=XFCE;
    RunHook=0
    ''')

    # 7. XFCE Window Manager Configuration (xfwm4.xml) with Inter Font
    put('/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml', '''
    <?xml version="1.0" encoding="UTF-8"?>
    <channel name="xfwm4" version="1.0">
      <property name="general" type="empty">
        <property name="theme" type="string" value="WhiteSur-Dark"/>
        <property name="button_layout" type="string" value="CHM|"/>
        <property name="button_offset" type="int" value="10"/>
        <property name="button_spacing" type="int" value="2"/>
        <property name="title_alignment" type="string" value="center"/>
        <property name="title_shadow_active" type="string" value="false"/>
        <property name="title_shadow_inactive" type="string" value="false"/>
        <property name="title_font" type="string" value="Inter Bold 10.5"/>
        <property name="use_compositing" type="bool" value="false"/>
        <property name="box_resize" type="bool" value="false"/>
        <property name="box_move" type="bool" value="false"/>
        <property name="double_click_action" type="string" value="maximize"/>
        <property name="scroll_workspaces" type="bool" value="false"/>
        <property name="workspace_count" type="int" value="4"/>
      </property>
    </channel>
    ''')

    # 8. XFCE Desktop Configuration (xfce4-desktop.xml) with Interactive Desktop Icons
    wallpaper_path = '/usr/share/backgrounds/groove-default.png'
    desktop_xml = f'''<?xml version="1.0" encoding="UTF-8"?>
    <channel name="xfce4-desktop" version="1.0">
      <property name="backdrop" type="empty">
        <property name="screen0" type="empty">
    '''
    monitors = ['monitor0', 'monitorVirtual-1', 'monitorVirtual-0', 'monitorVirtual1', 'monitorVGA-1', 'monitorHDMI-1', 'monitorDefault']
    for mon in monitors:
        desktop_xml += f'''
          <property name="{mon}" type="empty">
            <property name="workspace0" type="empty">
              <property name="last-image" type="string" value="{wallpaper_path}"/>
              <property name="image-style" type="int" value="5"/>
            </property>
          </property>
        '''
    desktop_xml += '''
        </property>
      </property>
      <property name="desktop-icons" type="empty">
        <property name="style" type="int" value="2"/>
        <property name="icon-size" type="uint" value="48"/>
        <property name="show-thumbnails" type="bool" value="true"/>
        <property name="file-icons" type="empty">
          <property name="show-home" type="bool" value="true"/>
          <property name="show-filesystem" type="bool" value="true"/>
          <property name="show-trash" type="bool" value="false"/>
          <property name="show-removable" type="bool" value="true"/>
        </property>
      </property>
    </channel>
    '''
    put('/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml', desktop_xml)
    put(PREFIX + '/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml', desktop_xml)
    put('/home/groove/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml', desktop_xml)
    put('/root/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml', desktop_xml)

    # Autostart wallpaper script to guarantee matching any dynamic RandR monitor
    wallpaper_script = '''#!/bin/sh
WP="/usr/share/backgrounds/groove-default.png"
[ -f "$WP" ] || WP="/usr/share/backgrounds/groove-blue-note.png"

sleep 1
if command -v xrandr >/dev/null 2>&1; then
    for mon in $(xrandr --query 2>/dev/null | awk '/ connected/ {print $1}'); do
        xfconf-query -c xfce4-desktop -p "/backdrop/screen0/monitor${mon}/workspace0/last-image" -s "$WP" --create -t string 2>/dev/null || true
        xfconf-query -c xfce4-desktop -p "/backdrop/screen0/monitor${mon}/workspace0/image-style" -s 5 --create -t int 2>/dev/null || true
    done
fi
for mon in 0 Virtual-1 Virtual-0 Virtual1 monitor0 default Default eDP-1; do
    xfconf-query -c xfce4-desktop -p "/backdrop/screen0/monitor${mon}/workspace0/last-image" -s "$WP" --create -t string 2>/dev/null || true
    xfconf-query -c xfce4-desktop -p "/backdrop/screen0/monitor${mon}/workspace0/image-style" -s 5 --create -t int 2>/dev/null || true
done
'''
    put('/usr/libexec/groove-wallpaper-autostart', wallpaper_script, 0o755)
    put('/etc/xdg/autostart/groove-wallpaper.desktop', '''[Desktop Entry]
Type=Application
Name=Groove Wallpaper Autostart
Exec=/usr/libexec/groove-wallpaper-autostart
OnlyShowIn=XFCE;
RunHook=0
''')

    # 9. Single 32px Top Menu Bar (xfce4-panel.xml) with Custom Warm Soundwave Logo
    panel_xml = '''<?xml version="1.0" encoding="UTF-8"?>
    <channel name="xfce4-panel" version="1.0">
      <property name="configver" type="int" value="2"/>
      <property name="panels" type="array">
        <value type="int" value="1"/>
        <property name="dark-mode" type="bool" value="true"/>
        <property name="panel-1" type="empty">
          <property name="position" type="string" value="p=6;x=0;y=0"/>
          <property name="length" type="uint" value="100"/>
          <property name="position-locked" type="bool" value="true"/>
          <property name="icon-size" type="uint" value="20"/>
          <property name="size" type="uint" value="32"/>
          <property name="enter-opacity" type="uint" value="90"/>
          <property name="leave-opacity" type="uint" value="75"/>
          <property name="plugin-ids" type="array">
            <value type="int" value="1"/>
            <value type="int" value="2"/>
            <value type="int" value="3"/>
            <value type="int" value="4"/>
            <value type="int" value="5"/>
            <value type="int" value="6"/>
          </property>
          <property name="background-style" type="uint" value="0"/>
        </property>
      </property>
      <property name="plugins" type="empty">
        <property name="plugin-1" type="string" value="applicationsmenu">
          <property name="show-button-title" type="bool" value="true"/>
          <property name="button-title" type="string" value=" Linux Groove "/>
          <property name="button-icon" type="string" value="groove-logo"/>
          <property name="show-menu-icons" type="bool" value="true"/>
          <property name="custom-menu" type="bool" value="false"/>
        </property>
        <property name="plugin-2" type="string" value="tasklist">
          <property name="grouping" type="uint" value="1"/>
          <property name="flat-buttons" type="bool" value="true"/>
          <property name="show-handle" type="bool" value="false"/>
          <property name="show-labels" type="bool" value="true"/>
        </property>
        <property name="plugin-3" type="string" value="separator">
          <property name="expand" type="bool" value="true"/>
          <property name="style" type="uint" value="0"/>
        </property>
        <property name="plugin-4" type="string" value="systray">
          <property name="square-icons" type="bool" value="true"/>
        </property>
        <property name="plugin-5" type="string" value="clock">
          <property name="digital-format" type="string" value="%a %d %b  %H:%M"/>
          <property name="mode" type="uint" value="2"/>
        </property>
        <property name="plugin-6" type="string" value="actions">
          <property name="appearance" type="uint" value="0"/>
          <property name="items" type="array">
            <value type="string" value="+lock-screen"/>
            <value type="string" value="-switch-user"/>
            <value type="string" value="-suspend"/>
            <value type="string" value="-separator"/>
            <value type="string" value="+logout"/>
            <value type="string" value="+restart"/>
            <value type="string" value="+shutdown"/>
          </property>
        </property>
      </property>
    </channel>
    '''
    put('/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-panel.xml', panel_xml)
    put(PREFIX + '/etc/xdg/xfce4/panel/default.xml', panel_xml)
    put(PREFIX + '/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-panel.xml', panel_xml)
    put('/home/groove/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-panel.xml', panel_xml)
    put('/root/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-panel.xml', panel_xml)

    # 10. GTK3 Settings & Decorations (WhiteSur-Dark + WhiteSur Icons + Inter Font + Subpixel Xft)
    put('/etc/xdg/gtk-3.0/settings.ini', '''
    [Settings]
    gtk-theme-name=WhiteSur-Dark
    gtk-icon-theme-name=WhiteSur
    gtk-font-name=Inter 10.5
    gtk-application-prefer-dark-theme=true
    gtk-decoration-layout=close,minimize,maximize:menu
    gtk-xft-antialias=1
    gtk-xft-hinting=1
    gtk-xft-hintstyle=hintslight
    gtk-xft-rgba=rgb
    ''')

    put('/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xsettings.xml', '''
    <?xml version="1.0" encoding="UTF-8"?>
    <channel name="xsettings" version="1.0">
      <property name="Net" type="empty">
        <property name="ThemeName" type="string" value="WhiteSur-Dark"/>
        <property name="IconThemeName" type="string" value="WhiteSur"/>
      </property>
      <property name="Gtk" type="empty">
        <property name="FontName" type="string" value="Inter 10.5"/>
        <property name="DecorationLayout" type="string" value="close,minimize,maximize:menu"/>
      </property>
      <property name="Xft" type="empty">
        <property name="DPI" type="int" value="-1"/>
        <property name="Antialias" type="int" value="1"/>
        <property name="Hinting" type="int" value="1"/>
        <property name="HintStyle" type="string" value="hintslight"/>
        <property name="RGBA" type="string" value="rgb"/>
        <property name="Lcdfilter" type="string" value="lcddefault"/>
      </property>
    </channel>
    ''')

    # 11. Glassmorphism CSS Styling for Menus, Top Bar, Popovers, and Thunar Sidebar
    glass_css = '''
    /* Linux Groove macOS Glassmorphism Overrides */
    * {
        font-family: 'Inter', 'DejaVu Sans', sans-serif;
    }
    #XfcePanelWindow,
    .xfce4-panel,
    .xfce4-panel.panel,
    panel-toplevel {
        background-color: rgba(16, 20, 30, 0.72) !important;
        background-image: none !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.14) !important;
        color: #f4efe6;
    }
    .xfce4-panel button {
        border-radius: 6px;
        color: #f4efe6;
        background: transparent;
        box-shadow: none;
        border: none;
        padding: 2px 6px;
        font-weight: 600;
    }
    .xfce4-panel button:hover,
    .xfce4-panel button:checked {
        background-color: rgba(255, 255, 255, 0.14);
    }
    menu,
    .menu,
    .context-menu,
    popover,
    popover.background {
        background-color: rgba(22, 26, 36, 0.84);
        color: #f4efe6;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
    }
    menuitem {
        border-radius: 6px;
        padding: 5px 10px;
        margin: 2px 4px;
    }
    menuitem:hover {
        background-color: rgba(249, 115, 22, 0.85);
        color: #ffffff;
    }
    .thunar .sidebar,
    .thunar .sidebar .view {
        background-color: rgba(20, 24, 34, 0.82);
        color: #e8e6e0;
    }
    .dim-label {
        color: #94a3b8;
    }
    '''

    fallback_css = '''
    @import url("resource:///org/gtk/libgtk/theme/Adwaita/gtk-contained-dark.css");
    @define-color theme_bg_color #141926;
    @define-color theme_fg_color #f4efe6;
    @define-color theme_selected_bg_color #d4af37;
    @define-color theme_selected_fg_color #0b0e17;

    window, dialog { background-color: #141926; color: #f4efe6; }
    button:checked, button.suggested-action { background: #d4af37; color: #0b0e17; }
    entry:focus { border-color: #d4af37; box-shadow: inset 0 0 0 1px #d4af37; }
    selection { background-color: #d4af37; color: #0b0e17; }
    ''' + glass_css
    put('/usr/share/themes/GrooveBlueNote/gtk-3.0/gtk.css', fallback_css)

    for ws_css_rel in ('usr/share/themes/WhiteSur-Dark/gtk-3.0/gtk.css',
                       'usr/share/themes/WhiteSur-Dark/gtk-3.0/gtk-dark.css'):
        ws_css_path = root / ws_css_rel
        if ws_css_path.exists():
            orig = ws_css_path.read_text()
            if 'Linux Groove macOS Glassmorphism Overrides' not in orig:
                ws_css_path.write_text(orig + '\n' + textwrap.dedent(glass_css))

    put('/etc/xdg/gtk-3.0/gtk.css', glass_css)
    put('/home/groove/.config/gtk-3.0/gtk.css', glass_css)

    # 12. Populate Desktop Launchers in /home/groove/Desktop
    desktop_dir = root / 'home/groove/Desktop'
    desktop_dir.mkdir(parents=True, exist_ok=True)

    launchers = [
        ('brave.desktop', 'Brave Browser', '/usr/libexec/groove-browser', '/usr/share/icons/groove-glass/browser.png'),
        ('onlyoffice.desktop', 'OnlyOffice Desktop Editors', '/usr/libexec/groove-office', '/usr/share/icons/groove-glass/office.png'),
        ('groove-control-center.desktop', 'Centro de Control', '/usr/libexec/groove-control-center', '/usr/share/icons/groove-glass/system.png'),
        ('groove-installer.desktop', 'Instalar Linux Groove OS', '/usr/libexec/groove-installer-gui', '/usr/share/icons/groove-glass/installer.png'),
        ('thunar.desktop', 'Archivos', '/usr/libexec/groove-files', '/usr/share/icons/groove-glass/files.png'),
        ('xfce4-terminal.desktop', 'Terminal', '/usr/libexec/groove-terminal', '/usr/share/icons/groove-glass/terminal.png')
    ]
    for fname, name, exec_cmd, icon_path in launchers:
        put(f'/home/groove/Desktop/{fname}', f'''[Desktop Entry]
Version=1.0
Type=Application
Name={name}
Exec={exec_cmd}
Icon={icon_path}
Terminal=false
Categories=Utility;
''', mode=0o755)

    for chown_target in (desktop_dir, root / 'home/groove/.config'):
        if chown_target.exists():
            for dirpath, dirnames, filenames in os.walk(chown_target):
                os.chown(dirpath, 1000, 1000)
                for fn in filenames:
                    fp = Path(dirpath) / fn
                    if not fp.is_symlink():
                        os.chown(fp, 1000, 1000)
    for f in desktop_dir.glob('*.desktop'):
        f.chmod(0o755)
