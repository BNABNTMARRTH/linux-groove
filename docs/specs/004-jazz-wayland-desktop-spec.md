# Especificación Técnica 004: The Jazz Desktop & `groove-compositor`
*Documento de Diseño del Sistema — Spec-Driven Development (SDD)*

## Estado real y entregas — 2026-11-04

El contenido siguiente describe la visión del escritorio propio. Actualmente
groove-compositor implementa una TUI y una demo minifb para macOS; todavía no
usa Smithay ni actúa como servidor Wayland. Los vúmetros y cifras de la demo
son simulados y no prueban audio ni rendimiento real.

La primera entrega gráfica está definida en la spec 007: XFCE/X11 y Weston en
sesiones separadas mediante LightDM. La spec 008 conserva y ordena el trabajo
del compositor Rust/Smithay. WGPU es una evaluación posterior al primer backend
funcional, no requisito de la primera ventana. Solo se registrará «Groove
Desktop» en el selector cuando cumpla sus pruebas de integración.

---

## 1. Alcance y Arquitectura Gráfica

El entorno gráfico de **Linux Groove OS** está construido enteramente en Rust alrededor de un servidor de visualización Wayland propio: **`groove-compositor`**, apoyado en la biblioteca **Smithay** y el motor de renderizado acelerado **WGPU**.

### 1.1 Backend de Visualización Dual
- **Directo DRM/KMS + Libinput:** Modo nativo para hardware real (PC Intel/AMD y Mac ARM64) y máquinas virtuales QEMU/UTM con soporte `virtio-gpu`.
- **Winit / Wayland Nested:** Modo anidado para previsualización instantánea en sistemas de desarrollo sin reiniciar el equipo.

---

## 2. Sistema de Diseño "Blue Note"

### 2.1 Paleta de Color Oficial
- **Midnight Club** (`#0B0E17`): Fondo del lienzo del espacio de trabajo.
- **Vinyl Groove** (`#141926`): Paneles, dock flotante y fondo de la barra de control.
- **Warm Brass** (`#D4AF37`): Resaltado de foco, bordes activos, agujas y barras de vúmetro.
- **Bebop Coral** (`#E05A47`): Alerta de recorte de audio (*clip*), grabación activa y cierres.
- **Cool Mute** (`#3C4A63`): Elementos inactivos o desenfocados.
- **Cream Parchment** (`#F4EFE6`): Tipografía principal clara y descansada.

---

## 3. Componentes de la Interfaz

```
+---------------------------------------------------------------------------------------------------------+
| [O] GROOVE OS  |  Take 1: Rhythm  |  [||||||||||....] L  [||||||||||||..] R  |  0.8ms @ 48kHz  |  21:45 |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|                                                                                                         |
|                                       VENTANAS DEL ESTUDIO CREATIVO                                     |
|                                                                                                         |
|                                                                                                         |
+---------------------------------------------------------------------------------------------------------+
|                          [ (Terminal)  (DAW)  (Design)  (Video)  (Settings) ]                           |
+---------------------------------------------------------------------------------------------------------+
```

1. **Top Vinyl Bar:**
   - **Vúmetro Estéreo:** Dos barras horizontales con balística analógica calculada con decaimiento suave (*decay rate* de 20 dB/s) conectadas a las lecturas del bus PipeWire / driver `groove_rt_kmod`.
   - **DSP Latency Monitor:** Muestra la latencia en milisegundos y la frecuencia de muestreo de la tarjeta de audio.
   - **Take Switcher:** Muestra el espacio de trabajo actual (Takes 1 al 4).
2. **The Brass Dock:**
   - Muelle de aplicaciones inferior con iconos vectoriales y animación con física de resortes (*spring animations*).
3. **Modos de Ventana ("Improvisation Switcher"):**
   - **Bebop Tiling (`Super + Space`):** Reparto proporcional de ventanas estilo BSP.
   - **Free Jazz Floating (`Super + Space`):** Libre ubicación y solapamiento ideal para DAWs y programas de diseño complejo con múltiples ventanas flotantes.

