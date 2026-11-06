# Product Requirements Document (PRD)

## Entrega vigente: Groove estable — 2026-11-06

La entrega vigente usa Arch Linux ARM nativo con systemd, SDDM, Plasma Wayland
como escritorio principal y Wayfire como sesión alternativa. Groove comparte
paleta, tipografía, portales y acciones; cada compositor conserva sus controles.
La instalación usa raíces A/B con UKI y systemd-sysupdate; la ISO Live es solo
prueba y recuperación. PipeWire/WirePlumber ofrece perfiles UTM de 48 kHz a
1024 y 256 muestras. No se promete identidad visual exacta entre aplicaciones,
cero xruns, PREEMPT_RT ni soporte físico hasta reunir evidencia UTM.
Especificación normativa: [013 — GrooveWindow](specs/013-unified-window-design-spec.md).
La implementación no se declara validada hasta completar la matriz UTM.

## Linux Groove OS — "Groove estable"
*A Minimal, High-Performance Linux Distribution Built from Scratch in Rust for Digital Artists and Creators*

---

## Estado y entrega gráfica acordada — 2026-11-05

La ISO ARM64 actual arranca mediante UEFI/ACPI en UTM y alcanza tanto la TUI como el selector gráfico de LightDM con apariencia Blue Note.
La entrega gráfica 0.2.0 incorpora:
1. **LightDM con selector XFCE/X11 y Weston**, utilidades completas de escritorio y Firefox ESR 153.6.0 compilado desde fuentes.
2. **Entrada dedicada en GRUB para Weston (Wayland puro)** mediante el parámetro `groove.wayland=1` gestionado por `groove-init`.
Los componentes se compilan desde fuentes usando BLFS 12.2 System V como referencia y `groove-init` como PID 1.

El acceso de groove sin contraseña se limita al LiveUSB, sin autologin.
La persistencia, x86_64 y nuevas suites creativas quedan fuera de esta entrega.
El escritorio Rust/Smithay continúa como etapa posterior; la TUI y la demo
minifb existentes no acreditan un compositor Wayland funcional.

Las métricas siguientes son objetivos de producto, no resultados actuales.
La ISO gráfica ronda los 836 MB; tamaño, RAM, arranque, FPS y latencia se
medirán con el hardware y procedimiento registrados. No se garantizan cero
xruns ni tiempos de arranque a partir de simulaciones.

Referencias: [plan](plans/GRAPHICAL_DESKTOP_IMPLEMENTATION.md),
[plan Weston](plans/DEDICATED_WESTON_WAYLAND_PLAN.md),
[sesiones gráficas](specs/007-graphical-sessions-spec.md),
[Wayland dedicado y traspaso](specs/009-wayland-standalone-and-session-handoff-spec.md),
[hoja de ruta Smithay](specs/008-smithay-desktop-roadmap-spec.md) y
[avance con evidencia](PROGRESS_TRACKER.md).

## 1. Introducción y Visión del Producto

### 1.1 Declaración de Misión
**Linux Groove OS** nace con el objetivo de demostrar que una distribución Linux puede construirse desde cero siguiendo la guía oficial **Linux From Scratch (LFS 12.2)**, sustituir de forma rigurosa el espacio de usuario tradicional por alternativas modernas escritas en **Rust**, y ofrecer una experiencia estética, sonora y funcional inspirada en la era clásica del **Jazz** (*Blue Note Records, Miles Davis, Thelonious Monk*).

El sistema está optimizado para flujos de trabajo artísticos profesionales (**Música/Audio en tiempo real, Diseño Gráfico, Edición de Video, Fotografía y Desarrollo Creativo**) manteniendo un tamaño base en modo LiveUSB inferior a **800 MB** y un tiempo de arranque sub-3 segundos.

---

## 2. Metas y Métricas de Rendimiento (KPIs)

| Métrica | Objetivo LFS Estándar | Objetivo Linux Groove OS | Justificación Técnica |
| :--- | :--- | :--- | :--- |
| **Tamaño Base ISO** | ~1.8 GB - 3.2 GB | **< 800 MB** | Sistema modular con Ensembles externos en SquashFS. |
| **Consumo RAM (Idle)** | ~550 MB - 900 MB | **< 220 MB** | Init propio en Rust (`groove-init`) + compositor Smithay (objetivo del compositor propio; XFCE usa X11). |
| **Tiempo de Booteo** | 12s - 25s | **< 3.0s** (en SSD/NVMe) | Inicialización en paralelo basada en grafo acíclico dirigido (DAG) en Rust. |
| **Latencia de Audio** | 10 ms - 20 ms | **< 2.5 ms** @ 48kHz (64 samples) | Kernel Linux `PREEMPT_RT` + driver `groove_rt_kmod` en Rust + PipeWire RT. |
| **Xruns en 60 mins** | Frecuentes (> 10) | **0 xruns como objetivo medible** | Memlock ilimitado, prioridad FIFO 98 y aislamiento de hilos de audio. |
| **Frame Pacing UI** | Inconsistente (X11) | **60 / 120 FPS como objetivo** | Protocolos Wayland directos sobre WGPU y DRM/KMS. |

---

## 3. Arquitectura del Sistema Operativo

