#!/usr/bin/env bash
set -e

echo "🎷 ======================================================================"
echo "   COMPILACIÓN E INTEGRACIÓN TOTAL DE USERSPACE RUST, DRIVER Y ROOTFS"
echo "   Linux Groove OS (The Blue Note Edition) - AArch64"
echo "=========================================================================="

IMAGE_FILE="/images/lfs_root.ext4"
MNT_DIR="/mnt/lfs"
CACHE_DIR="/cargo-cache"

export CARGO_HOME="${CACHE_DIR}/cargo"
export CARGO_TARGET_DIR="${CACHE_DIR}/target"

# 1. Instalar dependencias del host si faltan
echo "  [1/6] Verificando dependencias del entorno de compilación..."
apt-get update -qq && apt-get install -y -qq libpam0g-dev kmod

# 2. Compilar uutils/coreutils
echo "  [2/6] Compilando uutils/coreutils (Rust multicall)..."
cd /uutils
cargo build --release --target aarch64-unknown-linux-gnu --features unix --bin coreutils
ls -lh "${CARGO_TARGET_DIR}/aarch64-unknown-linux-gnu/release/coreutils"

# 3. Compilar sudo-rs
echo "  [3/6] Compilando sudo-rs (Rust SUID)..."
cd /sudo-rs
cargo build --release --target aarch64-unknown-linux-gnu
ls -lh "${CARGO_TARGET_DIR}/aarch64-unknown-linux-gnu/release/sudo"

# 4. Descomprimir Linux 6.12 si no existe para compilar groove_rt_kmod
echo "  [4/6] Preparando árbol de kernel 6.12 para driver groove_rt_kmod..."
if [ ! -d "/tmp/linux-6.12" ]; then
    tar -xf /sources/lfs/linux-6.12.tar.xz -C /tmp
    cp /workspace/kernel/groove_arm64_defconfig /tmp/linux-6.12/arch/arm64/configs/groove_defconfig
    cd /tmp/linux-6.12
    make ARCH=arm64 groove_defconfig
    make -j4 ARCH=arm64 modules_prepare
fi

echo "  Compilando módulo de kernel groove_rt.ko en /tmp (ext4)..."
rm -rf /tmp/groove_rt_kmod
cp -r /workspace/driver/groove_rt_kmod /tmp/groove_rt_kmod
cd /tmp/groove_rt_kmod
make KDIR=/tmp/linux-6.12 ARCH=arm64 clean || true
KBUILD_MODPOST_WARN=1 make KDIR=/tmp/linux-6.12 ARCH=arm64 modules
ls -lh /tmp/groove_rt_kmod/groove_rt.ko

# 5. Montar lfs_root.ext4 e instalar binarios
echo "  [5/6] Instalando binarios y configuraciones en lfs_root.ext4..."
mkdir -p "${MNT_DIR}"
mount -o loop "${IMAGE_FILE}" "${MNT_DIR}"

mkdir -p "${MNT_DIR}/usr/bin" "${MNT_DIR}/bin" "${MNT_DIR}/sbin" "${MNT_DIR}/etc" "${MNT_DIR}/usr/lib" "${MNT_DIR}/lib"

# Copiar coreutils y generar symlinks
cp -f "${CARGO_TARGET_DIR}/aarch64-unknown-linux-gnu/release/coreutils" "${MNT_DIR}/usr/bin/coreutils"
chmod 755 "${MNT_DIR}/usr/bin/coreutils"

# Instalar symlinks de todas las funciones de coreutils en /usr/bin y /bin
echo "  Generando symlinks de Rust Coreutils..."
for cmd in $("${MNT_DIR}/usr/bin/coreutils" --list); do
    ln -sf coreutils "${MNT_DIR}/usr/bin/${cmd}"
    ln -sf /usr/bin/coreutils "${MNT_DIR}/bin/${cmd}"
done

# Copiar sudo-rs y su
cp -f "${CARGO_TARGET_DIR}/aarch64-unknown-linux-gnu/release/sudo" "${MNT_DIR}/usr/bin/sudo"
chmod 4755 "${MNT_DIR}/usr/bin/sudo"

if [ -f "${CARGO_TARGET_DIR}/aarch64-unknown-linux-gnu/release/su" ]; then
    cp -f "${CARGO_TARGET_DIR}/aarch64-unknown-linux-gnu/release/su" "${MNT_DIR}/usr/bin/su"
    chmod 4755 "${MNT_DIR}/usr/bin/su"
fi

# Copiar bibliotecas compartidas de PAM
for pambin in /lib/aarch64-linux-gnu/libpam.so* /usr/lib/aarch64-linux-gnu/libpam.so*; do
    if [ -f "$pambin" ]; then
        cp -a "$pambin" "${MNT_DIR}/usr/lib/" 2>/dev/null || true
        cp -a "$pambin" "${MNT_DIR}/lib/" 2>/dev/null || true
    fi
done

# Configurar /etc/sudoers
cat << 'EOF' > "${MNT_DIR}/etc/sudoers"
# /etc/sudoers - Linux Groove OS (The Blue Note Edition)
root ALL=(ALL:ALL) ALL
%wheel ALL=(ALL:ALL) NOPASSWD: ALL
groove ALL=(ALL:ALL) NOPASSWD: ALL
EOF
chmod 0440 "${MNT_DIR}/etc/sudoers"

# Instalar groove_rt.ko
KERNEL_VER="6.12.0"
mkdir -p "${MNT_DIR}/lib/modules/${KERNEL_VER}/extra"
cp -f /tmp/groove_rt_kmod/groove_rt.ko "${MNT_DIR}/lib/modules/${KERNEL_VER}/extra/"
depmod -a -b "${MNT_DIR}" "${KERNEL_VER}" || true

# Copiar configuraciones de ensembles
mkdir -p "${MNT_DIR}/etc/groove/ensembles"
cp -f /workspace/ensembles/*.toml "${MNT_DIR}/etc/groove/ensembles/"

# 6. Test dentro de chroot
echo "  [6/6] Verificando entorno en chroot..."
chroot "${MNT_DIR}" /usr/bin/coreutils --version
chroot "${MNT_DIR}" /usr/bin/uname -a || true
chroot "${MNT_DIR}" /usr/bin/ls -la /usr/bin/sudo
chroot "${MNT_DIR}" /usr/bin/groove-session list-ensembles

sync
umount "${MNT_DIR}"

echo "🎷 ======================================================================"
echo "   INTEGRACIÓN EXITOSA EN ROOTFS!"
echo "=========================================================================="

