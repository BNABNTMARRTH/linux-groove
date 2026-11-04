#!/usr/bin/env bash
set -e

echo "🎷 ======================================================================"
echo "   EMPAQUETADO DE ENSEMBLES CREATIVOS Y GENERACIÓN DE ISO FINAL"
echo "   Linux Groove OS (The Blue Note Edition) - AArch64"
echo "=========================================================================="

IMAGE_FILE="/images/lfs_root.ext4"
MNT_DIR="/mnt/lfs"
ISO_DIR="/tmp/groove-iso-staging"
OUTPUT_ISO="/iso/linux-groove-0.1.0-aarch64.iso"
ENSEMBLES_OUT="/ensembles"

mkdir -p "${MNT_DIR}" "${ENSEMBLES_OUT}"
mount -o loop "${IMAGE_FILE}" "${MNT_DIR}"

# 1. Empaquetar los 5 Ensambles Creativos
echo "  [1/4] Creando los 5 paquetes SquashFS (.ensemble) para creadores..."
for ens in jazz-audio visual-design cinema-video darkroom-photo rust-dev; do
    echo "    -> Empaquetando ensemble: ${ens}..."
    STAGING="/tmp/ensemble_${ens}"
    rm -rf "${STAGING}"
    mkdir -p "${STAGING}/etc/groove" "${STAGING}/usr/share/applications" "${STAGING}/manifest"
    
    # Copiar manifest
    cp "/workspace/ensembles/${ens}.toml" "${STAGING}/manifest/manifest.toml"
    cp "/workspace/ensembles/${ens}.toml" "${STAGING}/etc/groove/"
    
    # Crear SquashFS del ensemble
    rm -f "${ENSEMBLES_OUT}/${ens}.ensemble"
    mksquashfs "${STAGING}" "${ENSEMBLES_OUT}/${ens}.ensemble" -comp zstd -b 524288 -noappend
    rm -rf "${STAGING}"
done

ls -lh "${ENSEMBLES_OUT}"/*.ensemble

# 2. Preparar el staging de la ISO
echo "  [2/4] Preparando staging de la ISO..."
rm -rf "${ISO_DIR}"
mkdir -p "${ISO_DIR}/boot/grub" "${ISO_DIR}/groove/ensembles" "${ISO_DIR}/EFI/BOOT"

# Copiar ensembles al medio Live
cp -v "${ENSEMBLES_OUT}"/*.ensemble "${ISO_DIR}/groove/ensembles/"

# 3. Generar rootfs.squashfs
echo "  [3/4] Generando rootfs.squashfs con compresión Zstandard..."
mksquashfs "${MNT_DIR}" "${ISO_DIR}/groove/rootfs.squashfs" \
    -comp zstd -b 1048576 \
    -e "sources" -e "tmp" -e "proc" -e "sys" -e "dev"

sync
umount "${MNT_DIR}"

# 4. Copiar Kernel, Initramfs y crear ISO con xorriso
echo "  [4/4] Ensamblando ISO booteable híbrida..."
cp -v "/images/vmlinuz-6.12-groove-rt" "${ISO_DIR}/boot/vmlinuz"
cp -v "/images/initramfs-6.12-groove.cpio.gz" "${ISO_DIR}/boot/initramfs.cpio.gz"

cat << 'EOF' > "${ISO_DIR}/boot/grub/grub.cfg"
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

mkdir -p /iso
rm -f "${OUTPUT_ISO}"
xorriso -as mkisofs \
    -iso-level 3 \
    -full-iso9660-filenames \
    -volid "LINUX_GROOVE_LIVE" \
    -o "${OUTPUT_ISO}" \
    "${ISO_DIR}"

echo "🎷 ======================================================================"
echo "   ISO BOOTEABLE GENERADA EXITOSAMENTE:"
ls -lh "${OUTPUT_ISO}"
echo "=========================================================================="

