#version 440

layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;

layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    float uTime;
    vec2 uResolution;
};

// Generador de números pseudoaleatorios rápido para GPU
float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

// Turbulencia eléctrica multi-frecuencia continua y orgánica
float electricDischarge(float r, float fi, float t) {
    float v = 0.0;
    v += sin(r * 7.5 + t * 4.8 + fi * 2.1) * 0.38;
    v += sin(r * 19.0 - t * 9.5 + fi * 4.3) * 0.22;
    v += sin(r * 46.0 + t * 22.0 - fi * 1.5) * 0.11;
    v += cos(r * 88.0 - t * 38.0) * 0.05;
    return v;
}

void main() {
    // 1. Coordenadas normalizadas con centro exacto en (0, 0)
    vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
    float r = length(p);
    float theta = atan(p.y, p.x);

    float R_core = 0.135;

    vec3 finalColor = vec3(0.0);

    // =========================================================================
    // 2. 16 RAYOS ELÉCTRICOS LIBRES (Emanando del centro hacia los bordes)
    // =========================================================================
    if (r >= R_core * 0.82) {
        float alpha = max(0.0, (r - R_core) / 0.80);
        float envelope = min(1.0, alpha * 2.5); // Fijo en el centro, se abre libremente
        // Desvanecimiento suave al salir por las orillas de la pantalla
        float edgeFade = clamp((1.25 - r) / 0.45, 0.0, 1.0);

        for (int i = 0; i < 16; ++i) {
            float fi = float(i);
            float baseAngle = (fi / 16.0) * 6.2831853;
            
            // Deriva orgánica continua y saltos cuánticos de tensión eléctrica
            float drift = sin(uTime * 0.35 + fi * 1.3) * 0.55 + cos(uTime * 0.20 - fi * 0.7) * 0.30;
            float jumpStep = floor(uTime * 1.3 + fi * 0.7);
            float jumpAngle = (hash11(jumpStep * 19.1) - 0.5) * 0.75;
            
            float arcAngle = baseAngle + drift + jumpAngle;
            arcAngle += electricDischarge(r, fi, uTime) * envelope;

            // Distancia euclídea del fragmento al rayo eléctrico
            float dAngle = mod(theta - arcAngle + 3.14159265, 6.2831853) - 3.14159265;
            float distToArc = r * abs(dAngle);

            // Núcleo blanco incandescente + aura bloom de alta luminosidad
            float core = pow(max(0.0, 1.0 - distToArc / 0.0030), 1.5) * 2.4;
            float glow = 0.0040 / (distToArc * distToArc * 260.0 + distToArc + 0.0028) * 1.25;
            
            // Parpadeo eléctrico de alta tensión
            float flicker = 0.80 + 0.20 * sin(uTime * 25.0 + fi * 8.0);
            float intensity = (core + glow) * flicker * edgeFade;

            // Paleta de colores vivos de plasma: Cian Eléctrico, Magenta Neón, Ámbar Solar
            vec3 arcCol;
            float m = mod(fi, 3.0);
            if (m < 1.0) {
                arcCol = vec3(0.05, 0.95, 1.00); // Cian eléctrico
            } else if (m < 2.0) {
                arcCol = vec3(0.95, 0.18, 0.90); // Magenta neón Tesla
            } else {
                arcCol = vec3(1.00, 0.78, 0.18); // Fuego ámbar solar
            }

            // El núcleo arde en blanco brillante
            arcCol = clamp(arcCol + vec3(core * 0.90), 0.0, 1.0);

            finalColor += arcCol * intensity * 0.30;
        }
    }

    // =========================================================================
    // 3. CORONA DE ENERGÍA ALREDEDOR DEL ELECTRODO CENTRAL (LOGO GROOVE)
    // =========================================================================
    float dCore = length(p * vec2(1.0, 1.35));
    float coreAura = 0.006 / (dCore + 0.014) * 0.45;
    coreAura *= (0.85 + 0.15 * sin(uTime * 5.0));
    finalColor += vec3(0.25, 0.75, 1.00) * coreAura;

    // Máscara suave para preservar el fondo oscuro nítido del logotipo
    float logoClearance = smoothstep(0.12, 0.18, dCore);
    finalColor *= (0.25 + 0.75 * logoClearance);

    // Curva de tono cinematográfico con contraste
    finalColor = pow(max(finalColor, vec3(0.0)), vec3(0.88));

    fragColor = vec4(finalColor, 1.0) * qt_Opacity;
}
