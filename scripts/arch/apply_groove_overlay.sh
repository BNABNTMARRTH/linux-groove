#!/usr/bin/env bash
# apply_groove_overlay.sh: Inject Linux Groove OS kernel RT, crates, apps and GrooveWindow theme
set -euo pipefail

WORKSPACE=$(cd "$(dirname "$0")/../.." && pwd)
BUILDER=${BUILDER:-groove-graphical-build}
WORK_ROOT="/tmp/groove-arch-root"
SOURCE_ROOT="/tmp/groove-wayfire-inputs"

echo "=== [Groove Overlay 1/4] Compilando e inyectando Kernel 6.12 Groove RT y módulo groove_rt.ko ==="
docker exec "$BUILDER" bash -c "
    set -euo pipefail
    
    # 1. Asegurar kernel y módulos
    cd '$SOURCE_ROOT'
    bash '$SOURCE_ROOT/scripts/graphics/build_kernel.sh'
    
    # Copiar kernel y System.map a /boot
    mkdir -p '$WORK_ROOT/boot' '$WORK_ROOT/lib/modules/6.12.0/extra'
    cp /tmp/linux-6.12/arch/arm64/boot/Image '$WORK_ROOT/boot/vmlinuz-6.12-groove-rt'
    
    # Instalar módulos compilados
    make -C /tmp/linux-6.12 modules_install INSTALL_MOD_PATH='$WORK_ROOT' ARCH=arm64
    
    # Copiar groove_rt.ko
    if [ -f /tmp/groove_rt_build/groove_rt.ko ]; then
        cp /tmp/groove_rt_build/groove_rt.ko '$WORK_ROOT/lib/modules/6.12.0/extra/'
        arch-chroot '$WORK_ROOT' depmod -a 6.12.0 || true
        echo 'Módulo groove_rt.ko instalado en /lib/modules/6.12.0/extra/'
    fi
    
    # Límites RT para audio profesional
    mkdir -p '$WORK_ROOT/etc/security/limits.d'
    cat <<'LIMITS' > '$WORK_ROOT/etc/security/limits.d/99-groove-realtime.conf'
@audio - rtprio 95
@audio - memlock unlimited
@audio - nice -19
@wheel - rtprio 95
@wheel - memlock unlimited
@wheel - nice -19
LIMITS
"

echo "=== [Groove Overlay 2/4] Compilando e instalando crates Rust (groove-installer, groove-session) ==="
docker exec "$BUILDER" bash -c "
    set -euo pipefail
    cd '$SOURCE_ROOT'
    CARGO_TARGET_DIR=/tmp/groove-arch-target cargo build --locked --release -p groove-installer -p groove-session -p groove-init
    
    mkdir -p '$WORK_ROOT/usr/bin' '$WORK_ROOT/usr/libexec'
    cp /tmp/groove-arch-target/release/groove-installer '$WORK_ROOT/usr/bin/'
    cp /tmp/groove-arch-target/release/groove-session '$WORK_ROOT/usr/bin/'
    cp /tmp/groove-arch-target/release/groove-init '$WORK_ROOT/usr/bin/'
"

