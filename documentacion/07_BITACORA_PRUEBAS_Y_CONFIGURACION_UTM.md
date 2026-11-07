# Bitácora de Pruebas, Especificación de la ISO y Configuración Óptima en UTM
**Linux Groove 0.4.1 (Arch ARM + SteamOS aarch64)**

---

## 1. Ficha Técnica de la Imagen ISO 0.4.1

| Parámetro | Valor Verificado |
|---|---|
| **Archivo ISO** | `linux-groove-0.4.1-aarch64.iso` |
| **Ubicación en Host** | `/Volumes/Backup/linux_groove_terabit/iso/linux-groove-0.4.1-aarch64.iso` |
| **Tamaño en Disco** | 2.31 GB (2,479,286,272 bytes) |
| **Checksum SHA256** | `f3634e6ed35860a4d656550cd862f2a613a9b52b7e65b05bad03b0d2bd6fadf9` |
| **Kernel Base** | Linux `7.3.1-2-aarch64-ARCH` (PREEMPT_DYNAMIC) |
| **Compresión RootFS** | SquashFS 4.0 con `gzip`, bloque de 256K (compatibilidad de descompresión inmediata) |
| **Gestor de Pantalla** | SDDM con tema Groove (`groove`), usuario por defecto `groove` |
| **Sesión por Defecto** | KDE Plasma 6 (Wayland) |
| **Control en Tiempo Real** | `groove-bridged` escuchando nativamente en puerto `8080` con `/dev/uinput` |
| **Aceleración Nativa** | `libgroove_fast.so` en `/etc/ld.so.preload` + `groove-boostd.service` |

---

## 2. Configuración Óptima de UTM para Apple Silicon (M-Series / M4)

Para garantizar la máxima velocidad, animaciones elásticas a 60/120 FPS y soporte completo de efectos 3D en KWin, la máquina virtual en UTM debe configurarse con los siguientes parámetros:

### A. Sistema y Procesamiento
- **Arquitectura:** `ARM64 (aarch64)`
- **Memoria RAM:** `8192 MB` (8 GB). Permite retener en RAM el rootfs y las bibliotecas gráficas sin paginación.
- **Núcleos de CPU:** `6 núcleos`. Distribuye el trabajo del compositor, el navegador y las aplicaciones de forma paralela sin saturar los 10 núcleos de tu Apple M4.
- **Acelerador de Hardware:** `HVF` (Hypervisor Framework de macOS).

### B. Tarjeta Gráfica y Pantalla (¡Crítico para Efectos 3D y Wobbly Windows!)
- **Hardware de Pantalla:** **`virtio-ramfb-gl`** (con aceleración por GPU / Metal activada).
  > **Nota Técnica:** Si se utiliza `virtio-gpu-pci` simple, UTM arranca QEMU con `gl=off`. En ese modo, el kernel Linux desactiva VirGL (`-virgl`) y KWin utiliza el rasterizador por software `llvmpipe` en CPU. KWin **desactiva automáticamente Wobbly Windows y deformaciones 3D** bajo `llvmpipe` para proteger la CPU. Al seleccionar `virtio-ramfb-gl`, KWin detecta GPU real y activa las deformaciones 3D sin retraso.
- **Resolución Dinámica:** `true` (Ajusta la resolución automáticamente al redimensionar la ventana de UTM).
- **Filtro de Escalado:** `Linear` o `Nearest`.

### C. Red y Conectividad
- **Modo de Red:** `Compartido` (`vmnet-shared`).
- **Dispositivo:** `virtio-net-pci`.
- **Rango de IP típico:** `192.168.64.0/24`. Permite la comunicación transparente bidireccional entre la Mac host y el puente MCP `groove-bridged` (`192.168.64.x:8080`).

### D. Dispositivos de Entrada y Portapapeles
- **Dispositivos:** `usb-tablet` (coordenadas absolutas), `usb-mouse`, `usb-kbd`.
- **Portapapeles Bidireccional:** Habilitado mediante el canal SPICE (`com.redhat.spice.0`) y el servicio de huésped `spice-vdagent` / `spice-vdagentd.socket`.

---

## 3. Bitácora de Pruebas de Telemetría en Vivo (Sesión 0.4.1)

Durante la sesión de prueba en vivo con la máquina virtual iniciada desde la ISO, se realizaron las siguientes verificaciones forenses:

### Prueba 1: Conexión con el Puente MCP Nativo
- **Endpoint:** `GET http://192.168.64.25:8080/status`
- **Resultado:** Respuesta HTTP 200 en 2 ms.
  ```json
  {
    "status": "ready",
    "arch": "aarch64",
    "kernel": "Linux version 7.3.1-2-aarch64-ARCH ...",
    "memory_live": "RAM live OK",
    "uinput_active": true,
    "ld_preload_active": true,
    "open_windows": [
      { "id": "633", "title": "KWin Compositor", "app_class": "kwin_wayland" },
      { "id": "640", "title": "Plasma 6 Desktop", "app_class": "plasmashell" }
    ]
  }
  ```

