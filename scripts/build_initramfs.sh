#!/bin/bash
set -e

echo "🎷 ========================================================"
echo "   GENERADOR DE INITRAMFS LIVEUSB (LINUX GROOVE OS)"
echo "============================================================"

INITRAMFS_DIR="/tmp/groove-initramfs"
OUTPUT_DIR="${IMAGES_DIR:-/images}"
mkdir -p "$OUTPUT_DIR"
OUTPUT_CPIO="$OUTPUT_DIR/initramfs-6.12-groove.cpio.gz"

rm -rf "$INITRAMFS_DIR"
mkdir -p "$INITRAMFS_DIR"/{bin,sbin,usr/bin,usr/sbin,proc,sys,dev,mnt/live,mnt/squash,mnt/ram,mnt/merged,run}

# Instalar busybox estático si no está disponible
if ! which busybox >/dev/null 2>&1; then
    apt-get update && apt-get install -y --no-install-recommends busybox-static
fi

cp -v $(which busybox) "$INITRAMFS_DIR/bin/busybox"
chmod +x "$INITRAMFS_DIR/bin/busybox"
(cd "$INITRAMFS_DIR/bin" && for app in sh mount umount mkdir switch_root ls echo cat sleep seq chmod; do ln -s busybox $app; done)
(cd "$INITRAMFS_DIR/sbin" && for app in switch_root; do ln -s ../bin/busybox $app; done)

# Crear el script de booteo /init
cat << 'EOF' > "$INITRAMFS_DIR/init"
#!/bin/sh
set -eu
trap 'echo "[groove-initramfs] Boot failed; rescue shell"; exec /bin/sh' EXIT
export PATH=/bin:/sbin:/usr/bin:/usr/sbin

echo "============================================================"
echo "  🎷 LINUX GROOVE OS (LiveUSB Boot Loader)                  "
echo "  \"Where Rust meets the improvisation of Sound and Code\"  "
echo "============================================================"

mount -t proc proc /proc
mount -t sysfs sysfs /sys
mount -t devtmpfs devtmpfs /dev
mount -t tmpfs -o mode=0755 tmpfs /run

handoff() {
    for fs in proc sys dev run; do
        mkdir -p "/mnt/merged/$fs"
        mount --move "/$fs" "/mnt/merged/$fs"
    done
    exec switch_root /mnt/merged /sbin/groove-init
}

echo ">> Buscando medio de instalación Linux Groove..."
FOUND=0
for attempt in $(seq 1 10); do
    for dev in /dev/sr* /dev/sd* /dev/nvme* /dev/vd* /dev/mmcblk*; do
        if [ -b "$dev" ]; then
            if mount -o ro "$dev" /mnt/live 2>/dev/null; then
                if [ -f /mnt/live/groove/rootfs.squashfs ]; then
                    echo "🎷 [LiveUSB] Encontrado medio de booteo en $dev"
                    FOUND=1
                    break 2
                fi
                umount /mnt/live 2>/dev/null
            fi
        fi
    done
    sleep 1
done

if [ "$FOUND" -eq 1 ]; then
    echo ">> Montando sistema de archivos SquashFS (Compresión ZSTD)..."
    mount -t squashfs -o loop /mnt/live/groove/rootfs.squashfs /mnt/squash
    
    echo ">> Creando capa volátil RAM OverlayFS..."
    mount -t tmpfs tmpfs /mnt/ram
    mkdir -p /mnt/ram/upper /mnt/ram/work
    mount -t overlay overlay -o lowerdir=/mnt/squash,upperdir=/mnt/ram/upper,workdir=/mnt/ram/work /mnt/merged
    
    mkdir -p /run/media/groove_live /run/groove
    mount --move /mnt/live /run/media/groove_live
    # Runtime evidence of a discovered LiveUSB, never baked into SquashFS.
    echo LINUX_GROOVE_LIVE > /run/groove/live
    chmod 0644 /run/groove/live
    
    echo ">> Transfiriendo control a /sbin/groove-init (PID 1)..."
    handoff
fi

echo ">> Modo directo: Montando partición raíz..."
if mount LABEL=GROOVE_ROOT /mnt/merged 2>/dev/null; then
    handoff
fi

echo "!! No se encontró medio LiveUSB ni partición raíz. Abriendo shell de rescate."
exec /bin/sh
EOF

chmod +x "$INITRAMFS_DIR/init"

echo "  [➜] Empaquetando cpio.gz..."
cd "$INITRAMFS_DIR"
find . -print0 | cpio --null --create --format=newc | gzip -n -9 > /tmp/initramfs.cpio.gz
rm -f "$OUTPUT_CPIO"
cp -f /tmp/initramfs.cpio.gz "$OUTPUT_CPIO"
cp -f /tmp/initramfs.cpio.gz /mnt/lfs/boot/initramfs-6.12-groove.cpio.gz 2>/dev/null || true

echo "🎷 Initramfs LiveUSB generado exitosamente:"
ls -lh "$OUTPUT_CPIO"

