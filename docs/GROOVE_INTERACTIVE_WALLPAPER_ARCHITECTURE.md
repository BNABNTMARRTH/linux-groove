# Arquitectura y Diseño: Fondo de Pantalla Dinámico e Interactivo en Linux Groove

**Documento:** `GROOVE_INTERACTIVE_WALLPAPER_ARCHITECTURE.md`  
**Estado:** Especificación e Implementación de Producción  
**Componente:** `org.groove.wallpaper.labyrinth` (**"Groove Labyrinth Interactivo"**)  
**Tipo de Paquete:** `Plasma/Wallpaper` (KDE Plasma 6 / Wayland)  
**Fecha:** Noviembre 2026  
**Autor:** Antigravity & Equipo de Ingeniería de Linux Groove  

---

## 1. Visión General del Proyecto

En entornos de escritorio convencionales, los fondos de pantalla suelen ser imágenes rasterizadas estáticas (`.png`, `.jpg`) o videos en bucle (`.mp4`) que consumen recursos excesivos de CPU y batería.

En **Linux Groove**, elevamos el escritorio a una experiencia cinemática e interactiva en tiempo real utilizando la infraestructura nativa de sombreadores en hardware de **KDE Plasma 6** y **Qt 6**:

1. **Renderizado Directo en GPU a 60 FPS:** Todo el entorno (laberinto de terminal ASCII, corredores de luz de neón y logotipo) se calcula matemáticamente por fragmento en la GPU mediante sombreadores compilados en formato binario universal con `qsb` (SPIR-V para Vulkan y GLSL para OpenGL/Wayland).
2. **Consumo de CPU Virtualmente Nulo (< 1%):** Al no decodificar video por software ni manipular pixeles en CPU, el impacto térmico y de consumo energético es imperceptible.
3. **Reactividad al Cursor del Ratón (Gravedad Cuántica e Iluminación):**
   - Cuando el usuario mueve el cursor por el escritorio, los corredores de luz neón más cercanos son atraídos gravitatoriamente hacia él, orbitándolo como partículas cuánticas o luciérnagas digitales.
   - El propio cursor actúa como un **faro de luz interactivo** que revela y enciende los caracteres ASCII a su paso.
4. **Logotipo Soundwave en Blanco Puro Reactivo:**
   - Las barras ecualizadoras de piano en blanco puro actúan como reflectores perfectos: absorben y emiten instantáneamente el color de cualquier luz (cian eléctrico, magenta Tesla, ámbar solar o el faro del ratón) que pase cerca.
   - A través de las separaciones transparentes de las barras, el laberinto continúa visible sin interrupciones ni cortes artificiales.
5. **Cero Interferencia con el Flujo de Trabajo:**
   - La captura del ratón se realiza mediante `HoverHandler` y `MouseArea` pasivo (`acceptedButtons: Qt.NoButton`).
   - El usuario puede hacer click derecho para abrir el menú de Plasma, seleccionar archivos en el escritorio o arrastrar ventanas sin que el wallpaper intercepte los eventos de botón.

---

## 2. Estructura del Paquete en KDE Plasma 6

El plugin reside de forma global en el sistema de archivos de Linux Groove:

```
/usr/share/plasma/wallpapers/org.groove.wallpaper.labyrinth/
├── metadata.json                                # Registro del plugin para KPackage / Plasma 6
└── contents/
    ├── images/
    │   └── groove-soundwave-white.png          # Textura del logo en blanco puro (TrueColorAlpha)
    ├── shaders/
    │   ├── labyrinth_interactive.frag          # Código fuente GLSL 440 con física interactiva
    │   └── labyrinth_interactive.frag.qsb      # Binario multiplataforma compilado con qsb
    └── ui/
        └── main.qml                            # Componente WallpaperItem de Plasma 6
```

---

## 3. Manifiesto del Plugin: `metadata.json`

Permite que KDE Plasma 6 descubra el plugin tanto en la configuración del escritorio como en `kpackagetool6 --type Plasma/Wallpaper --list --global`:

```json
{
    "KPackageStructure": "Plasma/Wallpaper",
    "KPlugin": {
        "Authors": [
            {
                "Email": "info@linuxgroove.org",
                "Name": "Linux Groove Team"
            }
        ],
        "Category": "Graphics",
        "Description": "Interactive Cyberpunk ASCII Matrix Wallpaper with Reactive Light Runners and Pure White Soundwave Logo",
        "Description[es]": "Fondo de pantalla interactivo estilo ASCII Matrix con corredores de luz reactivos al cursor y logo Soundwave blanco puro",
        "Icon": "preferences-desktop-wallpaper",
        "Id": "org.groove.wallpaper.labyrinth",
        "License": "GPL-2.0-or-later",
        "Name": "Groove Labyrinth Interactivo",
        "Version": "1.0.0",
        "Website": "https://linuxgroove.org"
    },
    "X-KDE-ParentApp": "org.kde.plasmashell"
}
```

