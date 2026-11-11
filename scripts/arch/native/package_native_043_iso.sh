#!/usr/bin/env bash
# package_native_043_iso.sh: Empaquetado oficial e integral de Linux Groove OS 0.4.3 (ARM64)
# Incluye motor universal Rust, precarga instantanea de ventanas y tuning CFS de baja latencia
set -euo pipefail

WORKSPACE=$(cd "$(dirname "$0")/../../.." && pwd)
STORAGE=${STORAGE:-/Volumes/Backup/linux_groove_terabit}
BUILDER=${BUILDER:-groove-graphical-build}
VERSION="0.4.3"
ROOT="/tmp/groove-native-root-0.4.1-rc1"
STAGING="/tmp/groove-native-043-staging"
OUTPUT_ISO="/tmp/linux-groove-$VERSION-aarch64.iso"
DEST_ISO="$STORAGE/iso/linux-groove-$VERSION-aarch64.iso"

echo "=== [Fase 1/7] Sincronizando fuentes y archivos de configuracion al builder ==="
docker exec "$BUILDER" rm -rf /tmp/groove-native-source
docker cp "$WORKSPACE/scripts/arch/native" "$BUILDER:/tmp/groove-native-source"

echo "=== [Fase 2/7] Construyendo e instalando groove-platform $VERSION ==="
docker exec "$BUILDER" bash -c "
set -euo pipefail
SOURCE=/tmp/groove-native-source
ROOT=$ROOT

