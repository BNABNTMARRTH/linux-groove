# Spec 009 — Arranque Wayland Dedicado y Traspaso de Sesión Gráfica

Estado: en implementación. Fecha: 2026-11-05.
Referencias: [Spec 007](007-graphical-sessions-spec.md), [Plan de Integración](../plans/DEDICATED_WESTON_WAYLAND_PLAN.md), [PRD](../PRD.md).

---

## 1. Justificación y Alcance

Linux Groove implementa un espacio de usuario minimalista gobernado por `groove-init` (PID 1) y `seatd` (gestión de asientos sin `systemd-logind`). 

Para garantizar máxima estabilidad y rendimiento gráfico, se definen dos mecanismos de inicio para entornos Wayland:
1. **Modo Directo / Standalone:** Arranque puro a Weston desde GRUB sin cargar Xorg ni LightDM.
2. **Modo Conmutado / Display Manager:** Selección de Weston desde el greeter de LightDM mediante traspaso limpio de DRM Master.

---

## 2. Asignación de Terminales Virtuales (VTs)

Para prevenir colisiones de modo gráfico (`KD_GRAPHICS`) y robo de foco de entrada entre demonios de consola y compositores:

| VT | Uso en Modo LightDM | Uso en Modo Standalone Wayland | Uso en Modo Recuperación |
|---|---|---|---|
| **tty1** | LightDM Greeter (Xorg :0) | Weston (Wayland puro) | Consola de rescate (`groove.text=1`) |
| **tty2** | Sesión de usuario (XFCE o Weston) | Libre | Libre |
| **tty3** | Consola agetty de respaldo | Consola agetty de respaldo | Libre |
| **ttyAMA0** | Consola serie (115200) | Consola serie (115200) | Consola serie activa |

---

## 3. Especificación del Supervisor (`groove-init`)

- Parámetro de arranque kernel: `groove.wayland=1` o `groove.session=weston`.
- Directorio de manifiestos activo: `/etc/groove/wayland-services`.
- Grafo de dependencias de `/etc/groove/wayland-services`:
  - `runtime` (oneshot, crea `/run/user/1000`, `/run/dbus`, `/run/seatd.sock`).
  - `udev` (demonio `udevd`, requiere `runtime`).
  - `device-trigger` (oneshot `udevadm trigger && settle`, requiere `udev`).
  - `dbus` (demonio del sistema, requiere `runtime`).
  - `seatd` (demonio de asientos con `-g video`, requiere `device-trigger`).
  - `network` (`dhcpcd`, requiere `runtime`, `device-trigger`).
  - `weston` (servicio en primer plano ejecutando `/usr/libexec/groove-weston`, requiere `seatd`, `dbus`, `device-trigger`).
  - `console` (`agetty tty3`, requiere `runtime`).
  - `serial` (`agetty ttyAMA0`, requiere `runtime`).

---

## 4. Protocolo de Traspaso DRM Master en LightDM

Al conmutar de la sesión greeter (X11 en VT 1) a una sesión Wayland (VT 2):
1. `/usr/libexec/groove-weston` debe comprobar si el proceso `Xorg` se encuentra aún activo.
2. Si `Xorg` está activo, el wrapper espera con sondeo no bloqueante (máximo 5 segundos) hasta que el proceso termine y libere el descriptor maestro de `/dev/dri/card0`.
3. Se invoca Weston con los parámetros `--backend=drm --renderer=pixman --config=/etc/xdg/weston/weston.ini`.
4. Los recursos declarados en `weston.ini` deben cumplir con los cargadores soportados por `weston-desktop-shell` (PNG para iconos y fondo de pantalla).

---

## 5. Pruebas de Aceptación

1. **Prueba de DAG:** `/sbin/groove-init --check-services /etc/groove/wayland-services` debe salir con código 0 y sin ciclos.
2. **Prueba Standalone:** Al elegir la entrada *"Compositor Weston (Wayland puro)"* en GRUB, el sistema arranca directamente a la interfaz de Weston en `tty1` en menos de 5 segundos.
3. **Prueba de Selector:** Al elegir *"Weston"* desde LightDM, el compositor carga el fondo Blue Note en PNG, lanza la barra superior y abre `weston-terminal` sin congelar el sistema ni cerrar sesión abruptamente.
4. **Prueba de Aislamiento VT:** `agetty` en `tty3` responde a `Ctrl+Alt+F3` sin interferir con la sesión gráfica en `tty1`/`tty2`.

