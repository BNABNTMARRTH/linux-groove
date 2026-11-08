# Arquitectura y Diseño: Pantallas de Bienvenida de Linux Groove

**Documento:** `GROOVE_SPLASH_SCREEN_ARCHITECTURE.md`  
**Estado:** Especificación e Implementación Activa  
**Componentes:**  
1. `org.groove.desktop` (**"Groove"** - Edición Cinemática Maestra)  
2. `org.groove.ribbons.desktop` (**"Groove Stroke"** - Edición Rayos Eléctricos Libres en GPU Shader)  
**Fecha:** Noviembre 2026  
**Autor:** Antigravity & Equipo de Ingeniería de Linux Groove  

---

## 1. Visión General del Subsistema de Bienvenida

Linux Groove reemplaza por completo la pantalla de arranque genérica de KDE Plasma ("Brisa") mediante dos experiencias visuales premium diseñadas bajo la identidad acústico-visual de la distribución:

| Paquete Look-and-Feel | Nombre en Preferencias | Motor de Renderizado | Concepto Visual |
| :--- | :--- | :--- | :--- |
| **`org.groove.desktop`** | **Groove** | QML Escena Vectorial / Multi-Capa | Arte cinemático maestro con ondas de luz envolventes, deriva de cámara flotante de 14s, zoom continuo de 7s y barridos de brillo de neón. |
| **`org.groove.ribbons.desktop`** | **Groove Stroke** | Shader GLSL Fragment + `qsb` (GPU nativa) | 16 rayos voltaicos de plasma que emanan libres del logotipo central hacia las orillas de la pantalla, con turbulencia eléctrica fractal y brillo tricolor. |

Ambas pantallas comparten los principios clave de diseño de Groove:
1. **Fondo 100% Negro Puro (`#000000`):** Conexión perfecta y continua desde el DRM framebuffer / Plymouth sin saltos de brillo ni bordes visibles.
2. **Emblema Central de Teclas de Piano (Groove Soundwave):** Las teclas representan simultáneamente una onda ecualizadora de audio y el teclado de un piano clásico, con iluminación cálida de ámbar a la izquierda y azul eléctrico a la derecha.
3. **Cero Líneas Divisorias:** Continuidad matemática rigurosa en todo el espacio de pantalla.
4. **Sincronización con el Ciclo de Vida de KDE 6 (`ksplashqml`):** Transiciones suaves mediante D-Bus (`stage 0` a `stage 5`).

---

## 2. Tema 1: "Groove" (Edición Cinemática Maestra)

### 2.1. Arquitectura Visual y Principios de Diseño
Ubicado en: `/usr/share/plasma/look-and-feel/org.groove.desktop/`

Combina el arte visual de alta definición con un sistema de animación multicapa que simula una cámara flotante en el espacio:
- **Deriva de Cámara Flotante (14 segundos):** El contenedor principal flota suavemente en una trayectoria elíptica paramétrica $x = \sin(t) \cdot 12$, $y = \cos(0.8t) \cdot 8$, eliminando la rigidez de una imagen estática.
- **Respiración Cinematográfica (7 segundos):** Escala oscilante entre `1.00` y `1.03` con aceleración senoidal (`InOutSine`).
- **Resplandor de Energía Dual (Neon Shimmer):** Dos gradientes aditivos en capas superiores:
  - Cuadrante inferior izquierdo: Pulso ámbar cálido (`#44ff8800`).
  - Cuadrante superior derecho: Pulso cian eléctrico (`#4400c8ff`).
  - Núcleo central: Destello blanco puro que ilumina las teclas de piano.

### 2.2. Código Fuente Maestro: `Splash.qml` (`org.groove.desktop`)

