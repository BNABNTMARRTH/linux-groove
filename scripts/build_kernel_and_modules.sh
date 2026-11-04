#!/bin/bash
set -e

echo "🎷 ========================================================"
echo "   COMPILACIÓN DEL KERNEL LINUX 6.12 LTS PARA LINUX GROOVE OS"
echo "   Arquitectura: ARM64 / AArch64 | Optimización Real-Time"
echo "============================================================"

SOURCES_DIR="/sources"
KERNEL_TAR="$SOURCES_DIR/linux-6.12.tar.xz"
BUILD_DIR="/tmp/linux-6.12"
WORKSPACE_DIR="/workspace"

echo "  [1/6] Descomprimiendo código fuente del Kernel 6.12..."
rm -rf "$BUILD_DIR"
tar -xf "$KERNEL_TAR" -C /tmp

echo "  [2/6] Aplicando configuración personalizada groove_defconfig..."
cp "$WORKSPACE_DIR/kernel/groove_arm64_defconfig" "$BUILD_DIR/arch/arm64/configs/groove_defconfig"
cd "$BUILD_DIR"
make ARCH=arm64 groove_defconfig

echo "  [3/6] Compilando el kernel Image (ARM64)..."
make -j4 ARCH=arm64 Image

echo "  [4/6] Compilando módulos del kernel..."
make -j4 ARCH=arm64 modules

echo "  [5/6] Instalando kernel y módulos en /mnt/lfs..."
mkdir -p /mnt/lfs/boot
rm -f /mnt/lfs/boot/vmlinuz-6.12-groove-rt /images/vmlinuz-6.12-groove-rt
cp -v arch/arm64/boot/Image /mnt/lfs/boot/vmlinuz-6.12-groove-rt
cp -v arch/arm64/boot/Image /images/vmlinuz-6.12-groove-rt
make ARCH=arm64 INSTALL_MOD_PATH=/mnt/lfs modules_install

echo "  [6/6] Compilando driver en tiempo real groove_rt_kmod..."
cd "$WORKSPACE_DIR/driver/groove_rt_kmod"
make KDIR="$BUILD_DIR" ARCH=arm64
KERNEL_VER=$(cd "$BUILD_DIR" && make -s kernelrelease)
mkdir -p "/mnt/lfs/lib/modules/$KERNEL_VER/extra"
cp -v groove_rt.ko "/mnt/lfs/lib/modules/$KERNEL_VER/extra/"
depmod -a -b /mnt/lfs "$KERNEL_VER" || true

echo "🎷 Kernel Linux 6.12 y driver groove_rt_kmod compilados e instalados con éxito!"
ls -lh /mnt/lfs/boot/vmlinuz-6.12-groove-rt

