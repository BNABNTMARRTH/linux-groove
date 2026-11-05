#!/usr/bin/env bash
set -e

echo "🎷 ======================================================================"
echo "   REGENERANDO ISO HÍBRIDA CON SOPORTE COMPLETO UEFI ARM64 (BOOTAA64.EFI)"
echo "   Linux Groove OS (The Blue Note Edition)"
echo "=========================================================================="

BACKUP_DIR="/backup"
OLD_ISO="${BACKUP_DIR}/iso/linux-groove-0.1.0-aarch64.iso"
NEW_ISO="${BACKUP_DIR}/iso/linux-groove-0.1.0-aarch64.iso.tmp"
FINAL_ISO="${BACKUP_DIR}/iso/linux-groove-0.1.0-aarch64.iso"
STAGING="/tmp/groove-iso-staging"
MNT_OLD="/mnt/old_iso"

mkdir -p "${MNT_OLD}" "${STAGING}"
mount -o loop "${OLD_ISO}" "${MNT_OLD}"

echo "  [1/5] Copiando contenidos del sistema (Rootfs + Ensembles + Kernel)..."
cp -a "${MNT_OLD}"/* "${STAGING}/"
umount "${MNT_OLD}"

# Use the newly built artifacts rather than retaining the old ISO's kernel.
cp -f "${BACKUP_DIR}/images/vmlinuz-6.12-groove-rt" "${STAGING}/boot/vmlinuz"
cp -f "${BACKUP_DIR}/images/initramfs-6.12-groove.cpio.gz" "${STAGING}/boot/initramfs.cpio.gz"

mkdir -p "${STAGING}/boot/grub" "${STAGING}/EFI/BOOT"

echo "  [2/5] Compilando cargador de arranque independiente GRUB UEFI ARM64..."
cat << 'EOF' > /tmp/grub-embed.cfg
search --no-floppy --set=root --label LINUX_GROOVE_LIVE
set prefix=($root)/boot/grub
configfile $prefix/grub.cfg
EOF

grub-mkstandalone -O arm64-efi -o /tmp/BOOTAA64.EFI \
    --modules="iso9660 part_gpt part_msdos fat ext2 squash4 search search_label search_fs_file normal configfile echo test all_video efi_gop gfxterm linux font gettext" \
    "boot/grub/grub.cfg=/tmp/grub-embed.cfg"

cp -v /tmp/BOOTAA64.EFI "${STAGING}/EFI/BOOT/BOOTAA64.EFI"

echo "  [3/5] Creando imagen de partición EFI System Partition (efiboot.img)..."
rm -f /tmp/efiboot.img
truncate -s 16M /tmp/efiboot.img
mkfs.vfat -F 12 /tmp/efiboot.img
mmd -i /tmp/efiboot.img ::/EFI
mmd -i /tmp/efiboot.img ::/EFI/BOOT
mcopy -i /tmp/efiboot.img /tmp/BOOTAA64.EFI ::/EFI/BOOT/BOOTAA64.EFI
cp -v /tmp/efiboot.img "${STAGING}/boot/grub/efiboot.img"

mkdir -p "${STAGING}/boot/grub/fonts"
if [ -f /usr/share/grub/unicode.pf2 ]; then
    cp -v /usr/share/grub/unicode.pf2 "${STAGING}/boot/grub/fonts/"
fi

echo "  [4/5] Configurando menú de inicio Blue Note en GRUB..."
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

echo "  [5/5] Ensamblando ISO híbrida El Torito + GPT EFI con xorriso..."
rm -f "${NEW_ISO}"
xorriso -as mkisofs \
    -iso-level 3 \
    -full-iso9660-filenames \
    -volid "LINUX_GROOVE_LIVE" \
    -eltorito-alt-boot \
    -e boot/grub/efiboot.img \
    -no-emul-boot \
    -append_partition 2 0xef /tmp/efiboot.img \
    -appended_part_as_gpt \
    -o "${NEW_ISO}" \
    "${STAGING}"

mv -f "${NEW_ISO}" "${FINAL_ISO}"

echo "Calculando nuevo SHA256..."
mkdir -p "${BACKUP_DIR}/iso"
sha256sum "${FINAL_ISO}" > "${BACKUP_DIR}/iso/SHA256SUMS.txt" || true

echo "🎷 ======================================================================"
echo "   ¡ISO HÍBRIDA UEFI GENERADA CON ÉXITO!"
ls -lh "${FINAL_ISO}"
cat "${BACKUP_DIR}/iso/SHA256SUMS.txt"
echo "=========================================================================="

