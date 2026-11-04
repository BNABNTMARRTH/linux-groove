#!/usr/bin/env bash
set -e

echo "[+] ========================================================"
echo "[+] Integrando Rust Coreutils, sudo-rs y groove_rt en RootFS"
echo "[+] ========================================================"

IMAGE_FILE="/images/lfs_root.ext4"
MNT_DIR="/mnt/lfs"

mkdir -p "${MNT_DIR}"
mount -o loop "${IMAGE_FILE}" "${MNT_DIR}"

# 1. Copiar y enlazar uutils/coreutils
echo "[+] Instalando uutils/coreutils en ${MNT_DIR}/usr/bin/..."
mkdir -p "${MNT_DIR}/usr/bin" "${MNT_DIR}/bin" "${MNT_DIR}/sbin" "${MNT_DIR}/usr/sbin"

cp -f /tmp/target-coreutils/aarch64-unknown-linux-gnu/release/coreutils "${MNT_DIR}/usr/bin/coreutils"
chmod 755 "${MNT_DIR}/usr/bin/coreutils"

# Instalar todos los symlinks de coreutils
# La bandera --install crea symlinks en el directorio indicado
"${MNT_DIR}/usr/bin/coreutils" --install "${MNT_DIR}/usr/bin" || true

# Crear symlinks esenciales en /bin si /bin no es symlink a usr/bin
for cmd in ls cp mv rm cat mkdir rmdir touch chmod chown chgrp uname pwd date echo sleep sync true false test dd df ln mktemp; do
    if [ ! -e "${MNT_DIR}/bin/${cmd}" ]; then
        ln -sf "/usr/bin/${cmd}" "${MNT_DIR}/bin/${cmd}"
    fi
done

# 2. Copiar y configurar sudo-rs
echo "[+] Instalando sudo-rs en ${MNT_DIR}/usr/bin/..."
cp -f /tmp/target-sudo/aarch64-unknown-linux-gnu/release/sudo "${MNT_DIR}/usr/bin/sudo"
if [ -f /tmp/target-sudo/aarch64-unknown-linux-gnu/release/su ]; then
    cp -f /tmp/target-sudo/aarch64-unknown-linux-gnu/release/su "${MNT_DIR}/usr/bin/su"
    chmod 4755 "${MNT_DIR}/usr/bin/su"
fi
chmod 4755 "${MNT_DIR}/usr/bin/sudo"

# Copiar librerías PAM requeridas por sudo-rs
mkdir -p "${MNT_DIR}/usr/lib" "${MNT_DIR}/lib"
for pambin in /lib/aarch64-linux-gnu/libpam.so* /usr/lib/aarch64-linux-gnu/libpam.so*; do
    if [ -f "$pambin" ]; then
        cp -a "$pambin" "${MNT_DIR}/usr/lib/" 2>/dev/null || true
    fi
done

# Crear /etc/sudoers con permisos 0440
mkdir -p "${MNT_DIR}/etc"
cat << 'EOF' > "${MNT_DIR}/etc/sudoers"
# /etc/sudoers - Linux Groove OS (The Blue Note Edition)
root ALL=(ALL:ALL) ALL
%wheel ALL=(ALL:ALL) NOPASSWD: ALL
groove ALL=(ALL:ALL) NOPASSWD: ALL
EOF
chmod 0440 "${MNT_DIR}/etc/sudoers"

# 3. Compilar módulo de kernel groove_rt_kmod
echo "[+] Compilando módulo de kernel groove_rt_kmod..."
cd /driver
make KDIR=/kernel_src PWD=/driver ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- clean || true
make KDIR=/kernel_src PWD=/driver ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- modules

mkdir -p "${MNT_DIR}/lib/modules/6.12.0/extra"
if [ -f /driver/groove_rt.ko ]; then
    cp -f /driver/groove_rt.ko "${MNT_DIR}/lib/modules/6.12.0/extra/groove_rt.ko"
    echo "[+] Módulo groove_rt.ko copiado con éxito a /lib/modules/6.12.0/extra/"
fi

# 4. Verificar ejecutable uutils y sudo dentro de chroot
echo "[+] Verificando coreutils y sudo en chroot..."
chroot "${MNT_DIR}" /usr/bin/coreutils --version
chroot "${MNT_DIR}" /usr/bin/uname -a || true
chroot "${MNT_DIR}" /usr/bin/ls -la /usr/bin/sudo || true

sync
umount "${MNT_DIR}"
echo "[+] Integración de Rust Coreutils, sudo-rs y groove_rt.ko completada con éxito."

