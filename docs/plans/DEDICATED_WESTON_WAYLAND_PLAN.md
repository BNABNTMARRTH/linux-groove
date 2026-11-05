# Plan de Integración: Entrada Dedicada de Weston en GRUB y Traspaso de Sesión en LightDM

Fecha: 2026-11-05
Estado: Aprobado / En ejecución.
Referencias: [PRD](../PRD.md), [Spec 007](../specs/007-graphical-sessions-spec.md), [Spec 009](../specs/009-wayland-standalone-and-session-handoff-spec.md), [Check de avance](../PROGRESS_TRACKER.md).

---

## 1. Contexto y Diagnóstico

En la versión preliminar de Linux Groove 0.2.0, el greeter Blue Note de LightDM cargó exitosamente en pantalla (`media_1793860562556_df1e0efd.jpg`). Sin embargo, al seleccionar «Weston» e intentar iniciar sesión, la interfaz se congeló sin permitir volver al selector.

Al auditar la arquitectura y el código fuente en C de `lightdm-1.32.0` (`src/seat.c`, `src/wayland-session.c`), `seatd-0.8.0` (`seatd/seat.c`) y `weston-13.0.3`, se identificaron 4 causas raíz concurrentes:

1. **Condición de carrera por DRM Master (`/dev/dri/card0`):**
   LightDM lanza la sesión Wayland en VT 2 antes de que el servidor `Xorg` del greeter termine de apagarse en VT 1. Al solicitar `/dev/dri/card0`, `seatd` falla en `drm_set_master()` devolviendo un fd sin capacidad de modesetting, causando el fallo inmediato de Weston.
2. **Colisión de terminal virtual en `tty2`:**
   El manifiesto `console.toml` mantenía un `agetty` escuchando en `tty2`. LightDM (`minimum-vt=1`) asigna VT 2 a la primera sesión de usuario, provocando conflicto de control de terminal con `seatd` en modo `KD_GRAPHICS`.
3. **Incompatibilidad de recursos en `weston.ini`:**
   `weston-desktop-shell` no soporta SVG directamente para wallpapers (requiere PNG/JPEG) y la ruta `/usr/share/icons/utilities-terminal.png` era inexistente (la ruta real instalada es `/opt/groove-graphics/share/weston/icon_terminal.png`).
4. **Sintaxis de backend en Weston 13.0.3:**
   El parámetro `--backend=drm-backend.so` está obsoleto en Weston 13; debe invocarse como `--backend=drm`.

---

## 2. Estrategia de Solución (Doble Vía)

Para satisfacer la necesidad de un arranque Wayland ultra-rápido y estable, manteniendo al mismo tiempo el cumplimiento de la Spec 007 en el selector de LightDM:

### Vía A: Entrada Dedicada en GRUB (Wayland Puro)
- Añadir entrada en GRUB: `Linux Groove 0.2.0 - Compositor Weston (Wayland puro)`.
- Parámetro de kernel: `groove.wayland=1`.
- `groove-init` (PID 1) detecta `groove.wayland=1` y carga el árbol `/etc/groove/wayland-services`.
- Weston corre directamente sobre `tty1` gestionado por `seatd`, sin intermediarios X11 ni LightDM.

### Vía B: Traspaso de Sesión Robusto en LightDM
- Mover `console.toml` a `tty3` en `/etc/groove/services` y `/etc/groove/wayland-services`, liberando VT 1 y VT 2.
- En `/usr/libexec/groove-weston`:
  - Detectar si `Xorg` se encuentra en proceso de cierre y esperar su terminación antes de inicializar el backend DRM.
  - Usar `--backend=drm --renderer=pixman --config=/etc/xdg/weston/weston.ini`.
- Proveer `/usr/share/backgrounds/groove-blue-note.png` rasterizado a 1920×1080.

---

## 3. Matriz de Cambios

| Componente | Archivo | Modificación |
|---|---|---|
| **groove-init** | `crates/groove-init/src/main.rs` | Parser de `groove.wayland=1` y selección de `/etc/groove/wayland-services`. Pruebas unitarias. |
| **Configuración Rootfs** | `scripts/graphics/configure_rootfs.py` | Árbol `/etc/groove/wayland-services`, `console.toml` en `tty3`, wallpaper PNG y corrección de `weston.ini`. |
| **Wrapper Weston** | `/usr/libexec/groove-weston` | Espera de liberación de DRM master, backend DRM y fallback de entorno. |
| **Empaquetado ISO** | `scripts/graphics/package_iso.sh` | Verificación de DAG `wayland-services`, actualización de menú en `grub.cfg`. |
| **Especificaciones** | `docs/specs/009-wayland-standalone-and-session-handoff-spec.md` | Nueva especificación técnica formal. |
| **Seguimiento** | `docs/PROGRESS_TRACKER.md` y `docs/PRD.md` | Actualización de estado y evidencia. |

