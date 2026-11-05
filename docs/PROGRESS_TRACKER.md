# Check de avance — Linux Groove

Actualizado: 2026-11-04 (America/Mexico_City).
Estados: **pendiente**, **en implementación**, **verificado**.
Una compilación no acredita integración. Las casillas históricas se conservan
como [registro sin validación](progress/LEGACY_PROGRESS_2026-11-04.md).

| Entregable | Estado | Evidencia / criterio pendiente |
|---|---|---|
| Arranque ARM64 UEFI con ACPI | verificado | Prueba previa de ISO en UTM: prompt groove@bluenote; docs/UTM_BOOT.md |
| TUI y demostración minifb | verificado | Código de groove-compositor; capacidades simuladas identificadas |
| Plan de entrega gráfica | verificado | docs/plans/GRAPHICAL_DESKTOP_IMPLEMENTATION.md; decisiones del usuario |
| Specs de sesiones y Smithay | verificado | Specs 007/008; estado e interfaces documentados |
| Supervisor real de groove-init | en implementación | Validación DAG y pruebas iniciales; faltan pruebas Linux/imagen |
| Fuentes BLFS y construcción reproducible | en implementación | Recetas y scripts de bloqueo/build; falta terminar compilación |
| Kernel con INPUT_EVDEV | en implementación | Defconfig actualizado; falta compilar/verificar imagen |
| Bibliotecas, Xorg, Mesa, GTK y entrada | en implementación | Falta build completo y auditoría ELF |
| Selector LightDM / apariencia Blue Note | pendiente | Debe mostrarse en UTM y aceptar selección |
| Sesión XFCE y utilidades | pendiente | Entrar, usar ventanas reales y cerrar sesión |
| Sesión Weston | pendiente | Cliente Wayland, entrada y retorno al selector |
| Acceso sin contraseña solo LiveUSB | pendiente | Pruebas positivas/negativas de PAM y marca de runtime |
| Firefox ESR, DHCP/DNS y HTTPS | pendiente | Build desde fuentes, perfil como groove y navegación real |
| Recuperación y manejo de fallos | pendiente | Consola, límites de reinicio, recolección y recuperación en VM |
| ISO gráfica y checksums | pendiente | Empaquetar y arrancar desde ISO por UEFI |
| Compositor propio Rust/Smithay | pendiente | Spec 008; no registrar todavía una sesión no funcional |
| Audio RT, suites y rendimiento | pendiente | Auditoría funcional y mediciones reales; no usar valores simulados |

## Mediciones de la ISO gráfica

Tamaño de ISO, RAM en reposo, tiempo hasta selector, frame timing y audio:
**pendientes**. Registrar comando, artefacto/hash, VM y resultado al medir.
No extrapolar los KPIs de la demo ni de la ISO TUI.
