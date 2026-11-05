"""Configure macOS Blue Note Glass appearance for XFCE, xfwm4, picom, and groove-dock."""
import os
from pathlib import Path
import subprocess
import textwrap

PREFIX = '/opt/groove-graphics'

def create_svg_button(color, border_color, glyph=None, glyph_color=None):
    svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">',
        f'  <circle cx="9" cy="9" r="6" fill="{color}" stroke="{border_color}" stroke-width="0.75"/>'
    ]
    if glyph == 'x':
        svg.append(f'  <path d="M6.5 6.5l5 5m0-5l-5 5" fill="none" stroke="{glyph_color}" stroke-width="1.2" stroke-linecap="round"/>')
    elif glyph == '-':
        svg.append(f'  <path d="M6 9h6" fill="none" stroke="{glyph_color}" stroke-width="1.4" stroke-linecap="round"/>')
    elif glyph == '+':
        svg.append(f'  <path d="M9 6v6m-3-3h6" fill="none" stroke="{glyph_color}" stroke-width="1.2" stroke-linecap="round"/>')
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

    theme_dir = root / 'usr/share/themes/GrooveBlueNote/xfwm4'
    theme_dir.mkdir(parents=True, exist_ok=True)

    # 1. xfwm4 themerc (macOS Traffic Light style on the left)
    themerc = '''
    button_layout=CHM|
    button_offset=8
    button_spacing=6
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

    # 2. Render traffic-light buttons via rsvg-convert
    converter = root / PREFIX.lstrip('/') / 'bin/rsvg-convert'
    env = os.environ.copy()
    env['LD_LIBRARY_PATH'] = str(root / PREFIX.lstrip('/') / 'lib')

    button_specs = [
        # Close: Red
        ('close-active', '#FF5F56', '#E0443E', None, None),
        ('close-prelight', '#FF5F56', '#E0443E', 'x', '#4C0002'),
        ('close-pressed', '#BF4942', '#8A322C', 'x', '#300001'),
        ('close-inactive', '#4A4D54', '#3E4046', None, None),
        # Hide/Minimize: Yellow
        ('hide-active', '#FFBD2E', '#DEA123', None, None),
        ('hide-prelight', '#FFBD2E', '#DEA123', '-', '#593A00'),
        ('hide-pressed', '#BF8E22', '#8A6615', '-', '#362300'),
        ('hide-inactive', '#4A4D54', '#3E4046', None, None),
        # Maximize: Green
        ('maximize-active', '#27C93F', '#1AAB29', None, None),
        ('maximize-prelight', '#27C93F', '#1AAB29', '+', '#00400C'),
        ('maximize-pressed', '#1E9730', '#136B20', '+', '#002607'),
        ('maximize-inactive', '#4A4D54', '#3E4046', None, None),
    ]

    tmp_dir = root / 'tmp/groove-xfwm4-svg'
    tmp_dir.mkdir(parents=True, exist_ok=True)

    for name, col, border, glyph, glyph_col in button_specs:
        svg_content = create_svg_button(col, border, glyph, glyph_col)
        svg_path = tmp_dir / f'{name}.svg'
        svg_path.write_text(svg_content)
        png_path = theme_dir / f'{name}.png'
        if converter.exists():
            subprocess.run([str(converter), '-w', '18', '-h', '18',
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

    # 5. Picom Configuration (Reliable XRender backend with full RGBA support)
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
    shadow-opacity = 0.38;
    shadow-offset-x = -10;
    shadow-offset-y = -10;
    shadow-exclude = [
      "class_g = 'xfce4-screenshooter'",
      "window_type = 'dock'",
      "window_type = 'desktop'",
      "_GTK_FRAME_EXTENTS@:c"
    ];

    fading = false;
    inactive-opacity = 1.0;
    active-opacity = 1.0;
    frame-opacity = 1.0;
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

    # 7. XFCE Window Manager Configuration (xfwm4.xml)
    put('/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml', '''
    <?xml version="1.0" encoding="UTF-8"?>
    <channel name="xfwm4" version="1.0">
      <property name="general" type="empty">
        <property name="theme" type="string" value="GrooveBlueNote"/>
        <property name="button_layout" type="string" value="CHM|"/>
        <property name="button_offset" type="int" value="8"/>
        <property name="button_spacing" type="int" value="6"/>
        <property name="title_alignment" type="string" value="center"/>
        <property name="title_shadow_active" type="string" value="false"/>
        <property name="title_shadow_inactive" type="string" value="false"/>
        <property name="title_font" type="string" value="DejaVu Sans Bold 10"/>
        <property name="use_compositing" type="bool" value="false"/>
        <property name="box_resize" type="bool" value="false"/>
        <property name="box_move" type="bool" value="false"/>
        <property name="double_click_action" type="string" value="maximize"/>
        <property name="scroll_workspaces" type="bool" value="false"/>
        <property name="workspace_count" type="int" value="4"/>
      </property>
    </channel>
    ''')

    # 8. XFCE Desktop Configuration (xfce4-desktop.xml) with Interactive Desktop Icons!
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

    # 9. Single 32px Top Menu Bar (xfce4-panel.xml)
    # CRITICAL: property name="panel-1" MUST be nested INSIDE property name="panels" type="array"
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
          <property name="icon-size" type="uint" value="16"/>
          <property name="size" type="uint" value="32"/>
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
          <property name="button-title" type="string" value=" 🎷 Linux Groove "/>
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
    # Put panel config in ALL discovery paths so xfce4-panel never falls back to an empty panel
    put('/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-panel.xml', panel_xml)
    put(PREFIX + '/etc/xdg/xfce4/panel/default.xml', panel_xml)
    put(PREFIX + '/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-panel.xml', panel_xml)
    put('/home/groove/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-panel.xml', panel_xml)
    put('/root/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-panel.xml', panel_xml)

    # 10. GTK3 Settings & Decorations
    put('/etc/xdg/gtk-3.0/settings.ini', '''
    [Settings]
    gtk-theme-name=GrooveBlueNote
    gtk-icon-theme-name=Adwaita
    gtk-font-name=DejaVu Sans 11
    gtk-application-prefer-dark-theme=true
    gtk-decoration-layout=close,minimize,maximize:menu
    ''')

    put('/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xsettings.xml', '''
    <?xml version="1.0" encoding="UTF-8"?>
    <channel name="xsettings" version="1.0">
      <property name="Net" type="empty">
        <property name="ThemeName" type="string" value="GrooveBlueNote"/>
        <property name="IconThemeName" type="string" value="Adwaita"/>
      </property>
      <property name="Gtk" type="empty">
        <property name="FontName" type="string" value="DejaVu Sans 11"/>
        <property name="DecorationLayout" type="string" value="close,minimize,maximize:menu"/>
      </property>
    </channel>
    ''')

    # 11. CSS Styling for macOS top bar and windows
    css = '''
    @import url("resource:///org/gtk/libgtk/theme/Adwaita/gtk-contained-dark.css");
    @define-color theme_bg_color #141926;
    @define-color theme_fg_color #f4efe6;
    @define-color theme_selected_bg_color #d4af37;
    @define-color theme_selected_fg_color #0b0e17;

    window, dialog { background-color: #141926; color: #f4efe6; }
    button:checked, button.suggested-action { background: #d4af37; color: #0b0e17; }
    entry:focus { border-color: #d4af37; box-shadow: inset 0 0 0 1px #d4af37; }
    selection { background-color: #d4af37; color: #0b0e17; }

    .xfce4-panel {
        background-color: rgba(14, 18, 28, 0.90);
        border-bottom: 1px solid rgba(255, 255, 255, 0.14);
        color: #f4efe6;
    }
    .xfce4-panel button {
        border-radius: 4px;
        color: #f4efe6;
        background: transparent;
        box-shadow: none;
        border: none;
    }
    .xfce4-panel button:hover {
        background-color: rgba(255, 255, 255, 0.12);
    }
    .dim-label {
        color: #94a3b8;
    }
    '''
    put('/usr/share/themes/GrooveBlueNote/gtk-3.0/gtk.css', css)

    # 12. Populate Desktop Launchers in /home/groove/Desktop
    desktop_dir = root / 'home/groove/Desktop'
    desktop_dir.mkdir(parents=True, exist_ok=True)

    launchers = [
        ('groove-control-center.desktop', 'Centro de Control', '/usr/libexec/groove-control-center', '/usr/share/icons/groove-glass/system.png'),
        ('groove-installer.desktop', 'Instalar Linux Groove OS', '/usr/libexec/groove-installer-gui', '/usr/share/icons/groove-glass/installer.png'),
        ('firefox.desktop', 'Firefox ESR', '/usr/libexec/groove-browser', '/usr/share/icons/groove-glass/browser.png'),
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

    os.chown(desktop_dir, 1000, 1000)
    for f in desktop_dir.glob('*.desktop'):
        os.chown(f, 1000, 1000)
        f.chmod(0o755)
