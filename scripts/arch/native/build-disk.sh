#!/bin/bash
# Requires Linux, root, loop devices and the clean native root from configure.sh.
# Creates a NEW regular file only. Never accepts a host disk or an existing image.
set -euo pipefail
: "${ROOT:?}" "${OUTPUT:?}" "${VERSION:?}" "${PASSWORD_HASH_FILE:?}"
[[ "$VERSION" =~ ^[0-9][a-zA-Z0-9.]{0,24}$ ]]
[[ "$OUTPUT" == /*.raw && ! -e "$OUTPUT" && -f "$PASSWORD_HASH_FILE" ]]
[[ -f "$ROOT/usr/share/groove-package-manifest.txt" ]]
[[ -x "$ROOT/usr/bin/groove-update" ]]
for command in losetup sgdisk mkfs.ext4 mkfs.vfat rsync; do command -v "$command" >/dev/null; done
# Require room for the real used blocks, not the sparse virtual capacity.
used=$(du -sx -B1 "$ROOT" | cut -f1)
available=$(df -B1 --output=avail "$(dirname "$OUTPUT")" | tail -n1)
(( available > used + 2147483648 ))
truncate -s 64G "$OUTPUT"
loop=''; work=$(mktemp -d /tmp/groove-disk.XXXXXX)
cleanup() {
  umount -R "$work/root" 2>/dev/null || true
  [[ -z "$loop" ]] || losetup -d "$loop"
  rmdir "$work/root" "$work" 2>/dev/null || true
}
trap cleanup EXIT
loop=$(losetup --find --show --partscan "$OUTPUT")
sgdisk --clear --new=1:0:+1G --typecode=1:ef00 --change-name=1:groove-esp \
 --new=2:0:+16G --typecode=2:b921b045-1df0-41c3-af44-4c6f280d3fae --change-name=2:"groove_$VERSION" \
 --new=3:0:+16G --typecode=3:b921b045-1df0-41c3-af44-4c6f280d3fae --change-name=3:_empty \
 --new=4:0:0 --typecode=4:8300 --change-name=4:groove-state "$loop"
partprobe "$loop"
udevadm settle
mkfs.vfat -F32 -n GROOVEESP "${loop}p1"
mkfs.ext4 -F -L "groove_$VERSION" "${loop}p2"
mkfs.ext4 -F -L groove-state "${loop}p4"
mkdir "$work/root"
mount "${loop}p2" "$work/root"
rsync -aHAXx --numeric-ids --exclude=/build --exclude=/proc/\* --exclude=/sys/\* --exclude=/dev/\* --exclude=/run/\* --exclude=/tmp/\* --exclude=/var/cache/pacman/pkg/\* "$ROOT/" "$work/root/"
image="$work/root"
mkdir -p "$image"/{efi,state,home}
mount "${loop}p1" "$image/efi"
cat > "$image/usr/lib/os-release" <<RELEASE
NAME="Linux Groove"
ID=groove
ID_LIKE=arch
PRETTY_NAME="Linux Groove $VERSION (candidate)"
IMAGE_ID=groove
IMAGE_VERSION=$VERSION
VERSION_ID=$VERSION
RELEASE
printf 'LABEL=GROOVEESP /efi vfat umask=0077 0 2\n' > "$image/etc/fstab"
# The password hash is supplied out-of-band, never committed or printed.
chroot "$image" useradd -m -G wheel -s /bin/bash groove
{ printf 'groove:'; cat "$PASSWORD_HASH_FILE"; } | chroot "$image" chpasswd -e
printf '%%wheel ALL=(ALL:ALL) ALL\n' > "$image/etc/sudoers.d/10-groove"
chmod 0440 "$image/etc/sudoers.d/10-groove"
chroot "$image" visudo -cf /etc/sudoers.d/10-groove
# Installed roots use image-specific /var and writable /etc overlay from initramfs.
: > "$image/etc/machine-id"
arch-chroot "$image" mkinitcpio -P
arch-chroot "$image" /usr/lib/systemd/ukify build --linux=/boot/Image --initrd=/boot/initramfs-linux.img \
 --cmdline="root=PARTLABEL=groove_$VERSION ro rootwait groove.version=$VERSION" \
 --os-release=@/usr/lib/os-release --output="/efi/EFI/Linux/groove_$VERSION.efi"
arch-chroot "$image" bootctl --esp-path=/efi --no-variables install
mkdir -p "$image/efi/loader"
printf 'timeout 5\ndefault groove_*.efi\neditor no\n' > "$image/efi/loader/loader.conf"
# Preserve initial user home, while future versions share it from persistent state.
mkdir -p "$image/state"
mount "${loop}p4" "$image/state"
mkdir -p "$image/state/home"
cp -a "$image/home/." "$image/state/home/"
sync
umount "$image/state" "$image/efi" "$image"
e2fsck -fn "${loop}p2"
sgdisk --attributes=2:set:60 "$loop"
sha256sum "$OUTPUT" > "$OUTPUT.sha256"
printf 'Candidate created: %s\nAcceptance in UTM is still required.\n' "$OUTPUT"