```qml
/*
    Linux Groove - Ambient Neon Screensaver Splash Screen
    SPDX-License-Identifier: GPL-2.0-or-later
*/

import QtQuick
import org.kde.kirigami as Kirigami

Rectangle {
    id: root
    width: 1280
    height: 800
    color: "#000000" // 100% Negro absoluto de fondo

    property int stage: 0

    onStageChanged: {
        if (stage === 1 || stage === 2) {
            introAnim.running = true;
        } else if (stage >= 5) {
            fadeOutAnim.running = true;
        }
    }

    Component.onCompleted: {
        introAnim.running = true;
    }

    // Temporizador continuo tipo protector de pantalla (cadencia hipnótica de 14s)
    property real screensaverPhase: 0.0
    NumberAnimation on screensaverPhase {
        from: 0.0
        to: Math.PI * 2
        duration: 14000
        loops: Animation.Infinite
        running: true
    }

    // -------------------------------------------------------------------------
    // CAPA 1: Escena con Movimiento de Cámara Flotante
    // -------------------------------------------------------------------------
    Item {
        id: sceneContainer
        anchors.fill: parent
        opacity: 0.0

        x: Math.sin(root.screensaverPhase) * 12
        y: Math.cos(root.screensaverPhase * 0.8) * 8

        Image {
            id: masterWaveArt
            anchors.fill: parent
            fillMode: Image.PreserveAspectCrop
            asynchronous: false
            smooth: true
            source: "images/groove-waves-master.png"

            // Zoom respiratorio continuo
            SequentialAnimation on scale {
                loops: Animation.Infinite
                running: true
                NumberAnimation { from: 1.00; to: 1.03; duration: 7000; easing.type: Easing.InOutSine }
                NumberAnimation { from: 1.03; to: 1.00; duration: 7000; easing.type: Easing.InOutSine }
            }
        }

        // ---------------------------------------------------------------------
        // CAPA 2: Pulso Dinámico de Energía Lumínica (Shimmer)
        // ---------------------------------------------------------------------
        Rectangle {
            anchors.fill: parent
            color: "transparent"

            // Resplandor pulsante ámbar (inferior izquierdo)
            Rectangle {
                width: parent.width * 0.55
                height: parent.height * 0.70
                anchors.left: parent.left
                anchors.bottom: parent.bottom
                color: "transparent"
                opacity: 0.20 + Math.sin(root.screensaverPhase * 1.5) * 0.15

                gradient: Gradient {
                    orientation: Gradient.Horizontal
                    GradientStop { position: 0.0; color: "transparent" }
                    GradientStop { position: 0.45; color: "#44ff8800" }
                    GradientStop { position: 1.0; color: "transparent" }
                }
            }

            // Resplandor pulsante azul eléctrico / cian (superior derecho)
            Rectangle {
                width: parent.width * 0.55
                height: parent.height * 0.70
                anchors.right: parent.right
                anchors.top: parent.top
                color: "transparent"
                opacity: 0.20 + Math.cos(root.screensaverPhase * 1.3) * 0.15

                gradient: Gradient {
                    orientation: Gradient.Horizontal
                    GradientStop { position: 0.0; color: "transparent" }
                    GradientStop { position: 0.55; color: "#4400c8ff" }
                    GradientStop { position: 1.0; color: "transparent" }
                }
            }

            // Destello de energía en el núcleo central
            Rectangle {
                width: parent.width * 0.35
                height: parent.height * 0.45
                anchors.centerIn: parent
                radius: width / 2
                color: "transparent"
                opacity: 0.15 + Math.sin(root.screensaverPhase * 2.0) * 0.12

                gradient: Gradient {
                    orientation: Gradient.Horizontal
                    GradientStop { position: 0.0; color: "transparent" }
                    GradientStop { position: 0.5; color: "#55ffffff" }
                    GradientStop { position: 1.0; color: "transparent" }
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // CAPA 3: Transiciones Suaves
    // -------------------------------------------------------------------------
    NumberAnimation {
        id: introAnim
        target: sceneContainer
        property: "opacity"
        from: 0.0
        to: 1.0
        duration: 1000
        easing.type: Easing.InOutQuad
    }

    NumberAnimation {
        id: fadeOutAnim
        target: root
        property: "opacity"
        from: 1.0
        to: 0.0
        duration: 650
        easing.type: Easing.InOutQuad
    }
}
```

---

## 3. Tema 2: "Groove Stroke" (Rayos Eléctricos Libres en GPU Shader)

### 3.1. Arquitectura y Modelo Matemático de Plasma
Ubicado en: `/usr/share/plasma/look-and-feel/org.groove.ribbons.desktop/`

En lugar de reproducir video o consumir ciclos de CPU con renderizado 2D, **Groove Stroke** compila un sombreador GLSL a bytecode binario SPIR-V/QSB mediante el compilador Qt 6 `qsb`. Los núcleos de la GPU computan en paralelo el campo electromagnético en tiempo real a 60 FPS fijos.

