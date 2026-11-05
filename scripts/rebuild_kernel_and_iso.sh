#!/bin/bash
set -e

echo "🎷 ========================================================"
echo "   RECOMPILACIÓN KERNEL 6.12 + USB STORAGE + FRAMEBUFFER CONSOLE"
echo "============================================================"

SOURCES_DIR="/sources"
KERNEL_TAR="$SOURCES_DIR/linux-6.12.tar.xz"
BUILD_DIR="/tmp/linux-6.12"
WORKSPACE_DIR="/workspace"

if [ ! -d "$BUILD_DIR" ]; then
    echo "  [1/4] Descomprimiendo kernel 6.12..."
    tar -xf "$KERNEL_TAR" -C /tmp
fi

echo "  [2/4] Aplicando defconfig con USB/SCSI/VT/FB..."
cp "$WORKSPACE_DIR/kernel/groove_arm64_defconfig" "$BUILD_DIR/arch/arm64/configs/groove_defconfig"
cd "$BUILD_DIR"
make ARCH=arm64 groove_defconfig

echo "  [3/4] Compilando kernel Image..."
make -j$(nproc) ARCH=arm64 Image

echo "  [4/4] Instalando kernel..."
rm -f /images/vmlinuz-6.12-groove-rt
cp -f arch/arm64/boot/Image /images/vmlinuz-6.12-groove-rt

echo "🎷 Generando nuevo initramfs..."
bash /workspace/scripts/build_initramfs.sh

echo "🎷 Regenerando ISO híbrida UEFI final..."
bash /workspace/scripts/build_uefi_hybrid_iso.sh

echo "🎷 ========================================================"
echo "   ¡PROCESO FINALIZADO EXITOSAMENTE!"
echo "============================================================"

