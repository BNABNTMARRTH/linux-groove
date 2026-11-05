# Spec 010 — Entorno de Escritorio Blue Note Glass (Weston Wayland)

Actualización 2026-11-05: la [spec 011](011-wayfire-blue-note-glass-spec.md) añade
Wayfire como sesión opcional y `groove.session=wayfire` como grafo independiente.
Weston conserva el inicio normal hasta validar GPU/funcionalidad en UTM; el fondo
piano se instala explícitamente. Esta etapa no implementa Rust/Smithay.


Estado: aprobado. Fecha: 2026-11-05.
Referencias: [Spec 007](007-graphical-sessions-spec.md), [Spec 009](009-wayland-standalone-and-session-handoff-spec.md), [Plan de Integración](../plans/weston_macos_glass_desktop_plan.md), [PRD](../PRD.md).

---

## 1. Declaración de Visión y Propósito

El entorno **Blue Note Glass** establece a **Weston (Wayland)** como la interfaz de escritorio de inicio por defecto de Linux Groove 0.2.0. Diseñado para artistas digitales, músicos y desarrolladores creativos, combina:
- **Arranque sub-2 segundos** desde el kernel hasta la interacción gráfica.
- **Estética macOS Glassmorphism** construida directamente sobre Cairo y Wayland sin depender de gestores pesados en X11 ni frameworks de navegador (consumo < 150 MB de RAM en reposo).
- **Identidad Blue Note Records**: fondo negro profundo (`#000000`), ondas sonoras de teclado de piano neón, acentos en latón cálido (`#D4AF37`), azul neón (`#3884FF`) y tipografía *Cream Sleeve* (`#F4EFE6`).

---

## 2. Componentes Visuales

### 2.1. Top Menu Bar Translúcida
- **Dimensiones:** Barra superior de `34px` de altura ocupando el 100% del ancho del display.
- **Apariencia:** Fondo de cristal esmerilado oscuro `rgba(14, 18, 28, 0.78)` con bisel superior `rgba(255, 255, 255, 0.12)` y línea divisoria inferior de latón `rgba(212, 175, 55, 0.35)`.
- **Contenido Izquierda:** Emblema `🎷 LINUX GROOVE` en tipografía en negrita y acento dorado, seguido del selector/identificador `Blue Note Glass • Wayland`.
- **Contenido Derecha:** Píldora de telemetría en vivo (consumo real de RAM y carga de CPU desde `/proc`) y reloj analógico/digital formateado.

### 2.2. Floating macOS Glass Dock
- **Dimensiones y Posición:** Cápsula flotante centrada horizontalmente, situada a `12px` sobre el borde inferior de la pantalla, con altura de `64px` y radio de curvatura de `18px`.
- **Glassmorphism:** Capa base con sombra proyectada difuminada (`rgba(0, 0, 0, 0.55)`), relleno de vidrio semitransparente (`rgba(20, 25, 38, 0.75)`), borde interior luminoso blanco de `1.5px` (`rgba(255, 255, 255, 0.16)`).
- **Aislamiento de Clics (`wl_region`):** Los eventos de puntero solo son capturados por el área de la cápsula del Dock y la barra superior; los espacios transparentes a los lados del Dock permiten clics directos sobre las ventanas de fondo.
- **Reserva de Espacio de Trabajo:** `get_output_work_area` reserva `34px` superior y `80px` inferior para que las ventanas maximizadas no solapen el dock.

### 2.3. Iconos Squircle Glass (48×48 px)
Iconos en forma *squircle* de macOS (`rx=10`) con fondo de cristal multicapa y glifos vectoriales en alta definición:
1. **Terminal:** Icono de consola de cristal con prompt `>_` en dorado neón.
2. **Archivos (Thunar Wayland):** Carpeta estilizada con gradiente azul neón y pestaña ámbar.
3. **Editor (Mousepad Wayland):** Documento luminoso con líneas de código y lápiz creador.
4. **Navegador (Firefox ESR Wayland):** Globo terráqueo con órbita y onda de zorro neón.
5. **Selector de Wallpapers:** Paleta/lienzo que cicla en vivo entre los fondos artísticos de Groove.
6. **Sistema:** Medidores analógicos de audio y engranaje de configuración.

### 2.4. Decoraciones de Ventana (Semáforo macOS)
- Radio de esquinas de ventana: `12px`.
- Barra de título con altura `32px` y estilo de cristal ahumado.
- Botones de control estilo semáforo:
  - **Cerrar:** Rojo Coral (`#FF5F56`).
  - **Minimizar:** Ámbar / Latón (`#FFBD2E`).
  - **Maximizar:** Verde Estudio (`#27C93F`).
  - Efecto *hover* que muestra los glifos `×`, `−` y `+`.

### 2.5. Terminal Translúcida (Glass Terminal)
- Soporte de transparencia alfa nativa en Wayland (`rgba(11, 14, 23, 0.84)`).
- Shell interactivo fijado a `/bin/bash` con prompt temático:
  `╭─ 🎷 groove@bluenote [~]\n╰─❯ `

---

## 3. Pruebas de Aceptación
1. Al arrancar la máquina virtual (Opción 0 de GRUB), el escritorio se muestra en menos de 2 segundos.
2. El wallpaper por defecto muestra las teclas de piano neón centradas en escala completa sin bandas distorsionadas.
3. El Dock flotante se dibuja centrado con sus 6 iconos legibles y reactivos al clic y hover.
4. Las ventanas abiertas muestran esquinas redondeadas de 12px y los botones semáforo responden cerrando, minimizando y maximizando.
5. La terminal se abre con transparencia de cristal y prompt Bash a color.

