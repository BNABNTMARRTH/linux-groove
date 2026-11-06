# Check de avance — Linux Groove

> Estado vigente de apariencia XFCE: [spec 013](specs/013-unified-window-design-spec.md). Las referencias a Picom y decoración universal más abajo describen etapas anteriores; la aceptación UTM de GrooveWindow está pendiente.

Actualizado: 2026-11-05 (America/Mexico_City).
Estados: **pendiente**, **en implementación**, **verificado**.
Una compilación no acredita integración. Las casillas históricas se conservan
como [registro sin validación](progress/LEGACY_PROGRESS_2026-11-04.md).

| Entregable | Estado | Evidencia / criterio pendiente |
|---|---|---|
| Arranque ARM64 UEFI con ACPI | verificado | Prueba previa de ISO en UTM: prompt groove@bluenote; docs/UTM_BOOT.md |
| TUI y demostración minifb | verificado | Código de groove-compositor; capacidades simuladas identificadas |
| Plan de entrega gráfica | verificado | docs/plans/GRAPHICAL_DESKTOP_IMPLEMENTATION.md, DEDICATED_WESTON_WAYLAND_PLAN.md y DESKTOP_EVOLUTION_OPTIONS.md |
| Specs de sesiones y Smithay | verificado | Specs 007, 008, 009 y 010; estado e interfaces documentados |
| Supervisor real de groove-init | verificado | Validación DAG en chroot superada; soporte de wayland-services y recuperación |
| Fuentes BLFS y construcción reproducible | verificado | Recetas compiladas en /opt/groove-graphics; lockfile y hashes verificados |
| Kernel con INPUT_EVDEV | verificado | Kernel 6.12 compilado con CONFIG_INPUT_EVDEV=y, ACPI=y y USER_NS=y |
| Bibliotecas, Xorg, Mesa, GTK y entrada | verificado | Auditoría ELF audit_runtime.sh 100% superada sin dependencias faltantes |
| Selector LightDM / apariencia Blue Note | verificado | Greeter GTK Blue Note desplegado en UTM con tema Groove, reloj, selector y sesión |
| Sesión XFCE y utilidades | en implementación | Empacado en ISO 0.2.0; disponible en opción 2 de GRUB / LightDM |
| Sesión Weston (Selector LightDM) | verificado | Resuelto traspaso DRM master y colisión VT2; verificado en UTM |
| Entrada dedicada Weston en GRUB | verificado | Verificado en UTM con prompt interactivo; ascendido a arranque por defecto |
| Escritorio Blue Note Glass (Weston) | verificado | Spec 010: Top Bar translúcida (34px), Dock flotante macOS (68px/58px), 6 iconos vectoriales squircle, botones semáforo, terminal translúcida (84%); el fondo piano de la nueva entrega requiere comprobarse en la ISO |
| Acceso sin contraseña solo LiveUSB | verificado | test_live_access.sh superó pruebas PAM de seguridad y restricción LiveUSB |
| Firefox ESR, DHCP/DNS y HTTPS | verificado | Firefox ESR 153.6.0 compilado e instalado en /opt/groove-graphics (836MB ISO) |
| Recuperación y manejo de fallos | verificado | groove.text=1 y consola de recuperación configuradas en GRUB |
| ISO gráfica y checksums | verificado | linux-groove-0.2.0-aarch64.iso (827MB) generada con SHA256 8e1a891762329e750192f0d4aca3f880ffd6669d512564d98cd025f9df6e3f53 |
| Compositor propio Rust/Smithay | pendiente | Spec 008; no registrar todavía una sesión no funcional |
| Audio RT, suites y rendimiento | pendiente | Auditoría funcional y mediciones reales; no usar valores simulados |

## Wayfire / Blue Note Glass — 2026-11-05

| Entregable | Estado | Evidencia / criterio pendiente |
|---|---|---|
| Plan y spec 011 | verificado | Plan aprobado guardado y criterios documentados |
| Fondo piano actualizado al reempaquetar | verificado | 2 tests Python del constructor, incluido reemplazo de imagen antigua; falta observación de la nueva ISO |
| Fuentes y compilación aislada Wayfire | verificado | 28 paquetes en /opt/groove-wayfire; tarballs/subproyectos fijados con SHA256; logs del constructor |
| Selección de grafo Wayfire / recuperación | verificado | 9 pruebas de groove-init, incluida prioridad de consola sobre Wayfire |
| Waybar, wf-dock, pixdecor y perfiles | en implementación | Compilados/configurados; falta aceptación visual y funcional UTM |
| Aceleración VirGL en UTM | verificado | Prueba de renderD128 en QA: EGL 1.4, virgl (ANGLE Apple M4, OpenGL 4.1 Metal); falta aceptación completa del escritorio |
| ISO candidata 0.3.0 | en implementación | RC1 generada y arrancada por UEFI; detectados permisos del fondo y fallo del runtime C++. RC3 corrige ambos; aceptación en curso, sin promoción |
| Rendimiento del nuevo escritorio | pendiente | Registrar RAM, CPU, arranque y animaciones reales, sin estimaciones |
| Promoción a escritorio predeterminado | pendiente | Requiere aceptación UEFI/UTM; Weston sigue predeterminado |

