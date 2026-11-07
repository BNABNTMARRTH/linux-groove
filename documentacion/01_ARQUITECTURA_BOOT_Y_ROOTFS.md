# 01 — Arquitectura de Arranque Live, Rootfs y Sesiones Gráficas

## 1. Flujo de Arranque en ARM64 (Apple Silicon / UTM / UEFI)

```
[UEFI Firmware (EDK2 / AAVMF)]
       │
       ▼
[GRUB2 EFI (BOOTAA64.EFI)] ──► Lee /boot/grub/grub.cfg (parámetro groove.live=1)
       │
       ▼
[Kernel Linux 7.3.1-2-aarch64-ARCH] (/boot/vmlinuz)
       │
       ▼
[Initramfs mkinitcpio] (/boot/initramfs.cpio.gz)
       ├── Ejecuta hook: /hooks/groove-live
       ├── Escanea bloques (/dev/sr*, /dev/vd*, /dev/sd*, /dev/nvme*)
       ├── Monta ISO en /run/groove-iso
       ├── Monta /groove/rootfs.squashfs (compresión gzip/zlib) en /run/groove-squash
       ├── Crea tmpfs en RAM (75% RAM) en /run/groove-ram
       ├── Une capas con OverlayFS en /sysroot
       └── Asigna mount_handler=groove_mount_handler (no-op) para switch_root limpio
       │
       ▼
[systemd PID 1] ──► Inicia dbus, systemd-logind, pipewire, groove-boostd y sddm.service
```

---

## 2. Hallazgos Técnicos Clave y Soluciones Permanentes

### A. Compresión SquashFS y el Kernel Arch ARM `7.3.1-2-aarch64-ARCH`
- **Causa raíz descubierta:** El binario del kernel ARM64 tenía `squashfs_zstd_comp_ops` compilado como stub deshabilitado (`supported=0`), mientras que `squashfs_zlib_comp_ops` (`gzip`) está plenamente habilitado.
- **Solución:** Empaquetar `/groove/rootfs.squashfs` con `-comp gzip -b 256K`, reduciendo el tamaño de la imagen a **~2.1 GB** y garantizando montaje instantáneo en el kernel.

### B. Convención de `mount_handler` en `mkinitcpio`
- **Causa raíz:** En el script `/init` de `mkinitcpio`, el montaje de `/sysroot` se invoca expandiendo la variable `"$mount_handler" /sysroot` (cuyo valor por defecto es `default_mount_handler`).
- **Solución:** Definir `groove_mount_handler() { :; }` y reasignar explícitamente la variable `mount_handler=groove_mount_handler` dentro de `run_hook()`.

---

## 3. Gestión de Usuarios y Sesiones Gráficas (SDDM)

- **Usuario oficial:** `groove` (UID `1000`, grupos `wheel,audio,video,input,storage,optical,network,power`).
- **Acceso Sudo y PAM:** Configurado en `/etc/sudoers.d/10-groove` (`NOPASSWD: ALL`) y `/etc/pam.d/sddm` para inicio directo con el botón **"Iniciar"**.
- **Convivencia de Compositors Wayland:**
  - **KDE Plasma 6 (Wayland):** Sesión predeterminada (`/usr/share/wayland-sessions/plasma.desktop`), con efectos 3D de KWin activados (`blurEnabled=true`, `wobblywindowsEnabled=true`, `cubeEnabled=true`).
  - **Wayfire 3D:** Sesión alternativa seleccionable desde el menú superior izquierdo de SDDM (`/usr/share/wayland-sessions/groove-wayfire.desktop`).