### Prueba 2: Auditoría del Subsistema Rust
1. **`groove-boostd.service`:**
   - Estado: `active (exited)` al inicio del sistema.
   - Duración de ejecución: **550 ms**.
   - Precarga: **403 bibliotecas y binarios fijados en RAM (429.8 MB)**.
2. **`libgroove_fast.so`:**
   - Inyección: Confirmada en `/etc/ld.so.preload`.
   - Mapeos de memoria: Presente en `kwin_wayland` y `plasmashell` (4 mapas VMA cada uno).
   - Prioridad asignada por kernel: `kwin_wayland` corriendo con prioridad de tiempo real (`PRI 41`), `plasmashell` con `Nice -8` (`PRI 27`).
3. **Parámetros del Kernel (`sysctl`):**
   - `vm.vfs_cache_pressure = 50`: Retiene el doble de tiempo las páginas del escritorio en RAM.
   - `vm.swappiness = 10`: Evita paginación innecesaria.
4. **Controlador Virtual (`uinput`):**
   - Dispositivo `/dev/uinput` operativo con permisos `0666` para inyección de eventos de puntero y teclado.

### Prueba 3: Control Remoto e Interacción de Ventanas
- **Lanzamiento de terminal Konsole:** Se abrió una ventana de Konsole con el mensaje *`🎷 Linux Groove 0.4.1 - Puente MCP Conectado con Exito!`* verificado visualmente mediante captura de pantalla.
- **Lanzamiento de Dolphin:** Se abrió el gestor de archivos Dolphin vía llamada MCP sin interacción manual en la VM.
- **Captura de Pantalla en Tiempo Real:** El endpoint `/mcp/screenshot` generó capturas completas del escritorio en PNG de 448 KB.

### Prueba 4: Diagnóstico y Solución de la "X" sobre el Puntero del Ratón
- **Síntoma:** Aparecía una "X" negra pixelada superpuesta a la flecha del cursor en la interfaz.
- **Causa Raíz:** En entornos Wayland con compatibilidad X11 (Xwayland), cuando el cursor entra en áreas de compatibilidad o cuando SPICE sincroniza el cursor, solicita el glifo tradicional de X11 `X_cursor`. Como el tema de cursores moderno (`breeze_cursors`) no incluía un archivo llamado `X_cursor`, X11 recurría a su glifo bitmap predeterminado.
- **Solución Implementada:**
  1. Enlace simbólico `/usr/share/icons/breeze_cursors/cursors/X_cursor -> default`.
  2. Creación del archivo de índice de temas `/home/groove/.icons/default/index.theme` y `/etc/skel/.icons/default/index.theme` heredando `breeze_cursors`.
  3. Configuración explícita en `kcminputrc` de `cursorTheme=breeze_cursors` y `cursorSize=24`.
  4. Exportación de `XCURSOR_THEME=breeze_cursors` en `/etc/environment`.

### Prueba 5: Diagnóstico del Efecto Elástico (*Wobbly Windows*)
- **Síntoma:** Las ventanas no presentaban deformación elástica al arrastrarlas.
- **Causa Raíz:** 
  - La consulta a D-Bus `qdbus6 org.kde.KWin /Effects org.kde.kwin.Effects.isEffectSupported wobblywindows` arrojó `false`.
  - La inspección de DRM reveló que la máquina virtual actual `groove_rust_arch.utm` se configuró con `virtio-gpu-pci` (`features: -virgl`), forzando a Mesa a usar `llvmpipe` (CPU software rasterizer).
  - El código de KWin (`WobblyWindowsEffect::supported()`) desactiva explícitamente los efectos de deformación de malla 3D cuando el controlador OpenGL es por software.
- **Acción requerida:** Configurar la pantalla en UTM como `virtio-ramfb-gl` para habilitar VirGL y Metal 3D.

### Prueba 6: Diagnóstico y Solución del Subsistema de Audio (ALSA / PipeWire / PulseAudio)
- **Síntoma:** La máquina virtual no reproducía audio al arrancar la ISO.
- **Causa Raíz:**
  1. El mezclador de hardware de ALSA (`snd_hda_intel`) tenía el control `Master` silenciado (`Playback 0 [0%] [-74.00dB] [off]`).
  2. El sumidero por defecto de PulseAudio (`alsa_output.pci-0000_00_03.0.analog-stereo`) tenía la propiedad `Mute: yes` y volumen al 6%.
  3. El archivo `/etc/pipewire/pipewire.conf.d/20-groove-defaults.conf` tenía permisos restringidos `0700` (`-rwx------`), arrojando `Permiso denegado` al proceso de usuario de PipeWire.
- **Solución Implementada y Persistida:**
  1. Permisos de `/etc/pipewire/pipewire.conf.d/` ajustados a `0644`.
  2. Estado del mezclador desmuteado al 80% y guardado con `alsactl store` en `/var/lib/alsa/asound.state`.
  3. Modificación del binario nativo en Rust `groove-session-ready` (`crates/groove-cli/src/bin/groove_session_ready.rs`) para desmutear automáticamente ALSA y el sumidero PulseAudio al 80% en cada inicio de sesión gráfica.
  4. Prueba de reproducción exitosa con `paplay /usr/share/sounds/alsa/Front_Center.wav`.

