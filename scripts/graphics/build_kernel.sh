#!/usr/bin/env bash
set -euo pipefail
SOURCE_ROOT=${GROOVE_SOURCE_ROOT:-/workspace}
mkdir -p /tmp/graphical-images
requested=$(sha256sum "$SOURCE_ROOT"/kernel/groove_arm64_defconfig | cut -d' ' -f1)
if [[ -s /tmp/graphical-images/vmlinuz-6.12-groove-rt && -f /tmp/graphical-images/defconfig.sha256 && $(cat /tmp/graphical-images/defconfig.sha256) == "$requested" ]]; then exit 0; fi
[[ -d /tmp/linux-6.12 ]] || tar -xf /backup/sources/lfs/linux-6.12.tar.xz -C /tmp
cd /tmp/linux-6.12
cp "$SOURCE_ROOT"/kernel/groove_arm64_defconfig arch/arm64/configs/groove_defconfig
make ARCH=arm64 groove_defconfig
make -j"${JOBS:-2}" ARCH=arm64 Image
make ARCH=arm64 modules_prepare
make -j"${JOBS:-2}" ARCH=arm64 modules
grep -qx CONFIG_ACPI=y .config
grep -qx CONFIG_INPUT_EVDEV=y .config
grep -qx CONFIG_USER_NS=y .config
cp arch/arm64/boot/Image /tmp/graphical-images/vmlinuz-6.12-groove-rt
cp .config /tmp/graphical-images/kernel.config
rm -rf /tmp/groove_rt_build
cp -r "$SOURCE_ROOT"/driver/groove_rt_kmod /tmp/groove_rt_build
make -C /tmp/linux-6.12 M=/tmp/groove_rt_build ARCH=arm64 modules
cp /tmp/groove_rt_build/groove_rt.ko /tmp/graphical-images/groove_rt.ko
echo "$requested" > /tmp/graphical-images/defconfig.sha256
