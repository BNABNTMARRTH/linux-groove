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
    // Si la luz intenta pasar por el centro, se atenúa suavemente a cero
    vec2 logoBox = uv * vec2(1.0, 1.35);
    float distToCenter = length(logoBox);
    float clearance = smoothstep(0.16, 0.36, distToCenter);

    // 3. Deformación orgánica del espacio (Campo de fuerza alrededor del logo)
    // Desvía los rayos de luz hacia arriba o abajo según su posición para esquivarlo
    float push = (1.0 - smoothstep(0.15, 0.45, distToCenter)) * 0.18;
    float pushDir = sign(uv.y);
    uv.y += pushDir * push;

    vec3 finalColor = vec3(0.0);

    // -------------------------------------------------------------
    // LISTÓN 1: Ámbar / Fuego (Inferior - fluyendo hacia la derecha)
    // -------------------------------------------------------------
    for (float i = 0.0; i < 4.0; i += 1.0) {
        float freq = 3.2 + i * 0.4;
        float speed = uTime * (0.6 + i * 0.08);
        float waveY = sin(uv.x * freq + speed) * 0.12 - 0.26 - (i * 0.02);
        
        // Intensidad luminosa inversa a la distancia (efecto neón / bloom)
        float d = abs(uv.y - waveY);
        float glow = 0.0045 / (d + 0.002);
        
        // Gradiente cálido de neón
        vec3 amberCol = mix(vec3(1.0, 0.45, 0.05), vec3(1.0, 0.85, 0.20), i / 3.0);
        finalColor += amberCol * glow * clearance;
    }

    // -------------------------------------------------------------
    // LISTÓN 2: Azul Eléctrico / Cian (Cruzado inferior - flotando)
    // -------------------------------------------------------------
    for (float j = 0.0; j < 4.0; j += 1.0) {
        float freq = 2.8 + j * 0.35;
        float speed = -uTime * (0.55 + j * 0.07);
        float waveY = cos(uv.x * freq + speed) * 0.14 - 0.28 - (j * 0.02);
        
        float d = abs(uv.y - waveY);
        float glow = 0.0045 / (d + 0.002);
        
        vec3 cyanCol = mix(vec3(0.0, 0.75, 1.0), vec3(0.1, 0.40, 1.0), j / 3.0);
        finalColor += cyanCol * glow * clearance;
    }

    // -------------------------------------------------------------
    // LISTÓN 3: Aurora Violeta / Magenta (Superior - vuela sobre el logo)
    // -------------------------------------------------------------
    for (float k = 0.0; k < 3.0; k += 1.0) {
        float freq = 3.0 + k * 0.5;
        float speed = uTime * (0.45 + k * 0.06);
        float waveY = sin(uv.x * freq + speed + 1.5) * 0.10 + 0.24 + (k * 0.025);
        
        float d = abs(uv.y - waveY);
        float glow = 0.0040 / (d + 0.002);
        
        vec3 violetCol = mix(vec3(0.85, 0.20, 1.0), vec3(0.50, 0.10, 1.0), k / 2.0);
        finalColor += violetCol * glow * clearance;
    }

    // Aplicar opacidad general de la ventana
    fragColor = vec4(finalColor, 1.0) * qt_Opacity;
}
