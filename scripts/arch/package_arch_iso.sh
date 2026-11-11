#!/usr/bin/env bash
# package_arch_iso.sh: Package Linux Groove OS (Arch Linux ARM base) into a bootable EFI ISO
set -euo pipefail

WORKSPACE=$(cd "$(dirname "$0")/../.." && pwd)
STORAGE=${STORAGE:-/Volumes/Backup/linux_groove_terabit}
BUILDER=${BUILDER:-groove-graphical-build}
VERSION="0.4.0-studio-arch"
WORK_ROOT="/tmp/groove-arch-root"
STAGING="/tmp/groove-arch-iso-staging"
OUTPUT_ISO="/tmp/linux-groove-$VERSION-aarch64.iso"
DEST_ISO="$STORAGE/iso/linux-groove-$VERSION-aarch64.iso"

[[ ! -e "$DEST_ISO" ]] || {
    echo "ERROR: Preservando ISO existente en $DEST_ISO" >&2
    exit 1
}

echo "=== [Empaquetado ISO 0/4] Ejecutando compuerta de verificación pre-ISO ==="
bash "$WORKSPACE/scripts/arch/verify_arch_rootfs.sh"
docker exec "$BUILDER" bash -e -c "
    chroot '$WORK_ROOT' /sbin/groove-init --check-services /etc/groove/services
    chroot '$WORK_ROOT' /sbin/groove-init --check-services /etc/groove/wayland-services
    chroot '$WORK_ROOT' /sbin/groove-init --check-services /etc/groove/wayfire-services
    chroot '$WORK_ROOT' /sbin/groove-init --check-services /etc/groove/recovery-services
    for dir in services wayland-services wayfire-services recovery-services; do
        for toml in '$WORK_ROOT'/etc/groove/\$dir/*.toml; do
            cmd=\$(sed -n 's/^command=\"\\(.*\\)\"/\\1/p' \"\$toml\")
            chroot '$WORK_ROOT' test -x \"\$cmd\" || { echo \"Missing executable \$cmd in \$toml\" >&2; exit 1; }
        done
    done
    test -x '$WORK_ROOT/usr/bin/groove-greeter-ui'
    test -x '$WORK_ROOT/usr/lib/Xorg'
    bash /workspace/scripts/graphics/test_live_access.sh '$WORK_ROOT'
    bash /workspace/scripts/graphics/tests/test_launchers.sh '$WORK_ROOT'
"

echo "=== [Empaquetado ISO 1/4] Limpiando cachés temporales en el Rootfs ==="
docker exec "$BUILDER" bash -c "
    set -euo pipefail
    # Limpiar caché de pacman para ahorrar cientos de MB en la ISO
    arch-chroot '$WORK_ROOT' pacman -Scc --noconfirm || true
    rm -rf '$WORK_ROOT/var/cache/pacman/pkg/'*
    rm -rf '$WORK_ROOT/tmp/'*
    rm -rf '$WORK_ROOT/root/.cache'
    rm -rf '$WORK_ROOT/home/groove/.cache'
"

echo "=== [Empaquetado ISO 2/4] Preparando staging y kernel EFI ==="
docker exec "$BUILDER" bash -c "
    set -euo pipefail
    rm -rf '$STAGING'
    mkdir -p '$STAGING/boot/grub' '$STAGING/groove'
    
    # Extraer árbol de booteo EFI base
    xorriso -osirrox on -indev /backup/iso/linux-groove-0.1.0-aarch64.iso -extract /boot '$STAGING/boot' || true

    # Copiar kernel e initramfs
    cp '$WORK_ROOT/boot/vmlinuz-6.12-groove-rt' '$STAGING/boot/vmlinuz'
    
    # Asegurar initramfs
    if [ -f /tmp/graphical-images/initramfs-6.12-groove.cpio.gz ]; then
        cp /tmp/graphical-images/initramfs-6.12-groove.cpio.gz '$STAGING/boot/initramfs.cpio.gz'
    else
        IMAGES_DIR=/tmp/graphical-images bash /workspace/scripts/build_initramfs.sh
        cp /tmp/graphical-images/initramfs-6.12-groove.cpio.gz '$STAGING/boot/initramfs.cpio.gz'
    fi

    # Configuración de GRUB con las 4 sesiones verificadas
    cat <<'GRUB' > '$STAGING/boot/grub/grub.cfg'
set default=0
set timeout=5
set menu_color_normal=white/black
set menu_color_highlight=yellow/blue
if [ -f /boot/grub/fonts/unicode.pf2 ]; then
    if loadfont /boot/grub/fonts/unicode.pf2; then
        insmod all_video
        insmod gfxterm
        terminal_output gfxterm console
    fi
fi

menuentry \"Linux Groove 0.4.0 (Arch ARM Studio) - KDE Plasma 6 (Wayland)\" {
    linux /boot/vmlinuz console=ttyAMA0,115200 console=tty0
    initrd /boot/initramfs.cpio.gz
}
menuentry \"Linux Groove 0.4.0 - macOS Glass (XFCE)\" {
    linux /boot/vmlinuz console=ttyAMA0,115200 console=tty0 groove.session=xfce
    initrd /boot/initramfs.cpio.gz
}
menuentry \"Linux Groove 0.4.0 - Blue Note Glass (Wayfire 3D Wayland)\" {
    linux /boot/vmlinuz console=ttyAMA0,115200 console=tty0 groove.session=wayfire
    initrd /boot/initramfs.cpio.gz
}
menuentry \"Linux Groove 0.4.0 - Consola de recuperacion\" {
    linux /boot/vmlinuz console=ttyAMA0,115200 console=tty0 groove.text=1
    initrd /boot/initramfs.cpio.gz
}
GRUB
"

echo "=== [Empaquetado ISO 3/4] Generando rootfs.squashfs con compresión ZSTD ==="
docker exec "$BUILDER" bash -c "
    set -euo pipefail
    rm -f '$STAGING/groove/rootfs.squashfs'
    mksquashfs '$WORK_ROOT' '$STAGING/groove/rootfs.squashfs' \
        -noappend -comp zstd -b 1048576 -processors 3 \
        -e proc sys dev run tmp var/cache/pacman/pkg
"

echo "=== [Empaquetado ISO 4/4] Generando imagen ISO final booteable con xorriso ==="
docker exec "$BUILDER" bash -c "
    set -euo pipefail
    rm -f '$OUTPUT_ISO' '${OUTPUT_ISO}.tmp'
    
    xorriso -indev /backup/iso/linux-groove-0.1.0-aarch64.iso -outdev '${OUTPUT_ISO}.tmp' \
        -boot_image any replay \
        -map '$STAGING/groove/rootfs.squashfs' /groove/rootfs.squashfs \
        -map '$STAGING/boot' /boot
        
    mv '${OUTPUT_ISO}.tmp' '$OUTPUT_ISO'
    sha256sum '$OUTPUT_ISO' > '${OUTPUT_ISO}.sha256'
    echo 'ISO generada con éxito:'
    ls -lh '$OUTPUT_ISO'
    cat '${OUTPUT_ISO}.sha256'
"

echo "=== Transfiriendo ISO a almacenamiento persistente ==="
docker cp "$BUILDER:$OUTPUT_ISO" "$DEST_ISO"
docker cp "$BUILDER:${OUTPUT_ISO}.sha256" "${DEST_ISO}.sha256"

echo "=== ¡PROCESO COMPLETADO! ==="
echo "ISO disponible en: $DEST_ISO"
cat "${DEST_ISO}.sha256"
