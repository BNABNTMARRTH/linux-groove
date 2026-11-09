#!/bin/bash
# Run inside the Linux builder. Existing Arch root is a package-manager toolchain,
# never the source of files installed into the new root.
set -euo pipefail
: "${ROOT:?Fresh destination root required}"
TOOLCHAIN=${TOOLCHAIN:-/tmp/groove-arch-root}
SOURCE=${SOURCE:-/tmp/groove-native-source}
CACHE=${CACHE:-/tmp/groove-native-cache}
[[ "$ROOT" == /tmp/groove-native-root-* && ! -e "$ROOT" ]]
[[ -x "$TOOLCHAIN/usr/bin/pacman" ]]
mkdir -p "$ROOT"/{dev,proc,sys,run,tmp,etc,var/lib/pacman} "$CACHE"
mountpoint="$TOOLCHAIN/mnt/groove-native-target"
cachepoint="$TOOLCHAIN/mnt/groove-native-cache"
mkdir -p "$mountpoint" "$cachepoint"
mount --bind "$ROOT" "$mountpoint"
mount --bind "$CACHE" "$cachepoint"
cleanup() { umount -R "$mountpoint" 2>/dev/null || true; umount "$cachepoint" 2>/dev/null || true; }
trap cleanup EXIT
cp "$SOURCE/packages.txt" "$TOOLCHAIN/mnt/groove-native-packages.txt"
# Explicit package signature policy; databases are unsigned upstream on ARM.
cp "$TOOLCHAIN/etc/pacman.conf" "$TOOLCHAIN/mnt/groove-native-pacman.conf"
sed -i 's/^CheckSpace/#CheckSpace/; s/^SigLevel.*/SigLevel = Required DatabaseOptional/' "$TOOLCHAIN/mnt/groove-native-pacman.conf"
arch-chroot "$TOOLCHAIN" /bin/bash -euc '
root=/mnt/groove-native-target
mount --rbind /dev "$root/dev"
mount --make-rslave "$root/dev"
mount -t proc proc "$root/proc"
mount --rbind /sys "$root/sys"
mount --make-rslave "$root/sys"
mapfile -t packages < /mnt/groove-native-packages.txt
pacman --root "$root" --config /mnt/groove-native-pacman.conf \
  --gpgdir /etc/pacman.d/gnupg --cachedir /mnt/groove-native-cache \
  -Syu --needed --noconfirm "${packages[@]}"
'
cleanup
trap - EXIT
cp /etc/resolv.conf "$ROOT/etc/resolv.conf"
cp "$TOOLCHAIN/etc/pacman.d/mirrorlist" "$ROOT/etc/pacman.d/mirrorlist"
arch-chroot "$ROOT" pacman-key --init
arch-chroot "$ROOT" pacman-key --populate archlinuxarm
sed -i 's/^SigLevel.*/SigLevel = Required DatabaseOptional/' "$ROOT/etc/pacman.conf"
sed -i 's/^CheckSpace/#CheckSpace/' "$ROOT/etc/pacman.conf"
sed -i 's/^#LocalFileSigLevel.*/LocalFileSigLevel = Optional TrustAll/' "$ROOT/etc/pacman.conf"
sed -i '/\[aur\]/,+1d' "$ROOT/etc/pacman.conf"
chroot "$ROOT" pacman -Q > "$ROOT/usr/share/groove-package-manifest.txt"
(cd "$CACHE"; sha256sum *.pkg.tar.* > SHA256SUMS)