---

## 4. Código Fuente Maestro: `contents/ui/main.qml`

Integra el ciclo de vida del fondo de escritorio de Plasma, la amortiguación física del cursor (lerp a 60 Hz) y el `ShaderEffect`:

```qml
/*
    Linux Groove - Interactive Cyberpunk ASCII Labyrinth Dynamic Wallpaper
    Wallpaper Plugin for KDE Plasma 6 (Plasma/Wallpaper)
    SPDX-License-Identifier: GPL-2.0-or-later
*/

import QtQuick
import org.kde.kirigami as Kirigami
import org.kde.plasma.plasmoid

WallpaperItem {
    id: root

    // Temporizador continuo para el Shader GLSL (GPU 60 FPS)
    property real wallpaperTime: 0.0
    NumberAnimation on wallpaperTime {
        from: 0.0
        to: 100000.0
        duration: 100000000
        loops: Animation.Infinite
        running: true
    }

    // Deriva suave y lenta de cámara (18 segundos)
    property real cameraPhase: 0.0
    NumberAnimation on cameraPhase {
        from: 0.0
        to: Math.PI * 2
        duration: 18000
        loops: Animation.Infinite
        running: true
    }

    // Respiración sutil de escala cinematográfica (8 segundos)
    property real logoScale: 1.0
    SequentialAnimation on logoScale {
        loops: Animation.Infinite
        running: true
        NumberAnimation {
            from: 1.00
            to: 1.03
            duration: 8000
            easing.type: Easing.InOutSine
        }
        NumberAnimation {
            from: 1.03
            to: 1.00
            duration: 8000
            easing.type: Easing.InOutSine
        }
    }

    // -------------------------------------------------------------------------
    // SEGUIMIENTO INTERACTIVO DEL CURSOR (Sin bloquear clicks del escritorio)
    // -------------------------------------------------------------------------
    property point targetMouse: Qt.point(0.5, 0.5)
    property point smoothMouse: Qt.point(0.5, 0.5)
    property real mouseHovered: 0.0

    // HoverHandler moderno de Qt 6
    HoverHandler {
        id: hoverHandler
        onPointChanged: {
            if (root.width > 0 && root.height > 0) {
                root.targetMouse = Qt.point(
                    point.position.x / root.width,
                    point.position.y / root.height
                );
                root.mouseHovered = 1.0;
            }
        }
    }

    // MouseArea de respaldo sin captura de clicks (acceptedButtons: Qt.NoButton)
    MouseArea {
        anchors.fill: parent
        hoverEnabled: true
        acceptedButtons: Qt.NoButton // Permite que los clicks pasen al escritorio
        onPositionChanged: (mouse) => {
            if (root.width > 0 && root.height > 0) {
                root.targetMouse = Qt.point(
                    mouse.x / root.width,
                    mouse.y / root.height
                );
                root.mouseHovered = 1.0;
            }
        }
        onExited: {
            root.mouseHovered = 0.0;
        }
    }

    // Amortiguación física lerp para movimiento de estela suave
    Timer {
        interval: 16 // 60 Hz
        repeat: true
        running: true
        onTriggered: {
            var tx = root.targetMouse.x;
            var ty = root.targetMouse.y;
            var sx = root.smoothMouse.x;
            var sy = root.smoothMouse.y;
            root.smoothMouse = Qt.point(
                sx + (tx - sx) * 0.16,
                sy + (ty - sy) * 0.16
            );
        }
    }

    // -------------------------------------------------------------------------
    // CAPA 1: Textura Fuente del Emblema Soundwave en Blanco Puro en VRAM
    // -------------------------------------------------------------------------
    Image {
        id: logoSource
        source: "../images/groove-soundwave-white.png"
        visible: false
        smooth: true
        asynchronous: false
    }

    // -------------------------------------------------------------------------
    // CAPA 2: Shader del Laberinto ASCII + Corredores Reactivos + Faro del Cursor
    // -------------------------------------------------------------------------
    ShaderEffect {
        id: labyrinthShader
        z: 1
        anchors.fill: parent

        property real uTime: root.wallpaperTime
        property vector2d uResolution: Qt.vector2d(Math.max(1.0, width), Math.max(1.0, height))

        // Centro flotante del logotipo
        property vector2d uLogoCenter: Qt.vector2d(
            0.50 + (Math.sin(root.cameraPhase) * 10.0) / Math.max(1.0, width),
            0.50 + (Math.cos(root.cameraPhase * 0.8) * 6.0) / Math.max(1.0, height)
        )

        // Dimensión normalizada manteniendo proporción 1:1
        property real baseLogoWidth: Math.min(width * 0.30, height * 0.48, 420.0) * root.logoScale
        property vector2d uLogoSize: Qt.vector2d(
            baseLogoWidth / Math.max(1.0, width),
            baseLogoWidth / Math.max(1.0, height)
        )

        // Posición y estado interactivo del cursor del ratón
        property vector2d uMouse: Qt.vector2d(root.smoothMouse.x, root.smoothMouse.y)
        property real uMouseHover: root.mouseHovered
        property real uPadding: 0.0

        property var sourceLogo: logoSource

        fragmentShader: "../shaders/labyrinth_interactive.frag.qsb"
    }

    // -------------------------------------------------------------------------
    // CAPA 3: Tipografía Minimalista
    // -------------------------------------------------------------------------
    Text {
        z: 10
        anchors.bottom: parent.bottom
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottomMargin: Kirigami.Units.gridUnit * 2.4
        text: "L I N U X   G R O O V E"
        color: "#ffffff"
        font.pixelSize: Kirigami.Units.gridUnit * 0.70
        font.letterSpacing: 6
        font.weight: Font.DemiBold
        opacity: 0.70
    }
}
```

