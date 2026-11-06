#!/usr/bin/env bash
# Extend the verified source-built desktop in a separate prefix and staging copy.
set -euo pipefail
WORKSPACE=$(cd "$(dirname "$0")/.." && pwd)
STORAGE=${STORAGE:-/Volumes/Backup/linux_groove_terabit}
BUILDER=${BUILDER:-groove-graphical-build}
ACTION=${1:-all}
VERSION=${VERSION:-0.3.0-rc22}
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]] || exit 1
case "$ACTION" in all|sources|package) ;; *) echo 'Usage: build_wayfire_iso.sh [all|sources|package]' >&2; exit 1;; esac
output="$STORAGE/iso/linux-groove-$VERSION-aarch64.iso"
if [[ "$ACTION" != sources ]]; then
    [[ ! -e "$output" && ! -e "${output}.tmp" ]] || { echo "Preserving existing output: $output" >&2; exit 1; }
fi
python3 - "$STORAGE/iso" <<'CHECKSUM'
import hashlib, pathlib, sys
folder=pathlib.Path(sys.argv[1]); image=folder/'linux-groove-0.2.0-aarch64.iso'
record=(folder/(image.name+'.sha256')).read_text().split()
with image.open('rb') as stream: actual=hashlib.file_digest(stream,'sha256').hexdigest()
if not record or actual!=record[0]:raise SystemExit('Baseline ISO checksum mismatch')
print('Baseline 0.2.0 SHA256 verified:',actual)
CHECKSUM
docker start "$BUILDER" >/dev/null
# Build from a local snapshot: external shared filesystems can retain stale metadata.
SOURCE_ROOT=/tmp/groove-wayfire-inputs
docker exec "$BUILDER" mkdir -p "$SOURCE_ROOT/scripts/graphics" "$SOURCE_ROOT/kernel" "$SOURCE_ROOT/backgrouds_groove" "$SOURCE_ROOT/crates"
docker cp "$WORKSPACE/scripts/graphics/." "$BUILDER:$SOURCE_ROOT/scripts/graphics/"
docker cp "$WORKSPACE/scripts/build_initramfs.sh" "$BUILDER:$SOURCE_ROOT/scripts/"
docker cp "$WORKSPACE/kernel/groove_arm64_defconfig" "$BUILDER:$SOURCE_ROOT/kernel/"
docker cp "$WORKSPACE/backgrouds_groove/." "$BUILDER:$SOURCE_ROOT/backgrouds_groove/"
docker cp "$WORKSPACE/crates/." "$BUILDER:$SOURCE_ROOT/crates/"
docker cp "$WORKSPACE/Cargo.toml" "$BUILDER:$SOURCE_ROOT/"
docker cp "$WORKSPACE/Cargo.lock" "$BUILDER:$SOURCE_ROOT/"
if [[ "$ACTION" != package ]]; then
    # Weston keeps a functional recovery shell and the shared refined launchers.
    docker exec -e GROOVE_SOURCE_ROOT="$SOURCE_ROOT" "$BUILDER" python3 "$SOURCE_ROOT/scripts/graphics/build_sources.py" \
        "$SOURCE_ROOT/scripts/graphics/sources.lock.json" --only weston \
        --prefix /opt/groove-graphics --work /tmp/groove-graphics-build --jobs "${JOBS:-3}"
    docker exec -e GROOVE_SOURCE_ROOT="$SOURCE_ROOT" "$BUILDER" python3 "$SOURCE_ROOT/scripts/graphics/build_sources.py" \
        "$SOURCE_ROOT/scripts/graphics/wayfire.sources.lock.json" \
        --prefix /opt/groove-wayfire --base-prefix /opt/groove-graphics \
        --work /tmp/groove-wayfire-build --jobs "${JOBS:-3}"
