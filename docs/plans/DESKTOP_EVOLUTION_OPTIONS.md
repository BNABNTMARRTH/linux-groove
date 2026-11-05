# Opciones de Evolución y Mejora del Entorno de Escritorio: Linux Groove OS

## Decisión vigente — 2026-11-05

Se seleccionó **Wayfire + Waybar** con wf-dock y efectos 3D expresivos, compilado
desde fuentes. Labwc no se considera equivalente en efectos. Weston queda como
alternativa y arranque normal hasta la aceptación UTM. El estilo es propio de
Groove; no se adopta WhiteSur ni se copian recursos de Apple.

Las alternativas siguientes son antecedentes: las afirmaciones de compatibilidad
universal, memoria mínima, seguridad garantizada y 60 FPS no son resultados
verificados. La [spec 011](../specs/011-wayfire-blue-note-glass-spec.md) y el
[plan aprobado](WAYFIRE_BLUE_NOTE_GLASS_IMPLEMENTATION.md) prevalecen.


Este documento recoge el análisis técnico y diagnóstico del escritorio gráfico de Linux Groove OS 0.2.0, así como las **tres opciones estratégicas de evolución** para reemplazar o mejorar la implementación inicial y lograr una experiencia visual de alta gama inspirada en **macOS + Glassmorphism Blue Note**, con alto rendimiento y fluidez.

---

## 1. Diagnóstico Técnico del Estado Actual (Weston 13 + Pixman)

En la versión 0.2.0 se implementó una prueba de concepto en Wayland usando **Weston 13.0.3**:

```
+-----------------------------------------------------------------+
|                       LINUX GROOVE 0.2.0                        |
|                                                                 |
|   [Thunar / Mousepad]                [Weston Terminal]          |
|      (GTK3 CSD)                         (Toytoolkit)            |
|   Barra oscura cuadrada               Botones semáforo izq.     |
|   Botones a la derecha                Esquinas 12px redondeadas |
|                                                                 |
|            [Top Bar 34px]       [Dock Cápsula 68px]             |
|                                                                 |
|   -----------------------------------------------------------   |
|              WESTON 13 (Compositor de referencia C)             |
|              Renderizado CPU / Software con Pixman              |
+-----------------------------------------------------------------+
```

### Causas del resultado visual actual:
1. **Weston es un compositor de referencia, no un shell de escritorio comercial:**
   Weston fue creado por freedesktop.org para validar y depurar el protocolo Wayland. Su arquitectura no está concebida para soportar compositores de efectos visuales avanzados (como desenfoque gaussiano de fondo, sombras volumétricas o animaciones complejas).
2. **Renderizado por CPU (Pixman / Cairo) sin aceleración 3D:**
   Al operar en modo software sobre el framebuffer/DRM sin shaders OpenGL/Vulkan, no es técnicamente viable ejecutar algoritmos de *dual-kawase blur* en tiempo real para generar glassmorphism real sin degradar severamente el framerate.
3. **Fragmentación en la decoración de ventanas (CSD vs SSD):**
   - Las aplicaciones **GTK3** (Thunar, Mousepad) usan *Client-Side Decorations* (CSD) y dibujan su propio marco según el tema GTK instalado (con barras rectangulares y botones a la derecha).
   - La **Terminal** usa el toolkit interno de Weston (*toytoolkit*), donde sí aplican los botones de semáforo.
   - El resultado es una falta de cohesión estética entre aplicaciones.
4. **Dock estático sin animaciones elásticas:**
   El dock de Weston no cuenta con un motor de física o animación para el efecto de magnificación (zoom al pasar el cursor) ni indicadores dinámicos de aplicaciones en ejecución.

---

## 2. Las 3 Opciones de Evolución

A continuación se presentan las 3 alternativas técnicas viables, sus fortalezas, debilidades y requerimientos de implementación:

---

### Opción 1: XFCE 4.18/4.20 con Tema macOS WhiteSur / Cupertino + Picom (Xorg)
> **Enfoque:** Estabilidad probada, máxima cohesión visual inmediata y efectos de vidrio reales.

