#version 440

/*
    Linux Groove - Groove Labyrinth Screensaver Fragment Shader
    ASCII Matrix Grid + 10 Neon Light Runners + Dynamic SVG Soundwave Illumination
    SPDX-License-Identifier: GPL-2.0-or-later
*/

layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;

layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;       // offset 0, size 64
    float qt_Opacity;     // offset 64, size 4
    float uTime;          // offset 68, size 4
    vec2 uResolution;     // offset 72, size 8
    vec2 uLogoCenter;     // offset 80, size 8 (normalized 0..1)
    vec2 uLogoSize;       // offset 88, size 8 (normalized 0..1)
};

layout(binding = 1) uniform sampler2D sourceLogo;

// Generador de ruido hash 2D pseudoaleatorio determinista para GPU
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void main() {
    vec2 aspectCorr = vec2(uResolution.x / uResolution.y, 1.0);

    // =========================================================================
    // 1. CUADRÍCULA DE TERMINAL ASCII (Continuo en toda la pantalla, sin círculo)
    // =========================================================================
    vec2 gridDim = vec2(80.0, 50.0);
    vec2 cellId = floor(qt_TexCoord0 * gridDim);
    vec2 cellUv = fract(qt_TexCoord0 * gridDim);

    float h = hash21(cellId);
    float glyphVal = 0.0;
    int glyphType = 0; // 0: dot '·', 1: horiz '-', 2: vert '|', 3: cross '+', 4: block '#'

    bool isEvenX = mod(cellId.x, 2.0) < 1.0;
    bool isEvenY = mod(cellId.y, 2.0) < 1.0;

    if (isEvenX && isEvenY) {
        glyphType = 3; // Cruce '+'
    } else if (isEvenY) {
        glyphType = (h > 0.30) ? 1 : 0; // Muro horizontal '-' o pasillo '·'
    } else if (isEvenX) {
        glyphType = (h > 0.30) ? 2 : 0; // Muro vertical '|' o pasillo '·'
    } else {
        glyphType = (h > 0.68) ? 4 : 0; // Bloque de datos '#' o pasillo '·'
    }

    // Dibujo analítico de trazos de caracteres ASCII
    if (glyphType == 1) {
        // Trazo horizontal '-'
        if (abs(cellUv.y - 0.5) < 0.09 && abs(cellUv.x - 0.5) < 0.42) glyphVal = 1.0;
    } else if (glyphType == 2) {
        // Trazo vertical '|'
        if (abs(cellUv.x - 0.5) < 0.09 && abs(cellUv.y - 0.5) < 0.42) glyphVal = 1.0;
    } else if (glyphType == 3) {
        // Intersección / cruce '+'
        if ((abs(cellUv.y - 0.5) < 0.09 && abs(cellUv.x - 0.5) < 0.42) ||
            (abs(cellUv.x - 0.5) < 0.09 && abs(cellUv.y - 0.5) < 0.42)) glyphVal = 1.0;
    } else if (glyphType == 4) {
        // Carácter bloque '#'
        if ((abs(cellUv.x - 0.32) < 0.065 || abs(cellUv.x - 0.68) < 0.065) && abs(cellUv.y - 0.5) < 0.36) glyphVal = 1.0;
        if ((abs(cellUv.y - 0.32) < 0.065 || abs(cellUv.y - 0.68) < 0.065) && abs(cellUv.x - 0.5) < 0.36) glyphVal = 1.0;
    } else {
        // Punto guía de pasillo '·'
        if (length(cellUv - vec2(0.5)) < 0.10) glyphVal = 0.70;
    }

    // Color base tenue de terminal oscura (100% fondo negro, glifos sutiles)
    float baseLum = glyphVal * 0.10;
    vec3 mazeColor = vec3(0.04, 0.07, 0.14) * baseLum;

    // =========================================================================
    // 2. RECORRIDO DE 10 CORREDORES DE LUZ NEÓN
    // =========================================================================
    vec3 logoDynamicLight = vec3(0.0);

    for (int k = 0; k < 10; ++k) {
        float fk = float(k);
        float speed = 0.75 + mod(fk * 1.618, 3.0) * 0.30;
        float phase = fk * 1.2566; // 2 * PI / 5
        float t = uTime * speed + phase;

        // Trayectoria orbital y sinusoidal por pasillos que cruzan la pantalla entera
        vec2 runnerNorm;
        runnerNorm.x = 0.50 + 0.42 * sin(t * 0.65 + fk * 0.85) + 0.07 * sin(t * 1.9 + fk);
        runnerNorm.y = 0.50 + 0.38 * cos(t * 0.55 + fk * 1.25) + 0.06 * cos(t * 1.7 + fk * 2.0);

        // Paleta tricolor de Linux Groove
        vec3 runnerCol;
        float m = mod(fk, 3.0);
        if (m < 1.0) {
            runnerCol = vec3(0.05, 0.95, 1.00); // Cian eléctrico brillante
        } else if (m < 2.0) {
            runnerCol = vec3(0.98, 0.18, 0.90); // Magenta neón Tesla
        } else {
            runnerCol = vec3(1.00, 0.76, 0.16); // Fuego ámbar solar
        }

        // --- ILUMINACIÓN SOBRE EL LABERINTO ASCII ---
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

        // --- ILUMINACIÓN PROYECTADA SOBRE EL LOGO SOUNDWAVE ---
        vec2 diffLogo = (qt_TexCoord0 - runnerNorm) * aspectCorr;
        float distLogo = length(diffLogo);

        // Atenuación física equilibrada que baña el logo en el color proyectado de la luz
        float atten = 1.0 / (1.0 + 16.0 * distLogo + 70.0 * distLogo * distLogo);
        logoDynamicLight += runnerCol * (atten * 0.90);
    }

    // =========================================================================
    // 3. RENDERIZADO Y BLENDING DEL LOGO SOUNDWAVE CON TRANSPARENCIA
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

    // Resplandor / halo suave proyectado en el espacio vacío inmediato alrededor del logo
    float distToLogoCenter = length((qt_TexCoord0 - uLogoCenter) * aspectCorr);
    float logoRadius = length(logoHalfSize * aspectCorr);
    if (distToLogoCenter < logoRadius * 1.5) {
        float haloFade = smoothstep(logoRadius * 1.5, logoRadius * 0.35, distToLogoCenter);
        finalColor += logoDynamicLight * (haloFade * 0.22 * (1.0 - logoTex.a));
    }

    // Iluminación dinámica de las barras del logotipo SVG
    if (logoTex.a > 0.01) {
        vec3 baseLogoCol = logoTex.rgb;

        // Difusión y reflexión especular del color proyectado por las luces
        vec3 litLogoCol = baseLogoCol * 0.85
                        + logoDynamicLight * baseLogoCol * 1.10
                        + logoDynamicLight * 0.45;

        // Brillo especular sutil en el punto más cercano de un corredor
        float peak = max(logoDynamicLight.r, max(logoDynamicLight.g, logoDynamicLight.b));
        if (peak > 1.2) {
            litLogoCol += vec3((peak - 1.2) * 0.30);
        }

        // Mezcla transparente perfecta: entre las barras se ve el laberinto
        finalColor = mix(mazeColor, litLogoCol, logoTex.a);
    }

    // Curva de contraste cinematográfica
    finalColor = pow(max(finalColor, vec3(0.0)), vec3(0.92));

    fragColor = vec4(finalColor, 1.0) * qt_Opacity;
}
