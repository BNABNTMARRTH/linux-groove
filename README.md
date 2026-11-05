# Linux Groove OS — The Blue Note Edition

## Blue Note Glass: Wayfire en integración

La siguiente ISO conserva Weston, XFCE y recuperación e incorpora una sesión
Wayfire + Waybar con el piano de Groove como fondo, dock y perfil de efectos 3D.
La aceleración y la promoción a escritorio predeterminado requieren evidencia en
UTM. [Plan](docs/plans/WAYFIRE_BLUE_NOTE_GLASS_IMPLEMENTATION.md) ·
[Spec](docs/specs/011-wayfire-blue-note-glass-spec.md) ·
[Construcción](docs/GRAPHICAL_BUILD.md) · [Avance](docs/PROGRESS_TRACKER.md).


Distribución ARM64 basada en LFS 12.2, con PID 1 y herramientas propias en Rust.
El escritorio Wayland propio con Smithay es parte de la hoja de ruta.

## Estado real

La ISO **0.1.0** arranca mediante UEFI/ACPI en UTM y ofrece la TUI Blue Note.
`groove-compositor` todavía contiene una TUI y una demo gráfica minifb para macOS;
no es aún un compositor Wayland funcional. Los indicadores de la demostración
son simulados. Audio RT, suites creativas y métricas requieren validación real.

La entrega **0.2.0 gráfica está en implementación**: selector LightDM, XFCE/X11,
Weston como sesión alternativa, utilidades y Firefox ESR. Las dependencias se
compilan desde fuentes siguiendo BLFS; no se sustituye la base por otra distro.
Consultar el [check de avance con evidencia](docs/PROGRESS_TRACKER.md).

## Documentación

- [Plan de implementación](docs/plans/GRAPHICAL_DESKTOP_IMPLEMENTATION.md).
- [PRD](docs/PRD.md) y [plan maestro](docs/phases/MASTER_PLAN_PHASES.md).
- [Spec 007: sesiones gráficas](docs/specs/007-graphical-sessions-spec.md).
- [Spec 008: escritorio Rust/Smithay](docs/specs/008-smithay-desktop-roadmap-spec.md).
- [Diagnóstico del arranque UTM/ACPI](docs/UTM_BOOT.md).
- [Construcción gráfica desde fuentes](docs/GRAPHICAL_BUILD.md).

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

## Refinamiento Blue Note — 2026-11-05

Dirección aprobada: oscuro sobrio, terminal GTK opaca, controles monocromáticos
a la derecha y cuatro lanzadores compartidos (Terminal, Archivos, Editor, Firefox).
Barra 34 px con métricas en tooltip; dock 64 px con iconos propios de 40/80 px.
Sustituye la apariencia de las candidatas anteriores. Wayfire sigue candidato
hasta completar aceptación; Weston, XFCE y consola se conservan.
Audacity, Blender, persistencia y gestor de aplicaciones quedan para después.

Ver [spec 012](docs/specs/012-blue-note-refinement-spec.md) y el informe de validación.
