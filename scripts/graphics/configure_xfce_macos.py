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
    # 24x28 button with solid background matching titlebar (#373737 with top border #1a1a1a)
    # Output must be converted to RGB (no alpha) to avoid xfwm4 1-bit binary thresholding
    svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28">',
        '  <rect width="24" height="28" fill="#373737"/>',
        '  <rect width="24" height="1" fill="#1a1a1a"/>',
        f'  <circle cx="12" cy="14" r="5.6" fill="{color}" stroke="{border_color}" stroke-width="0.8"/>'
    ]
    if glyph == 'x':
        svg.append(f'  <path d="M10 12l4 4m0-4l-4 4" fill="none" stroke="{glyph_color}" stroke-width="1.2" stroke-linecap="round"/>')
    elif glyph == '-':
        svg.append(f'  <path d="M9.5 14h5" fill="none" stroke="{glyph_color}" stroke-width="1.2" stroke-linecap="round"/>')
    elif glyph == '+':
        svg.append(f'  <path d="M12 11.5v5m-2.5-2.5h5" fill="none" stroke="{glyph_color}" stroke-width="1.2" stroke-linecap="round"/>')
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
    is_arch = (root / 'usr/bin/pacman').is_file()
    bin_prefix = '/usr/bin' if is_arch else PREFIX + '/bin'

    def put(rel_path, body, mode=0o644):
        target = root / rel_path.lstrip('/')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(textwrap.dedent(body).lstrip())
        target.chmod(mode)

    converter = root / PREFIX.lstrip('/') / 'bin/rsvg-convert'
    icon_cache_bin = root / PREFIX.lstrip('/') / 'bin/gtk-update-icon-cache'
    fc_cache_bin = root / PREFIX.lstrip('/') / 'bin/fc-cache'
    conv_cmd = [str(converter)]
    icon_cache_cmd = [str(icon_cache_bin)]
    fc_cache_cmd = [str(fc_cache_bin)]
    env = os.environ.copy()
    env['LD_LIBRARY_PATH'] = str(root / PREFIX.lstrip('/') / 'lib')
    if not converter.exists() and (root / 'usr/bin/rsvg-convert').exists():
        converter = root / 'usr/bin/rsvg-convert'
        icon_cache_bin = root / 'usr/bin/gtk-update-icon-cache'
        fc_cache_bin = root / 'usr/bin/fc-cache'
        ld_so = root / 'usr/lib/ld-linux-aarch64.so.1'
        conv_cmd = ([str(ld_so), '--library-path', str(root / 'usr/lib'), str(converter)]
                    if ld_so.is_file() else [str(converter)])
        icon_cache_cmd = ([str(ld_so), '--library-path', str(root / 'usr/lib'), str(icon_cache_bin)]
                          if ld_so.is_file() else [str(icon_cache_bin)])
        fc_cache_cmd = ([str(ld_so), '--library-path', str(root / 'usr/lib'), str(fc_cache_bin)]
                        if ld_so.is_file() else [str(fc_cache_bin)])
        env = os.environ.copy()

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
            dest_ttf = inter_target / ttf.name
            shutil.copy2(ttf, dest_ttf)
            dest_ttf.chmod(0o644)

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
        subprocess.run(fc_cache_cmd + ['-f', str(inter_target)], env=env, check=False)

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
        oo_dir = oo_parent / 'opt/onlyoffice'
        if oo_dir.is_dir():
            for p in oo_dir.rglob('*'):
                if p.is_file():
                    p.chmod(0o755 if (p.suffix in ('.so', '') or os.access(p, os.X_OK)) else 0o644)
                elif p.is_dir():
                    p.chmod(0o755)

    dst_apps_lib = root / 'opt/groove-apps/lib'
    dst_apps_lib.mkdir(parents=True, exist_ok=True)
    for sdir in (Path('/opt/groove-apps/lib'), Path('/backup/sources/apps/lib')):
        if sdir.is_dir():
            for lib_file in sdir.iterdir():
                dest_file = dst_apps_lib / lib_file.name
                if not dest_file.exists():
                    shutil.copy2(lib_file, dest_file)
    for lib_file in dst_apps_lib.glob('*'):
        if lib_file.is_file():
            lib_file.chmod(0o755)

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
            subprocess.run(conv_cmd + ['-w', '24', '-h', '28',
                            str(svg_path), '-o', str(png_path)], env=env, check=True)
            png_path.chmod(0o644)

    # 3. Window Top Corners and titlebars from original WhiteSur-Dark
    # Extract them cleanly from WhiteSur-Dark archive
    ws_extract_tmp = root / 'tmp/ws-orig-xfwm4'
    ws_extract_tmp.mkdir(parents=True, exist_ok=True)
    if ws_gtk_tar.exists():
        subprocess.run(['tar', '-xJf', str(ws_gtk_tar), '-C', str(ws_extract_tmp), 'WhiteSur-Dark/xfwm4'], check=True)
        orig_xfwm4 = ws_extract_tmp / 'WhiteSur-Dark/xfwm4'
        if orig_xfwm4.is_dir():
            for item in orig_xfwm4.iterdir():
                if item.name.startswith(('title-', 'top-', 'bottom', 'left-', 'right-', 'shade-', 'stick-', 'menu-')):
                    shutil.copy2(item, theme_dir / item.name)

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
                    subprocess.run(conv_cmd + ['-w', str(size), '-h', str(size),
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
                subprocess.run(conv_cmd + ['-w', str(size), '-h', str(size),
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
                    subprocess.run(conv_cmd + ['-w', str(px), '-h', str(px),
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
                subprocess.run(icon_cache_cmd + ['-f', '-t', str(ic_dir)], env=env, check=False)

    # 6. Autostart Groove Dock (Picom not autostarted to avoid double compositing)
    (root / 'etc/xdg/autostart/groove-picom.desktop').unlink(missing_ok=True)

    put('/etc/xdg/autostart/groove-dock.desktop', f'''
    [Desktop Entry]
    Type=Application
    Name=Groove macOS Dock
    Comment=macOS Glass Floating Dock
    Exec={bin_prefix}/groove-dock
    OnlyShowIn=XFCE;
    RunHook=0
    ''')

    # 7. XFCE Window Manager Configuration (xfwm4.xml) with Inter Font & Anti-Freeze Watchdog
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
        <property name="use_compositing" type="bool" value="true"/>
        <property name="box_resize" type="bool" value="false"/>
        <property name="box_move" type="bool" value="false"/>
        <property name="double_click_action" type="string" value="maximize"/>
        <property name="scroll_workspaces" type="bool" value="false"/>
        <property name="workspace_count" type="int" value="4"/>
        <property name="ping_timeout" type="uint" value="3000"/>
        <property name="easy_click" type="string" value="Super"/>
      </property>
    </channel>
    ''')

    # 7b. Universal Force Quit shortcuts (Mac Cmd+Alt+Esc & Ctrl+Alt+Esc) and Cmd+Q
    put('/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-keyboard-shortcuts.xml', '''
    <?xml version="1.0" encoding="UTF-8"?>
    <channel name="xfce4-keyboard-shortcuts" version="1.0">
      <property name="commands" type="empty">
        <property name="custom" type="empty">
          <property name="&lt;Primary&gt;&lt;Alt&gt;Escape" type="string" value="xkill"/>
          <property name="&lt;Super&gt;&lt;Alt&gt;Escape" type="string" value="xkill"/>
          <property name="&lt;Primary&gt;&lt;Shift&gt;Escape" type="string" value="xfce4-taskmanager"/>
          <property name="&lt;Super&gt;e" type="string" value="thunar"/>
          <property name="&lt;Super&gt;t" type="string" value="xfce4-terminal"/>
          <property name="&lt;Super&gt;space" type="string" value="xfce4-appfinder"/>
        </property>
      </property>
      <property name="xfwm4" type="empty">
        <property name="custom" type="empty">
          <property name="&lt;Super&gt;q" type="string" value="close_window_key"/>
          <property name="&lt;Alt&gt;F4" type="string" value="close_window_key"/>
          <property name="&lt;Alt&gt;Tab" type="string" value="cycle_windows_key"/>
          <property name="&lt;Alt&gt;&lt;Shift&gt;Tab" type="string" value="cycle_reverse_windows_key"/>
          <property name="&lt;Super&gt;Tab" type="string" value="switch_window_key"/>
        </property>
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
        <property name="style" type="int" value="0"/>
        <property name="icon-size" type="uint" value="48"/>
        <property name="show-thumbnails" type="bool" value="false"/>
        <property name="file-icons" type="empty">
          <property name="show-home" type="bool" value="false"/>
          <property name="show-filesystem" type="bool" value="false"/>
          <property name="show-trash" type="bool" value="false"/>
          <property name="show-removable" type="bool" value="false"/>
        </property>
      </property>
    </channel>
    '''
    put('/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml', desktop_xml)
    put(PREFIX + '/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml', desktop_xml)
    # XFCE reads the system default when no user preference exists.
    put('/root/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml', desktop_xml)

    # Autostart wallpaper script to guarantee matching any dynamic RandR monitor and resolution
    wallpaper_script = '''#!/bin/sh
WP="/usr/share/backgrounds/groove-default.png"
[ -f "$WP" ] || WP="/usr/share/backgrounds/groove-blue-note.png"

# Set optimal virtual display resolution if available
if command -v xrandr >/dev/null 2>&1; then
    for mon in $(xrandr --query 2>/dev/null | awk '/ connected/ {print $1}'); do
        for res in 1920x1080 1920x1200 1600x900 1440x900 1280x800; do
            if xrandr --query 2>/dev/null | grep -A 10 "$mon connected" | grep -q "$res"; then
                xrandr --output "$mon" --mode "$res" 2>/dev/null || true
                break
            fi
        done
    done
fi

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
          <property name="enter-opacity" type="uint" value="98"/>
          <property name="leave-opacity" type="uint" value="92"/>
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
    # Preserve user panel settings; use the system default for new profiles.
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
    gtk-xft-rgba=none
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
        <property name="DPI" type="int" value="96"/>
        <property name="Antialias" type="int" value="1"/>
        <property name="Hinting" type="int" value="1"/>
        <property name="HintStyle" type="string" value="hintslight"/>
        <property name="RGBA" type="string" value="none"/>
        <property name="Lcdfilter" type="string" value="lcdnone"/>
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
        background-color: rgba(22, 26, 36, 0.96) !important;
        color: #f4efe6;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.22);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.55);
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

    # Keep panel styling separate from application themes; never inject user CSS.
    panel_css = glass_css[:glass_css.index('    menu,')]
    put('/etc/xdg/gtk-3.0/gtk.css', panel_css)

    # 12. Clean macOS Desktop (Launchers reside in the Dock and Application Menu)
    desktop_dir = root / 'home/groove/Desktop'
    desktop_dir.mkdir(parents=True, exist_ok=True)
    for old_launcher in desktop_dir.glob('*.desktop'):
        old_launcher.unlink(missing_ok=True)

    for chown_target in (desktop_dir, root / 'home/groove/.config'):
        if chown_target.exists():
            for dirpath, dirnames, filenames in os.walk(chown_target):
                try:
                    os.chown(dirpath, 1000, 1000)
                except PermissionError:
                    pass
                for fn in filenames:
                    fp = Path(dirpath) / fn
                    if not fp.is_symlink():
                        try:
                            os.chown(fp, 1000, 1000)
                        except PermissionError:
                            pass
    for f in desktop_dir.glob('*.desktop'):
        f.chmod(0o755)

    # 13. Rebuild dynamic linker cache (ldconfig) in rootfs
    ldconfig_bin = root / 'sbin/ldconfig'
    if not ldconfig_bin.exists():
        ldconfig_bin = Path('/sbin/ldconfig')
    if ldconfig_bin.exists():
        subprocess.run(['ldconfig', '-r', str(root)], check=False)
