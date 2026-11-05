"""Install the optional Wayfire session without changing the verified default."""
import configparser
import os
import shutil
import subprocess
import textwrap
from pathlib import Path

PREFIX = '/opt/groove-wayfire'
ASSETS = Path(__file__).resolve().parent / 'wayfire'

def install(root, environment, service):
    def put(name, body, mode=0o644):
        p=root/name.lstrip('/'); p.parent.mkdir(parents=True,exist_ok=True)
        p.write_text(textwrap.dedent(body).lstrip()); p.chmod(mode)
    def script(name, body):
        put('/usr/libexec/'+name,'#!/bin/sh\nset -eu\n'+textwrap.dedent(body).lstrip(),0o755)
    for source,dest in [('wayfire.ini','wayfire/expressive.ini'),('wf-shell.ini','wf-shell.ini'),('dock.css','wayfire/dock.css'),('config.json','waybar/config.json'),('style.css','waybar/style.css')]:
        put('/etc/xdg/'+dest,(ASSETS/source).read_text())
    reduced=configparser.ConfigParser(interpolation=None)
    reduced.read(ASSETS/'wayfire.ini')
    reduced['core']['plugins']=' '.join(x for x in reduced['core']['plugins'].split() if x not in ('blur','animate','cube','wrot'))
    reduced['vswitch']['duration']='0'
    reduced['grid']['duration']='0'
    reduced['pixdecor']['shadow_radius']='0'
    import io
    buf=io.StringIO();reduced.write(buf);put('/etc/xdg/wayfire/reduced.ini',buf.getvalue())
    # Session-only paths select the isolated Mesa; Weston/XFCE keep their existing environment.
    env=environment.replace('export LIBGL_ALWAYS_SOFTWARE=1','unset LIBGL_ALWAYS_SOFTWARE').replace('export PATH=',f'export PATH={PREFIX}/bin:')
    env+=f'\nexport GSETTINGS_SCHEMA_DIR={PREFIX}/share/glib-2.0/schemas\nexport LD_LIBRARY_PATH={PREFIX}/lib:/opt/groove-graphics/lib\nexport LIBGL_DRIVERS_PATH={PREFIX}/lib/dri\nexport XDG_DATA_DIRS={PREFIX}/share:/opt/groove-graphics/share:/usr/local/share:/usr/share\n'
    script('groove-wayfire',env+'''
    export XDG_SESSION_TYPE=wayland XDG_CURRENT_DESKTOP=Wayfire LIBSEAT_BACKEND=seatd
    export WLR_BACKENDS=drm,libinput
    unset DISPLAY WAYLAND_DISPLAY WAYFIRE_SOCKET
    export XDG_RUNTIME_DIR=/run/user/$(id -u)
    [ -d "$XDG_RUNTIME_DIR" ] && [ -O "$XDG_RUNTIME_DIR" ] || exit 1
    if [ "${1:-}" = --fallback-weston ]; then
        mkdir -p "$HOME/.local/state/groove"
        if ! /opt/groove-wayfire/bin/groove-gpu-info > "$HOME/.local/state/groove/gpu-info.log" 2>&1; then
            echo 'GPU VirGL no acreditada; iniciando Weston de recuperación.' >&2
            unset LD_LIBRARY_PATH LIBGL_DRIVERS_PATH WLR_BACKENDS XDG_CURRENT_DESKTOP GSETTINGS_SCHEMA_DIR
            exec /usr/libexec/groove-weston
        fi
    fi
    waited=0
    xorg_active() {
        for process in /proc/[0-9]*/comm; do
            [ -r "$process" ] || continue
            read -r comm < "$process" || continue
            [ "$comm" != Xorg ] || return 0
        done
        return 1
    }
    while xorg_active; do
        [ "$waited" -lt 50 ] || { echo 'Xorg did not release the seat' >&2; exit 1; }
        sleep 0.1; waited=$((waited + 1))
    done
    export WAYFIRE_CONFIG_FILE="$XDG_RUNTIME_DIR/groove-wayfire.ini"
    cp /etc/xdg/wayfire/expressive.ini "$WAYFIRE_CONFIG_FILE"
    printf 'expressive\\n' > "$XDG_RUNTIME_DIR/groove-motion"
    unset DBUS_SESSION_BUS_ADDRESS
    exec dbus-run-session -- /usr/libexec/groove-wayfire-run
    ''')
    script('groove-wayfire-run',f'''
    mkdir -p "$HOME/.local/state/groove"
    # Ensure the entire compositor session is reaped when exiting or restarting.
    {PREFIX}/bin/wayfire --config "$WAYFIRE_CONFIG_FILE" > "$HOME/.local/state/groove/wayfire.log" 2>&1 &
    compositor=$!
    printf '%s\\n' "$compositor" > "$XDG_RUNTIME_DIR/groove-wayfire.pid"
    trap 'kill -TERM "$compositor" 2>/dev/null || true' TERM INT HUP
    result=0
    wait "$compositor" || result=$?
    if [ -f "$XDG_RUNTIME_DIR/groove-wayfire-shell.pid" ]; then
        read -r shell_pid < "$XDG_RUNTIME_DIR/groove-wayfire-shell.pid"
        case "$shell_pid" in ''|*[!0-9]*) ;; *) kill -TERM "$shell_pid" 2>/dev/null || true ;; esac
    fi
    kill -TERM "$compositor" 2>/dev/null || true
    wait "$compositor" 2>/dev/null || true
    rm -f "$XDG_RUNTIME_DIR/groove-wayfire.pid"
    exit "$result"
    ''')
    script('groove-wayfire-shell',f'''
    printf '%s\\n' "$$" > "$XDG_RUNTIME_DIR/groove-wayfire-shell.pid"
    children=""
    cleanup() {{
        trap - EXIT TERM INT HUP
        for child in $children; do kill -TERM "$child" 2>/dev/null || true; done
        wait 2>/dev/null || true
        rm -f "$XDG_RUNTIME_DIR/groove-wayfire-shell.pid"
    }}
    trap cleanup EXIT
    trap 'exit 0' TERM INT HUP
    {PREFIX}/bin/wf-background --config /etc/xdg/wf-shell.ini &
    children="$children $!"
    {PREFIX}/bin/wf-dock --config /etc/xdg/wf-shell.ini &
    children="$children $!"
    {PREFIX}/bin/waybar --config /etc/xdg/waybar/config.json --style /etc/xdg/waybar/style.css &
    children="$children $!"
    wait
    ''')
    script('groove-wayfire-logout','''
    # Only this user's Wayfire compositor; LightDM takes over after it exits.
    [ -d "$XDG_RUNTIME_DIR" ] && [ -O "$XDG_RUNTIME_DIR" ] || exit 1
    read -r compositor < "$XDG_RUNTIME_DIR/groove-wayfire.pid"
    case "$compositor" in ''|*[!0-9]*) exit 1 ;; esac
    kill -TERM "$compositor"
    ''')
    script('groove-motion-toggle','''
    [ "${XDG_CURRENT_DESKTOP:-}" = Wayfire ] || exit 1
    [ -d "$XDG_RUNTIME_DIR" ] && [ -O "$XDG_RUNTIME_DIR" ] || exit 1
    mode=expressive
    [ "$(cat "$XDG_RUNTIME_DIR/groove-motion" 2>/dev/null)" != expressive ] || mode=reduced
    tmp=$(mktemp "$XDG_RUNTIME_DIR/groove-wayfire.XXXXXX")
    cp "/etc/xdg/wayfire/$mode.ini" "$tmp"
    mv "$tmp" "$XDG_RUNTIME_DIR/groove-wayfire.ini"
    printf '%s\\n' "$mode" > "$XDG_RUNTIME_DIR/groove-motion"
    ''')
    script('groove-motion-status','''
    mode=$(cat "$XDG_RUNTIME_DIR/groove-motion" 2>/dev/null || true)
    if [ "$mode" = reduced ]; then
        printf '%s\\n' '{"text":"Reducido","tooltip":"Movimiento reducido · clic para activar efectos 3D"}'
    else
        printf '%s\\n' '{"text":"3D","tooltip":"Efectos expresivos · clic para reducir movimiento"}'
    fi
    ''')
    script('groove-network-status','''
    for dev in /sys/class/net/*; do
        [ "${dev##*/}" != lo ] || continue
        [ "$(cat "$dev/operstate")" = up ] && { echo 'Red conectada'; exit; }
    done
    echo 'Sin enlace'
    ''')
    put('/usr/share/wayland-sessions/groove-wayfire.desktop','[Desktop Entry]\nName=Groove · Wayfire (Blue Note)\nExec=/usr/libexec/groove-wayfire\nTryExec=/opt/groove-wayfire/bin/wayfire\nType=Application\nDesktopNames=Wayfire;\n')
    schema_dir=root/'opt/groove-wayfire/share/glib-2.0/schemas'
    if schema_dir.is_dir():
        put('/opt/groove-wayfire/share/glib-2.0/schemas/50-groove.gschema.override','''
        [org.gnome.desktop.interface]
        font-name='DejaVu Sans 11'
        monospace-font-name='DejaVu Sans Mono 11'
        gtk-theme='GrooveBlueNote'
        icon-theme='Adwaita'
        color-scheme='prefer-dark'
        [org.gnome.desktop.wm.preferences]
        button-layout=':minimize,maximize,close'
        ''')
        tool_env=os.environ.copy()
        tool_env['LD_LIBRARY_PATH']=str(root/'opt/groove-graphics/lib')
        subprocess.run([str(root/'opt/groove-graphics/bin/glib-compile-schemas'),str(schema_dir)],env=tool_env,check=True)
    # pixdecor loads these PNG paths directly; supply original vector controls.
    converter=root/'opt/groove-graphics/bin/rsvg-convert'
    if converter.is_file():
        controls={
            'close':'<path d="M5 5L11 11M11 5L5 11"/>',
            'maximize':'<rect x="4.5" y="4.5" width="7" height="7" rx="1"/>',
            'minimize':'<path d="M4.5 10.5H11.5"/>',
        }
        for name,drawing in controls.items():
            svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><g fill="none" stroke="#f4efe6" stroke-width="1.5" stroke-linecap="round">{drawing}</g></svg>'
            asset='/usr/share/icons/groove-controls/'+name+'.svg'
            put(asset,svg)
            for size in (16,24,32,48):
                dest=root/f'usr/share/icons/Adwaita/{size}x{size}/ui/window-{name}-symbolic.symbolic.png'
                dest.parent.mkdir(parents=True,exist_ok=True)
                tool_env=os.environ.copy();tool_env['LD_LIBRARY_PATH']=str(root/'opt/groove-graphics/lib')
                subprocess.run([str(converter),'-w',str(size),'-h',str(size),str(root/asset.lstrip('/')),'-o',str(dest)],env=tool_env,check=True)
                dest.chmod(0o644)
    target=root/'etc/groove/wayfire-services'; target.mkdir(parents=True,exist_ok=True)
    for manifest in (root/'etc/groove/wayland-services').glob('*.toml'):
        if manifest.name!='weston.toml':shutil.copy2(manifest,target/manifest.name)
    # The root coordinator drops all user identity before the compositor starts.
    # After its clean exit, it becomes LightDM, which needs root to manage VTs.
    put('/etc/groove/wayfire-services/wayfire.toml',service('wayfire','/opt/groove-graphics/bin/groove-desktop',requires=['dbus','device-trigger','seatd'],user='root',group='root',restart='on-failure'))
