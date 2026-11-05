# Check de avance — Linux Groove

Actualizado: 2026-11-05 (America/Mexico_City).
Estados: **pendiente**, **en implementación**, **verificado**.
Una compilación no acredita integración. Las casillas históricas se conservan
como [registro sin validación](progress/LEGACY_PROGRESS_2026-11-04.md).

| Entregable | Estado | Evidencia / criterio pendiente |
|---|---|---|
| Arranque ARM64 UEFI con ACPI | verificado | Prueba previa de ISO en UTM: prompt groove@bluenote; docs/UTM_BOOT.md |
| TUI y demostración minifb | verificado | Código de groove-compositor; capacidades simuladas identificadas |
| Plan de entrega gráfica | verificado | docs/plans/GRAPHICAL_DESKTOP_IMPLEMENTATION.md y DEDICATED_WESTON_WAYLAND_PLAN.md |
| Specs de sesiones y Smithay | verificado | Specs 007, 008 y 009; estado e interfaces documentados |
| Supervisor real de groove-init | verificado | Validación DAG en chroot superada; soporte de wayland-services y recuperación |
| Fuentes BLFS y construcción reproducible | verificado | Recetas compiladas en /opt/groove-graphics; lockfile y hashes verificados |
| Kernel con INPUT_EVDEV | verificado | Kernel 6.12 compilado con CONFIG_INPUT_EVDEV=y, ACPI=y y USER_NS=y |
| Bibliotecas, Xorg, Mesa, GTK y entrada | verificado | Auditoría ELF audit_runtime.sh 100% superada sin dependencias faltantes |
| Selector LightDM / apariencia Blue Note | verificado | Greeter GTK Blue Note desplegado en UTM con tema Groove, reloj, selector y sesión |
| Sesión XFCE y utilidades | en implementación | Empacado en ISO 0.2.0; pendiente prueba en UTM |
| Sesión Weston (Selector LightDM) | en implementación | Resuelto traspaso DRM master y colisión VT2; en validación ISO |
| Entrada dedicada Weston en GRUB | en implementación | Spec 009 implementada en groove-init y grub.cfg; en validación ISO |
| Acceso sin contraseña solo LiveUSB | verificado | test_live_access.sh superó pruebas PAM de seguridad y restricción LiveUSB |
| Firefox ESR, DHCP/DNS y HTTPS | verificado | Firefox ESR 153.6.0 compilado e instalado en /opt/groove-graphics (836MB ISO) |
| Recuperación y manejo de fallos | verificado | groove.text=1 y consola de recuperación configuradas en GRUB |
| ISO gráfica y checksums | verificado | linux-groove-0.2.0-aarch64.iso (845MB) generada con SHA256 ffc5af07... |
| Compositor propio Rust/Smithay | pendiente | Spec 008; no registrar todavía una sesión no funcional |
| Audio RT, suites y rendimiento | pendiente | Auditoría funcional y mediciones reales; no usar valores simulados |

## Mediciones de la ISO gráfica

Tamaño de ISO, RAM en reposo, tiempo hasta selector, frame timing y audio:
**pendientes**. Registrar comando, artefacto/hash, VM y resultado al medir.
No extrapolar los KPIs de la demo ni de la ISO TUI.
