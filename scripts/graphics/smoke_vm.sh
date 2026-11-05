#!/usr/bin/env bash
# Start a test VM inside the builder. Quit through QMP after acceptance testing.
set -euo pipefail
ISO=${1:?candidate ISO required}
QMP=${QMP:-/tmp/groove-smoke.qmp}
SERIAL=${SERIAL:-/tmp/groove-smoke.serial}
[[ ! -e "$QMP" && ! -e "$SERIAL" ]] || { echo 'Existing VM sockets: quit the previous VM before another test' >&2; exit 1; }
exec qemu-system-aarch64 -nodefaults -machine virt -cpu max -m 1536 -smp 2 \
  -bios /usr/share/qemu-efi-aarch64/QEMU_EFI.fd \
  -device virtio-gpu-pci -device qemu-xhci,id=usb \
  -device usb-kbd,bus=usb.0 -device usb-tablet,bus=usb.0 \
  -device usb-storage,drive=live,bus=usb.0,bootindex=0 \
  -drive "if=none,id=live,media=cdrom,readonly=on,file=$ISO" \
  -netdev user,id=n0 -device virtio-net-pci,netdev=n0,romfile= \
  -audiodev none,id=audio0 -device intel-hda -device hda-duplex,audiodev=audio0 \
  -display none -qmp "unix:$QMP,server=on,wait=off" \
  -serial "unix:$SERIAL,server=on,wait=off"
