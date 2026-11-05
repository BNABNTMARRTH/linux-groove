#!/usr/bin/env bash
# Run in the builder after all source builds and kernel/init checks succeed.
set -euo pipefail
ROOT=${ROOT:-/tmp/groove-root}
ROOT=$(realpath "$ROOT")
STAGING=${STAGING:-/tmp/base-iso}
STAGING=$(realpath "$STAGING")
SOURCE_ROOT=${GROOVE_SOURCE_ROOT:-/workspace}
PREFIX=${PREFIX:-/opt/groove-graphics}
OUTPUT=${OUTPUT:-/tmp/linux-groove-0.2.0-aarch64.iso}
VERSION=${VERSION:-0.2.0}
ENABLE_WAYFIRE=${ENABLE_WAYFIRE:-0}
DEFAULT_SESSION=${DEFAULT_SESSION:-xfce}
case "$DEFAULT_SESSION" in xfce|weston|wayfire) ;; *) echo "Invalid DEFAULT_SESSION" >&2; exit 1 ;; esac
[[ ! -e "$OUTPUT" && ! -e "${OUTPUT}.tmp" ]] || { echo 'Preserve the existing ISO before repackaging' >&2; exit 1; }
[[ "$ROOT" != / && -f "$ROOT/etc/os-release" && -d "$PREFIX" ]]
if [[ ${PREVIEW_ONLY:-0} != 1 ]]; then
    [[ -x "$PREFIX/bin/firefox" ]] || { echo "Firefox has not finished building" >&2; exit 1; }
fi
for bin in "$PREFIX/sbin/lightdm" "$PREFIX/sbin/lightdm-gtk-greeter" "$PREFIX/bin/Xorg" "$PREFIX/bin/startxfce4" "$PREFIX/bin/weston"; do
    [[ -x "$bin" ]] || { echo "Missing required application: $bin" >&2; exit 1; }
done
mkdir -p "$ROOT$PREFIX" "$ROOT/sbin" "$ROOT/tmp" "$STAGING/boot/grub/fonts" /tmp/graphical-images
chmod 1777 "$ROOT/tmp"
# Build the shared native binaries against source-built GTK and X11 only.
cc -O2 -Wall -Wextra "$SOURCE_ROOT/scripts/graphics/blue-note/groove-desktop.c" -o "$PREFIX/bin/groove-desktop"
cc -O2 "$SOURCE_ROOT/scripts/graphics/blue-note/groove-launch-error.c" \
    $(PKG_CONFIG_LIBDIR="$PREFIX/lib/pkgconfig:$PREFIX/share/pkgconfig" pkg-config --cflags --libs gtk+-3.0) \
    -Wl,-rpath,"$PREFIX/lib" -o "$PREFIX/bin/groove-launch-error"
cc -O2 -Wall -Wextra "$SOURCE_ROOT/scripts/graphics/blue-note/groove-dock.c" \
    $(PKG_CONFIG_LIBDIR="$PREFIX/lib/pkgconfig:$PREFIX/share/pkgconfig" pkg-config --cflags --libs gtk+-3.0 libwnck-3.0 x11) \
    -L"$PREFIX/lib" -Wl,-rpath,"$PREFIX/lib" -lm -o "$PREFIX/bin/groove-dock"
cc -O2 -Wall -Wextra "$SOURCE_ROOT/scripts/graphics/blue-note/groove-control-center.c" \
    $(PKG_CONFIG_LIBDIR="$PREFIX/lib/pkgconfig:$PREFIX/share/pkgconfig" pkg-config --cflags --libs gtk+-3.0) \
    -L"$PREFIX/lib" -Wl,-rpath,"$PREFIX/lib" -o "$PREFIX/bin/groove-control-center"
