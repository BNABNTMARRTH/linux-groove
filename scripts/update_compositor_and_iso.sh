#!/bin/bash
set -e

echo "🎷 ========================================================"
echo "   ACTUALIZANDO GROOVE COMPOSITOR Y REENSAMBLANDO ISO"
echo "============================================================"

# 1. Compilar groove-compositor y groove-init
cd /workspace
export CARGO_TARGET_DIR=/tmp/target
cargo build --release -p groove-compositor -p groove-init
cp /tmp/target/release/groove-compositor /tmp/groove-compositor
cp /tmp/target/release/groove-init /tmp/groove-init

# 2. Inyectar en lfs_root.ext4
mkdir -p /mnt/lfs
mount -o loop /backup/images/lfs_root.ext4 /mnt/lfs
cp -f /tmp/groove-compositor /mnt/lfs/usr/bin/groove-compositor
chmod +x /mnt/lfs/usr/bin/groove-compositor
cp -f /tmp/groove-init /mnt/lfs/sbin/groove-init
chmod +x /mnt/lfs/sbin/groove-init
sync

# 3. Regenerar rootfs.squashfs
STAGING="/tmp/groove-iso-staging"
mkdir -p "${STAGING}/groove" "${STAGING}/boot/grub/fonts" "${STAGING}/EFI/BOOT"

echo "  -> Creando rootfs.squashfs con Zstandard..."
rm -f "${STAGING}/groove/rootfs.squashfs"
mksquashfs /mnt/lfs "${STAGING}/groove/rootfs.squashfs" \
    -comp zstd -b 1048576 \
    -e "sources" -e "tmp" -e "proc" -e "sys" -e "dev"
sync
umount /mnt/lfs

# 4. Copiar ensembles, kernel e initramfs
cp -r /backup/ensembles/*.ensemble "${STAGING}/groove/" 2>/dev/null || true
mkdir -p "${STAGING}/groove/ensembles"
cp -r /backup/ensembles/*.ensemble "${STAGING}/groove/ensembles/" 2>/dev/null || true

cp -f /backup/images/vmlinuz-6.12-groove-rt "${STAGING}/boot/vmlinuz"
cp -f /backup/images/initramfs-6.12-groove.cpio.gz "${STAGING}/boot/initramfs.cpio.gz"
cp -f /usr/share/grub/unicode.pf2 "${STAGING}/boot/grub/fonts/" 2>/dev/null || true

# 5. Generar cargador UEFI BOOTAA64.EFI
if ! which grub-mkstandalone >/dev/null 2>&1; then
    apt-get update && apt-get install -y --no-install-recommends grub-efi-arm64-bin mtools dosfstools
fi
cat << 'EOF' > /tmp/grub-embed.cfg
search --no-floppy --set=root --label LINUX_GROOVE_LIVE
set prefix=($root)/boot/grub
configfile $prefix/grub.cfg
EOF

grub-mkstandalone -O arm64-efi -o /tmp/BOOTAA64.EFI \
    --modules="iso9660 part_gpt part_msdos fat ext2 squash4 search search_label search_fs_file normal configfile echo test all_video efi_gop gfxterm linux font gettext" \
    "boot/grub/grub.cfg=/tmp/grub-embed.cfg"

cp -f /tmp/BOOTAA64.EFI "${STAGING}/EFI/BOOT/BOOTAA64.EFI"

# 6. Crear partición EFI efiboot.img
truncate -s 16M /tmp/efiboot.img
mkfs.vfat -F 12 /tmp/efiboot.img
mmd -i /tmp/efiboot.img ::/EFI
mmd -i /tmp/efiboot.img ::/EFI/BOOT
mcopy -i /tmp/efiboot.img /tmp/BOOTAA64.EFI ::/EFI/BOOT/BOOTAA64.EFI
cp -f /tmp/efiboot.img "${STAGING}/boot/grub/efiboot.img"

# 7. Configuración de GRUB Blue Note
cat << 'EOF' > "${STAGING}/boot/grub/grub.cfg"
set default=0
set timeout=5

set menu_color_normal=white/black
set menu_color_highlight=yellow/blue

insmod font
if loadfont /boot/grub/fonts/unicode.pf2; then
    set gfxmode=auto
    insmod all_video
    insmod gfxterm
    terminal_output gfxterm console
fi

menuentry "🎷 Linux Groove OS 0.1.0 - The Blue Note Edition (LiveUSB)" {
    linux /boot/vmlinuz console=ttyAMA0,115200 console=tty0
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

# 8. Ensamblar ISO con xorriso
FINAL_ISO="/backup/iso/linux-groove-0.1.0-aarch64.iso"
rm -f "${FINAL_ISO}" /tmp/out.iso
xorriso -as mkisofs \
    -iso-level 3 \
    -full-iso9660-filenames \
    -volid "LINUX_GROOVE_LIVE" \
    -eltorito-alt-boot \
    -e boot/grub/efiboot.img \
    -no-emul-boot \
    -append_partition 2 0xef /tmp/efiboot.img \
    -appended_part_as_gpt \
    -o /tmp/out.iso \
    "${STAGING}"

cp -f /tmp/out.iso "${FINAL_ISO}"

echo "🎷 ========================================================"
echo "   ¡ISO DEFINITIVA GENERADA CON ÉXITO!"
ls -lh "${FINAL_ISO}"
echo "============================================================"
