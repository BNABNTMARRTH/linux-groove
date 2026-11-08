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

// Turbulencia eléctrica continua y orgánica
float electricDischarge(float rNorm, float fi, float t) {
    float v = 0.0;
    v += sin(rNorm * 8.0 + t * 4.5 + fi * 2.3) * 0.35;
    v += sin(rNorm * 22.0 - t * 9.0 + fi * 4.7) * 0.20;
    v += sin(rNorm * 52.0 + t * 21.0 - fi * 1.1) * 0.10;
    v += cos(rNorm * 95.0 - t * 35.0) * 0.05;
    return v;
}

void main() {
    // 1. Coordenadas normalizadas con centro en (0, 0)
    vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
    float r = length(p);
    float theta = atan(p.y, p.x);

    float R_globe = 0.42;
    float R_core  = 0.145;

    vec3 finalColor = vec3(0.0);

    // 2. Nebulosa gaseosa interna de la esfera
    if (r < R_globe) {
        float gas = pow(clamp(1.0 - r / R_globe, 0.0, 1.0), 1.6) * 0.16;
        finalColor += vec3(0.18, 0.08, 0.35) * gas;
    }

    // 3. 16 Rayos y Arcos de Plasma Eléctrico
    if (r >= R_core * 0.85 && r <= R_globe * 1.02) {
        float rNorm = clamp((r - R_core) / (R_globe - R_core), 0.0, 1.0);
        float envelope = sin(rNorm * 3.14159265);

        for (int i = 0; i < 16; ++i) {
            float fi = float(i);
            float baseAngle = (fi / 16.0) * 6.2831853;
            float drift = sin(uTime * 0.40 + fi * 1.4) * 0.60 + cos(uTime * 0.22 - fi * 0.8) * 0.30;
            float jumpStep = floor(uTime * 1.4 + fi * 0.75);
            float jumpAngle = (hash11(jumpStep * 17.3) - 0.5) * 0.85;
            float contactAngle = baseAngle + drift + jumpAngle;

            float arcAngle = mix(baseAngle, contactAngle, rNorm);
            arcAngle += electricDischarge(rNorm, fi, uTime) * envelope;

            // Distancia polar envuelta en [-pi, pi]
            float dAngle = mod(theta - arcAngle + 3.14159265, 6.2831853) - 3.14159265;
            float distToArc = r * abs(dAngle);

            // Núcleo blanco incandescente y halo de plasma
            float core = pow(max(0.0, 1.0 - distToArc / 0.0028), 1.5) * 2.2;
            float glow = 0.0035 / (distToArc * distToArc * 350.0 + distToArc + 0.0030) * 1.2;
            float flicker = 0.80 + 0.20 * sin(uTime * 24.0 + fi * 8.0);
            float intensity = (core + glow) * flicker;

            // Colores de los arcos: cian eléctrico, magenta tesla, ámbar solar
            vec3 arcCol;
            float m = mod(fi, 3.0);
            if (m < 1.0) {
                arcCol = vec3(0.10, 0.90, 1.00);
            } else if (m < 2.0) {
                arcCol = vec3(0.95, 0.20, 0.85);
            } else {
                arcCol = vec3(1.00, 0.75, 0.15);
            }
            arcCol = clamp(arcCol + vec3(core * 0.9), 0.0, 1.0);

            finalColor += arcCol * intensity * 0.28;

            // Chispa / nodo de contacto en la pared del cristal
            vec2 contactPos = R_globe * vec2(cos(contactAngle), sin(contactAngle));
            float dSpot = length(p - contactPos);
            float spot = 0.0035 / (dSpot * dSpot * 350.0 + dSpot + 0.0025) * 0.60;
            finalColor += arcCol * spot;
        }
    }

    // 4. Cristal de la Esfera (Borde Fresnel y Destellos Especulares 3D)
    float dRim = abs(r - R_globe);
    float rim = (0.0040 / (dRim + 0.0035)) * 0.45;
    rim += pow(clamp(r / R_globe, 0.0, 1.0), 18.0) * 0.40;
    finalColor += vec3(0.35, 0.75, 1.00) * rim;

    // Destello de luz especular en el cristal
    vec2 specPos = p - vec2(-0.24, 0.24);
    float spec = exp(-dot(specPos, specPos) * 32.0) * 0.40;
    vec2 specPos2 = p - vec2(0.22, -0.22);
    spec += exp(-dot(specPos2, specPos2) * 45.0) * 0.12;
    finalColor += vec3(0.95, 0.98, 1.00) * spec;

    // Desvanecimiento exterior hacia el negro puro
    if (r > R_globe) {
        float fade = max(0.0, 1.0 - (r - R_globe) / 0.025);
        float outerGlow = 0.0025 / (r - R_globe + 0.010) * 0.12;
        finalColor = finalColor * fade + vec3(0.35, 0.75, 1.00) * outerGlow;
    }

    // 5. Aura de energía del núcleo central
    float dCore = length(p * vec2(1.0, 1.35));
    float coreAura = 0.006 / (dCore + 0.014) * 0.40;
    finalColor += vec3(0.25, 0.75, 1.00) * coreAura;

    // Máscara suave para preservar la nitidez del logotipo central
    float logoClearance = smoothstep(0.12, 0.18, dCore);
    finalColor *= (0.20 + 0.80 * logoClearance);

    // Ajuste de contraste cinematográfico
    finalColor = pow(max(finalColor, vec3(0.0)), vec3(0.88));

    fragColor = vec4(finalColor, 1.0) * qt_Opacity;
}
