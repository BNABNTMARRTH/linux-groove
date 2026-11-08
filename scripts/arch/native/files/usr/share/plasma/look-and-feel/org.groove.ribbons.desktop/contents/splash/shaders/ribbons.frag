#version 440

layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;

layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    float uTime;
    vec2 uResolution;
};

void main() {
    // 1. Normalización de coordenadas con centro en (0, 0)
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

    // 2. Zona de Exclusión Elíptica para el logotipo central
    // Asegura que el centro se mantenga 100% negro puro para el emblema
    vec2 logoBox = uv * vec2(1.0, 1.36);
    float distToCenter = length(logoBox);
    float clearance = smoothstep(0.18, 0.38, distToCenter);

    // 3. Campo de evasión continuo Gaussiano (C-infinito sin costuras)
    float dodgeX = exp(-uv.x * uv.x * 10.0);

    vec3 finalColor = vec3(0.0);

    // =========================================================================
    // LISTÓN 1: Ámbar / Dorado Solar (Inferior, 60 filamentos de luz)
    // =========================================================================
    float t1 = uTime * 0.45;
    float baseWave1 = -0.27 - (dodgeX * 0.18)
                    + sin(uv.x * 2.4 + t1) * 0.14
                    + sin(uv.x * 1.2 - t1 * 0.6) * 0.08;

    float ribbonWidth1 = 0.13 + 0.05 * sin(uv.x * 2.0 + t1 * 0.8);

    for (int i = 0; i < 60; ++i) {
        float fi = float(i) / 59.0; // 0.0 a 1.0
        float offset = (fi - 0.5) * ribbonWidth1;
        
        float phase = fi * 15.70;
        // Los hilos se trenzan y abren suavemente en forma de abanico de seda
        float wobble = sin(uv.x * (3.6 + fi * 1.8) + phase + t1 * 1.1) * (0.016 * (1.0 - abs(fi - 0.5) * 0.5));
        
        float strandY = baseWave1 + offset + wobble;
        float d = abs(uv.y - strandY);
        
        // Núcleo brillante y nítido + halo bloom luminoso
        float core = max(0.0, 1.0 - d / 0.0011);
        float bloom = 0.00065 / (d + 0.0018);
        float intensity = core * 1.1 + bloom * 0.75;
        
        // Gradiente oro resplandeciente a ámbar fuego
        vec3 col = mix(vec3(1.0, 0.88, 0.32), vec3(1.0, 0.42, 0.05), fi);
        col += vec3(0.40, 0.30, 0.10) * (1.0 - abs(fi - 0.5) * 2.0);

        finalColor += col * (intensity * 0.11) * clearance;
    }

    // =========================================================================
    // LISTÓN 2: Cian Eléctrico / Azul Neón (Cruce inferior, 60 filamentos de luz)
    // =========================================================================
    float t2 = uTime * 0.38;
    float baseWave2 = -0.32 - (dodgeX * 0.15)
                    + cos(uv.x * 2.2 - t2) * 0.12
                    + sin(uv.x * 1.5 + t2 * 0.5) * 0.07;

    float ribbonWidth2 = 0.12 + 0.045 * cos(uv.x * 1.7 - t2 * 0.7);

    for (int j = 0; j < 60; ++j) {
        float fj = float(j) / 59.0;
        float offset = (fj - 0.5) * ribbonWidth2;
        
        float phase = fj * 16.8;
        float wobble = cos(uv.x * (3.8 + fj * 1.6) + phase - t2 * 1.0) * (0.015 * (1.0 - abs(fj - 0.5) * 0.5));
        
        float strandY = baseWave2 + offset + wobble;
        float d = abs(uv.y - strandY);
        
        float core = max(0.0, 1.0 - d / 0.0011);
        float bloom = 0.00060 / (d + 0.0018);
        float intensity = core * 1.1 + bloom * 0.75;
        
        // Gradiente cian neón a azul eléctrico cobalto
        vec3 col = mix(vec3(0.0, 0.95, 1.0), vec3(0.15, 0.50, 1.0), fj);
        col += vec3(0.20, 0.40, 0.50) * (1.0 - abs(fj - 0.5) * 2.0);

        finalColor += col * (intensity * 0.10) * clearance;
    }

    // =========================================================================
    // LISTÓN 3: Aurora Magenta / Púrpura Real (Superior, 60 filamentos de luz)
    // =========================================================================
    float t3 = uTime * 0.42;
    float baseWave3 = 0.28 + (dodgeX * 0.19)
                    + sin(uv.x * 2.3 + t3 * 0.8) * 0.13
                    + cos(uv.x * 1.1 - t3 * 0.4) * 0.07;

    float ribbonWidth3 = 0.13 + 0.048 * sin(uv.x * 1.9 - t3 * 0.6);

    for (int k = 0; k < 60; ++k) {
        float fk = float(k) / 59.0;
        float offset = (fk - 0.5) * ribbonWidth3;
        
        float phase = fk * 14.9;
        float wobble = sin(uv.x * (3.5 + fk * 1.7) + phase + t3 * 0.9) * (0.015 * (1.0 - abs(fk - 0.5) * 0.5));
        
        float strandY = baseWave3 + offset + wobble;
        float d = abs(uv.y - strandY);
        
        float core = max(0.0, 1.0 - d / 0.0011);
        float bloom = 0.00065 / (d + 0.0018);
        float intensity = core * 1.1 + bloom * 0.75;
        
        // Gradiente magenta neón a púrpura real
        vec3 col = mix(vec3(1.0, 0.28, 0.95), vec3(0.60, 0.12, 1.0), fk);
        col += vec3(0.40, 0.15, 0.45) * (1.0 - abs(fk - 0.5) * 2.0);

        finalColor += col * (intensity * 0.10) * clearance;
    }

    // Curva de tono / saturación cinematográfica
    finalColor = pow(finalColor, vec3(0.92));

    fragColor = vec4(finalColor, 1.0) * qt_Opacity;
}
