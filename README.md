# Linux Groove OS — Groove estable sobre Arch Linux ARM

Sistema operativo Linux de alto rendimiento para creadores de música, código y contenido en Apple Silicon (MacBooks M1, M2, M3, M4) y hardware ARM64 (`aarch64`), compatible tanto en virtualización nativa (UTM / Hypervisor.framework) como en bare metal.

Groove usa una base nativa de Arch Linux ARM con systemd, KDE Plasma Wayland
como escritorio principal y Wayfire como sesión alternativa. Es un desarrollo
independiente enfocado en creadores y alto rendimiento.

## Estado actual (0.4.1 candidate — Noviembre 2026)

- **Imagen ISO:** `linux-groove-0.4.0-studio-arch-aarch64.iso` (2.6 GB, SHA-256: `9b40c9229894b7ffe4e40aea400083a6af399acb27bab66f5deda7e1a6a758b3`).
- **Base del Sistema:** Arch Linux ARM oficial con `pacman`, `systemd`, `logind`, SDDM, NetworkManager, PipeWire/WirePlumber y Flatpak.
- **Entorno Predeterminado:** **KDE Plasma 6 Wayland** (acelerado por KWin, con soporte de resoluciones dinámicas Mac Retina, menú contextual completo con clic derecho y centro de ajustes del sistema integrado).
- **Diseño Visual:** Groove oscuro sobrio, acento latón, controles monocromáticos a la izquierda y Breeze nativo; blur solo en el perfil Expresivo.
- **Protección Anti-Cuelgues:**
  - Aislamiento nativo de memoria Wayland (si una aplicación pesada de IA o Electron se congela, el ratón y el dock se mantienen fluidos a 60 fps).
  - Atajo global universal para forzar salida: `Cmd + Option + Esc` / `Ctrl + Alt + Esc` con terminador instantáneo `Kill Window`.
  - Cierre rápido con `Cmd + Q` / `Alt + F4`.
- **Sesiones Disponibles en GRUB y Pantalla de Inicio:**
  1. **Groove Studio Edition (KDE Plasma 6 Wayland)** *(Predeterminada)*.
  2. **Groove · Wayfire (Wayfire 0.11 con plugins compatibles)**.
  4. **Consola de recuperación**.

## Documentación

- [Diseño del Sistema e Interfaz (.interface-design/system.md)](.interface-design/system.md).
- [Plan Maestro de Arquitectura Groove Studio (docs/plans/PLAN_ARQUITECTURA_GROOVE_STUDIO.md)](docs/plans/PLAN_ARQUITECTURA_GROOVE_STUDIO.md).
- [Registro de Avance y Mediciones (docs/PROGRESS_TRACKER.md)](docs/PROGRESS_TRACKER.md).
- [Diagnóstico del arranque UTM/ACPI (docs/UTM_BOOT.md)](docs/UTM_BOOT.md).

## Desarrollo

```sh
cargo test -p groove-init
cargo run -p groove-init -- --check-services /ruta/a/manifiestos
cargo run -p groove-lfs -- status
cargo run -p groove-installer -- --dry-run
```

Validar servicios no los inicia ni requiere modificar el sistema anfitrión.
Los comandos de inspección y simulación no acreditan una instalación completa.

## Construcción de la ISO gráfica

El código permanece en este repositorio y los artefactos grandes en
`/Volumes/Backup/linux_groove_terabit`. Se requiere Docker ARM64 y la ISO base
0.1.0 verificada; la compilación ocurre en un contenedor y un rootfs de staging.

```sh
./scripts/build_graphical_iso.sh
```

El script genera una **ISO candidata nueva**, sin sobrescribir la base 0.1.0.
Antes de declararla verificada se debe probar el arranque UEFI, ambas sesiones,
entrada, logout, recuperación y navegación HTTPS en UTM.

En LiveUSB se permite iniciar como `groove` sin contraseña desde el selector;
esta excepción requiere una marca creada durante el arranque y no aplica a
instalaciones normales. Los cambios del LiveUSB se pierden al reiniciar.

## Estructura

`crates/` contiene las herramientas Rust; `kernel/`, la configuración ARM64;
`lfs/`, los manifiestos base; `scripts/graphics/`, las recetas, configuración y
pruebas de integración gráfica; `docs/`, las specs y evidencia.

Las metas anteriores de tamaño, memoria, latencia y arranque se mantienen como
objetivos medibles, no como resultados garantizados de la ISO gráfica.

Licencia: Apache-2.0 o MIT.

## Refinamiento Blue Note — antecedente 2026-11-05

La spec 013 sustituye estas decisiones visuales para XFCE; Wayfire conserva
su configuración hasta su adaptación posterior.

Dirección aprobada: oscuro sobrio, terminal GTK opaca, controles monocromáticos
a la derecha y cuatro lanzadores compartidos (Terminal, Archivos, Editor, Firefox).
Barra 34 px con métricas en tooltip; dock 64 px con iconos propios de 40/80 px.
Sustituye la apariencia de las candidatas anteriores. Wayfire sigue candidato
hasta completar aceptación; Weston, XFCE y consola se conservan.
Audacity, Blender, persistencia y gestor de aplicaciones quedan para después.

Ver [spec 012](docs/specs/012-blue-note-refinement-spec.md) y el informe de validación.