#### Física de los Rayos Eléctricos Libres:
1. **Emisión Radial:** 16 arcos voltaicos nacen en el radio del electrodo central ($R_{\text{core}} = 0.135$) y se proyectan libremente por todo el espacio bidimensional hasta sobrepasar los límites de la pantalla ($r > 1.25$).
2. **Turbulencia Eléctrica Multifrecuencia (FBM):**
   $$\text{Discharge}(r, \phi, t) = 0.38 \sin(7.5r + 4.8t + 2.1\phi) + 0.22 \sin(19r - 9.5t + 4.3\phi) + 0.11 \sin(46r + 22t) + 0.05 \cos(88r - 38t)$$
   La combinación de armónicos de baja y alta frecuencia recrea el latigazo errático del plasma voltaico real.
3. **Disipación en los Bordes:**
   $$\text{EdgeFade} = \operatorname{clamp}\left(\frac{1.25 - r}{0.45}, 0.0, 1.0\right)$$
   Los rayos no chocan contra paredes artificiales; se atenúan gradualmente conforme se alejan del núcleo hasta disolverse en el negro absoluto.
4. **Núcleo Incandescente y Aura de Ionización:**
   Cada rayo posee un núcleo central con brillo exponencial blanco caliente y un halo gaseoso circundante que baña el vacío de color cian, magenta tesla o ámbar solar.

### 3.2. Código Fuente GLSL: `ribbons.frag` (`org.groove.ribbons.desktop`)

```glsl
#version 440

layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;

layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    float uTime;
    vec2 uResolution;
};

// Generador pseudoaleatorio de precisión para GPU
float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

// Turbulencia eléctrica continua y orgánica
float electricDischarge(float r, float fi, float t) {
    float v = 0.0;
    v += sin(r * 7.5 + t * 4.8 + fi * 2.1) * 0.38;
    v += sin(r * 19.0 - t * 9.5 + fi * 4.3) * 0.22;
    v += sin(r * 46.0 + t * 22.0 - fi * 1.5) * 0.11;
    v += cos(r * 88.0 - t * 38.0) * 0.05;
    return v;
}

void main() {
    // Coordenadas ortonormales centradas en (0, 0)
    vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
    float r = length(p);
    float theta = atan(p.y, p.x);

    float R_core = 0.135;
    vec3 finalColor = vec3(0.0);

    // =========================================================================
    // 16 RAYOS VOLTAICOS LIBRES
    // =========================================================================
    if (r >= R_core * 0.82) {
        float alpha = max(0.0, (r - R_core) / 0.80);
        float envelope = min(1.0, alpha * 2.5);
        float edgeFade = clamp((1.25 - r) / 0.45, 0.0, 1.0);

        for (int i = 0; i < 16; ++i) {
            float fi = float(i);
            float baseAngle = (fi / 16.0) * 6.2831853;
            
            float drift = sin(uTime * 0.35 + fi * 1.3) * 0.55 + cos(uTime * 0.20 - fi * 0.7) * 0.30;
            float jumpStep = floor(uTime * 1.3 + fi * 0.7);
            float jumpAngle = (hash11(jumpStep * 19.1) - 0.5) * 0.75;
            
            float arcAngle = baseAngle + drift + jumpAngle;
            arcAngle += electricDischarge(r, fi, uTime) * envelope;

            // Distancia polar envuelta en [-pi, pi]
            float dAngle = mod(theta - arcAngle + 3.14159265, 6.2831853) - 3.14159265;
            float distToArc = r * abs(dAngle);

            // Núcleo blanco y halo bloom
            float core = pow(max(0.0, 1.0 - distToArc / 0.0030), 1.5) * 2.4;
            float glow = 0.0040 / (distToArc * distToArc * 260.0 + distToArc + 0.0028) * 1.25;
            
            float flicker = 0.80 + 0.20 * sin(uTime * 25.0 + fi * 8.0);
            float intensity = (core + glow) * flicker * edgeFade;

            // Tríada cromática de plasma: Cian, Magenta Tesla, Ámbar Solar
            vec3 arcCol;
            float m = mod(fi, 3.0);
            if (m < 1.0) {
                arcCol = vec3(0.05, 0.95, 1.00);
            } else if (m < 2.0) {
                arcCol = vec3(0.95, 0.18, 0.90);
            } else {
                arcCol = vec3(1.00, 0.78, 0.18);
            }

            arcCol = clamp(arcCol + vec3(core * 0.90), 0.0, 1.0);
            finalColor += arcCol * intensity * 0.30;
        }
    }

    // Corona de energía del electrodo central
    float dCore = length(p * vec2(1.0, 1.35));
    float coreAura = 0.006 / (dCore + 0.014) * 0.45;
    coreAura *= (0.85 + 0.15 * sin(uTime * 5.0));
    finalColor += vec3(0.25, 0.75, 1.00) * coreAura;

    // Máscara de exclusión para el emblema central
    float logoClearance = smoothstep(0.12, 0.18, dCore);
    finalColor *= (0.25 + 0.75 * logoClearance);

    // Ajuste cinematográfico gamma
    finalColor = pow(max(finalColor, vec3(0.0)), vec3(0.88));

    fragColor = vec4(finalColor, 1.0) * qt_Opacity;
}
```

