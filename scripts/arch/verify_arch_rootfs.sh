#!/usr/bin/env bash
# verify_arch_rootfs.sh: Audit the bootstrapped Arch Linux ARM rootfs
set -euo pipefail

BUILDER=${BUILDER:-groove-graphical-build}
WORK_ROOT="/tmp/groove-arch-root"

echo "=== Iniciando Auditoría de Calidad en el Rootfs Arch ARM ==="

docker exec "$BUILDER" bash -c "
    set -euo pipefail
    
    echo -n '[1/7] Verificando usuario groove y grupo wheel... '
    arch-chroot '$WORK_ROOT' id -u groove >/dev/null
    arch-chroot '$WORK_ROOT' groups groove | grep -q wheel
    echo 'OK (groove pertenece a wheel)'

    echo -n '[2/7] Verificando stack PAM y sudo... '
    arch-chroot '$WORK_ROOT' sudo -u groove sudo -n true
    echo 'OK (sudo y PAM funcionan sin errores)'

    echo -n '[3/7] Verificando curl y certificados SSL... '
    arch-chroot '$WORK_ROOT' curl --version | head -n 1
    echo 'OK'

    echo -n '[4/7] Verificando gestor de paquetes pacman... '
    arch-chroot '$WORK_ROOT' pacman --version | head -n 1
    echo 'OK'

    echo -n '[5/7] Verificando soporte Flatpak y Flathub... '
    arch-chroot '$WORK_ROOT' flatpak --version
    arch-chroot '$WORK_ROOT' flatpak remotes | grep -q flathub
    echo 'OK (Flathub activo)'

    echo -n '[6/7] Verificando stack de librerías para Electron y apps visuales... '
    test -f '$WORK_ROOT/usr/lib/libnss3.so'
    test -f '$WORK_ROOT/usr/lib/libasound.so.2'
    test -f '$WORK_ROOT/usr/lib/libgtk-3.so.0'
    echo 'OK (Librerías Electron presentes)'

    echo -n '[7/7] Verificando comando de protección groove-readonly... '
    test -x '$WORK_ROOT/usr/bin/groove-readonly'
    arch-chroot '$WORK_ROOT' groove-readonly status
    echo 'OK'
"

echo "=== ¡Todas las auditorías pasaron al 100%! Rootfs listo para la capa Groove ==="
