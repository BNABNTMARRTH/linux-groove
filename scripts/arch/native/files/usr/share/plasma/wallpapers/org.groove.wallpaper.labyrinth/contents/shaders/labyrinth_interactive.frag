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

    // Luminancia ambiental tenue de terminal oscura
    float baseLum = glyphVal * 0.10;
    vec3 mazeColor = vec3(0.04, 0.07, 0.14) * baseLum;

    // =========================================================================
    // 2. 10 CORREDORES NEÓN CON ATRACCIÓN MAGNÉTICA VISIBLE AL CURSOR
    // =========================================================================
    vec3 logoDynamicLight = vec3(0.0);

    for (int k = 0; k < 10; ++k) {
        float fk = float(k);
        float speed = 0.70 + mod(fk * 1.618, 3.0) * 0.28;
        float phase = fk * 1.2566;
        float t = uTime * speed + phase;

        // Trayectoria autónoma de patrullaje por los pasillos
        vec2 autoPos;
        autoPos.x = 0.50 + 0.42 * sin(t * 0.65 + fk * 0.85) + 0.07 * sin(t * 1.9 + fk);
        autoPos.y = 0.50 + 0.38 * cos(t * 0.55 + fk * 1.25) + 0.06 * cos(t * 1.7 + fk * 2.0);

        // Reacción inmediata hacia el cursor del ratón
        vec2 runnerNorm = autoPos;
        if (uMouseHover > 0.01) {
            vec2 toMouse = uMouse - autoPos;
            float dMouse = length(toMouse * aspectCorr);
            
            // Atracción magnética fuerte cuando el cursor está en el radio
            float pull = clamp(1.0 - dMouse / 0.50, 0.0, 1.0) * 0.82 * uMouseHover;
            
            // Enjambre orbital danzante alrededor del puntero
            vec2 swarmOrbit = vec2(sin(t * 3.0 + fk * 1.8), cos(t * 3.0 + fk * 1.8)) * (0.05 + 0.03 * mod(fk, 3.0));
            runnerNorm = mix(autoPos, uMouse + swarmOrbit, pull);
        }

        // Paleta tricolor de Linux Groove
        vec3 runnerCol;
        float m = mod(fk, 3.0);
        if (m < 1.0) runnerCol = vec3(0.05, 0.95, 1.00);      // Cian eléctrico
        else if (m < 2.0) runnerCol = vec3(0.98, 0.18, 0.90); // Magenta neón Tesla
        else runnerCol = vec3(1.00, 0.76, 0.16);              // Fuego ámbar solar

        // Iluminación sobre los caracteres del laberinto
        vec2 runnerCell = runnerNorm * gridDim;
        vec2 dCell = (cellId + cellUv) - runnerCell;
        float distCells = length(dCell);
        float glow = 2.8 / (distCells * distCells * 0.38 + distCells + 1.15);

        if (glyphVal > 0.0) {
            vec3 litChar = runnerCol * (glow * glyphVal * 0.88);
            float whiteCore = max(0.0, 1.0 - distCells / 2.2) * glyphVal * 0.42;
            mazeColor += litChar + vec3(whiteCore);
        } else {
            mazeColor += runnerCol * (glow * 0.075);
        }

        // Iluminación proyectada sobre el logotipo SVG
        vec2 diffLogo = (qt_TexCoord0 - runnerNorm) * aspectCorr;
        float distLogo = length(diffLogo);
        float atten = 1.0 / (1.0 + 15.0 * distLogo + 65.0 * distLogo * distLogo);
        logoDynamicLight += runnerCol * (atten * 0.95);
    }

    // =========================================================================
    // 3. FARO DE LUZ INTERACTIVO DEL PROPIO CURSOR
    // =========================================================================
    if (uMouseHover > 0.01) {
        vec2 diffCursor = (qt_TexCoord0 - uMouse) * aspectCorr;
        float distCursor = length(diffCursor);
        float cursorGlow = (0.24 / (distCursor * distCursor * 10.0 + distCursor * 2.8 + 0.02)) * uMouseHover;
        vec3 cursorColor = vec3(0.90, 0.96, 1.00); // Resplandor cian/blanco celestial

        if (glyphVal > 0.0) {
            mazeColor += cursorColor * (cursorGlow * glyphVal * 1.10);
            float core = max(0.0, 1.0 - distCursor / 0.10) * glyphVal * 0.50;
            mazeColor += vec3(core);
        } else {
            mazeColor += cursorColor * (cursorGlow * 0.22);
        }
        logoDynamicLight += cursorColor * (cursorGlow * 1.60);
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

    // Resplandor / halo ambiental alrededor del logo
    float distToLogoCenter = length((qt_TexCoord0 - uLogoCenter) * aspectCorr);
    float logoRadius = length(logoHalfSize * aspectCorr);
    if (distToLogoCenter < logoRadius * 1.5) {
        float haloFade = smoothstep(logoRadius * 1.5, logoRadius * 0.35, distToLogoCenter);
        finalColor += logoDynamicLight * (haloFade * 0.28 * (1.0 - logoTex.a));
    }

    // Las barras blancas puras absorben y reflejan el color de cada luz que pasa
    if (logoTex.a > 0.01) {
        vec3 whiteBase = vec3(0.92, 0.94, 0.98);
        vec3 litLogoCol = whiteBase * 0.82 + logoDynamicLight * 1.45;

        float peak = max(logoDynamicLight.r, max(logoDynamicLight.g, logoDynamicLight.b));
        if (peak > 0.85) {
            litLogoCol += vec3((peak - 0.85) * 0.45);
        }

        finalColor = mix(mazeColor, litLogoCol, logoTex.a);
    }

    // Curva de contraste cinematográfica
    finalColor = pow(max(finalColor, vec3(0.0)), vec3(0.92));
    fragColor = vec4(finalColor, 1.0) * qt_Opacity;
}
