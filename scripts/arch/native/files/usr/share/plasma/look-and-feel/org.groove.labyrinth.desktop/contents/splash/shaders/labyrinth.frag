#version 440

layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;

layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    float uTime;
    vec2 uResolution;
};

// Generador de números pseudoaleatorios 2D para GPU
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void main() {
    // 1. Normalización de coordenadas espaciales centradas en (0, 0)
    vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
    float dCenter = length(p * vec2(1.0, 1.35));

    // 2. Cuadrícula de Terminal de Caracteres ASCII (80 columnas x 50 filas)
    vec2 gridDim = vec2(80.0, 50.0);
    vec2 cellSize = uResolution / gridDim;
    vec2 cellId = floor(gl_FragCoord.xy / cellSize);
    vec2 cellUv = fract(gl_FragCoord.xy / cellSize);

    // 3. Lógica Procedural del Laberinto ASCII
    float h = hash21(cellId);
    float glyphVal = 0.0;
    int glyphType = 0; // 0: dot '·', 1: horiz '-', 2: vert '|', 3: cross '+', 4: block '#'

    // Cámara central donde se revela el logotipo SVG
    float chamber = smoothstep(0.20, 0.26, dCenter);

    if (chamber > 0.01) {
        bool isEvenX = mod(cellId.x, 2.0) < 1.0;
        bool isEvenY = mod(cellId.y, 2.0) < 1.0;

        if (isEvenX && isEvenY) {
            glyphType = 3; // Cruce '+'
        } else if (isEvenY) {
            glyphType = (h > 0.32) ? 1 : 0; // Muro horizontal '-' o pasillo '·'
        } else if (isEvenX) {
            glyphType = (h > 0.32) ? 2 : 0; // Muro vertical '|' o pasillo '·'
        } else {
            glyphType = (h > 0.70) ? 4 : 0; // Bloque denso '#' o pasillo '·'
        }

        // Renderizado del glifo vectorial ASCII
        if (glyphType == 1) {
            // Guion '-'
            if (abs(cellUv.y - 0.5) < 0.10 && abs(cellUv.x - 0.5) < 0.42) glyphVal = 1.0;
        } else if (glyphType == 2) {
            // Barra vertical '|'
            if (abs(cellUv.x - 0.5) < 0.10 && abs(cellUv.y - 0.5) < 0.42) glyphVal = 1.0;
        } else if (glyphType == 3) {
            // Cruce / intersección '+'
            if ((abs(cellUv.y - 0.5) < 0.10 && abs(cellUv.x - 0.5) < 0.42) ||
                (abs(cellUv.x - 0.5) < 0.10 && abs(cellUv.y - 0.5) < 0.42)) glyphVal = 1.0;
        } else if (glyphType == 4) {
            // Bloque denso de matriz '#'
            if ((abs(cellUv.x - 0.32) < 0.07 || abs(cellUv.x - 0.68) < 0.07) && abs(cellUv.y - 0.5) < 0.36) glyphVal = 1.0;
            if ((abs(cellUv.y - 0.32) < 0.07 || abs(cellUv.y - 0.68) < 0.07) && abs(cellUv.x - 0.5) < 0.36) glyphVal = 1.0;
        } else {
            // Punto guía de pasillo '·'
            if (length(cellUv - vec2(0.5)) < 0.11) glyphVal = 0.75;
        }
    }

    // 4. Color base ambiental tenue del laberinto (estilo terminal oscura)
    float baseLum = glyphVal * 0.10 * chamber;
    vec3 finalColor = vec3(0.04, 0.08, 0.15) * baseLum;

    // =========================================================================
    // 5. PULSOS DE LUZ NEÓN (10 Corredores de Luz viajando por los pasillos)
    // =========================================================================
    for (int k = 0; k < 10; ++k) {
        float fk = float(k);
        float speed = 1.0 + mod(fk, 3.0) * 0.35;
        float tRun = uTime * speed + fk * 2.1;

        // Trayectoria paramétrica que recorre los pasillos del laberinto
        vec2 runnerPos;
        runnerPos.x = gridDim.x * 0.5 + sin(tRun * 0.65 + fk) * (gridDim.x * 0.40);
        runnerPos.y = gridDim.y * 0.5 + cos(tRun * 0.85 + fk * 1.4) * (gridDim.y * 0.40);

        // Distancia en celdas
        vec2 dCell = (cellId + cellUv) - runnerPos;
        float distCells = length(dCell);

        // Brillo volumétrico del pulso
        float glow = 2.8 / (distCells * distCells * 0.45 + distCells + 1.2);

        // Paleta tricolor de Linux Groove
        vec3 runnerCol;
        float m = mod(fk, 3.0);
        if (m < 1.0) {
            runnerCol = vec3(0.05, 0.95, 1.00); // Cian eléctrico
        } else if (m < 2.0) {
            runnerCol = vec3(0.95, 0.18, 0.90); // Magenta neón Tesla
        } else {
            runnerCol = vec3(1.00, 0.78, 0.18); // Fuego ámbar solar
        }

        // Si el rayo ilumina un glifo ASCII, este resplandece intensamente
        if (glyphVal > 0.0) {
            vec3 litChar = runnerCol * glow * glyphVal * 0.85 * chamber;
            // Núcleo del caracter quemando en blanco
            float whiteCore = max(0.0, 1.0 - distCells / 2.5) * glyphVal * 0.40;
            finalColor += litChar + vec3(whiteCore);
        } else {
            // Halo de luz ambiental en el corredor
            finalColor += runnerCol * (glow * 0.07 * chamber);
        }
    }

    // =========================================================================
    // 6. PORTAL LUMINOSO EN LA CÁMARA CENTRAL (REVELACIÓN DEL SVG)
    // =========================================================================
    if (dCenter < 0.28) {
        float chamberAura = pow(max(0.0, 1.0 - dCenter / 0.28), 2.2) * 0.40;
        // Resplandor de energía azul / cian donde emerge el logotipo
        finalColor += vec3(0.20, 0.65, 1.00) * chamberAura;
    }

    // Curva cinematográfica de contraste
    finalColor = pow(max(finalColor, vec3(0.0)), vec3(0.88));

    fragColor = vec4(finalColor, 1.0) * qt_Opacity;
}
