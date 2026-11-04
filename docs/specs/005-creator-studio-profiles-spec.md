# Especificación Técnica 005: Perfiles de Estudio para Creadores (`groove-session`)
*Documento de Diseño del Sistema — Spec-Driven Development (SDD)*

---

## 1. Alcance y Arquitectura de Ensembles

Para mantener la imagen base del sistema en **menos de 800 MB**, las herramientas creativas de gran envergadura no se instalan de forma monolítica en la raíz, sino que se distribuyen como **Groove Ensembles**: paquetes autónomos en formato **SquashFS comprimido con Zstandard (`.ensemble`)** que se montan en caliente bajo `/usr/ensemble/<nombre>` utilizando **OverlayFS**.

---

## 2. Definición de los 5 Ensembles Creativos

| Ensemble | Propósito | Aplicaciones Principales | Integración en Rust |
| :--- | :--- | :--- | :--- |
| **`ensemble-jazz-audio`** | Producción musical, grabación multitrack y mezcla. | Ardour, PipeWire, Carla, Yoshimi, LSP Plugins. | `groove-tuner` (afinador/metrónomo DSP) y monitor de xruns. |
| **`ensemble-visual-design`** | Ilustración vectorial, diseño editorial y retoque. | Inkscape, GIMP, Krita, FontManager. | `groove-palette` (armonías de color y exportador de paletas). |
| **`ensemble-cinema-video`** | Edición no lineal, streaming y transcodificación. | Kdenlive, OBS Studio, FFmpeg con VA-API. | `groove-transcode` (generador de proxies ultra liviano en Rust). |
| **`ensemble-darkroom-photo`** | Revelado digital RAW y catalogación fotográfica. | Darktable, RawTherapee, ExifTool. | `groove-loupe` (visor de metadatos e histogramas acelerado). |
| **`ensemble-rust-dev`** | Desarrollo de sistemas, shaders y programación creativa. | Rust toolchain, Helix, Alacritty, Git, LLVM. | Integración nativa con `cargo` y plantillas de audio DSP en Rust. |

---

## 3. Gestor de Sesiones (`groove-session`)

La utilidad en línea de comandos y biblioteca `groove-session` permite:
- `groove-session list`: Muestra los ensembles disponibles localmente o en el disco USB.
- `groove-session activate <nombre>`: Realiza el loop-mount y activa el overlay en el sistema.
- `groove-session deactivate <nombre>`: Desmonta limpiamente la capa sin reiniciar.
- `groove-session status`: Informa sobre memoria utilizada por cada conjunto de herramientas.