cc -O2 -Wall -Wextra "$SOURCE_ROOT/scripts/graphics/blue-note/groove-greeter-ui.c" \
    $(PKG_CONFIG_LIBDIR="$PREFIX/lib/pkgconfig:$PREFIX/share/pkgconfig" pkg-config --cflags --libs liblightdm-gobject-1 gtk+-3.0) \
    -L"$PREFIX/lib" -Wl,-rpath,"$PREFIX/lib" -o "$PREFIX/bin/groove-greeter-ui"
# Copy only the compiled source prefix. Never copy libraries from builder /usr.
"$PREFIX/bin/gdk-pixbuf-query-loaders" > "$PREFIX/lib/gdk-pixbuf-2.0/2.10.0/loaders.cache.tmp"
mv "$PREFIX/lib/gdk-pixbuf-2.0/2.10.0/loaders.cache.tmp" "$PREFIX/lib/gdk-pixbuf-2.0/2.10.0/loaders.cache"
tar -C "$PREFIX" --exclude='./include' --exclude='./share/doc' --exclude='./share/man' --exclude='*.a' --exclude='*.la' -cf - . | tar -C "$ROOT$PREFIX" -xf -
if [[ "$ENABLE_WAYFIRE" == 1 ]]; then
    for app in wayfire waybar wf-dock wf-background groove-gpu-info groove-workspace; do
        [[ -x /opt/groove-wayfire/bin/$app ]] || { echo "Missing Wayfire component: $app" >&2; exit 1; }
    done
    [[ -f /opt/groove-wayfire/lib/dri/virtio_gpu_dri.so ]]
    mkdir -p "$ROOT/opt/groove-wayfire"
    tar -C /opt/groove-wayfire --exclude='./include' --exclude='./share/doc' --exclude='./share/man' --exclude='*.a' --exclude='*.la' -cf - . | tar -C "$ROOT/opt/groove-wayfire" -xf -
    mkdir -p "$ROOT/usr/share/zoneinfo" "$ROOT/usr/share/groove"
    cp -a /opt/groove-wayfire/share/zoneinfo/. "$ROOT/usr/share/zoneinfo/"
    ln -sfn /usr/share/zoneinfo/America/Mexico_City "$ROOT/etc/localtime"
    cp "$SOURCE_ROOT"/scripts/graphics/wayfire.sources.lock.json "$ROOT/usr/share/groove/wayfire.sources.lock.json"
    chmod 0644 "$ROOT/usr/share/groove/wayfire.sources.lock.json"
fi
cp /tmp/groove-init-target/release/groove-init "$ROOT/sbin/groove-init"
chmod 0755 "$ROOT/sbin/groove-init"
python3 "$SOURCE_ROOT"/scripts/graphics/configure_rootfs.py "$ROOT"
if [[ -d "$PREFIX/share/dbus-1/system.d" ]]; then
    mkdir -p "$ROOT/etc/dbus-1/system.d"
    cp -rf "$PREFIX/share/dbus-1/system.d/"* "$ROOT/etc/dbus-1/system.d/"
fi
if [[ -f "$SOURCE_ROOT"/scripts/graphics/ca-bundle.pem ]]; then
    (cd "$SOURCE_ROOT"/scripts/graphics && sha256sum -c ca-bundle.sha256)
    mkdir -p "$ROOT/etc/ssl/certs"
    cp "$SOURCE_ROOT"/scripts/graphics/ca-bundle.pem "$ROOT/etc/ssl/certs/ca-certificates.crt"
fi
mkdir -p "$ROOT/usr/lib/locale"
if [[ -f "$ROOT/usr/share/i18n/charmaps/UTF-8.gz" && ! -f "$ROOT/usr/share/i18n/charmaps/UTF-8" ]]; then
    gzip -dk "$ROOT/usr/share/i18n/charmaps/UTF-8.gz"