---

## 5. El Sombreador de Fragmentos: `labyrinth_interactive.frag`

### 5.1. Alineación std140 del Uniform Buffer
Para garantizar compatibilidad binaria estricta entre arquitecturas x86_64 y AArch64 (ARM64), el bloque de memoria UBO cumple con las reglas estándar de std140:

| Miembro | Tipo GLSL | Offset en Bytes | Tamaño | Alineación |
| :--- | :--- | :--- | :--- | :--- |
| `qt_Matrix` | `mat4` | 0 | 64 | 16 |
| `qt_Opacity` | `float` | 64 | 4 | 4 |
| `uTime` | `float` | 68 | 4 | 4 |
| `uResolution` | `vec2` | 72 | 8 | 8 ($72 = 8 \times 9$) |
| `uLogoCenter` | `vec2` | 80 | 8 | 8 ($80 = 8 \times 10$) |
| `uLogoSize` | `vec2` | 88 | 8 | 8 ($88 = 8 \times 11$) |
| `uMouse` | `vec2` | 96 | 8 | 8 ($96 = 8 \times 12$) |
| `uMouseHover` | `float` | 104 | 4 | 4 ($104 = 4 \times 26$) |
| `uPadding` | `float` | 108 | 4 | 4 (Completa a 112 bytes, múltiplo de 16) |

### 5.2. Código Fuente Completo del Shader

