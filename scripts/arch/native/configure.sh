#!/bin/bash
# Run in the builder after bootstrap.sh. No legacy overlay is invoked.
set -euo pipefail
: "${ROOT:?}" "${SOURCE:?}"
[[ "$ROOT" == /tmp/groove-native-root-* && -x "$ROOT/usr/lib/systemd/systemd" ]]
mount --bind "$ROOT" "$ROOT"
trap 'umount "$ROOT"' EXIT
python3 "$SOURCE/generate.py"
mkdir -p "$ROOT/build/groove-platform/payload"
cp -a "$SOURCE/files/." "$ROOT/build/groove-platform/payload/"
tar -C "$ROOT/build/groove-platform" -cf "$ROOT/build/groove-platform/groove-platform.tar" payload
hash=$(sha256sum "$ROOT/build/groove-platform/groove-platform.tar" | cut -d' ' -f1)
sed "s/@PAYLOAD_SHA256@/$hash/" "$SOURCE/packages/groove-platform/PKGBUILD" > "$ROOT/build/groove-platform/PKGBUILD"
arch-chroot "$ROOT" pacman -Syu --needed --noconfirm inter-font qt6-tools
chroot "$ROOT" id buildgroove >/dev/null 2>&1 || arch-chroot "$ROOT" useradd --system --create-home buildgroove
arch-chroot "$ROOT" chown -R buildgroove:buildgroove /build/groove-platform
arch-chroot "$ROOT" runuser -u buildgroove -- bash -c 'cd /build/groove-platform && makepkg --cleanbuild --force --noconfirm'
arch-chroot "$ROOT" bash -c 'pacman -U --noconfirm /build/groove-platform/groove-platform-*.pkg.tar.*'
arch-chroot "$ROOT" userdel --remove buildgroove
chroot "$ROOT" systemctl enable sddm NetworkManager systemd-timesyncd
# QEMU guest agent is device-activated by its packaged udev rule.
chroot "$ROOT" systemctl mask systemd-bless-boot.service
chroot "$ROOT" systemctl set-default graphical.target
printf 'en_US.UTF-8 UTF-8\nes_MX.UTF-8 UTF-8\n' > "$ROOT/etc/locale.gen"
arch-chroot "$ROOT" locale-gen
printf 'LANG=es_MX.UTF-8\n' > "$ROOT/etc/locale.conf"
printf 'groove\n' > "$ROOT/etc/hostname"
chroot "$ROOT" pacman -Q > "$ROOT/usr/share/groove-package-manifest.txt"
