# 03 — Especificación de Pruebas Unitarias y de Integración (Rust)

Todas las piezas en Rust de **Linux Groove** cuentan con pruebas unitarias deterministas ejecutables mediante `cargo test --workspace`.

---

## 1. Matriz de Pruebas Unitarias por Crate

### A. `crates/groove-preload` (`libgroove_fast.so`)
| ID Prueba | Nombre de Función Test | Qué Verifica | Criterio de Éxito |
| :--- | :--- | :--- | :--- |
| **UT-PRE-01** | `test_classify_compositor_and_shell` | Clasificación exacta de `kwin_wayland`, `wayfire` y `plasmashell` a partir de su cadena `comm` (con y sin salto de línea final). | Retorna `ProcessClass::Compositor` (`nice -12`) y `ProcessClass::ShellUI` (`nice -8`). |
| **UT-PRE-02** | `test_classify_interactive_apps` | Clasificación de `dolphin`, `konsole`, `systemsettings`, `krunner`. | Retorna `ProcessClass::InteractiveApp` (`nice -5`). |
| **UT-PRE-03** | `test_classify_background_ignored` | Verifica que procesos normales (`bash`, `ls`, `systemd`, `python3`) no reciban alteración de prioridad. | Retorna `ProcessClass::Standard` (`nice 0`, sin syscalls innecesarias). |
| **UT-PRE-04** | `test_fast_allocator_alignment_and_zeroing` | Reserva, realineación y liberación de bloques pequeños (16B a 64KB) simulando cargas de nodos QML/Qt6. | Punteros alineados a 16 bytes, memoria inicializada a cero en `calloc`, 0 fugas. |
| **UT-PRE-05** | `test_preload_safe_fallback_on_unprivileged` | Si `setpriority` se ejecuta sin `CAP_SYS_NICE` (usuario normal sin permisos de elevar nice), el hook no aborta ni lanza pánico. | Retorna `Ok(AppliedState::GracefulSkip)` sin errores. |

---

### B. `crates/groove-boostd` (Daemon de Precarga en RAM y Tuning)
| ID Prueba | Nombre de Función Test | Qué Verifica | Criterio de Éxito |
| :--- | :--- | :--- | :--- |
| **UT-BST-01** | `test_page_warmer_touches_all_pages` | Crea un archivo temporal de 128 KB (32 páginas de 4 KB) y ejecuta `warm_file_into_ram()`. | Devuelve exactamente `32` páginas tocadas y `131072` bytes precargados en caché. |
| **UT-BST-02** | `test_page_warmer_handles_empty_and_missing` | Verifica comportamiento ante archivos vacíos (`0 bytes`) o rutas inexistentes. | Archivos vacíos retornan `0` páginas sin fallar en `mmap`; rutas faltantes se registran y omiten limpiamente. |
| **UT-BST-03** | `test_library_discovery_filter` | Filtra en un directorio simulado `/usr/lib` únicamente librerías críticas (`libQt6*.so*`, `libKF6*.so*`, `libkwin*.so*`). | Selecciona todas las librerías gráficas e ignora archivos `.a`, `.cmake` o documentación. |
| **UT-BST-04** | `test_sysctl_profile_generation` | Verifica los pares clave/valor de optimización del kernel para modo Live RAM. | `vm.swappiness=10`, `vm.vfs_cache_pressure=50`, `vm.dirty_ratio=15`. |

---

### C. `crates/groove-cli` (`groove-profile`, `groove-diagnostics`, `groove-session-ready`)
| ID Prueba | Nombre de Función Test | Qué Verifica | Criterio de Éxito |
| :--- | :--- | :--- | :--- |
| **UT-CLI-01** | `test_profile_instant_config_values` | Genera la configuración de `kdeglobals` y `kwinrc` para el perfil `instant`. | `AnimationDurationFactor=0`, `LatencyPolicy=ExtremelyLow`, `DirectScanout=true`. |
| **UT-CLI-02** | `test_profile_expressive_config_values` | Genera la configuración para el perfil `expressive`. | `AnimationDurationFactor=0.15`, `blurEnabled=true`, `wobblywindowsEnabled=true`, `cubeEnabled=true`. |
| **UT-CLI-03** | `test_profile_studio_low_latency_audio` | Verifica que el perfil `studio` ajuste el quantum de PipeWire a `256` a `48000 Hz` y desactive efectos pesados de GPU. | `quantum=256`, `rate=48000`, `blurEnabled=false`. |
| **UT-CLI-04** | `test_ini_patcher_preserves_existing_sections` | Modifica claves dentro de `[KDE]`, `[Plugins]` y `[Compositing]` en archivos INI reales sin borrar `[General]` ni `[Windows]`. | Todas las secciones previas permanecen intactas; escritura atómica vía archivo temporal. |
| **UT-CLI-05** | `test_session_ready_socket_validation` | Prueba el validador de sesión Wayland con un `UnixListener` real en un directorio temporal `XDG_RUNTIME_DIR`. | Detecta el socket activo y genera el archivo `groove-graphical-ready` en `< 1 ms`. |
| **UT-CLI-06** | `test_diagnostics_json_schema_serialization` | Ejecuta el recolector de diagnóstico en modo prueba y valida la estructura JSON resultante. | JSON válido con campos `timestamp`, `kernel`, `memory`, `compositors`, `rust_boost_active`. |
| **UT-CLI-07** | `test_kwin_dbus_reconfigure_command_builder` | Verifica la construcción exacta de los comandos de recarga en caliente de KDE (`org.kde.KWin /KWin org.kde.KWin.reconfigure` y PipeWire metadata) al cambiar de perfil. | Secuencia IPC generada sin errores y tolerante a ejecución fuera de sesión gráfica. |
| **UT-CLI-08** | `test_krunner_query_matcher_instant_response` | Prueba el motor de búsqueda rápida tipo KRunner (`groove instant`, `groove 3d`, `groove studio`) verificando coincidencias por relevancia y acciones asociadas. | Retorna resultados ordenados por score (`1.0` exact match) en `< 0.1 ms`. |

---

## 2. Comando de Ejecución de la Suite Completa

```bash
cargo test --workspace -- --nocapture
```