```glsl
#version 440

/*
    Linux Groove - Interactive Cyberpunk ASCII Labyrinth Wallpaper Shader
    Reactive Light Runners with Mouse Gravitational Attraction + Pure White SVG Soundwave
    SPDX-License-Identifier: GPL-2.0-or-later
*/

layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;

layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;       // offset 0, size 64
    float qt_Opacity;     // offset 64, size 4
    float uTime;          // offset 68, size 4
    vec2 uResolution;     // offset 72, size 8
    vec2 uLogoCenter;     // offset 80, size 8 (normalizado 0..1)
    vec2 uLogoSize;       // offset 88, size 8 (normalizado 0..1)
    vec2 uMouse;          // offset 96, size 8 (normalizado 0..1)
    float uMouseHover;    // offset 104, size 4
    float uPadding;       // offset 108, size 4 (alineación std140 a 16 bytes: total 112)
};

layout(binding = 1) uniform sampler2D sourceLogo;

// Ruido pseudoaleatorio para la matriz procedural
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void main() {
    vec2 aspectCorr = vec2(uResolution.x / uResolution.y, 1.0);

    // =========================================================================
    // 1. CUADRÍCULA DE TERMINAL ASCII PROCEDURAL (80x50 celdas)
    // =========================================================================
    vec2 gridDim = vec2(80.0, 50.0);
    vec2 cellId = floor(qt_TexCoord0 * gridDim);
    vec2 cellUv = fract(qt_TexCoord0 * gridDim);

    float h = hash21(cellId);
    float glyphVal = 0.0;
    int glyphType = 0; // 0: '·', 1: '-', 2: '|', 3: '+', 4: '#'

    bool isEvenX = mod(cellId.x, 2.0) < 1.0;
    bool isEvenY = mod(cellId.y, 2.0) < 1.0;

    if (isEvenX && isEvenY) {
        glyphType = 3; // Cruce '+'
    } else if (isEvenY) {
        glyphType = (h > 0.30) ? 1 : 0; // Muro horizontal '-' o pasillo '·'
    } else if (isEvenX) {
        glyphType = (h > 0.30) ? 2 : 0; // Muro vertical '|' o pasillo '·'
    } else {
        glyphType = (h > 0.68) ? 4 : 0; // Bloque denso '#' o pasillo '·'
    }

    // Dibujo analítico de los glifos de matriz
    if (glyphType == 1) {
        if (abs(cellUv.y - 0.5) < 0.09 && abs(cellUv.x - 0.5) < 0.42) glyphVal = 1.0;
    } else if (glyphType == 2) {
        if (abs(cellUv.x - 0.5) < 0.09 && abs(cellUv.y - 0.5) < 0.42) glyphVal = 1.0;
    } else if (glyphType == 3) {
        if ((abs(cellUv.y - 0.5) < 0.09 && abs(cellUv.x - 0.5) < 0.42) ||
            (abs(cellUv.x - 0.5) < 0.09 && abs(cellUv.y - 0.5) < 0.42)) glyphVal = 1.0;
    } else if (glyphType == 4) {
        if ((abs(cellUv.x - 0.32) < 0.065 || abs(cellUv.x - 0.68) < 0.065) && abs(cellUv.y - 0.5) < 0.36) glyphVal = 1.0;
        if ((abs(cellUv.y - 0.32) < 0.065 || abs(cellUv.y - 0.68) < 0.065) && abs(cellUv.x - 0.5) < 0.36) glyphVal = 1.0;
    } else {
        if (length(cellUv - vec2(0.5)) < 0.10) glyphVal = 0.70;
    }

    float baseLum = glyphVal * 0.10;
    vec3 mazeColor = vec3(0.04, 0.07, 0.14) * baseLum;

    // =========================================================================
    // 2. 10 CORREDORES NEÓN CON FÍSICA DE ATRACCIÓN HACIA EL CURSOR
    // =========================================================================
    vec3 logoDynamicLight = vec3(0.0);

    for (int k = 0; k < 10; ++k) {
        float fk = float(k);
        float speed = 0.70 + mod(fk * 1.618, 3.0) * 0.28;
        float phase = fk * 1.2566;
        float t = uTime * speed + phase;

        vec2 autoPos;
        autoPos.x = 0.50 + 0.42 * sin(t * 0.65 + fk * 0.85) + 0.07 * sin(t * 1.9 + fk);
        autoPos.y = 0.50 + 0.38 * cos(t * 0.55 + fk * 1.25) + 0.06 * cos(t * 1.7 + fk * 2.0);

        vec2 runnerNorm = autoPos;
        if (uMouseHover > 0.01) {
            vec2 toMouse = uMouse - autoPos;
            float dMouse = length(toMouse * aspectCorr);
            // Gravedad cuántica hacia el ratón
            float pull = (1.0 / (dMouse * 3.2 + 1.0)) * 0.45 * uMouseHover;
            // Órbita de micro-enjambre alrededor del cursor
            vec2 swarmOrbit = vec2(sin(t * 2.5 + fk * 1.6), cos(t * 2.5 + fk * 1.6)) * (0.04 + 0.02 * mod(fk, 3.0));
            runnerNorm = mix(autoPos, uMouse + swarmOrbit, pull);
        }

        vec3 runnerCol;
        float m = mod(fk, 3.0);
        if (m < 1.0) runnerCol = vec3(0.05, 0.95, 1.00);      // Cian eléctrico
        else if (m < 2.0) runnerCol = vec3(0.98, 0.18, 0.90); // Magenta neón Tesla
        else runnerCol = vec3(1.00, 0.76, 0.16);              // Fuego ámbar solar

        vec2 runnerCell = runnerNorm * gridDim;
        vec2 dCell = (cellId + cellUv) - runnerCell;
        float distCells = length(dCell);
        float glow = 2.6 / (distCells * distCells * 0.40 + distCells + 1.2);

        if (glyphVal > 0.0) {
            vec3 litChar = runnerCol * (glow * glyphVal * 0.85);
            float whiteCore = max(0.0, 1.0 - distCells / 2.2) * glyphVal * 0.40;
            mazeColor += litChar + vec3(whiteCore);
        } else {
            mazeColor += runnerCol * (glow * 0.07);
        }

        vec2 diffLogo = (qt_TexCoord0 - runnerNorm) * aspectCorr;
        float distLogo = length(diffLogo);
        float atten = 1.0 / (1.0 + 16.0 * distLogo + 70.0 * distLogo * distLogo);
        logoDynamicLight += runnerCol * (atten * 0.90);
    }

    // =========================================================================
    // 3. FARO DE LUZ INTERACTIVO DEL PROPIO CURSOR
    // =========================================================================
    if (uMouseHover > 0.01) {
        vec2 diffCursor = (qt_TexCoord0 - uMouse) * aspectCorr;
        float distCursor = length(diffCursor);
        float cursorGlow = (0.16 / (distCursor * distCursor * 15.0 + distCursor * 3.5 + 0.025)) * uMouseHover;
        vec3 cursorColor = vec3(0.85, 0.95, 1.00);

        if (glyphVal > 0.0) {
            mazeColor += cursorColor * (cursorGlow * glyphVal * 0.95);
        } else {
            mazeColor += cursorColor * (cursorGlow * 0.18);
        }
        logoDynamicLight += cursorColor * (cursorGlow * 1.35);
    }

    // =========================================================================
    // 4. LOGOTIPO SVG EN BLANCO PURO REACTIVO
    // =========================================================================
    vec2 logoHalfSize = 0.5 * uLogoSize;
    vec2 logoMin = uLogoCenter - logoHalfSize;
    vec2 logoMax = uLogoCenter + logoHalfSize;

    vec4 logoTex = vec4(0.0);
    if (qt_TexCoord0.x >= logoMin.x && qt_TexCoord0.x <= logoMax.x &&
        qt_TexCoord0.y >= logoMin.y && qt_TexCoord0.y <= logoMax.y) {
        vec2 logoUv = (qt_TexCoord0 - logoMin) / uLogoSize;
        logoTex = texture(sourceLogo, logoUv);
    }

    vec3 finalColor = mazeColor;

    float distToLogoCenter = length((qt_TexCoord0 - uLogoCenter) * aspectCorr);
    float logoRadius = length(logoHalfSize * aspectCorr);
    if (distToLogoCenter < logoRadius * 1.5) {
        float haloFade = smoothstep(logoRadius * 1.5, logoRadius * 0.35, distToLogoCenter);
        finalColor += logoDynamicLight * (haloFade * 0.26 * (1.0 - logoTex.a));
    }

    if (logoTex.a > 0.01) {
        vec3 whiteBase = vec3(0.92, 0.94, 0.98);
        vec3 litLogoCol = whiteBase * 0.85 + logoDynamicLight * 1.40;

        float peak = max(logoDynamicLight.r, max(logoDynamicLight.g, logoDynamicLight.b));
        if (peak > 0.9) {
            litLogoCol += vec3((peak - 0.9) * 0.40);
        }

        finalColor = mix(mazeColor, litLogoCol, logoTex.a);
    }

    finalColor = pow(max(finalColor, vec3(0.0)), vec3(0.92));
    fragColor = vec4(finalColor, 1.0) * qt_Opacity;
}
```