### 3.3. Integración en QML: `Splash.qml` (`org.groove.ribbons.desktop`)

```qml
/*
    Linux Groove - Groove Stroke Screensaver Splash Screen (Free Electric Lightning Edition)
    SPDX-License-Identifier: GPL-2.0-or-later
*/

import QtQuick
import org.kde.kirigami as Kirigami

Rectangle {
    id: root
    width: 1280
    height: 800
    color: "#000000" // CAPA 0: Fondo 100% negro puro absoluto

    property int stage: 0

    onStageChanged: {
        if (stage === 1 || stage === 2) {
            introAnim.running = true;
        } else if (stage >= 5) {
            fadeOutAnim.running = true;
        }
    }

    Component.onCompleted: {
        introAnim.running = true;
    }

    property real screensaverTime: 0.0
    NumberAnimation on screensaverTime {
        from: 0.0; to: 10000.0; duration: 10000000; loops: Animation.Infinite; running: true
    }

    property real screensaverPhase: 0.0
    NumberAnimation on screensaverPhase {
        from: 0.0; to: Math.PI * 2; duration: 14000; loops: Animation.Infinite; running: true
    }

    // -------------------------------------------------------------------------
    // CAPA 1: Shader de Rayos Eléctricos Libres en GPU a 60 FPS
    // -------------------------------------------------------------------------
    ShaderEffect {
        id: ribbonsShader
        z: 1
        anchors.fill: parent
        opacity: 1.0
        property real uTime: root.screensaverTime
        property vector2d uResolution: Qt.vector2d(width, height)
        fragmentShader: "shaders/ribbons.frag.qsb"
    }

    // -------------------------------------------------------------------------
    // CAPA 2: Emblema SVG/PNG Central con Cámara Flotante y Respiración
    // -------------------------------------------------------------------------
    Item {
        id: logoCenter
        z: 10
        anchors.centerIn: parent
        width: Math.min(parent.width * 0.44, Kirigami.Units.gridUnit * 21)
        height: width * 0.66
        opacity: 1.0

        // Deriva continua en X e Y
        x: (parent.width - width) / 2 + Math.sin(root.screensaverPhase) * 10
        y: (parent.height - height) / 2 + Math.cos(root.screensaverPhase * 0.8) * 7

        Image {
            id: logoImage
            anchors.fill: parent
            fillMode: Image.PreserveAspectFit
            asynchronous: false
            smooth: true
            source: "images/groove-logo-glow.png"

            // Respiración de escala cinematográfica de 7 segundos
            SequentialAnimation on scale {
                loops: Animation.Infinite
                running: true
                NumberAnimation { from: 1.00; to: 1.035; duration: 7000; easing.type: Easing.InOutSine }
                NumberAnimation { from: 1.035; to: 1.00; duration: 7000; easing.type: Easing.InOutSine }
            }
        }
    }

    // -------------------------------------------------------------------------
    // CAPA 3: Tipografía Minimalista
    // -------------------------------------------------------------------------
    Text {
        z: 12
        anchors.bottom: parent.bottom
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottomMargin: Kirigami.Units.gridUnit * 2.2
        text: "L I N U X   G R O O V E"
        color: "#ffffff"
        font.pixelSize: Kirigami.Units.gridUnit * 0.70
        font.letterSpacing: 6
        font.weight: Font.DemiBold
        opacity: 0.75
    }

    // -------------------------------------------------------------------------
    // CAPA 4: Transiciones
    // -------------------------------------------------------------------------
    ParallelAnimation {
        id: introAnim
        NumberAnimation { target: ribbonsShader; property: "opacity"; from: 0.0; to: 1.0; duration: 1000; easing.type: Easing.OutCubic }
        NumberAnimation { target: logoCenter; property: "opacity"; from: 0.0; to: 1.0; duration: 900; easing.type: Easing.OutCubic }
    }

    NumberAnimation {
        id: fadeOutAnim
        target: root
        property: "opacity"
        from: 1.0
        to: 0.0
        duration: 600
        easing.type: Easing.InOutQuad
    }
}
```

