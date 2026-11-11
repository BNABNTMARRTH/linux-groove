#!/usr/bin/env bash
# build_arch_rootfs.sh: Bootstrap the official Arch Linux ARM rootfs with PAM, sudo, curl, pacman & Flatpak
set -euo pipefail

WORKSPACE=$(cd "$(dirname "$0")/../.." && pwd)
STORAGE=${STORAGE:-/Volumes/Backup/linux_groove_terabit}
BUILDER=${BUILDER:-groove-graphical-build}
TARBALL_SRC="/backup/arch_cache/ArchLinuxARM-aarch64-latest.tar.gz"
WORK_ROOT="/tmp/groove-arch-root"

echo "=== [Paso 1/5] Verificando tarball base de Arch Linux ARM ==="
docker exec "$BUILDER" bash -c "test -f '$TARBALL_SRC'" || {
    echo "ERROR: No se encontró el tarball en $TARBALL_SRC" >&2
    exit 1
}

echo "=== [Paso 2/5] Extrayendo rootfs con bsdtar si no existe ==="
docker exec "$BUILDER" bash -c "
    set -euo pipefail
    if [ ! -f '$WORK_ROOT/usr/bin/pacman' ]; then
        rm -rf '$WORK_ROOT'
        mkdir -p '$WORK_ROOT'
        echo 'Extrayendo $TARBALL_SRC en $WORK_ROOT...'
        bsdtar -xpf '$TARBALL_SRC' -C '$WORK_ROOT'
        echo 'Extracción completada.'
    else
        echo 'Rootfs ya existente en $WORK_ROOT, omitiendo extracción.'
    fi
"

echo "=== [Paso 3/5] Configurando resolv.conf y llaves de Pacman ==="
docker exec "$BUILDER" bash -c "
    set -euo pipefail
    rm -f '$WORK_ROOT/etc/resolv.conf'
    cp /etc/resolv.conf '$WORK_ROOT/etc/resolv.conf'
    
    # Desactivar CheckSpace para permitir instalación en chroot/overlayfs sin fallo de statvfs
    sed -i 's/^CheckSpace/#CheckSpace/' '$WORK_ROOT/etc/pacman.conf'

    # Configurar mirrorlist oficial
    cat <<'MIRRORS' > '$WORK_ROOT/etc/pacman.d/mirrorlist'
Server = http://fl.us.mirror.archlinuxarm.org/\$arch/\$repo
Server = http://nj.us.mirror.archlinuxarm.org/\$arch/\$repo
Server = http://os.archlinuxarm.org/\$arch/\$repo
MIRRORS

    echo 'Inicializando pacman-key en chroot...'
    arch-chroot '$WORK_ROOT' pacman-key --init
    arch-chroot '$WORK_ROOT' pacman-key --populate archlinuxarm
"

echo "=== [Paso 4/5] Actualizando e instalando paquetes base, sudo, curl, PAM y entorno gráfico ==="
docker exec "$BUILDER" bash -c "
    set -euo pipefail
    
    echo 'Sincronizando repositorios oficiales de Arch Linux ARM...'
    arch-chroot '$WORK_ROOT' pacman -Syu --noconfirm
    
    echo 'Instalando herramientas esenciales, red, compilación y PAM...'
    arch-chroot '$WORK_ROOT' pacman -S --needed --noconfirm \
        base-devel sudo curl wget git ca-certificates \
        nano htop fastfetch zsh bash-completion \
        polkit polkit-gnome dbus shadow pambase

    echo 'Instalando stack de audio PipeWire y gráficos...'
    arch-chroot '$WORK_ROOT' pacman -S --needed --noconfirm --overwrite '*' \
        pipewire pipewire-pulse pipewire-jack wireplumber alsa-utils rtkit \
        mesa vulkan-virtio vulkan-swrast xorg-server xorg-xwayland xorg-xinit xorg-xrandr xf86-video-fbdev \
        xfce4 xfce4-terminal thunar mousepad flatpak \
        lightdm lightdm-gtk-greeter seatd librsvg weston 7zip

    echo 'Instalando dependencias de Electron (Antigravity IDE / OpenCode) y tipografías...'
    arch-chroot '$WORK_ROOT' pacman -S --needed --noconfirm \
        nss alsa-lib gtk3 libdrm libnotify libsecret libxss \
        nodejs npm python \
        ttf-dejavu ttf-liberation noto-fonts noto-fonts-emoji
