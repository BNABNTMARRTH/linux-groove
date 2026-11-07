# Documentación Oficial del Proyecto — Linux Groove OS

Bienvenido al repositorio central de documentación técnica, arquitectura, planes de ingeniería y pruebas unitarias de **Linux Groove OS (ARM64 / Apple Silicon & x86_64)**.

---

## Estructura de la Carpeta `documentacion/`

1. **[`01_ARQUITECTURA_BOOT_Y_ROOTFS.md`](./01_ARQUITECTURA_BOOT_Y_ROOTFS.md)**
   - Arquitectura del sistema Live híbrido (UEFI GRUB2 + Initramfs `mkinitcpio` + SquashFS `gzip` + OverlayFS en RAM).
   - Diagnóstico forense y soluciones aplicadas para compatibilidad con UTM / QEMU / Apple Silicon.
   - Configuración de SDDM, PAM, AccountsService y coexistencia de **KDE Plasma 6 (Wayland)** y **Wayfire 3D**.

2. **[`02_FASE1_OPTIMIZACION_RUST.md`](./02_FASE1_OPTIMIZACION_RUST.md)**
   - Plan completo de aceleración e inyección nativa en **Rust** para respuesta instantánea (0 ms de latencia percibida).
   - Especificación de `libgroove_fast.so` (`mimalloc` + hooks de prioridad CPU/IO), `groove-boostd` (precarga de librerías Qt6/KDE en RAM) y herramientas CLI nativas en Rust (`groove-profile`, `groove-diagnostics`, `groove-session-ready`).

3. **[`03_ESPECIFICACION_PRUEBAS_UNITARIAS.md`](./03_ESPECIFICACION_PRUEBAS_UNITARIAS.md)**
   - Suite de pruebas unitarias (`cargo test`) para todos los crates en Rust.
   - Pruebas de inyección dinámica (`LD_PRELOAD`), pruebas de precarga en caché de páginas (`mincore` / `mmap`), pruebas de perfiles de latencia y pruebas de humo de la imagen ISO.

4. **[`04_FASE2_APARIENCIA_PLASMA.md`](./04_FASE2_APARIENCIA_PLASMA.md)**
   - Arquitectura de personalización visual de KDE Plasma 6 (QML, SVG, KWin, paneles, docks, temas e identidad Blue Note).

5. **[`05_ANALISIS_ARQUITECTURA_RUST_KDE.md`](./05_ANALISIS_ARQUITECTURA_RUST_KDE.md)**
   - Estudio técnico de los repositorios Rust en `invent.kde.org` (`cxx-qt`, `cxx-kde-frameworks`, D-Bus runners, `KConfig` + `KWin reconfigure`) y cómo sus mejores patrones arquitectónicos se aplican en Linux Groove.

6. **[`WALKTHROUGH_041_BOOT_FIX.md`](./WALKTHROUGH_041_BOOT_FIX.md)**
   - Registro forense exhaustivo del diagnóstico y solución del arranque en Linux Groove 0.4.1, inventario detallado de todos los archivos modificados/creados y código exacto añadido.