echo "=== [Groove Overlay 3/4] Compilando e instalando utilidades nativas GTK3 CSD Groove y Wayfire ==="
docker exec "$BUILDER" bash -c "
    set -euo pipefail
    
    # Copiar Wayfire 3D prefix si existe en el builder
    if [ -x /opt/groove-wayfire/bin/wayfire ]; then
        echo 'Instalando /opt/groove-wayfire en el rootfs de Arch...'
        mkdir -p '$WORK_ROOT/opt/groove-wayfire' '$WORK_ROOT/usr/share/groove'
        tar -C /opt/groove-wayfire --exclude='./include' --exclude='./share/doc' --exclude='./share/man' --exclude='*.a' --exclude='*.la' -cf - . | tar -C '$WORK_ROOT/opt/groove-wayfire' -xf -
        cp '$SOURCE_ROOT/scripts/graphics/wayfire.sources.lock.json' '$WORK_ROOT/usr/share/groove/wayfire.sources.lock.json'
        chmod 0644 '$WORK_ROOT/usr/share/groove/wayfire.sources.lock.json'
    fi

    mkdir -p '$WORK_ROOT/usr/src/groove' '$WORK_ROOT/opt/groove-graphics/bin'
    cp -r /workspace/scripts/graphics/blue-note/. '$SOURCE_ROOT/scripts/graphics/blue-note/'
    cp -r '$SOURCE_ROOT/scripts/graphics/blue-note/.' '$WORK_ROOT/usr/src/groove/'

    # Compilar todos los 8 binarios nativos C contra GTK3, X11 y LightDM del rootfs Arch
    arch-chroot '$WORK_ROOT' bash -e -c '
        cc -O2 -Wall -Wextra /usr/src/groove/groove-desktop.c \
            -o /usr/bin/groove-desktop
            
        cc -O2 /usr/src/groove/groove-launch-error.c \
            \$(pkg-config --cflags --libs gtk+-3.0) \
            -o /usr/bin/groove-launch-error
            
        cc -O2 -Wall -Wextra /usr/src/groove/groove-dock.c \
            \$(pkg-config --cflags --libs gtk+-3.0 libwnck-3.0 x11) \
            -lm -o /usr/bin/groove-dock
            
        cc -O2 -Wall -Wextra /usr/src/groove/groove-control-center.c \
            \$(pkg-config --cflags --libs gtk+-3.0) \
            -o /usr/bin/groove-control-center

        cc -O2 -Wall -Wextra /usr/src/groove/groove-greeter-ui.c \
            \$(pkg-config --cflags --libs liblightdm-gobject-1 gtk+-3.0) \
            -o /usr/bin/groove-greeter-ui
            
        cc -O2 -Wall -Wextra /usr/src/groove/groove-effects-dialog.c \
            \$(pkg-config --cflags --libs gtk+-3.0) \
            -o /usr/bin/groove-effects-dialog
            
        cc -O2 -Wall -Wextra /usr/src/groove/groove-transparency-settings.c \
            \$(pkg-config --cflags --libs gtk+-3.0) \
            -o /usr/bin/groove-transparency-settings
            
        cc -O2 -Wall -Wextra /usr/src/groove/groove-package-installer.c \
            \$(pkg-config --cflags --libs gtk+-3.0) \
            -o /usr/bin/groove-package-installer

        cc -O2 -Wall -Wextra /usr/src/groove/groove-app-hub.c \
            \$(pkg-config --cflags --libs gtk+-3.0) \
            -o /usr/bin/groove-app-hub
            
        rm -rf /usr/src/groove
    '
    for b in groove-desktop groove-launch-error groove-dock groove-control-center groove-greeter-ui groove-effects-dialog groove-transparency-settings groove-package-installer groove-app-hub; do
        ln -sfn \"../../../usr/bin/\$b\" '$WORK_ROOT/opt/groove-graphics/bin/'\"\$b\"
    done
"

echo "=== [Groove Overlay 4/4] Aplicando configuración visual GrooveWindow, fuentes LCD y branding ==="
docker exec "$BUILDER" bash -c "
    set -euo pipefail
    cp /workspace/scripts/graphics/configure_rootfs.py '$SOURCE_ROOT/scripts/graphics/configure_rootfs.py'
    cp /workspace/scripts/graphics/configure_blue_note.py '$SOURCE_ROOT/scripts/graphics/configure_blue_note.py'
    cp /workspace/scripts/graphics/configure_xfce_macos.py '$SOURCE_ROOT/scripts/graphics/configure_xfce_macos.py'
    cp /workspace/scripts/graphics/configure_window_design.py '$SOURCE_ROOT/scripts/graphics/configure_window_design.py'
    cp /workspace/scripts/graphics/configure_wayfire.py '$SOURCE_ROOT/scripts/graphics/configure_wayfire.py'
    VERSION=0.4.0 python3 '$SOURCE_ROOT/scripts/graphics/configure_rootfs.py' '$WORK_ROOT'
    arch-chroot '$WORK_ROOT' bash -e -c '
        mkdir -p /usr/lib/gdk-pixbuf-2.0/2.10.0/loaders
        gdk-pixbuf-query-loaders --update-cache
        fc-cache -f
        ldconfig
    '
"

echo "=== Capa Linux Groove OS inyectada con éxito sobre Arch Linux ARM ==="
