#!/usr/bin/env bash
# Run in the builder after all source builds and kernel/init checks succeed.
set -euo pipefail
ROOT=${ROOT:-/tmp/groove-root}
STAGING=${STAGING:-/tmp/base-iso}
PREFIX=${PREFIX:-/opt/groove-graphics}
OUTPUT=${OUTPUT:-/tmp/linux-groove-0.2.0-aarch64.iso}
[[ "$ROOT" != / && -f "$ROOT/etc/os-release" && -d "$PREFIX" ]]
if [[ ${PREVIEW_ONLY:-0} != 1 ]]; then
    [[ -x "$PREFIX/bin/firefox" ]] || { echo "Firefox has not finished building" >&2; exit 1; }
fi
for bin in "$PREFIX/sbin/lightdm" "$PREFIX/sbin/lightdm-gtk-greeter" "$PREFIX/bin/Xorg" "$PREFIX/bin/startxfce4" "$PREFIX/bin/weston"; do
    [[ -x "$bin" ]] || { echo "Missing required application: $bin" >&2; exit 1; }
done
mkdir -p "$ROOT$PREFIX" "$ROOT/sbin" "$STAGING/boot/grub/fonts" /tmp/graphical-images
# Copy only the compiled source prefix. Never copy libraries from builder /usr.
"$PREFIX/bin/gdk-pixbuf-query-loaders" > "$PREFIX/lib/gdk-pixbuf-2.0/2.10.0/loaders.cache.tmp"
mv "$PREFIX/lib/gdk-pixbuf-2.0/2.10.0/loaders.cache.tmp" "$PREFIX/lib/gdk-pixbuf-2.0/2.10.0/loaders.cache"
tar -C "$PREFIX" --exclude='./include' --exclude='./share/doc' --exclude='./share/man' --exclude='*.a' --exclude='*.la' -cf - . | tar -C "$ROOT$PREFIX" -xf -
cp /tmp/groove-init-target/release/groove-init "$ROOT/sbin/groove-init"
chmod 0755 "$ROOT/sbin/groove-init"
python3 /workspace/scripts/graphics/configure_rootfs.py "$ROOT"
# Preserve the source-installed configuration for D-Bus.
mkdir -p "$ROOT/etc/dbus-1"
cp /etc/dbus-1/system.conf /etc/dbus-1/session.conf "$ROOT/etc/dbus-1/"
if [[ -f /workspace/scripts/graphics/ca-bundle.pem ]]; then
    (cd /workspace/scripts/graphics && sha256sum -c ca-bundle.sha256)
    mkdir -p "$ROOT/etc/ssl/certs"
    cp /workspace/scripts/graphics/ca-bundle.pem "$ROOT/etc/ssl/certs/ca-certificates.crt"
fi
if [[ -f /etc/dbus-1/system.d/org.freedesktop.DisplayManager.conf ]]; then
    mkdir -p "$ROOT/etc/dbus-1/system.d"
    cp /etc/dbus-1/system.d/org.freedesktop.DisplayManager.conf "$ROOT/etc/dbus-1/system.d/"
fi
chroot "$ROOT" /usr/bin/localedef -i es_MX -f UTF-8 es_MX.UTF-8
/sbin/ldconfig -r "$ROOT"
chroot "$ROOT" /sbin/groove-init --check-services /etc/groove/services
chroot "$ROOT" /sbin/groove-init --check-services /etc/groove/recovery-services
bash /workspace/scripts/graphics/audit_runtime.sh "$ROOT"
bash /workspace/scripts/graphics/test_live_access.sh "$ROOT"
IMAGES_DIR=/tmp/graphical-images bash /workspace/scripts/build_initramfs.sh
cp /tmp/graphical-images/vmlinuz-6.12-groove-rt "$STAGING/boot/vmlinuz"
cp /tmp/graphical-images/initramfs-6.12-groove.cpio.gz "$STAGING/boot/initramfs.cpio.gz"
if command -v grub-mkfont >/dev/null; then
    grub-mkfont -o "$STAGING/boot/grub/fonts/unicode.pf2" "$PREFIX/share/fonts/dejavu/DejaVuSans.ttf"
fi
cat > "$STAGING/boot/grub/grub.cfg" <<'GRUB'
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
menuentry "Linux Groove 0.2.0 - Selector XFCE / Weston" {
    linux /boot/vmlinuz console=ttyAMA0,115200 console=tty0
    initrd /boot/initramfs.cpio.gz
}
menuentry "Linux Groove - Consola de recuperacion" {
    linux /boot/vmlinuz console=ttyAMA0,115200 console=tty0 groove.text=1
    initrd /boot/initramfs.cpio.gz
}
GRUB
rm -f "$STAGING/groove/rootfs.squashfs"
mksquashfs "$ROOT" "$STAGING/groove/rootfs.squashfs" -noappend -comp zstd -b 1048576 -processors 2 -e proc sys dev run tmp sources
# Replay the already verified EFI boot image and appended GPT partition.
xorriso -indev /backup/iso/linux-groove-0.1.0-aarch64.iso -outdev "${OUTPUT}.tmp" \
    -boot_image any replay \
    -map "$STAGING/groove/rootfs.squashfs" /groove/rootfs.squashfs \
    -map "$STAGING/boot" /boot
mv "${OUTPUT}.tmp" "$OUTPUT"
sha256sum "$OUTPUT" > "${OUTPUT}.sha256"
stat -c 'ISO bytes: %s' "$OUTPUT"
