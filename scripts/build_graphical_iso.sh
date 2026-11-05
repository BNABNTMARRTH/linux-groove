#!/usr/bin/env bash
# Client-side entrypoint; outputs a new ISO and leaves the 0.1.0 baseline intact.
set -euo pipefail
WORKSPACE=$(cd "$(dirname "$0")/.." && pwd)
STORAGE=${STORAGE:-/Volumes/Backup/linux_groove_terabit}
BUILDER=${BUILDER:-groove-graphical-build}
BUILD_IMAGE=${BUILD_IMAGE:-linux-groove-graphics-builder}
ACTION=${1:-all}
case "$ACTION" in all|sources|firefox|package) ;; *) echo 'Usage: build_graphical_iso.sh [all|sources|firefox|package]' >&2; exit 1 ;; esac
[[ -f "$STORAGE/iso/linux-groove-0.1.0-aarch64.iso" ]] || { echo 'Missing verified baseline ISO' >&2; exit 1; }
(cd "$STORAGE/iso" && shasum -a 256 -c SHA256SUMS.txt)
[[ -f "$WORKSPACE/scripts/graphics/sources.lock.json" ]] || { echo 'Missing audited source lock' >&2; exit 1; }
if ! docker inspect "$BUILDER" >/dev/null 2>&1; then
    docker build -f "$WORKSPACE/Dockerfile.graphics-builder" -t "$BUILD_IMAGE" "$WORKSPACE"
    docker run -d --privileged --name "$BUILDER" -v "$STORAGE:/backup:ro" -v "$WORKSPACE:/workspace:ro" "$BUILD_IMAGE" sleep infinity
else
    docker start "$BUILDER" >/dev/null
fi
BUILDER="$BUILDER" STORAGE="$STORAGE" BUILD_IMAGE="$BUILD_IMAGE" bash "$WORKSPACE/scripts/graphics/prepare_build_storage.sh"
if [[ "$ACTION" == all || "$ACTION" == sources ]]; then
    docker exec "$BUILDER" python3 /workspace/scripts/graphics/build_sources.py /workspace/scripts/graphics/sources.lock.json
    [[ "$ACTION" != sources ]] || exit 0
fi
if [[ "$ACTION" == all || "$ACTION" == firefox ]]; then
    docker exec "$BUILDER" bash /workspace/scripts/graphics/build_firefox.sh
    [[ "$ACTION" != firefox ]] || exit 0
fi
# The base image extraction and all filesystem mutations happen in the builder.
docker exec "$BUILDER" /bin/bash -euc '
  if [[ ! -d /tmp/groove-root ]]; then
    mkdir -p /tmp/base-iso
    xorriso -osirrox on -indev /backup/iso/linux-groove-0.1.0-aarch64.iso -extract / /tmp/base-iso
    unsquashfs -d /tmp/groove-root /tmp/base-iso/groove/rootfs.squashfs
  fi
  cd /workspace
  CARGO_TARGET_DIR=/tmp/groove-init-target cargo test --locked -p groove-init
  CARGO_TARGET_DIR=/tmp/groove-init-target cargo build --locked --release -p groove-init
  bash /workspace/scripts/graphics/build_kernel.sh
  bash /workspace/scripts/graphics/package_iso.sh
'
output="$STORAGE/iso/linux-groove-0.2.0-aarch64.iso"
[[ ! -e "$output" ]] || { echo 'Output exists; preserve it before another release build' >&2; exit 1; }
docker cp "$BUILDER:/tmp/linux-groove-0.2.0-aarch64.iso" "${output}.tmp"
mv "${output}.tmp" "$output"
(cd "$STORAGE/iso" && shasum -a 256 linux-groove-0.2.0-aarch64.iso > SHA256SUMS-0.2.0.txt && shasum -a 256 -c SHA256SUMS-0.2.0.txt)
echo "Built candidate: $output"
echo 'Acceptance requires UEFI boot, both sessions, logout, input and Firefox HTTPS in UTM.'
