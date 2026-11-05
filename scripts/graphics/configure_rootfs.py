#!/usr/bin/env python3
"""Install session configuration into a *staging copy* of the LFS rootfs."""
import argparse, os, shutil, subprocess, textwrap
from pathlib import Path
PREFIX='/opt/groove-graphics'
def main():
    ap=argparse.ArgumentParser();ap.add_argument('root',type=Path);a=ap.parse_args();root=a.root.resolve()
    if root==Path('/') or not (root/'etc/os-release').exists():raise SystemExit('Expected an extracted Groove staging root, never /')
    def put(name,body,mode=0o644):
        dest=root/name.lstrip('/');dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(textwrap.dedent(body).lstrip());dest.chmod(mode)
    def script(name,body): put('/usr/libexec/'+name,'#!/bin/sh\nset -eu\n'+textwrap.dedent(body).lstrip(),0o755)
    def account(file,entries):
        path=root/'etc'/file;lines=path.read_text().splitlines() if path.exists() else []
        keys={line.split(':')[0] for line in entries};lines=[line for line in lines if line.split(':')[0] not in keys];path.write_text('\n'.join(lines+entries)+'\n')
    put('/etc/os-release','NAME="Linux Groove OS"\nPRETTY_NAME="Linux Groove OS 0.2.0 — Blue Note Desktop Preview"\nID=groove\nID_LIKE=lfs\nVERSION_ID=0.2.0\nVERSION_CODENAME=blue-note\n')
    account('passwd',['root:x:0:0:root:/root:/bin/bash','messagebus:x:18:18:System D-Bus:/run/dbus:/bin/false','lightdm:x:65:65:LightDM:/var/lib/lightdm:/bin/false','groove:x:1000:1000:Groove Artist:/home/groove:/bin/bash'])
    account('group',['root:x:0:','tty:x:5:','cdrom:x:15:','video:x:12:groove,lightdm','messagebus:x:18:','input:x:24:groove,lightdm','lightdm:x:65:','render:x:107:groove,lightdm','kvm:x:108:','sgx:x:109:','groove:x:1000:'])
    account('shadow',['root:!:1:0:99999:7:::','messagebus:!:1:0:99999:7:::','lightdm:!:1:0:99999:7:::','groove:!:1:0:99999:7:::'])
    (root/'etc/shadow').chmod(0o600)
    dbus_minimal='<!DOCTYPE busconfig PUBLIC "-//freedesktop//DTD D-Bus Bus Configuration 1.0//EN"\n "http://www.freedesktop.org/standards/dbus/1.0/busconfig.dtd">\n<busconfig></busconfig>\n'
    put('/etc/dbus-1/system.conf',dbus_minimal)
    put('/etc/dbus-1/session.conf',dbus_minimal)
    dbus_sysd=root/PREFIX.lstrip('/')/'share/dbus-1/system.d'
    if dbus_sysd.exists():
        for conf in dbus_sysd.glob('*.conf'):
            put(f'/etc/dbus-1/system.d/{conf.name}',conf.read_text())
    put('/etc/nsswitch.conf','passwd: files\ngroup: files\nshadow: files\nhosts: files dns\nnetworks: files\n')
    put('/etc/login.defs','ENV_PATH PATH=/opt/groove-graphics/bin:/opt/groove-graphics/sbin:/usr/bin:/bin\nLOGIN_RETRIES 3\nFAIL_DELAY 2\nDEFAULT_HOME yes\nUID_MIN 1000\nGID_MIN 1000\n')
    put('/etc/ld.so.conf','include /etc/ld.so.conf.d/*.conf\n/usr/lib\n/lib\n')
    put('/etc/ld.so.conf.d/groove-graphics.conf',f'{PREFIX}/lib\n{PREFIX}/lib/weston\n{PREFIX}/lib/firefox\n')
    profile=root/'etc/profile'
    if not profile.exists():put('/etc/profile','for script in /etc/profile.d/*.sh; do [ ! -r "$script" ] || . "$script"; done\n')
    put('/etc/profile.d/groove-graphics.sh',f'export PATH={PREFIX}/bin:{PREFIX}/sbin:$PATH\nexport XDG_DATA_DIRS={PREFIX}/share:/usr/local/share:/usr/share\n')
    environment=f'''
    export PATH={PREFIX}/bin:{PREFIX}/sbin:/usr/bin:/usr/sbin:/bin:/sbin
    export XDG_DATA_DIRS={PREFIX}/share:/usr/local/share:/usr/share
    export XDG_CONFIG_DIRS=/etc/xdg:{PREFIX}/etc/xdg
    export GSETTINGS_SCHEMA_DIR={PREFIX}/share/glib-2.0/schemas
    export FONTCONFIG_FILE={PREFIX}/etc/fonts/fonts.conf
    export GDK_PIXBUF_MODULE_FILE={PREFIX}/lib/gdk-pixbuf-2.0/2.10.0/loaders.cache
    export SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
    if [ "${{XDG_CURRENT_DESKTOP:-}}" = Wayfire ]; then
        export PATH=/opt/groove-wayfire/bin:$PATH
        export XDG_DATA_DIRS=/opt/groove-wayfire/share:$XDG_DATA_DIRS
        export GSETTINGS_SCHEMA_DIR=/opt/groove-wayfire/share/glib-2.0/schemas
        unset LIBGL_ALWAYS_SOFTWARE
    else
        export LIBGL_ALWAYS_SOFTWARE=1
    fi
    export GTK_THEME=GrooveBlueNote
    export LANG=es_MX.UTF-8
    '''
    script('groove-session-wrapper',environment+'''
    export XDG_RUNTIME_DIR=/run/user/$(id -u)
    [ -d "$XDG_RUNTIME_DIR" ] && [ -O "$XDG_RUNTIME_DIR" ] || exit 1
    # Wayfire owns the same bus lifecycle in standalone and LightDM modes.
    if [ "${1:-}" = /usr/libexec/groove-wayfire ]; then exec "$@"; fi
    unset DBUS_SESSION_BUS_ADDRESS
    exec dbus-run-session -- "$@"
    ''')
    script('groove-xfce','export XDG_SESSION_TYPE=x11\nexport XDG_CURRENT_DESKTOP=XFCE\nexec '+PREFIX+'/bin/startxfce4\n')
    script('groove-weston',environment+f'''
    export XDG_SESSION_TYPE=wayland
    export XDG_CURRENT_DESKTOP=Weston
    export LIBSEAT_BACKEND=seatd
    export XDG_RUNTIME_DIR=/run/user/$(id -u)
    if [ ! -d "$XDG_RUNTIME_DIR" ]; then
        mkdir -p "$XDG_RUNTIME_DIR"
        chmod 0700 "$XDG_RUNTIME_DIR"
    fi
    waited=0
    while pidof Xorg >/dev/null 2>&1 && [ "$waited" -lt 50 ]; do
        sleep 0.1
        waited=$((waited + 1))
    done
    printf '%s\\n' "$$" > "$XDG_RUNTIME_DIR/groove-weston.pid"
    exec {PREFIX}/bin/weston --backend=drm --renderer=pixman --config=/etc/xdg/weston/weston.ini
    ''')
    script('groove-greeter',environment+f'exec {PREFIX}/sbin/lightdm-gtk-greeter\n')
    script('groove-xserver',f'exec {PREFIX}/bin/Xorg -logfile /var/log/lightdm/x-0.log -modulepath {PREFIX}/lib/xorg/modules -nolisten tcp "$@"\n')
    script('groove-live-access','''
    case "${PAM_SERVICE:-}" in lightdm|login) ;; *) exit 1 ;; esac
    [ "${PAM_USER:-}" = groove ] || exit 1
    marker=/run/groove/live
    [ -f "$marker" ] && [ ! -L "$marker" ] || exit 1
    [ "$(/usr/bin/stat -c %u "$marker")" = 0 ] || exit 1
    IFS= read -r value < "$marker"
    [ "$value" = LINUX_GROOVE_LIVE ]
    ''')
    pam=f'''
    auth [success=done default=ignore] {PREFIX}/lib/security/pam_exec.so quiet /usr/libexec/groove-live-access
    auth required {PREFIX}/lib/security/pam_unix.so
    account required {PREFIX}/lib/security/pam_unix.so
    password required {PREFIX}/lib/security/pam_unix.so
    session required {PREFIX}/lib/security/pam_unix.so
    '''
    put('/etc/pam.d/lightdm',pam);put('/etc/pam.d/login',pam)
    put('/etc/pam.d/lightdm-greeter',f'''
    auth required {PREFIX}/lib/security/pam_permit.so
    account required {PREFIX}/lib/security/pam_permit.so
    session required {PREFIX}/lib/security/pam_unix.so
    ''')
    put('/etc/lightdm/lightdm.conf','''
    [LightDM]
    minimum-vt=1
    logind-check-graphical=false
    start-default-seat=true
    sessions-directory=/usr/share/xsessions:/usr/share/wayland-sessions
    greeters-directory=/usr/share/xgreeters
    [Seat:*]
    greeter-session=groove-greeter
    user-session=groove-xfce
    greeter-hide-users=false
    greeter-show-manual-login=false
    allow-guest=false
    session-wrapper=/usr/libexec/groove-session-wrapper
    xserver-command=/usr/libexec/groove-xserver
    pam-service=lightdm
    pam-greeter-service=lightdm-greeter
    ''')
    put('/etc/lightdm/users.conf','[UserList]\nminimum-uid=1000\nhidden-users=root lightdm messagebus\nhidden-shells=/bin/false /usr/sbin/nologin\n')
    put('/etc/lightdm/lightdm-gtk-greeter.conf','''
    [greeter]
    background=/usr/share/backgrounds/groove-blue-note.png
    theme-name=GrooveBlueNote
    icon-theme-name=Adwaita
    font-name=DejaVu Sans 12
    hide-user-image=true
    default-user-image=#avatar-default
    indicators=~session;~spacer;~clock;~power
    clock-format=%H:%M
    position=50%,center 50%,center
    ''')
    for path,name,exec_ in [('xsessions/groove-xfce.desktop','Groove XFCE','/usr/libexec/groove-xfce'),('wayland-sessions/weston.desktop','Weston','/usr/libexec/groove-weston'),('xgreeters/groove-greeter.desktop','Groove Blue Note','/usr/libexec/groove-greeter')]:
        put('/usr/share/'+path,f'[Desktop Entry]\nName={name}\nComment=Linux Groove OS\nExec={exec_}\nTryExec={exec_}\nType=Application\nDesktopNames={"XFCE" if "xfce" in path else "Weston"};\n')
    put('/etc/X11/xorg.conf',f'''
    Section "Device"
        Identifier "VirtIO"
        Driver "modesetting"
        Option "AccelMethod" "none"
    EndSection
    Section "InputClass"
        Identifier "Groove input"
        MatchDevicePath "/dev/input/event*"
        Driver "libinput"
    EndSection
    Section "Files"
        ModulePath "{PREFIX}/lib/xorg/modules"
    EndSection
    ''')
    put('/etc/udev/rules.d/70-groove-input.rules','SUBSYSTEM=="input", GROUP="input", MODE="0660"\nSUBSYSTEM=="drm", GROUP="video", MODE="0660"\nKERNEL=="renderD*", GROUP="render", MODE="0660"\n')
    put('/etc/xdg/weston/weston.ini',f'''
    [core]
    idle-time=0
    xwayland=false

    [shell]
    background-image=/usr/share/backgrounds/groove-default.png
    background-type=scale-crop
    background-color=0xff000000
    panel-color=0xbb0e121c
    panel-position=top
    clock-format=minutes-24h
    locking=false

    [launcher]
    icon=/usr/share/icons/groove-glass/terminal@2x.png
    path=/usr/libexec/groove-terminal
    displayname=Terminal

    [launcher]
    icon=/usr/share/icons/groove-glass/files@2x.png
    path=/usr/libexec/groove-files
    displayname=Archivos

    [launcher]
    icon=/usr/share/icons/groove-glass/editor@2x.png
    path=/usr/libexec/groove-editor
    displayname=Editor

    [launcher]
    icon=/usr/share/icons/groove-glass/browser@2x.png
    path=/usr/libexec/groove-browser
    displayname=Navegador

    ''')
    script('groove-files',environment+f'''
    export GDK_BACKEND=wayland,x11
    exec {PREFIX}/bin/thunar "$@"
    ''')
    script('groove-editor',environment+f'''
    export GDK_BACKEND=wayland,x11
    exec {PREFIX}/bin/mousepad "$@"
    ''')
    script('groove-browser',environment+f'''
    export MOZ_ENABLE_WAYLAND=1
    export GDK_BACKEND=wayland,x11
    exec {PREFIX}/bin/firefox "$@"
    ''')
    script('groove-wallpaper-next','''
    current_bg=/usr/share/backgrounds/groove-default.png
    bg_dir=/usr/share/backgrounds
    bgs=("$bg_dir"/*.png)
    [ ${#bgs[@]} -gt 0 ] || exit 0
    echo "Wallpapers available in /usr/share/backgrounds"
    ''')
    script('groove-system-info',environment+f'''
    exec {PREFIX}/bin/weston-terminal --title="Linux Groove System Specs" --shell=/usr/bin/groove-sysinfo
    ''')
    put('/usr/bin/groove-sysinfo','''#!/bin/sh
    clear
    printf "\\033[38;5;214m"
    cat <<'EOF'
      _     ___ _   _ _   ___  __   ____ ____   ___   _____     _______ 
     | |   |_ _| \ | | | | \ \/ /  / ___|  _ \ / _ \ / _ \ \   / / ____|
     | |    | ||  \| | | | |\  /  | |  _| |_) | | | | | | \ \ / /|  _|  
     | |___ | || |\  | |_| |/  \  | |_| |  _ <| |_| | |_| |\ V / | |___ 
     |_____|___|_| \_|\___//_/\_\  \____|_| \_\\___/ \___/  \_/  |_____|
                         🎷 BLUE NOTE GLASS EDITION 0.2.0
EOF
    printf "\\033[38;5;75m\\n"
    echo "  ================================================================"
    printf "\\033[38;5;255m"
    echo "   OS:          Linux Groove OS 0.2.0 (aarch64)"
    echo "   Kernel:      $(uname -r)"
    echo "   Display:     ${XDG_CURRENT_DESKTOP:-consola} (${XDG_SESSION_TYPE:-tty})"
    echo "   Theme:       Groove Blue Note Glass"
    total=0; available=0
    while read -r key value rest; do
        case "$key" in MemTotal:) total=$value ;; MemAvailable:) available=$value ;; esac
    done < /proc/meminfo
    echo "   RAM:         $(((total - available) / 1024)) / $((total / 1024)) MiB"
    echo "   CPU:         $(uname -m)"
    printf "\\033[38;5;75m"
    echo "  ================================================================"
    printf "\\033[38;5;214m\\n  Presiona Enter para cerrar esta ventana...\\033[0m"
    read -r _
    ''',0o755)
    prompt_str = "export PS1='\\[\\033[38;5;214m\\]╭─ ♬ groove@bluenote \\[\\033[38;5;75m\\][\\w]\\[\\033[0m\\]\\n\\[\\033[38;5;214m\\]╰─❯ \\[\\033[0m\\] '\n"
    put('/etc/profile.d/groove-prompt.sh', prompt_str)
    put('/home/groove/.bashrc', prompt_str + "alias ll='ls -la --color=auto'\n")
    put('/root/.bashrc', prompt_str + "alias ll='ls -la --color=auto'\n")
    put('/usr/share/backgrounds/groove-blue-note.svg','''
    <svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
      <rect width="1920" height="1080" fill="#0b0e17"/>
      <g fill="none" stroke="#202638" stroke-width="2">
        <circle cx="1490" cy="550" r="430"/><circle cx="1490" cy="550" r="400"/>
        <circle cx="1490" cy="550" r="370"/><circle cx="1490" cy="550" r="340"/>
        <circle cx="1490" cy="550" r="310"/><circle cx="1490" cy="550" r="280"/>
      </g>
      <circle cx="1490" cy="550" r="115" fill="#141926" stroke="#d4af37" stroke-width="2"/>
      <circle cx="1490" cy="550" r="9" fill="#d4af37"/>
      <path d="M130 420h80" stroke="#d4af37" stroke-width="6"/>
      <text x="130" y="515" font-family="DejaVu Sans,sans-serif" font-size="64" font-weight="bold" fill="#f4efe6">LINUX GROOVE</text>
      <text x="134" y="565" font-family="DejaVu Sans,sans-serif" font-size="22" letter-spacing="5" fill="#d4af37">THE BLUE NOTE EDITION</text>
      <text x="134" y="945" font-family="DejaVu Sans,sans-serif" font-size="17" fill="#94a3b8">A space for sound, code and creation.</text>
    </svg>
    ''')
    svg_bg=root/'usr/share/backgrounds/groove-blue-note.svg'
    png_bg=root/'usr/share/backgrounds/groove-blue-note.png'
    rsvg=root/PREFIX.lstrip('/')/'bin/rsvg-convert'
    if rsvg.exists():
        rsvg_env=os.environ.copy()
        rsvg_env['LD_LIBRARY_PATH']=str(root/PREFIX.lstrip('/')/'lib')
        subprocess.run([str(rsvg),'-w','1920','-h','1080','-f','png',str(svg_bg),'-o',str(png_bg)],env=rsvg_env,check=False)
    for extra_bg_dir in [Path('/workspace/backgrouds_groove'),Path('/workspace/backgrounds_groove')]:
        if extra_bg_dir.exists():
            for bg in extra_bg_dir.glob('*.png'):
                if not bg.name.startswith('._'):
                    shutil.copy2(bg,root/'usr/share/backgrounds'/bg.name)
    # Resolve relative to the repository, never an incidental builder mount.
    # Always replace the old default when repackaging an existing staging root.
    src_default = Path(__file__).resolve().parents[2]/'backgrouds_groove/groove-piano-background-4k.png'
    if not src_default.is_file():
        raise SystemExit('Missing required Groove piano wallpaper: '+str(src_default))
    shutil.copy2(src_default, root/'usr/share/backgrounds'/src_default.name)
    shutil.copy2(src_default, root/'usr/share/backgrounds/groove-default.png')
    # Source files on the host ExFAT disk may be 0700; desktop assets must be readable by groove.
    for background in (root/'usr/share/backgrounds').glob('*'):
        if background.is_file():background.chmod(0o644)
    css='''
    @import url("resource:///org/gtk/libgtk/theme/Adwaita/gtk-contained-dark.css");
    @define-color theme_bg_color #141926;
    @define-color theme_fg_color #f4efe6;
    @define-color theme_selected_bg_color #d4af37;
    @define-color theme_selected_fg_color #0b0e17;
    window, dialog { background-color: #141926; color: #f4efe6; }
    button:checked, button.suggested-action { background: #d4af37; color: #0b0e17; }
    entry:focus { border-color: #d4af37; box-shadow: inset 0 0 0 1px #d4af37; }
    selection { background-color: #d4af37; color: #0b0e17; }
    '''
    put('/usr/share/themes/GrooveBlueNote/gtk-3.0/gtk.css',css)
    put('/etc/xdg/gtk-3.0/settings.ini','[Settings]\ngtk-theme-name=GrooveBlueNote\ngtk-icon-theme-name=Adwaita\ngtk-font-name=DejaVu Sans 11\ngtk-application-prefer-dark-theme=true\n')
    put('/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xsettings.xml','''
    <?xml version="1.0" encoding="UTF-8"?>
    <channel name="xsettings" version="1.0"><property name="Net" type="empty"><property name="ThemeName" type="string" value="GrooveBlueNote"/><property name="IconThemeName" type="string" value="Adwaita"/></property><property name="Gtk" type="empty"><property name="FontName" type="string" value="DejaVu Sans 11"/></property></channel>
    ''')
    put('/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml','''
    <?xml version="1.0" encoding="UTF-8"?>
    <channel name="xfce4-desktop" version="1.0"><property name="backdrop" type="empty"><property name="screen0" type="empty"><property name="monitorVirtual-1" type="empty"><property name="workspace0" type="empty"><property name="last-image" type="string" value="/usr/share/backgrounds/groove-blue-note.png"/><property name="image-style" type="int" value="5"/></property></property></property></property></channel>
    ''')
    put('/usr/share/applications/firefox.desktop',f'[Desktop Entry]\nName=Firefox ESR\nComment=Navegador compilado desde fuentes\nExec={PREFIX}/bin/firefox %u\nIcon=firefox\nTerminal=false\nType=Application\nCategories=Network;WebBrowser;\nMimeType=text/html;x-scheme-handler/http;x-scheme-handler/https;\n')
    put('/etc/xdg/mimeapps.list','[Default Applications]\ntext/html=firefox.desktop\nx-scheme-handler/http=firefox.desktop\nx-scheme-handler/https=firefox.desktop\n')
    put('/etc/xdg/xfce4/helpers.rc','WebBrowser=firefox\nTerminalEmulator=xfce4-terminal\nFileManager=Thunar\n')
    for icon in (root/PREFIX.lstrip('/')/'lib').glob('firefox*/browser/chrome/icons/default/default128.png'):
        dest=root/'usr/share/icons/hicolor/128x128/apps/firefox.png'
        dest.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(icon,dest)
        break
    put('/etc/dhcpcd.conf','hostname linux-groove\noption domain_name_servers, domain_name, domain_search\noption classless_static_routes\nrequire dhcp_server_identifier\nnoipv4ll\n')
    script('groove-runtime',f'''
    mkdir -p /run/dbus /run/user/1000 /run/lightdm /run/lightdm/root /var/lib/lightdm /var/lib/lightdm-data /var/cache/lightdm /var/log/lightdm /var/lib/xkb /var/lib/dhcpcd /var/lib/dbus /var/cache/fontconfig /tmp/.X11-unix /tmp/.ICE-unix {PREFIX}/var/log
    chmod 1777 /tmp /tmp/.X11-unix /tmp/.ICE-unix
    chown 1000:1000 /run/user/1000 /home/groove
    chmod 0700 /run/user/1000
    chown 18:18 /run/dbus
    chown -R 65:65 /var/lib/lightdm /var/cache/lightdm /var/log/lightdm /var/lib/lightdm-data /run/lightdm
    chmod 0755 /var/log/lightdm
    chmod 0750 /var/lib/lightdm /var/cache/lightdm
    chmod 0711 /var/lib/lightdm-data
    chmod 0777 {PREFIX}/var/log
    [ -e /usr/bin/xkbcomp ] || ln -sfn {PREFIX}/bin/xkbcomp /usr/bin/xkbcomp
    [ -e {PREFIX}/var ] || ln -sfn /var {PREFIX}/var
    {PREFIX}/bin/dbus-uuidgen --ensure=/etc/machine-id
    {PREFIX}/bin/dbus-uuidgen --ensure=/var/lib/dbus/machine-id
    ''')
    script('groove-device-trigger',f'{PREFIX}/bin/udevadm trigger --action=add\n{PREFIX}/bin/udevadm settle --timeout=15\n')
    daemon_env=f'PATH = "{PREFIX}/bin:{PREFIX}/sbin:/usr/bin:/usr/sbin:/bin:/sbin"'
    services=root/'etc/groove/services';services.mkdir(parents=True,exist_ok=True)
    # Remove obsolete manifests only from the staging copy; graph does not depend on audio.
    for old in services.glob('*.toml'):old.unlink()
    def service(name,command,args=(),requires=(),after=(),kind='simple',ready=None,console=False,restart='on-failure',user=None,group=None):
        import json
        body=f'[service]\nname={json.dumps(name)}\ndescription={json.dumps(name)}\nkind={json.dumps(kind)}\nrequires={json.dumps(list(requires))}\nafter={json.dumps(list(after))}\nrestart={json.dumps(restart)}\nmax_retries=3\ntimeout_ms=20000\n'
        if ready:body+='ready_path='+json.dumps(ready)+'\n'
        body+='\n[exec]\ncommand='+json.dumps(command)+'\nargs='+json.dumps(list(args))+'\nconsole='+str(console).lower()+'\n'
        if user:body+='user='+json.dumps(user)+'\n'
        if group:body+='group='+json.dumps(group)+'\n'
        body+='environment={ '+daemon_env+' }\n'
        return body
    put('/etc/groove/services/runtime.toml',service('runtime','/usr/libexec/groove-runtime',kind='oneshot',restart='never'))
    put('/etc/groove/services/udev.toml',service('udev',PREFIX+'/sbin/udevd',requires=['runtime'],ready='/run/udev/control'))
    put('/etc/groove/services/device-trigger.toml',service('device-trigger','/usr/libexec/groove-device-trigger',requires=['udev'],kind='oneshot'))
    put('/etc/groove/services/dbus.toml',service('dbus',PREFIX+'/bin/dbus-daemon',['--system','--nofork','--nopidfile'],requires=['runtime'],ready='/run/dbus/system_bus_socket'))
    put('/etc/groove/services/seatd.toml',service('seatd',PREFIX+'/bin/seatd',['-g','video'],requires=['device-trigger'],ready='/run/seatd.sock'))
    put('/etc/groove/services/network.toml',service('network',PREFIX+'/sbin/dhcpcd',['--nobackground'],requires=['runtime','device-trigger']))
    put('/etc/groove/services/lightdm.toml',service('lightdm',PREFIX+'/sbin/lightdm',['--debug','--config=/etc/lightdm/lightdm.conf'],requires=['dbus','device-trigger','seatd']))
    put('/etc/groove/services/serial.toml',service('serial',PREFIX+'/sbin/agetty',['--noclear','--login-program',PREFIX+'/bin/login','ttyAMA0','115200','linux'],requires=['runtime'],restart='always'))
    put('/etc/groove/services/console.toml',service('console',PREFIX+'/sbin/agetty',['--noclear','--login-program',PREFIX+'/bin/login','tty3','linux'],requires=['runtime'],restart='always'))
    wayland_services=root/'etc/groove/wayland-services';wayland_services.mkdir(parents=True,exist_ok=True)
    for old in wayland_services.glob('*.toml'):old.unlink()
    put('/etc/groove/wayland-services/runtime.toml',service('runtime','/usr/libexec/groove-runtime',kind='oneshot',restart='never'))
    put('/etc/groove/wayland-services/udev.toml',service('udev',PREFIX+'/sbin/udevd',requires=['runtime'],ready='/run/udev/control'))
    put('/etc/groove/wayland-services/device-trigger.toml',service('device-trigger','/usr/libexec/groove-device-trigger',requires=['udev'],kind='oneshot'))
    put('/etc/groove/wayland-services/dbus.toml',service('dbus',PREFIX+'/bin/dbus-daemon',['--system','--nofork','--nopidfile'],requires=['runtime'],ready='/run/dbus/system_bus_socket'))
    put('/etc/groove/wayland-services/seatd.toml',service('seatd',PREFIX+'/bin/seatd',['-g','video'],requires=['device-trigger'],ready='/run/seatd.sock'))
    put('/etc/groove/wayland-services/network.toml',service('network',PREFIX+'/sbin/dhcpcd',['--nobackground'],requires=['runtime','device-trigger']))
    put('/etc/groove/wayland-services/weston.toml',service('weston','/usr/libexec/groove-weston',requires=['dbus','device-trigger','seatd'],user='groove',group='groove',restart='always'))
    put('/etc/groove/wayland-services/serial.toml',service('serial',PREFIX+'/sbin/agetty',['--noclear','--login-program',PREFIX+'/bin/login','ttyAMA0','115200','linux'],requires=['runtime'],restart='always'))
    put('/etc/groove/wayland-services/console.toml',service('console',PREFIX+'/sbin/agetty',['--noclear','--login-program',PREFIX+'/bin/login','tty3','linux'],requires=['runtime'],restart='always'))
    put('/etc/groove/recovery-services/console.toml',service('console',PREFIX+'/sbin/agetty',['--noclear','--login-program',PREFIX+'/bin/login','tty1','linux'],console=True,restart='always'))
    put('/etc/groove/recovery-services/serial.toml',service('serial',PREFIX+'/sbin/agetty',['--noclear','--login-program',PREFIX+'/bin/login','ttyAMA0','115200','linux'],console=True,restart='always'))
    for folder,uid,gid in [('home/groove',1000,1000),('var/lib/lightdm',65,65),('var/cache/lightdm',65,65),('var/log/lightdm',65,65)]:
        dest=root/folder;dest.mkdir(parents=True,exist_ok=True);os.chown(dest,uid,gid)
    for name,target in [('var/run','/run'),('var/lock','/run/lock')]:
        path=root/name
        path.parent.mkdir(parents=True,exist_ok=True)
        if not path.exists() and not path.is_symlink():path.symlink_to(target)
    marker=root/'run/groove/live'
    if marker.exists() or marker.is_symlink():marker.unlink()
    if (root/'opt/groove-wayfire/bin/wayfire').is_file():
        from configure_wayfire import install
        install(root, environment, service)
    from configure_blue_note import install as install_blue_note
    install_blue_note(root, environment)
    from configure_xfce_macos import install as install_xfce_macos
    install_xfce_macos(root)
    version=os.environ.get('VERSION','0.2.0')
    for name in ['etc/os-release','usr/bin/groove-sysinfo']:
        target=root/name
        target.write_text(target.read_text().replace('0.2.0',version))
    print('Configured staging root:',root)
if __name__=='__main__':main()