fi
chroot "$ROOT" /usr/bin/localedef -i es_MX -f UTF-8 es_MX.UTF-8
/sbin/ldconfig -r "$ROOT"
# Validate the catalogue through the same API used by the greeter.
cc -O2 "$SOURCE_ROOT"/scripts/graphics/tests/session_catalog_check.c \
    $(PKG_CONFIG_LIBDIR="$PREFIX/lib/pkgconfig:$PREFIX/share/pkgconfig" pkg-config --cflags --libs liblightdm-gobject-1) \
    -Wl,-rpath,"$PREFIX/lib" -o "$ROOT/tmp/groove-session-catalog-check"
if [[ "$ENABLE_WAYFIRE" == 1 ]]; then
    chroot --userspec=65:65 "$ROOT" /tmp/groove-session-catalog-check --wayfire
else
    chroot --userspec=65:65 "$ROOT" /tmp/groove-session-catalog-check
fi
rm "$ROOT/tmp/groove-session-catalog-check"
chroot "$ROOT" /sbin/groove-init --check-services /etc/groove/services
chroot "$ROOT" /sbin/groove-init --check-services /etc/groove/wayland-services
if [[ "$ENABLE_WAYFIRE" == 1 ]]; then
    chroot "$ROOT" /sbin/groove-init --check-services /etc/groove/wayfire-services
    c++ -O2 "$SOURCE_ROOT"/scripts/graphics/tests/cxx_runtime_check.cpp \
        -Wl,-rpath,/opt/groove-wayfire/lib -o "$ROOT/tmp/groove-cxx-runtime-check"
    chroot "$ROOT" /tmp/groove-cxx-runtime-check /etc/xdg/wayfire/expressive.ini
    rm "$ROOT/tmp/groove-cxx-runtime-check"
    GSETTINGS_SCHEMA_DIR=/opt/groove-wayfire/share/glib-2.0/schemas chroot "$ROOT" /opt/groove-graphics/bin/gsettings get org.gnome.desktop.interface font-name
    cmp "$SOURCE_ROOT"/backgrouds_groove/groove-piano-background-4k.png "$ROOT/usr/share/backgrounds/groove-default.png"
fi
chroot "$ROOT" /sbin/groove-init --check-services /etc/groove/recovery-services
if [[ "$ENABLE_WAYFIRE" == 1 ]]; then
    WAYFIRE_AUDIT_ROOT="$ROOT/opt/groove-wayfire" bash "$SOURCE_ROOT"/scripts/graphics/audit_runtime.sh "$ROOT"
else
    bash "$SOURCE_ROOT"/scripts/graphics/audit_runtime.sh "$ROOT"
fi
bash "$SOURCE_ROOT"/scripts/graphics/test_live_access.sh "$ROOT"
bash "$SOURCE_ROOT"/scripts/graphics/tests/test_launchers.sh "$ROOT"
IMAGES_DIR=/tmp/graphical-images bash "$SOURCE_ROOT"/scripts/build_initramfs.sh
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
menuentry "Linux Groove 0.3.0 - Blue Note macOS Glass (XFCE + Picom)" {
    linux /boot/vmlinuz console=ttyAMA0,115200 console=tty0
    initrd /boot/initramfs.cpio.gz
}
menuentry "Linux Groove 0.3.0 - Blue Note Glass (Wayfire 3D Wayland)" {
    linux /boot/vmlinuz console=ttyAMA0,115200 console=tty0 groove.session=wayfire
    initrd /boot/initramfs.cpio.gz
}
menuentry "Linux Groove 0.3.0 - Weston (Wayland Basico)" {
    linux /boot/vmlinuz console=ttyAMA0,115200 console=tty0 groove.wayland=1
    initrd /boot/initramfs.cpio.gz
}
menuentry "Linux Groove - Consola de recuperacion" {
    linux /boot/vmlinuz console=ttyAMA0,115200 console=tty0 groove.text=1
    initrd /boot/initramfs.cpio.gz
}
GRUB
sed -i "s/Linux Groove 0.3.0/Linux Groove $VERSION/g" "$STAGING/boot/grub/grub.cfg"
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
