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
chroot "$ROOT" systemctl enable sddm NetworkManager systemd-timesyncd sshd
# Habilitar catalogo remoto Flathub por defecto
arch-chroot "$ROOT" flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo || true

# Instalar yay (AUR helper) nativo aarch64 si no existe
if [ ! -x "$ROOT/usr/bin/yay" ]; then
    echo ":: Instalando yay (aarch64) para soporte nativo de AUR..."
    YAY_TMP=$(mktemp -d)
    curl -fsSL https://github.com/Jguer/yay/releases/download/v12.4.2/yay_12.4.2_aarch64.tar.gz -o "$YAY_TMP/yay.tar.gz"
    tar -xzf "$YAY_TMP/yay.tar.gz" -C "$YAY_TMP"
    install -m 755 "$YAY_TMP/yay_12.4.2_aarch64/yay" "$ROOT/usr/bin/yay"
    if [ -f "$YAY_TMP/yay_12.4.2_aarch64/yay.8" ]; then
        mkdir -p "$ROOT/usr/share/man/man8"
        install -m 644 "$YAY_TMP/yay_12.4.2_aarch64/yay.8" "$ROOT/usr/share/man/man8/yay.8"
    fi
    rm -rf "$YAY_TMP"
fi

# Instalar debtap para conversion de paquetes .deb
if [ ! -x "$ROOT/usr/bin/debtap" ]; then
    echo ":: Instalando debtap para compatibilidad con instaladores .deb..."
    curl -fsSL https://raw.githubusercontent.com/helixarch/debtap/master/debtap -o "$ROOT/usr/bin/debtap"
    chmod +x "$ROOT/usr/bin/debtap"
fi

# QEMU guest agent is device-activated by its packaged udev rule.
chroot "$ROOT" systemctl mask systemd-bless-boot.service
chroot "$ROOT" systemctl set-default graphical.target
printf 'en_US.UTF-8 UTF-8\nes_MX.UTF-8 UTF-8\nes_ES.UTF-8 UTF-8\n' > "$ROOT/etc/locale.gen"
arch-chroot "$ROOT" locale-gen
printf 'LANG=es_MX.UTF-8\nLC_ALL=es_MX.UTF-8\n' > "$ROOT/etc/locale.conf"
printf 'groove\n' > "$ROOT/etc/hostname"
chroot "$ROOT" pacman -Q > "$ROOT/usr/share/groove-package-manifest.txt"
