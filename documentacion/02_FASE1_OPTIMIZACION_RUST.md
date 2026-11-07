# 02 — Fase 1: Optimización de Latencia Cero e Inyección en Rust

## 1. Objetivo de Ingeniería
Eliminar toda latencia perceptible al abrir/cerrar ventanas, desplegar menús y ejecutar aplicaciones en KDE Plasma 6 (Wayland) mediante la inyección de bibliotecas nativas en **Rust**, precarga inteligente de páginas en RAM y ajuste de baja latencia en KWin/Qt6.

---

## 2. Módulos en Rust a Desarrollar

### Módulo 1: `crates/groove-preload` → `/usr/lib/libgroove_fast.so`
Biblioteca dinámica (`cdylib`) en Rust para aceleración de procesos gráficos:
- **Reemplazo de Asignador de Memoria (`mimalloc`):** Reduce el tiempo de reserva y liberación de objetos pequeños de C++/Qt6/QML hasta en un 35%.
- **Detección Ultra-Rápida de Proceso (`classify_process_comm`):**
  - Lee `/proc/self/comm` al inicializar el proceso (`.init_array`).
  - Clasifica el proceso en niveles de prioridad (`Compositor`, `ShellUI`, `RealtimeAudio`, `InteractiveApp`, `Background`).
- **Auto-Tuning de Prioridad de CPU e I/O:**
  - Aplica `setpriority(PRIO_PROCESS, 0, nice_target)` e `ioprio_set` automáticamente a `kwin_wayland`, `plasmashell`, `pipewire`, `dolphin`, `konsole` y `systemsettings`.

### Módulo 2: `crates/groove-boostd` → `/usr/bin/groove-boostd`
Daemon de sistema en Rust gestionado por `systemd` (`groove-boostd.service`):
- **Precarga y Calentamiento de RAM (`RAM Page-Cache Warmer`):**
  - Escanea las bibliotecas compartidas críticas (`libQt6Core.so*`, `libQt6Gui.so*`, `libQt6Quick.so*`, `libQt6WaylandClient.so*`, `libkwin.so*`) y ejecutables frecuentes.
  - Ejecuta `mmap` + `posix_fadvise(..., POSIX_FADV_WILLNEED)` leyendo páginas cada 4096 bytes para forzar que el kernel descomprima y mantenga los bloques del SquashFS en la caché de páginas de RAM.
- **Sysctl Optimizer:**
  - Configura `vm.swappiness=10` y `vm.vfs_cache_pressure=50` para que el kernel nunca descarte los inodos ni las librerías gráficas de la RAM.

### Módulo 3: `crates/groove-cli` → `/usr/bin/groove-*`
Reescritura completa de las herramientas del sistema (actualmente en Python/Bash) a binarios nativos en Rust con arranque en `< 0.5 ms`, incorporando los patrones de integración directa con KDE Plasma 6:
- `groove-session-ready`: Validación atómica del socket Wayland y registro de arranque.
- `groove-profile`: Conmutador instantáneo de perfiles (`instant`, `expressive`, `studio`, `stable`, `status`, `restore`) con **notificación en vivo vía D-Bus a KWin (`org.kde.KWin /KWin reconfigure`)**, aplicando cambios de latencia y efectos 3D en `< 2 ms` sin cerrar sesión.
- `groove-runner` (integrado en `groove-profile query <term>`): Motor de respuesta instantánea para consultas desde el lanzador de Plasma / KRunner (`groove instant`, `groove 3d`, `groove studio`, `groove ram`), permitiendo cambiar la aceleración del sistema desde `Alt+Espacio`.
- `groove-diagnostics`: Recolector paralelo de telemetría local (kernel, sesiones, compositor, memoria, PipeWire, estado de `libgroove_fast.so` y `groove-boostd`).

---

## 3. Configuración de Latencia Cero en KDE Plasma 6 / KWin

| Archivo | Parámetro | Valor | Propósito |
| :--- | :--- | :--- | :--- |
| `/etc/xdg/kdeglobals` | `AnimationDurationFactor` | `0.125` (o `0` en perfil `instant`) | Apertura y cierre instantáneo de ventanas y menús |
| `/etc/xdg/kwinrc` | `LatencyPolicy` | `ExtremelyLow` | Despacho inmediato de frames en Wayland |
| `/etc/xdg/kwinrc` | `DirectScanout` | `true` | Evita copias intermedias de GPU en ventanas activas |
| `/etc/environment.d/10-groove-fast.conf` | `QSG_RENDER_LOOP` | `threaded` | Renderizado Qt6 multihilo dedicado |
| `/etc/environment.d/10-groove-fast.conf` | `QML_DISK_CACHE` | `aot` | Caché de bytecode QML precompilado |