```
+---------------------------------------------------------------------------------+
|                       USER INTERFACE: THE JAZZ DESKTOP                          |
|         groove-compositor (Wayland / Smithay + WGPU) - Velvet & Brass UI        |
|      [Top Vinyl Bar: Stereo VU Meter | DSP Latency | The Brass Dock | Takes]    |
+---------------------------------------------------------------------------------+
|                         MODULAR GROOVE ENSEMBLES (SquashFS)                     |
|  [Audio: PipeWire+Ardour] [Design: Inkscape+GIMP] [Video: Kdenlive] [Dev: Helix]|
+---------------------------------------------------------------------------------+
|                     RUSTIFIED USERSPACE (LFS Chapters 6, 8, 9)                  |
|  * PID 1: groove-init (DAG Services, zram, uevent)                              |
|  * CLI Utilities: uutils/coreutils (Rust), ripgrep, fd, bat, sudo-rs            |
|  * C-ABI Core: Glibc 2.40 + GCC 14.2 runtime + Rustc Target Runtime             |
+---------------------------------------------------------------------------------+
|                         KERNEL & DRIVERS (LFS Chapter 10)                       |
|  * Linux Kernel 6.12 LTS + PREEMPT_RT Patch (CONFIG_RUST=y)                     |
|  * Custom Driver in Rust: groove_rt_kmod (/dev/groove_rt)                       |
|  * DRM/KMS (virtio-gpu, AMD, Intel) + USB Audio Class 2.0 (snd-usb-audio)       |
+---------------------------------------------------------------------------------+
|                 BOOT & RUNTIME PLATFORM (LiveUSB & Installed)                   |
|  * Initramfs (groove-initramfs): OverlayFS + zram + SquashFS read-only root     |
|  * Dual Architecture: aarch64 (Apple Silicon / ARM64) & x86_64 (Intel / AMD)   |
+---------------------------------------------------------------------------------+
```

---

## 4. Filosofía Visual y Experiencia de Usuario: "Blue Note"

La estructura de ventanas XFCE se rige por la spec 013. Los conceptos de audio,
tilado y escritorio propio siguientes son objetivos de producto, no funciones
acreditadas por esta entrega gráfica.

1. **Paleta Cromática Analógica:**
   - **Midnight Club** (`#0B0E17`): Fondo principal profundo de bajo consumo visual.
   - **Vinyl Groove** (`#141926`): Paneles, dock y contenedores de ventanas.
   - **Warm Brass** (`#D4AF37`): Detalles dorados en widgets activos, bordes de foco y controles.
   - **Bebop Coral** (`#E05A47`): Alertas, grabaciones activas y advertencias de nivel de audio (clip).
   - **Cream Sleeve** (`#F4EFE6`): Tipografía de alto contraste legible y suave para los ojos.
2. **Top Vinyl Bar:**
   - Vúmetro estéreo analógico integrado que analiza la salida principal de audio en tiempo real.
   - Indicador de latencia DSP de audio (ej: `0.9 ms | 48kHz | 64 samples`).
   - Selector de "Takes" (espacios de trabajo temáticos: *Rhythm, Canvas, Cinema, Code*).
3. **Improvisation Mode (Gestor de Ventanas Híbrido):**
   - Conmutación instantánea mediante `Super + Space`:
     - **Bebop Tiling:** Mosaico automático inteligente para código, terminales y documentación.
     - **Free Jazz Floating:** Lienzo libre flotante para suites complejas (DAWs, GIMP, Blender).

---

## 5. Perfiles de Usuario (User Personas)

1. **Miles (El Músico / Productor):**
   - Necesita conectar su interfaz de audio USB, abrir su DAW y grabar instrumentos con latencia imperceptible sin pelear con JACK ni configurar permisos manuales de límites PAM.
2. **Reid (El Diseñador Gráfico & Tipógrafo):**
   - Necesita una pantalla con fidelidad de color, atajos ágiles, soporte de tabletas gráficas con presión y una interfaz limpia sin distracciones.
3. **Coltrane (El Creador Multimedia & Editor):**
   - Requiere edición de video fluida con aceleración por hardware de decodificación y exportación rápida.
4. **Monk (El Hacker / Desarrollador Creativo):**
   - Busca un entorno moderno en Rust, editores rápidos, utilidades de terminal ultrarrápidas y control milimétrico sobre el sistema operativo.

---

## 6. Estrategia de Entrega e Instalación

- **Modo LiveUSB Universal:**
  - Imagen `.iso` híbrida compatible con arranque UEFI y BIOS Legacy en `x86_64`, y UEFI en `aarch64`.
  - Capa de persistencia opcional cifrada en la segunda partición del pendrive USB.
- **The Soundcheck Installer (`groove-installer`):**
  - Asistente con estética Jazz en modo texto avanzado (TUI) y gráfico (Wayland).
  - Particionado guiado con soporte para NVMe, SSD y discos virtuales QEMU/UTM.
  - Selección de Ensembles modulares durante el proceso de instalación.


## Refinamiento Blue Note — antecedente 2026-11-05

Para XFCE, la spec 013 sustituye colores, botones y tipografía de este
antecedente. Las decisiones restantes de Wayfire se conservan.

Dirección aprobada: oscuro sobrio, terminal GTK opaca, controles monocromáticos
a la derecha y cuatro lanzadores compartidos (Terminal, Archivos, Editor, Firefox).
Barra 34 px con métricas en tooltip; dock 64 px con iconos propios de 40/80 px.
Sustituye la apariencia de las candidatas anteriores. Wayfire sigue candidato
hasta completar aceptación; Weston, XFCE y consola se conservan.
Audacity, Blender, persistencia y gestor de aplicaciones quedan para después.

Ver [spec 012](specs/012-blue-note-refinement-spec.md) y el informe de validación.