python3 \"\$SOURCE/generate.py\"
mkdir -p \"\$ROOT/build/groove-platform/payload\"
rm -rf \"\$ROOT/build/groove-platform/payload/\"*
rm -f \"\$ROOT/build/groove-platform/\"*.pkg.tar.*
cp -a \"\$SOURCE/files/.\" \"\$ROOT/build/groove-platform/payload/\"
tar -C \"\$ROOT/build/groove-platform\" -cf \"\$ROOT/build/groove-platform/groove-platform.tar\" payload
hash=\$(sha256sum \"\$ROOT/build/groove-platform/groove-platform.tar\" | cut -d' ' -f1)
sed \"s/@PAYLOAD_SHA256@/\$hash/\" \"\$SOURCE/packages/groove-platform/PKGBUILD\" > \"\$ROOT/build/groove-platform/PKGBUILD\"

chroot \"\$ROOT\" id buildgroove >/dev/null 2>&1 || arch-chroot \"\$ROOT\" useradd --system --create-home buildgroove
arch-chroot \"\$ROOT\" chown -R buildgroove:buildgroove /build/groove-platform
arch-chroot \"\$ROOT\" runuser -u buildgroove -- bash -c 'cd /build/groove-platform && makepkg --cleanbuild --force --noconfirm'
arch-chroot \"\$ROOT\" bash -c 'pacman -U --noconfirm --overwrite \"*\" /build/groove-platform/groove-platform-$VERSION-*.pkg.tar.*'
arch-chroot \"\$ROOT\" userdel --remove buildgroove || true

# Asegurar permisos correctos en unidades systemd y componentes criticos
chmod 644 \"\$ROOT/etc/systemd/system/\"*.service 2>/dev/null || true
chmod 644 \"\$ROOT/usr/share/sddm/themes/breeze/Login.qml\" \"\$ROOT/usr/share/sddm/themes/breeze/theme.conf\" 2>/dev/null || true
chmod 644 \"\$ROOT/etc/vconsole.conf\" \"\$ROOT/etc/X11/xorg.conf.d/00-keyboard.conf\" 2>/dev/null || true
chmod 644 \"\$ROOT/etc/xdg/plasma-localerc\" \"\$ROOT/etc/skel/.config/plasma-localerc\" 2>/dev/null || true
chmod 644 \"\$ROOT/etc/xdg/klaunchrc\" \"\$ROOT/etc/xdg/UserFeedbackrc\" 2>/dev/null || true
chmod 644 \"\$ROOT/etc/xdg/xdg-desktop-portal/kde-portals.conf\" 2>/dev/null || true
chmod 755 \"\$ROOT/usr/bin/\"groove-* 2>/dev/null || true
chmod 755 \"\$ROOT/usr/lib/libgroove_fast.so\" 2>/dev/null || true
chmod 644 \"\$ROOT/usr/lib/systemd/user/groove-warmer.service\" 2>/dev/null || true
chmod 644 \"\$ROOT/etc/xdg/autostart/groove-warmer.desktop\" 2>/dev/null || true
chmod 644 \"\$ROOT/etc/sysctl.d/99-groove-lowlatency.conf\" 2>/dev/null || true
sed -i 's|^Exec=dolphin|Exec=groove-launch dolphin|' \"\$ROOT/usr/share/applications/org.kde.dolphin.desktop\" 2>/dev/null || true
rm -f \"\$ROOT/etc/xdg/autostart/spice-vdagent.desktop\" 2>/dev/null || true
chmod 644 \"\$ROOT/usr/share/color-schemes/Groove.colors\" 2>/dev/null || true
find \"\$ROOT/usr/share/plasma/look-and-feel/org.groove.desktop\" -type d -exec chmod 755 {} + 2>/dev/null || true
find \"\$ROOT/usr/share/plasma/look-and-feel/org.groove.desktop\" -type f -exec chmod 644 {} + 2>/dev/null || true
find \"\$ROOT/usr/share/wallpapers\" -type d -exec chmod 755 {} + 2>/dev/null || true
find \"\$ROOT/usr/share/wallpapers\" -type f -exec chmod 644 {} + 2>/dev/null || true

# Sincronizar directorio de usuario groove desde /etc/skel
mkdir -p \"\$ROOT/home/groove/Desktop\" \"\$ROOT/home/groove/.config\"
rm -rf \"\$ROOT/home/groove/.cache\" \"\$ROOT/root/.cache\"
cp -a \"\$ROOT/etc/skel/.\" \"\$ROOT/home/groove/\"
chmod 755 \"\$ROOT/home/groove/Desktop/\"*.desktop 2>/dev/null || true
chmod 644 \"\$ROOT/etc/skel/.face.icon\" \"\$ROOT/home/groove/.face.icon\" \"\$ROOT/var/lib/AccountsService/icons/groove\" 2>/dev/null || true
arch-chroot \"\$ROOT\" chown -R groove:users /home/groove

# Establecer contrasenas estandar y autorizar llave SSH del administrador
echo \"groove:groove\" | arch-chroot \"\$ROOT\" chpasswd
echo \"root:groove\" | arch-chroot \"\$ROOT\" chpasswd
mkdir -p \"\$ROOT/root/.ssh\"
cp -f \"\$ROOT/etc/skel/.ssh/authorized_keys\" \"\$ROOT/root/.ssh/authorized_keys\" 2>/dev/null || true
chmod 700 \"\$ROOT/root/.ssh\" \"\$ROOT/home/groove/.ssh\" 2>/dev/null || true
chmod 600 \"\$ROOT/root/.ssh/authorized_keys\" \"\$ROOT/home/groove/.ssh/authorized_keys\" 2>/dev/null || true

# Verificar servicios habilitados
chroot \"\$ROOT\" systemctl enable sddm NetworkManager systemd-timesyncd sshd groove-audio-init groove-boostd || true
"

echo "=== [Fase 3/7] Ejecutando compuertas de verificacion del rootfs ==="
docker exec "$BUILDER" bash -c "ROOT=$ROOT /tmp/groove-native-source/verify.sh"

echo "=== [Fase 4/7] Limpiando caches transitorias del rootfs ==="
docker exec "$BUILDER" bash -c "
set -euo pipefail
arch-chroot '$ROOT' pacman -Scc --noconfirm || true
rm -rf '$ROOT/var/cache/pacman/pkg/'*
rm -rf '$ROOT/tmp/'*
rm -rf '$ROOT/build'
rm -rf '$ROOT/root/.cache'
rm -rf '$ROOT/home/groove/.cache'
"

echo "=== [Fase 5/7] Generando rootfs.squashfs con compresion GZIP ==="
docker exec "$BUILDER" bash -c "
set -euo pipefail
rm -rf '$STAGING'
mkdir -p '$STAGING/groove' '$STAGING/boot/grub'
mksquashfs '$ROOT' '$STAGING/groove/rootfs.squashfs' \
    -noappend -comp gzip -b 1048576 -processors 4 \
    -e proc sys dev run tmp var/cache/pacman/pkg build
"

echo "=== [Fase 6/7] Configurando arranque GRUB con version $VERSION ==="
docker exec "$BUILDER" bash -c "
set -euo pipefail

# Extraer arbol de arranque EFI base desde la ISO 0.4.1 existente
xorriso -osirrox on -indev /backup/iso/linux-groove-0.4.1-aarch64.iso -extract /boot '$STAGING/boot' || true
xorriso -osirrox on -indev /backup/iso/linux-groove-0.4.1-aarch64.iso -extract /EFI '$STAGING/EFI' || true

# Configurar nuevo grub.cfg
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

menuentry \"Linux Groove 0.4.3 (Arch ARM Studio) - KDE Plasma 6 (Wayland Ultra-Fast)\" {
    linux /boot/vmlinuz console=tty0 console=ttyAMA0,115200 groove.live=1
    initrd /boot/initramfs.cpio.gz
}
menuentry \"Linux Groove 0.4.3 - macOS Glass (XFCE)\" {
    linux /boot/vmlinuz console=tty0 console=ttyAMA0,115200 groove.live=1 groove.session=xfce
    initrd /boot/initramfs.cpio.gz
}
menuentry \"Linux Groove 0.4.3 - Blue Note Glass (Wayfire 3D Wayland)\" {
    linux /boot/vmlinuz console=tty0 console=ttyAMA0,115200 groove.live=1 groove.session=wayfire
    initrd /boot/initramfs.cpio.gz
}
menuentry \"Linux Groove 0.4.3 - Consola de recuperacion\" {
    linux /boot/vmlinuz console=tty0 console=ttyAMA0,115200 groove.live=1 groove.text=1
    initrd /boot/initramfs.cpio.gz
}
GRUB
"

echo "=== [Fase 7/7] Ensamblando imagen ISO booteable hibrida con xorriso ==="
docker exec "$BUILDER" bash -c "
set -euo pipefail
rm -f '$OUTPUT_ISO' '${OUTPUT_ISO}.tmp'

xorriso -indev /backup/iso/linux-groove-0.4.1-aarch64.iso -outdev '${OUTPUT_ISO}.tmp' \
    -volid 'LINUX_GROOVE_LIVE' \
    -boot_image any replay \
    -map '$STAGING/groove/rootfs.squashfs' /groove/rootfs.squashfs \
    -map '$STAGING/boot/grub/grub.cfg' /boot/grub/grub.cfg

mv '${OUTPUT_ISO}.tmp' '$OUTPUT_ISO'
sha256sum '$OUTPUT_ISO' > '${OUTPUT_ISO}.sha256'
"

echo "=== Copiando nueva ISO al almacenamiento persistente ==="
docker cp "$BUILDER:$OUTPUT_ISO" "$DEST_ISO"
docker cp "$BUILDER:${OUTPUT_ISO}.sha256" "${DEST_ISO}.sha256"

echo "=== PROCESO COMPLETADO EXITOSAMENTE ==="
echo "Nueva ISO generada en: $DEST_ISO"
cat "${DEST_ISO}.sha256"