---

## 4. Pipeline de Compilación de Sombreadores con `qsb`

Para que un archivo `.frag` funcione dentro de Qt 6 en Linux (utilizando OpenGL, Vulkan o Wayland), debe compilarse con el compilador binario oficial de Qt Shader Tools:

```bash
# Compilación oficial en Arch Linux / Linux Groove
/usr/lib/qt6/bin/qsb --glsl "100 es,120,150" \
  -o /usr/share/plasma/look-and-feel/org.groove.ribbons.desktop/contents/splash/shaders/ribbons.frag.qsb \
     /usr/share/plasma/look-and-feel/org.groove.ribbons.desktop/contents/splash/shaders/ribbons.frag
```

El archivo resultante `.qsb` encapsula:
1. SPIR-V 100 binario para Vulkan.
2. GLSL 100 ES para OpenGL ES (móviles / SoC integrados).
3. GLSL 120 / 150 para controladores de escritorio Linux estándar.
4. Metadatos de reflexión JSON del `uniform buf` std140.

---

## 5. Nueva Propuesta Conceptual: "Groove Labyrinth" (Laberinto ASCII Art Neón)

### 5.1. Concepto y Filosofía
La propuesta solicitada consiste en una pantalla de bienvenida inspirada en la cultura *demoscene*, la estética terminal *cyberpunk* y los clásicos laberintos procedurales de ASCII Art de los años 80-90, pero impulsada con shaders de GPU modernos:

1. **La Cuadrícula de Terminal ASCII:**
   - La pantalla se subdivide en una cuadrícula de caracteres monoespaciados (ej. $120 \times 75$ celdas de matriz).
   - Los muros del laberinto se construyen proceduralmente utilizando glifos ASCII: `+`, `-`, `|`, `#`, `░`, `▒`, `▓`, `/`, `\`.
2. **Haces de Luz Neón en los Pasillos (*Light Runners*):**
   - Paquetes de luz brillantes (cian, violeta y naranja) recorren los pasillos del laberinto como si fueran señales eléctricas o datos a alta velocidad.
   - Dejan una estela luminosa (*phosphor persistence*) con efecto bloom/glow retro de fósforo verde o neón moderno.
3. **Resolución del Laberinto y Revelación del SVG:**
   - Durante las etapas iniciales de arranque (`stage 1-3`), el laberinto se genera, muta y los pulsos de luz buscan el centro.
   - En `stage 4`, las rutas convergen hacia la cámara central: las paredes de ASCII se abren en abanico o se desintegran en partículas de caracteres disueltos.
   - En el corazón del laberinto iluminado, se revela en toda su gloria el emblema de teclas de piano de **Linux Groove** con su retroiluminación cinematográfica.

### 5.2. Arquitectura Técnica Propuesta

```mermaid
flowchart TD
    A[Grid de Celdas ASCII] --> B[Generador de Laberinto Procedural: Truchet Tiles]
    B --> C[Shaders GLSL: Renderizado de Caracteres por Bitmask]
    C --> D[Pulsos de Luz Neón: Dijkstra / Flow Field]
    D --> E[Fase de Convergencia Central]
    E --> F[Apertura de Muros ASCII y Revelación del SVG de Groove]
```

#### Opciones de Implementación:
- **Opción A (100% GPU Fragment Shader con QSB):**
  - Se codifica una fuente de caracteres 8x8 en una pequeña textura o bitmask entero en GLSL.
  - La lógica de laberinto (ej. algoritmo de Truchet con cuadrícula aleatoria animada por tiempo) se evalúa en el fragment shader.
  - Cero consumo de CPU, 60 FPS garantizados, efecto de tubo CRT / Bloom integrado.
- **Opción B (Híbrido QML Matrix + Shader Bloom):**
  - QML maneja la cuadrícula de texto ASCII mediante un `Item` repetidor optimizado o `TableView` liviano, y un `ShaderEffect` aplica el barrido lumínico y resplandor sobre los glifos.
  - Facilita transiciones fluidas de opacidad del texto hacia el SVG central.

---

*Fin del documento técnico.*