```
+-----------------------------------------------------------------+
|   Ventana 1 (Thunar)               Ventana 2 (Terminal)         |
|   +----------------------------+   +------------------------+   |
|   | (o)(o)(o)  Título Ventana  |   | (o)(o)(o)  Terminal    |   |
|   |                            |   |                        |   |
|   +----------------------------+   +------------------------+   |
|                                                                 |
|                 [Plank Dock / DockbarX con Zoom]                |
|   -----------------------------------------------------------   |
|     PICOM (Compositor con Dual-Kawase Blur, Sombras y Opacidad) |
|     XFWM4 (Decorador de ventanas universal con botones izq.)    |
|     XORG (Servidor gráfico X11 ya compilado e integrado)        |
+-----------------------------------------------------------------+
```

- **Mecanismo:**
  - **Xorg + xfwm4**: Al utilizar `xfwm4`, el decorador de ventanas opera del lado del servidor (*Server-Side Decorations*). Esto garantiza que **absolutamente todas las ventanas** (Thunar, editores, navegadores, terminales) tengan exactamente el mismo marco: botones de semáforo a la izquierda, esquinas redondeadas y tipografía unificada.
  - **Picom (compositor)**: Permite desenfoque de fondo real (*dual-kawase blur*), bordes difuminados, sombras suaves configurables y transiciones fluidas de opacidad.
  - **Dock dedicado (Plank o panel XFCE en modo cápsula inteligente)**: Soporta zoom de iconos por interpolación, rebote al abrir apps y temas transparentes de vidrio.
- **Ventajas:**
  - Xorg y XFCE ya están compilados, verificados y listos en la ISO de Linux Groove.
  - Cohesión visual 100% idéntica a macOS desde el primer arranque.
  - Muy bajo consumo de recursos y alta compatibilidad con cualquier máquina virtual o PC físico.
- **Desventajas:**
  - Corre sobre el servidor gráfico tradicional X11 en lugar de Wayland puro.
- **Esfuerzo de implementación:** **Bajo / Medio**.

---

### Opción 2: Compositor Wayland Moderno y Acelerado (Wayfire o Labwc + Waybar + Wlogout)
> **Enfoque:** Wayland nativo con shaders de GPU, animaciones elásticas y efectos 3D.

```
+-----------------------------------------------------------------+
|                        WAYFIRE / LABWC                          |
|             (Compositor Wayland moderno sobre wlroots)          |
|                                                                 |
|   - Animaciones de ventana elásticas (Genie / Lámpara mágica)   |
|   - Blur y esquinas redondeadas renderizadas vía OpenGL/GLES    |
|   - Barra superior moderna estilizada con CSS puro (Waybar)     |
|   - Dock Wayland fluido (wf-shell o nwg-dock)                   |
|   -----------------------------------------------------------   |
|               Mesa Gallium / VirGL / DRM KMS                    |
+-----------------------------------------------------------------+
```

- **Mecanismo:**
  - **Wayfire**: Compositor Wayland 3D basado en wlroots inspirado en Compiz. Permite efectos de lámpara mágica de macOS al minimizar, desenfoque de fondo dinámico (*blur plugin*), sombras y esquinas suaves.
  - **Labwc**: Compositor Wayland tipo Openbox muy ligero pero compatible con temas de ventana completos y decoraciones universales.
  - **Waybar**: Barra superior moderna basada en GTK3/CSS donde se puede recrear con exactitud pixel-perfect el menú superior de macOS con tipografía San Francisco / DejaVu.
  - **nwg-dock**: Dock nativo para Wayland con soporte de hover, zoom y aislamiento de entrada.
- **Ventajas:**
  - 100% Wayland moderno y preparado para el futuro.
  - Aceleración gráfica por hardware fluida a 60 fps.
  - Efectos visuales genuinos sin trucos de imágenes fijas.