---

## 6. Pipeline de Compilación con `qsb`

```bash
/usr/lib/qt6/bin/qsb --glsl "100 es,120,150" \
  -o /usr/share/plasma/wallpapers/org.groove.wallpaper.labyrinth/contents/shaders/labyrinth_interactive.frag.qsb \
     /usr/share/plasma/wallpapers/org.groove.wallpaper.labyrinth/contents/shaders/labyrinth_interactive.frag
```

El resultado binario empaqueta:
1. SPIR-V 100 para Vulkan en compositores Wayland modernos.
2. GLSL 100 ES para dispositivos embebidos o aceleradores móviles.
3. GLSL 120 / 150 para controladores de escritorio Linux estándar.
4. Descriptores de reflexión con binding 0 para UBO y binding 1 para la textura del logotipo.

---

## 7. Activación en el Escritorio de Linux Groove

El plugin se puede activar de dos formas:

### 7.1. Desde la Interfaz Gráfica (GUI)
1. Hacer click derecho en cualquier espacio vacío del escritorio.
2. Seleccionar **"Configurar el escritorio y los fondos de pantalla..."**
3. En la lista desplegable **Tipo de fondo de pantalla**, seleccionar **"Groove Labyrinth Interactivo"**.
4. Hacer click en **Aplicar**.

### 7.2. Desde la Línea de Comandos o Scripts de Instalación
En el archivo de configuración de Plasma (`~/.config/plasma-org.kde.plasma.desktop-appletsrc`):

```ini
[Containments][1][Wallpaper][org.groove.wallpaper.labyrinth]
# Configuración predeterminada activada
```

---

*Fin del documento técnico.*
