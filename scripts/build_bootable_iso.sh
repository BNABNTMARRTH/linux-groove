#!/bin/bash
set -e

echo "🎷 ========================================================"
echo "   GENERADOR DE IMAGEN BOOTEABLE ISO / LIVEUSB"
echo "   Linux Groove OS - The Blue Note Edition"
echo "============================================================"

ISO_DIR="/tmp/groove-iso-staging"
OUTPUT_ISO="/iso/linux-groove-0.1.0-aarch64.iso"
IMAGES_DIR="/images"

rm -rf "$ISO_DIR"
mkdir -p "$ISO_DIR"/boot/grub "$ISO_DIR"/groove "$ISO_DIR"/EFI/BOOT

echo "  [1/4] Creando rootfs.squashfs comprimido con Zstandard..."
if [ -d /mnt/lfs ]; then
    mksquashfs /mnt/lfs "$ISO_DIR/groove/rootfs.squashfs" \
        -comp zstd -b 1048576 \
        -e "mnt/lfs/sources" -e "mnt/lfs/tmp" -e "mnt/lfs/proc" -e "mnt/lfs/sys" -e "mnt/lfs/dev"
else
    echo "Error: /mnt/lfs no montado."
    exit 1
fi

echo "  [2/4] Copiando Kernel e Initramfs..."
cp -v "$IMAGES_DIR/vmlinuz-6.12-groove-rt" "$ISO_DIR/boot/vmlinuz"
cp -v "$IMAGES_DIR/initramfs-6.12-groove.cpio.gz" "$ISO_DIR/boot/initramfs.cpio.gz"

echo "  [3/4] Generando configuración de arranque GRUB2 (Tema Blue Note)..."
cat << 'EOF' > "$ISO_DIR/boot/grub/grub.cfg"
set default=0
set timeout=5

set menu_color_normal=white/black
set menu_color_highlight=yellow/blue

menuentry "🎷 Linux Groove OS 0.1.0 - The Blue Note Edition (LiveUSB)" {
    linux /boot/vmlinuz console=ttyAMA0,115200 console=tty0 quiet loglevel=3
    initrd /boot/initramfs.cpio.gz
}

menuentry "🎷 Linux Groove OS (Modo Seguro / Terminal TUI)" {
    linux /boot/vmlinuz console=ttyAMA0,115200 console=tty0 single
    initrd /boot/initramfs.cpio.gz
}

menuentry "🎷 The Soundcheck Installer (Instalación Directa)" {
    linux /boot/vmlinuz console=ttyAMA0,115200 console=tty0 groove.install=1
    initrd /boot/initramfs.cpio.gz
}
EOF

echo "  [4/4] Creando imagen ISO híbrida booteable con xorriso..."
mkdir -p /iso
rm -f "$OUTPUT_ISO"
xorriso -as mkisofs \
    -iso-level 3 \
    -full-iso9660-filenames \
    -volid "LINUX_GROOVE_LIVE" \
    -o "$OUTPUT_ISO" \
    "$ISO_DIR"

echo "🎷 ========================================================"
echo "   ISO BOOTEABLE GENERADA EXITOSAMENTE:"
ls -lh "$OUTPUT_ISO"
echo "============================================================"