- **Desventajas:**
  - Requiere compilar la pila de `wlroots`, `wayfire` (o `labwc`), sus plugins y herramientas satélite.
  - Depende de soporte adecuado de aceleración 3D (VirGL en QEMU/UTM o controladores nativos de GPU en bare-metal).
- **Esfuerzo de implementación:** **Medio / Alto**.

---

### Opción 3: Compositor Propio Groove en Rust (Smithay + Shaders wgpu)
> **Enfoque:** Arquitectura propietaria de Linux Groove OS (según Spec 008 del PRD).

```
+-----------------------------------------------------------------+
|                     GROOVE-COMPOSITOR (Rust)                    |
|                                                                 |
|   - Motor propio de Shell con Smithay                           |
|   - Pipeline wgpu: Shaders GLSL/WGSL para Glassmorphism propio  |
|   - Decorador de ventanas nativo unificado                      |
|   - Reactividad a audio (ecualizador visual en barra y dock)    |
|   -----------------------------------------------------------   |
|              Rust / Smithay / libseat / DRM KMS                 |
+-----------------------------------------------------------------+
```

- **Mecanismo:**
  - Construcción del compositor `groove-compositor` en Rust utilizando la biblioteca **Smithay** (framework moderno para compositores Wayland en Rust).
  - Dibujo de la interfaz mediante shaders personalizados (WGSL/OpenGL vía `wgpu`), integrando el concepto *Blue Note*: transparencias de vidrio, aberración cromática sutil, y reactividad a señales de audio de Linux Groove.
- **Ventajas:**
  - Máxima originalidad e independencia tecnológica: producto 100% de autor.
  - Consumo mínimo de memoria y seguridad de memoria garantizada por Rust.
  - Permite unir la estética gráfica con el motor de audio en tiempo real del sistema.
- **Desventajas:**
  - Curva de ingeniería elevada: construir un gestor de ventanas completo requiere implementar protocolos de cliente como `xdg-shell`, popups, menús contextuales, portapapeles, atajos de teclado y arrastrar/soltar (*drag and drop*).
  - Tiempo de entrega significativamente más prolongado.
- **Esfuerzo de implementación:** **Alto**.

---

## 3. Matriz Comparativa

| Criterio | Opción 1: XFCE + Picom (Xorg) | Opción 2: Wayfire/Labwc (Wayland) | Opción 3: Propio Smithay (Rust) |
| :--- | :--- | :--- | :--- |
| **Fidelidad macOS Glass** | ⭐⭐⭐⭐⭐ (Excelente, temas maduros) | ⭐⭐⭐⭐ (Muy buena con plugins) | ⭐⭐⭐⭐⭐ (Ilimitada, hecha a medida) |
| **Consistencia de ventanas** | Universal (100% xfwm4) | Alta (vía decorador Wayland) | Total (definida por el compositor) |
| **Efecto Blur / Vidrio Real** | Nativo vía Picom (Kawase) | Nativo vía Shaders GL | Nativo vía Shaders wgpu |
| **Tiempo de desarrollo** | Sin estimación validada | En implementación | Etapa futura |
| **Protocolo base** | X11 | Wayland | Wayland |
| **Rendimiento y consumo** | Pendiente de medición | Pendiente de medición en UTM | Pendiente de implementación |
| **Estado actual en Groove** | Binarios ya listos en la ISO | Requiere compilar wlroots | Spec 008 diseñada en Rust |

---

## 4. Recomendación Estratégica

1. **Corto Plazo (Entrega Rápida y Pulida):**
   Activar la **Opción 1 (XFCE + Picom con tema WhiteSur / Glass)**:
   Aprovecha que XFCE y Xorg ya están 100% operativos en el sistema. Proporcionará de inmediato ventanas con botones semáforo idénticos en todas las aplicaciones, dock con zoom y desenfoque real sin errores visuales.

2. **Medio/Largo Plazo (Identidad de Linux Groove OS):**
   Avanzar en paralelo con la **Opción 3 (Compositor Smithay en Rust)** como el verdadero compositor insigne de Linux Groove para versiones posteriores (0.3.0+).

