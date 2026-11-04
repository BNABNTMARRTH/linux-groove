#!/bin/bash
# Script de arranque en QEMU para Linux Groove OS (ARM64 / Apple Silicon y emulación)

KERNEL="/Volumes/Backup/linux_groove_terabit/images/vmlinuz-6.12-groove-rt"
INITRD="/Volumes/Backup/linux_groove_terabit/images/initramfs-6.12-groove.cpio.gz"
ISO="/Volumes/Backup/linux_groove_terabit/iso/linux-groove-0.1.0-aarch64.iso"

# Detectar acelerador disponible (Hypervisor.framework en macOS o TCG de respaldo)
if qemu-system-aarch64 -accel help 2>&1 | grep -q "hvf"; then
    ACCEL="-accel hvf -cpu host"
else
    ACCEL="-accel tcg -cpu cortex-a72"
fi

echo "🎷 ========================================================"
echo "   INICIANDO LINUX GROOVE OS EN QEMU (ARM64)"
echo "   Modo: LiveUSB / Blue Note Edition"
echo "============================================================"

qemu-system-aarch64 \
    -M virt \
    $ACCEL \
    -m 2048 \
    -smp 4 \
    -kernel "$KERNEL" \
    -initrd "$INITRD" \
    -append "console=ttyAMA0,115200 root=/dev/ram0" \
    -cdrom "$ISO" \
    -device virtio-net-pci \
    -device virtio-keyboard-pci \
    -device virtio-mouse-pci \
    -nographic