fi
# Local helper sources are versioned with the desktop configuration.
docker exec -e GROOVE_SOURCE_ROOT="$SOURCE_ROOT" "$BUILDER" bash -euc '
    cc -O2 -Wall -Wextra "$GROOVE_SOURCE_ROOT"/scripts/graphics/blue-note/groove-desktop.c \
        -o /opt/groove-graphics/bin/groove-desktop
    cc -O2 "$GROOVE_SOURCE_ROOT"/scripts/graphics/blue-note/groove-launch-error.c \
        $(PKG_CONFIG_LIBDIR=/opt/groove-graphics/lib/pkgconfig:/opt/groove-graphics/share/pkgconfig pkg-config --cflags --libs gtk+-3.0) \
        -Wl,-rpath,/opt/groove-graphics/lib -o /opt/groove-graphics/bin/groove-launch-error
    cc -O2 -Wall -Wextra "$GROOVE_SOURCE_ROOT"/scripts/graphics/blue-note/groove-dock.c \
        $(PKG_CONFIG_LIBDIR=/opt/groove-graphics/lib/pkgconfig:/opt/groove-graphics/share/pkgconfig pkg-config --cflags --libs gtk+-3.0 libwnck-3.0 x11) \
        -L/opt/groove-graphics/lib -Wl,-rpath,/opt/groove-graphics/lib -lm \
        -o /opt/groove-graphics/bin/groove-dock
    cc -O2 -Wall -Wextra "$GROOVE_SOURCE_ROOT"/scripts/graphics/blue-note/groove-control-center.c \
        $(PKG_CONFIG_LIBDIR=/opt/groove-graphics/lib/pkgconfig:/opt/groove-graphics/share/pkgconfig pkg-config --cflags --libs gtk+-3.0) \
        -L/opt/groove-graphics/lib -Wl,-rpath,/opt/groove-graphics/lib \
        -o /opt/groove-graphics/bin/groove-control-center
    cc -O2 -Wall -Wextra "$GROOVE_SOURCE_ROOT"/scripts/graphics/blue-note/groove-greeter-ui.c \
        $(PKG_CONFIG_LIBDIR=/opt/groove-graphics/lib/pkgconfig:/opt/groove-graphics/share/pkgconfig pkg-config --cflags --libs liblightdm-gobject-1 gtk+-3.0) \
        -L/opt/groove-graphics/lib -Wl,-rpath,/opt/groove-graphics/lib \
        -o /opt/groove-graphics/bin/groove-greeter-ui
    cc -O2 -Wall -Wextra "$GROOVE_SOURCE_ROOT"/scripts/graphics/blue-note/groove-effects-dialog.c \
        $(PKG_CONFIG_LIBDIR=/opt/groove-graphics/lib/pkgconfig:/opt/groove-graphics/share/pkgconfig pkg-config --cflags --libs gtk+-3.0) \
        -L/opt/groove-graphics/lib -Wl,-rpath,/opt/groove-graphics/lib \
        -o /opt/groove-graphics/bin/groove-effects-dialog
    cc -O2 -Wall -Wextra "$GROOVE_SOURCE_ROOT"/scripts/graphics/blue-note/groove-transparency-settings.c \
        $(PKG_CONFIG_LIBDIR=/opt/groove-graphics/lib/pkgconfig:/opt/groove-graphics/share/pkgconfig pkg-config --cflags --libs gtk+-3.0) \
        -L/opt/groove-graphics/lib -Wl,-rpath,/opt/groove-graphics/lib \
        -o /opt/groove-graphics/bin/groove-transparency-settings
    cc -O2 -Wall -Wextra "$GROOVE_SOURCE_ROOT"/scripts/graphics/blue-note/groove-package-installer.c \
        $(PKG_CONFIG_LIBDIR=/opt/groove-graphics/lib/pkgconfig:/opt/groove-graphics/share/pkgconfig pkg-config --cflags --libs gtk+-3.0) \
        -L/opt/groove-graphics/lib -Wl,-rpath,/opt/groove-graphics/lib \
        -o /opt/groove-graphics/bin/groove-package-installer
    cc -D_GNU_SOURCE -O2 -I/opt/groove-wayfire/include -I/opt/groove-graphics/include \
       "$GROOVE_SOURCE_ROOT"/scripts/graphics/wayfire/groove-gpu-info.c \
       -L/opt/groove-wayfire/lib -Wl,-rpath,/opt/groove-wayfire/lib \
       -Wl,-rpath,/opt/groove-graphics/lib -lEGL -lGLESv2 -lgbm -o /opt/groove-wayfire/bin/groove-gpu-info
    c++ -std=c++17 -O2 -I/opt/groove-wayfire/include \
        "$GROOVE_SOURCE_ROOT"/scripts/graphics/wayfire/groove-workspace.cpp \
        -Wl,-rpath,/opt/groove-wayfire/lib -Wl,-rpath,/opt/groove-graphics/lib \
        -o /opt/groove-wayfire/bin/groove-workspace
'
[[ "$ACTION" != sources ]] || exit 0
docker exec -e VERSION="$VERSION" -e DEFAULT_SESSION="${DEFAULT_SESSION:-xfce}" -e GROOVE_SOURCE_ROOT="$SOURCE_ROOT" "$BUILDER" bash -euc '
    # A new tree per release prevents mutations of the working Weston rootfs.
    root=/tmp/groove-wayfire-root-$VERSION
    staging=/tmp/groove-wayfire-iso-$VERSION
    [[ ! -e "$root" && ! -e "$staging" ]] || { echo "Staging exists; inspect it before retrying" >&2; exit 1; }
    mkdir -p "$staging"
    xorriso -osirrox on -indev /backup/iso/linux-groove-0.2.0-aarch64.iso -extract / "$staging"
    unsquashfs -d "$root" "$staging/groove/rootfs.squashfs"
    cd "$GROOVE_SOURCE_ROOT"
    bash "$GROOVE_SOURCE_ROOT"/scripts/graphics/build_kernel.sh
    CARGO_TARGET_DIR=/tmp/groove-init-target cargo test --locked -p groove-init
    CARGO_TARGET_DIR=/tmp/groove-init-target cargo build --locked --release -p groove-init
    CARGO_TARGET_DIR=/tmp/groove-init-target cargo build --locked --release -p groove-installer
    CARGO_TARGET_DIR=/tmp/groove-init-target cargo build --locked --release -p groove-session
    ROOT="$root" STAGING="$staging" ENABLE_WAYFIRE=1 \
      OUTPUT="/tmp/linux-groove-$VERSION-aarch64.iso" bash "$GROOVE_SOURCE_ROOT"/scripts/graphics/package_iso.sh
'
docker cp "$BUILDER:/tmp/linux-groove-$VERSION-aarch64.iso" "${output}.tmp"
mv "${output}.tmp" "$output"
(cd "$STORAGE/iso" && shasum -a 256 "linux-groove-$VERSION-aarch64.iso" > "SHA256SUMS-$VERSION.txt" && shasum -a 256 -c "SHA256SUMS-$VERSION.txt")
echo "Candidate: $output; candidate requires UTM acceptance before promotion."