"

echo "=== [Paso 5/5] Configurando usuario groove, sudoers, hostname y Flathub ==="
docker exec "$BUILDER" bash -c "
    set -euo pipefail
    
    # Hostname
    echo 'groove' > '$WORK_ROOT/etc/hostname'
    cat <<'HOSTS' > '$WORK_ROOT/etc/hosts'
127.0.0.1   localhost
::1         localhost
127.0.1.1   groove.localdomain groove
HOSTS

    # Configuración de usuario groove con grupo wheel
    if arch-chroot '$WORK_ROOT' id -u alarm >/dev/null 2>&1; then
        echo 'Transformando usuario alarm a groove...'
        arch-chroot '$WORK_ROOT' groupmod -n groove alarm 2>/dev/null || true
        arch-chroot '$WORK_ROOT' usermod -l groove -d /home/groove -m -c 'Linux Groove OS User' alarm
    elif ! arch-chroot '$WORK_ROOT' id -u groove >/dev/null 2>&1; then
        echo 'Creando usuario groove...'
        arch-chroot '$WORK_ROOT' groupadd -g 1000 groove 2>/dev/null || true
        arch-chroot '$WORK_ROOT' useradd -m -u 1000 -g groove -s /bin/bash -c 'Linux Groove OS User' groove
    fi
    arch-chroot '$WORK_ROOT' usermod -aG wheel,audio,video,input,render,storage,seat groove
    arch-chroot '$WORK_ROOT' usermod -aG video,input,render,seat lightdm
    echo 'groove:groove' | arch-chroot '$WORK_ROOT' chpasswd
    echo 'root:groove' | arch-chroot '$WORK_ROOT' chpasswd

    # Inicializar machine-id y locales para D-Bus, LightDM y GTK
    arch-chroot '$WORK_ROOT' /bin/bash -e -c '
        rm -f /etc/machine-id /var/lib/dbus/machine-id
        systemd-machine-id-setup
        mkdir -p /var/lib/dbus
        cp -f /etc/machine-id /var/lib/dbus/machine-id
        sed -i \"s/^#es_MX.UTF-8 UTF-8/es_MX.UTF-8 UTF-8/\" /etc/locale.gen
        sed -i \"s/^#en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/\" /etc/locale.gen
        locale-gen
        echo \"LANG=es_MX.UTF-8\" > /etc/locale.conf
    '

    # Sudoers limpio sin errores PAM
    mkdir -p '$WORK_ROOT/etc/sudoers.d'
    cat <<'SUDO' > '$WORK_ROOT/etc/sudoers.d/10-groove-wheel'
%wheel ALL=(ALL:ALL) NOPASSWD: ALL
Defaults env_keep += \"XDG_SESSION_TYPE XDG_CURRENT_DESKTOP DISPLAY WAYLAND_DISPLAY\"
SUDO
    chmod 0440 '$WORK_ROOT/etc/sudoers.d/10-groove-wheel'

    # Repositorio Flathub
    echo 'Registrando repositorio oficial Flathub...'
    arch-chroot '$WORK_ROOT' flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo

    # Crear script groove-readonly: herramienta de proteccion inmutable del rootfs
    cat <<'READONLY_CMD' > '$WORK_ROOT/usr/bin/groove-readonly'
#!/bin/bash
# groove-readonly: Groove Studio rootfs protection tool
case \"\$1\" in
    status)
        if [ -w / ]; then
            echo \"Linux Groove OS: Modo Desarrollo (Escritura habilitada)\"
        else
            echo \"Linux Groove OS: Modo Seguro (Solo Lectura)\"
        fi
        ;;
    disable)
        echo \"Desbloqueando sistema para pacman/desarrollo profundo...\"
        mount -o remount,rw / 2>/dev/null || true
        echo \"Sistema desbloqueado.\"
        ;;
    enable)
        echo \"Protegiendo sistema base...\"
        mount -o remount,ro / 2>/dev/null || true
        echo \"Sistema protegido.\"
        ;;
    *)
        echo \"Uso: groove-readonly [status|disable|enable]\"
        ;;
esac
READONLY_CMD
    chmod 0755 '$WORK_ROOT/usr/bin/groove-readonly'
"

echo "=== Bootstrap de Arch Linux ARM completado con éxito en $WORK_ROOT ==="
