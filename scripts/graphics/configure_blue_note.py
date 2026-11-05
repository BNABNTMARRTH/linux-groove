"""Shared Blue Note appearance and launch contracts for Weston and Wayfire."""
import os
from pathlib import Path
import subprocess
import textwrap

ASSETS = Path(__file__).resolve().parent / 'blue-note'
PREFIX = '/opt/groove-graphics'
APPLICATIONS = (
    ('terminal', 'Terminal', 'xfce4-terminal --disable-server --working-directory=/home/groove'),
    ('files', 'Archivos', 'thunar'),
    ('editor', 'Editor', 'mousepad'),
    ('browser', 'Firefox', 'firefox'),
)

def install(root, environment):
    def put(name, body, mode=0o644):
        target = root / name.lstrip('/')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(textwrap.dedent(body).lstrip())
        target.chmod(mode)

    # Preserve the caller's session environment, especially its D-Bus and Mesa.
    put('/usr/libexec/groove-launch', '#!/bin/sh\nset -eu\n' + environment + '''
label=$1
name=$2
shift 2
if [ "${XDG_SESSION_TYPE:-}" = x11 ]; then
    export GDK_BACKEND=x11
    export MOZ_ENABLE_WAYLAND=0
else
    export GDK_BACKEND=wayland,x11
    export MOZ_ENABLE_WAYLAND=1
fi
state="$HOME/.local/state/groove"
mkdir -p "$state"
log="$state/launch-$name.log"
cd "$HOME"
result=0
"$@" >> "$log" 2>&1 || result=$?
if [ "$result" -ne 0 ]; then
    printf 'Exit status: %s\\n' "$result" >> "$log"
    /opt/groove-graphics/bin/groove-launch-error "$label" "$log" || true
fi
exit "$result"
''', 0o755)
    for name, label, command in APPLICATIONS:
        put('/usr/libexec/groove-' + name,
            '#!/bin/sh\nexec /usr/libexec/groove-launch "' + label + '" ' + name +
            ' ' + PREFIX + '/bin/' + command + ' "$@"\n', 0o755)
        put('/usr/share/applications/groove-launcher-' + name + '.desktop', f'''
        [Desktop Entry]
        Type=Application
        Name={label}
        Exec=/usr/libexec/groove-{name}
        TryExec=/usr/libexec/groove-{name}
        Icon=/usr/share/icons/groove-glass/{name}.svg
        Terminal=false
        Categories=Utility;
        ''')
    put('/usr/libexec/groove-system-status', '''#!/bin/sh
set -eu
total=0; available=0
while read -r key value rest; do
    case "$key" in MemTotal:) total=$value;; MemAvailable:) available=$value;; esac
done < /proc/meminfo
used=$(( (total - available) / 1024 ))
read -r _ user nice system idle iowait irq softirq steal rest < /proc/stat
ticks=$((user + nice + system + idle + iowait + irq + softirq + steal))
idle=$((idle + iowait))
usage=0
cache="$XDG_RUNTIME_DIR/groove-cpu-sample"
if [ -r "$cache" ]; then
    read -r previous previous_idle < "$cache"
    delta=$((ticks - previous))
    [ "$delta" -le 0 ] || usage=$((100 * (delta - idle + previous_idle) / delta))
fi
printf '%s %s\\n' "$ticks" "$idle" > "$cache"
link='Sin enlace'
for dev in /sys/class/net/*; do
    [ "${dev##*/}" = lo ] && continue
    read -r status < "$dev/operstate"
    [ "$status" != up ] || link='Red conectada'
done
printf '{"text":"%s","tooltip":"CPU %s%% · RAM %s MiB de %s MiB"}\\n' "$link" "$usage" "$used" "$((total / 1024))"
''', 0o755)
    put('/usr/libexec/groove-weston-logout', '''#!/bin/sh
set -eu
[ -d "$XDG_RUNTIME_DIR" ] && [ -O "$XDG_RUNTIME_DIR" ] || exit 1
read -r compositor < "$XDG_RUNTIME_DIR/groove-weston.pid"
case "$compositor" in ''|*[!0-9]*) exit 1;; esac
read -r name < "/proc/$compositor/comm"
[ "$name" = weston ] || exit 1
kill -TERM "$compositor"
''', 0o755)
    put('/usr/libexec/groove-system-info', '''#!/bin/sh
exec /usr/libexec/groove-terminal --title="Groove · Sistema" --command=/usr/bin/groove-sysinfo
''', 0o755)
    put('/usr/libexec/groove-control-center', '''#!/bin/sh
exec /usr/libexec/groove-launch "Control" control /opt/groove-graphics/bin/groove-control-center "$@"
''', 0o755)
    put('/usr/libexec/groove-installer-gui', '''#!/bin/sh
exec /opt/groove-graphics/bin/xfce4-terminal --title="Instalador de Linux Groove OS" --geometry=100x30 -e /usr/bin/groove-installer "$@"
''', 0o755)
    # Old wallpaper actions did not change anything; do not expose empty actions.
    for name in ('motion', 'wallpaper', 'system'):
        (root / f'usr/share/applications/groove-launcher-{name}.desktop').unlink(missing_ok=True)
    converter = root / PREFIX.lstrip('/') / 'bin/rsvg-convert'
    env = os.environ.copy()
    env['LD_LIBRARY_PATH'] = str(root / PREFIX.lstrip('/') / 'lib')
    for svg in sorted((ASSETS / 'icons').glob('*.svg')):
        put('/usr/share/icons/groove-glass/' + svg.name, svg.read_text())
        if converter.exists():
            for size, suffix in ((48, ''), (96, '@2x')):
                dest = root / f'usr/share/icons/groove-glass/{svg.stem}{suffix}.png'
                subprocess.run([str(converter), '-w', str(size), '-h', str(size),
                    str(svg), '-o', str(dest)], env=env, check=True)
                dest.chmod(0o644)
    prompt = "export PS1='\\[\\033[38;5;180m\\]groove\\[\\033[0m\\] \\w \\$ '\n"
    put('/etc/profile.d/groove-prompt.sh', prompt)
    put('/home/groove/.bashrc', prompt + "alias ll='ls -la --color=auto'\n")
    put('/etc/xdg/xfce4/terminal/terminalrc', '''
    [Configuration]
    FontName=DejaVu Sans Mono 11
    ColorForeground=#e8e6e0
    ColorBackground=#15181e
    ColorCursor=#d4af37
    BackgroundMode=TERMINAL_BACKGROUND_SOLID
    MiscMenubarDefault=FALSE
    MiscToolbarDefault=FALSE
    MiscDefaultWorkingDir=/home/groove
    TitleMode=TERMINAL_TITLE_HIDE
    MiscDefaultGeometry=96x26
    ''')
    put('/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-terminal.xml', '''
    <?xml version="1.0" encoding="UTF-8"?>
    <channel name="xfce4-terminal" version="1.0">
      <property name="background-mode" type="string" value="TERMINAL_BACKGROUND_SOLID"/>
      <property name="color-foreground" type="string" value="#e8e6e0"/>
      <property name="color-background" type="string" value="#15181e"/>
      <property name="color-cursor" type="string" value="#d4af37"/>
      <property name="title-mode" type="string" value="TERMINAL_TITLE_HIDE"/>
      <property name="font-name" type="string" value="DejaVu Sans Mono 11"/>
      <property name="misc-default-geometry" type="string" value="96x26"/>
      <property name="misc-menubar-default" type="bool" value="false"/>
      <property name="misc-toolbar-default" type="bool" value="false"/>
    </channel>
    ''')
    put('/usr/share/gtksourceview-4/styles/groove.xml', '''
    <?xml version="1.0" encoding="UTF-8"?>
    <style-scheme id="groove" name="Groove Blue Note" version="1.0">
      <author>Linux Groove</author>
      <style name="text" foreground="#e8e6e0" background="#15181e"/>
      <style name="selection" foreground="#ffffff" background="#78683c"/>
      <style name="cursor" foreground="#d4af37"/>
      <style name="current-line" background="#20242b"/>
      <style name="line-numbers" foreground="#a6abb3" background="#191d23"/>
      <style name="def:comment" foreground="#a6abb3"/>
      <style name="def:keyword" foreground="#c3ad77"/>
      <style name="def:string" foreground="#9dbbc5"/>
    </style-scheme>
    ''')
    schemas = root / PREFIX.lstrip('/') / 'share/glib-2.0/schemas'
    if (schemas / 'org.xfce.mousepad.gschema.xml').exists():
        put(PREFIX + '/share/glib-2.0/schemas/60-groove-mousepad.gschema.override', '''
        [org.xfce.mousepad.preferences.view]
        color-scheme='groove'
        ''')
        subprocess.run([str(root / PREFIX.lstrip('/') / 'bin/glib-compile-schemas'),
            str(schemas)], env=env, check=True)
    if (root / PREFIX.lstrip('/') / 'lib/firefox').exists():
        put(PREFIX + '/lib/firefox/defaults/pref/groove.js', '''
        // Let GTK/Wayfire supply the titlebar; keep the browser's own tab strip.
        pref("browser.tabs.inTitlebar", 0);
        pref("browser.startup.homepage", "about:blank");
        pref("browser.startup.homepage_override.mstone", "ignore");
        pref("browser.newtabpage.activity-stream.showSponsored", false);
        pref("browser.newtabpage.activity-stream.showSponsoredTopSites", false);
        pref("browser.shell.checkDefaultBrowser", false);
        ''')
    put('/usr/share/themes/GrooveBlueNote/gtk-3.0/gtk.css', '''
    @import url("resource:///org/gtk/libgtk/theme/Adwaita/gtk-contained-dark.css");
    @define-color theme_bg_color #20242b;
    @define-color theme_fg_color #e8e6e0;
    @define-color theme_selected_bg_color #78683c;
    @define-color theme_selected_fg_color #ffffff;
    window, dialog { background: #20242b; color: #e8e6e0; }
    headerbar, menubar, toolbar { background: #20242b; color: #e8e6e0; box-shadow: none; }
    headerbar { border-radius: 12px 12px 0 0; min-height: 32px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    headerbar .title { font-size: 11pt; font-weight: 600; color: #f4efe6; }
    headerbar button.titlebutton {
        padding: 0;
        margin: 0 4px;
        min-width: 14px;
        min-height: 14px;
        border-radius: 7px;
        border: none;
    }
    headerbar button.titlebutton.close { background-color: #FF5F56; color: transparent; }
    headerbar button.titlebutton.close:hover { background-color: #FF5F56; color: #4C0002; }
    headerbar button.titlebutton.minimize { background-color: #FFBD2E; color: transparent; }
    headerbar button.titlebutton.minimize:hover { background-color: #FFBD2E; color: #593A00; }
    headerbar button.titlebutton.maximize { background-color: #27C93F; color: transparent; }
    headerbar button.titlebutton.maximize:hover { background-color: #27C93F; color: #00400C; }
    decoration { border-radius: 12px; box-shadow: 0 16px 36px rgba(0,0,0,0.50); }
    headerbar button { border-radius: 6px; }
    .view, treeview, textview, textview text, .terminal-screen { background: #15181e; color: #e8e6e0; }
    entry { background: #191d23; border-radius: 6px; }
    entry:focus, button:focus { border-color: #d4af37; }
    selection { background: #78683c; color: #ffffff; }
    ''')
    settings = root / 'etc/xdg/gtk-3.0/settings.ini'
    settings.write_text(settings.read_text() + 'gtk-decoration-layout=close,minimize,maximize:menu\n')
    # The session's compositor owns server decorations; no second frame is added.
    for desktop in ('wayland-sessions/weston.desktop', 'xsessions/groove-xfce.desktop'):
        path = root / 'usr/share' / desktop
        if path.exists():
            text = path.read_text().replace('Name=Weston\n', 'Name=Groove · Weston (recuperación)\n')
            path.write_text(text.replace('Name=Groove XFCE\n', 'Name=Groove · XFCE (X11)\n'))