## Evolución macOS Glass — Fase 1 (XFCE + Picom + groove-dock) — 2026-11-05

| Entregable | Estado | Evidencia / criterio pendiente |
|---|---|---|
| Plan híbrido por fases | verificado | hybrid_macos_glass_evolution_plan.md aprobado y guardado |
| Picom compositor compilado | verificado | /opt/groove-graphics/bin/picom v9.1 compilado con libev, libconfig, libpcre, XCB y GLX; 100% dependencias internas en /opt/groove-graphics/lib |
| groove-dock flotante con zoom macOS | verificado | /opt/groove-graphics/bin/groove-dock nativo GTK3 + Cairo + libwnck-3.0 con magnificación gaussiana 60 FPS e indicadores de ventanas abiertas |
| Tema universal xfwm4 macOS | verificado | /usr/share/themes/GrooveBlueNote/xfwm4/ con button_layout=CHM| (semáforo rojo #FF5F56, amarillo #FFBD2E, verde #27C93F a la izquierda en todas las ventanas) y máscaras XPM de esquinas redondeadas 12px |
| Top bar única 32px glass | verificado | xfce4-panel.xml reconfigurado con panel-1 (32px translúcido, menú 🎷 Groove, pager, reloj centrado, systray, acciones) y eliminación de panel-2 |
| Fondo Piano Keys Neon 4K universal | verificado | xfce4-desktop.xml configurado con /usr/share/backgrounds/groove-default.png para todos los identificadores de monitores RandR |
| Entrada predeterminada en GRUB (default=0) | verificado | ISO configurada con default=0 apuntando directamente a Blue Note macOS Glass (XFCE + Picom), manteniendo Wayfire 3D, Weston y Consola en el menú |
| ISO candidata 0.3.0-rc13 | verificado | linux-groove-0.3.0-rc13-aarch64.iso (848 MB) generada en /Volumes/Backup/linux_groove_terabit/iso/ con SHA256 cb75585f01620b9e8502a12a24b9ead00f3552b526d2c89dcc5d34ba8e812f40 |

## Mediciones de la ISO gráfica actual (Candidata macOS Glass)

- **Imagen:** `linux-groove-0.3.0-rc13-aarch64.iso`
- **Ubicación:** `/Volumes/Backup/linux_groove_terabit/iso/linux-groove-0.3.0-rc13-aarch64.iso`
- **Tamaño:** 848 MB (889,454,592 bytes)
- **SHA-256:** `cb75585f01620b9e8502a12a24b9ead00f3552b526d2c89dcc5d34ba8e812f40`
- **Arranque por defecto (GRUB `default=0`):** `Linux Groove 0.3.0-rc13 - Blue Note macOS Glass (XFCE + Picom)`.
- **Entorno de usuario:** XFCE 4.18/4.20 con compositor Picom (sombras 24px, esquinas redondeadas 12px, blur dual-kawase en GLX / xrender), Server-Side Decorations universales `xfwm4` con botones semáforo a la izquierda, Dock flotante macOS `groove-dock` con magnificación al hover e indicadores de ventanas activas, y fondo Piano Keys Neon 4K.

## Mediciones de la ISO gráfica previa (Línea base Weston)

- **Imagen:** `linux-groove-0.2.0-aarch64.iso`
- **Tamaño:** 827 MB (867,106,816 bytes)
- **SHA-256:** `8e1a891762329e750192f0d4aca3f880ffd6669d512564d98cd025f9df6e3f53`
- **Arranque por defecto (GRUB `default=0`):** `Linux Groove 0.2.0 - Blue Note Glass Desktop (Wayland)` (`groove.wayland=1`).
- **Entorno de usuario:** Weston 13.0.3 Wayland modificado con Top Bar + macOS Dock flotante + botones semáforo + Terminal translúcida + Wallpaper Piano Keys Neon.

## GrooveWindow — spec 013 (estado vigente de XFCE)

Las afirmaciones anteriores sobre semáforos universales y Picom son históricas;
la configuración vigente usa XFWM y coherencia por aplicación.

| Entregable | Estado | Evidencia |
|---|---|---|
| Tokens y generador XFWM/GTK 1×/2× | Implementado | configure_window_design.py y test_window_design.py |
| Defaults XFCE, fuentes y ONLYOFFICE | Implementado; pruebas de tema Xvfb, apps UTM pendientes | Spec 013 |
| Superficie transparente del dock | Implementado; validación visual pendiente | groove-dock.c |
| ISO rc21 y pruebas de construcción | Verificado, no promovida | docs/validation/unified-window-design/README.md y rc21-build.log |
| Matriz UTM y promoción | Pendiente | No acreditada por pruebas estáticas |
| Adaptación Wayfire | Planificada posteriormente | Fuera de esta entrega |
