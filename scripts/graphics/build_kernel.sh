#!/usr/bin/env bash
set -euo pipefail
mkdir -p /tmp/graphical-images
requested=$(sha256sum /workspace/kernel/groove_arm64_defconfig | cut -d' ' -f1)
if [[ -s /tmp/graphical-images/vmlinuz-6.12-groove-rt && -f /tmp/graphical-images/defconfig.sha256 && $(cat /tmp/graphical-images/defconfig.sha256) == "$requested" ]]; then exit 0; fi
[[ -d /tmp/linux-6.12 ]] || tar -xf /backup/sources/lfs/linux-6.12.tar.xz -C /tmp
cd /tmp/linux-6.12
cp /workspace/kernel/groove_arm64_defconfig arch/arm64/configs/groove_defconfig
make ARCH=arm64 groove_defconfig
make -j"${JOBS:-2}" ARCH=arm64 Image
grep -qx CONFIG_ACPI=y .config
grep -qx CONFIG_INPUT_EVDEV=y .config
grep -qx CONFIG_USER_NS=y .config
cp arch/arm64/boot/Image /tmp/graphical-images/vmlinuz-6.12-groove-rt
cp .config /tmp/graphical-images/kernel.config
echo "$requested" > /tmp/graphical-images/defconfig.sha256
