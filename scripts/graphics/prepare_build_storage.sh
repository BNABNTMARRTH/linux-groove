#!/usr/bin/env bash
# Give Firefox objects an ext4 workspace on the project's large external disk.
# Run on the Docker client host. The helper joins only this builder's namespace.
set -euo pipefail
BUILDER=${BUILDER:-groove-graphical-build}
STORAGE=${STORAGE:-/Volumes/Backup/linux_groove_terabit}
BUILD_IMAGE=${BUILD_IMAGE:-linux-groove-builder}
docker exec "$BUILDER" mkdir -p /tmp/groove-firefox-objects
if docker exec "$BUILDER" mountpoint -q /tmp/groove-firefox-objects; then exit 0; fi
builder_pid=$(docker inspect --format '{{.State.Pid}}' "$BUILDER")
[[ "$builder_pid" =~ ^[1-9][0-9]*$ ]] || { echo 'Builder must be running' >&2; exit 1; }
docker run --rm --privileged --pid=host -v "$STORAGE:/backup" "$BUILD_IMAGE" /bin/bash -euc '
  image=/backup/images/groove-firefox-objects.ext4
  if [[ ! -f "$image" ]]; then
    truncate -s 20G "${image}.tmp"
    sync
    /sbin/mkfs.ext4 -q -F -m 0 -E nodiscard -L GROOVE_BUILD "${image}.tmp"
    mv "${image}.tmp" "$image"
  fi
  loopdev=$(/sbin/losetup -j "$image" -n -O NAME | head -n 1)
  [[ -n "$loopdev" ]] || loopdev=$(/sbin/losetup --find --show "$image")
  set +e
  /sbin/e2fsck -p "$loopdev"
  fsck_status=$?
  set -e
  [[ $fsck_status -le 1 ]] || { /sbin/losetup -d "$loopdev"; exit "$fsck_status"; }
  if ! nsenter --target "$1" --mount --root --wd -- /bin/mount "$loopdev" /tmp/groove-firefox-objects; then
    /sbin/losetup -d "$loopdev"
    exit 1
  fi
  echo "Firefox build storage mounted from $loopdev"
' -- "$builder_pid"