### Prueba 7: Diagnóstico y Solución del Panel de Resolución de Pantalla (kscreen)
- **Síntoma:** No aparecía la opción de cambiar resolución ni el apartado de pantallas en Preferencias del Sistema.
- **Causa Raíz:** Estaba instalado `libkscreen` y `kscreen-doctor` (CLI), pero faltaba el paquete oficial de interfaz gráfica **`kscreen`** que provee el módulo KCM `/usr/lib/qt6/plugins/plasma/kcms/systemsettings/kcm_kscreen.so`.
- **Solución Implementada y Persistida:**
  1. Instalación en vivo de `kscreen` en la VM mediante el puente MCP.
  2. Apertura instantánea de la ventana de configuración con `systemsettings kcm_kscreen`, permitiendo seleccionar cualquier resolución (1280x800, 1920x1080, 2K, 4K, escala y tasa de refresco).
  3. Instalación definitiva de `kscreen` en el rootfs del constructor para las siguientes imágenes ISO.

### Prueba 8: Logotipo Negro Vectorial en Barra de Tareas y Colección Oficial de Fondos Groove
- **Requerimiento:** Sustituir el ícono del menú de inicio por el logotipo de onda sonora de Groove en color negro (para máximo contraste con el tema claro de la barra de tareas) e incorporar la galería de fondos de pantalla de Groove.
- **Implementación y Despliegue:**
  1. **Logotipo Vectorial Negro (`groove-logo-black.svg`):** Diseñado en SVG con 7 barras redondeadas simétricas en `#181818` idéntico a la imagen oficial provista por el usuario.
  2. **Integración en Iconos del Sistema:** Reemplazo de `start-here-kde` en todas las resoluciones (16px a 96px) en `/usr/share/icons/breeze/places/` y `/usr/share/icons/breeze-dark/places/`.
  3. **Colección de Fondos KDE (`/usr/share/wallpapers/`):** Creación de 9 paquetes compatibles con KDE Plasma con sus respectivos archivos `metadata.json`:
     - `Groove_Default` (Fondo principal de teclas de piano y onda neón)
     - `Groove_Piano_4K`
     - `Groove_Ondas_Ambar`
     - `Groove_Estudio`
     - `Groove_Creativo`
     - `Groove_Abstracto`
     - `Groove_Vidrio_Pink`
     - `Groove_Jazz_Neon`
     - `Groove_Portal`
  4. **Aplicación en Vivo:** Despliegue directo vía API del puente MCP y recarga de `plasmashell` sin cerrar las aplicaciones del usuario.

---

## 4. Estructura de Archivos del Sistema Modificados y Rastreados

Todos los cambios se encuentran sincronizados en el repositorio Git en la rama `main`:

```text
documentacion/
├── 00_INDICE_PROYECTO.md
├── 01_ARQUITECTURA_BOOT_Y_ROOTFS.md
├── 02_FASE1_OPTIMIZACION_RUST.md
├── 03_ESPECIFICACION_PRUEBAS_UNITARIAS.md
├── 04_FASE2_APARIENCIA_PLASMA.md
├── 05_ANALISIS_ARQUITECTURA_RUST_KDE.md
├── 06_PLAN_INTEGRAL_LIVE_BRIDGE_Y_UTM.md
├── 07_BITACORA_PRUEBAS_Y_CONFIGURACION_UTM.md  <-- (Nuevo)
└── WALKTHROUGH_041_BOOT_FIX.md

scripts/arch/native/files/
├── etc/
│   ├── ld.so.preload                              (/usr/lib/libgroove_fast.so)
│   ├── environment.d/10-groove-fast.conf
│   ├── modules-load.d/uinput.conf                 (Carga automática de uinput)
│   ├── security/limits.d/10-groove-realtime.conf  (Límites realtime de prioridad)
│   ├── udev/rules.d/99-uinput.rules               (Permisos 0666 para uinput)
│   ├── skel/.config/
│   │   ├── kdeglobals                             (AnimationDurationFactor=0.25)
│   │   ├── kwinrc                                 (Plugins de efectos y física)
│   │   ├── kxkbrc                                 (Teclado latam,us)
│   │   └── kcminputrc                             (Tema de cursores Breeze)
│   ├── skel/.icons/default/index.theme            (Mapeo de cursores)
│   └── xdg/
│       ├── kdeglobals
│       ├── kwinrc
│       ├── kxkbrc
│       └── kcminputrc
└── usr/
    ├── bin/
    │   ├── groove-bridged                         (Servidor MCP Rust puerto 8080)
    │   ├── groove-boostd                          (Daemon de calentamiento RAM)
    │   ├── groove-profile                         (Selector de perfiles instant/expressive)
    │   ├── groove-diagnostics                     (Diagnóstico de estado)
    │   └── groove-session-ready                   (Notificador de sesión gráfica)
    └── lib/
        ├── libgroove_fast.so                      (Biblioteca interceptora preload)
        └── systemd/system/
            ├── groove-bridged.service             (Servicio systemd del puente)
            └── groove-boostd.service              (Servicio systemd de precarga)
```

