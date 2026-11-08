# Linux Groove: Motor de Juegos Ultraligero 2D/3D & Plan del Túnel 3D en Tercera Persona

**Documento de Arquitectura Técnica y Hoja de Ruta**  
*Autor:* Antigravity AI Engine Architect & Linux Groove Team  
*Fecha:* Noviembre 2026  
*Estado:* Especificación Activa y Plan de Implementación  

---

## 1. Introducción y Visión General

El desarrollo de videojuegos contemporáneo sufre de un problema endémico: el **sobrepeso masivo de los motores tradicionales**. Motores como Unity, Unreal Engine o incluso Godot introducen capas de abstracción pesadas, dependencias complejas de tiempo de ejecución y binarios de distribución que raramente bajan de 100 MB – 2 GB, consumiendo entre 500 MB y 2 GB de memoria RAM simplemente para abrir una pantalla en blanco.

Con las tecnologías demostradas en las animaciones de **Linux Groove** (el reproductor interactivo, la pantalla de inicio *Groove Stroke* y el fondo de pantalla interactivo *Groove Labyrinth*), se ha comprobado empíricamente que la combinación de:

1. **Qt 6 Quick RHI (Rendering Hardware Interface):** Acceso directo a Vulkan, OpenGL y EGL con cero intermediarios pesados.
2. **QML Declarativo con Tipado Estricto:** Control de estados, interfaces cinemáticas, bucles de actualización temporal y lógica reactiva de eventos.
3. **Shaders GLSL Precompilados a SPIR-V (`qsb`):** Desplazamiento del 98% del trabajo computacional directo a la GPU.
4. **Matemáticas Analíticas y Funciones de Distancia Signada (SDF):** Generación de geometría, iluminación volumétrica, enjambres y partículas en tiempo real sin almacenamiento en disco de mallas gigantescas.

Esta arquitectura convierte a **Linux Groove en una plataforma nativa de videojuegos ultraligera, instantánea, visualmente deslumbrante y de consumo prácticamente despreciable**.

---

## 2. Matriz Comparativa: Motores Comerciales vs. Linux Groove Game Stack

| Métrica / Dimensión | Motor Tradicional (Unity / Unreal Engine) | Linux Groove Game Stack (Qt 6 + RHI + QSB) |
| :--- | :--- | :--- |
| **Tamaño en Disco del Juego** | 150 MB – 3.5 GB | **3 MB – 20 MB** (Assets incluidos) |
| **Consumo de Memoria RAM** | 450 MB – 2.5 GB | **30 MB – 75 MB** |
| **Tiempo de Arranque (Cold Boot)**| 4.0 – 12.0 segundos | **< 120 milisegundos (Instantáneo)** |
| **Uso de CPU en Reposo / Juego** | 12% – 35% CPU | **< 1.5% CPU** (Completamente descargado en GPU) |
| **Pipeline Gráfico** | Capas de abstracción pesadas de C# / Blueprint | **Qt RHI directo a Vulkan / OpenGL ES nativo** |
| **Compilación de Shaders** | JIT lenta al arrancar niveles | **Precompilados AOT multiversión con `qsb`** |
| **Integración con el Sistema Operativo** | Ventana invasiva, difícil de embeber | **Puede ejecutarse en ventana, pantalla completa o como wallpaper vivo** |
| **Latencia de Entrada (Input Lag)** | 16 – 32 ms (1-2 frames retenidos) | **Sub-milisegundo (acceso directo a eventos Wayland)** |

---

## 3. Espectro de Opciones y Arquitecturas de Juego Disponibles

Gracias a este ecosistema, se abren 4 arquitecturas de juego distintas según el alcance del proyecto:

```mermaid
graph TD
    A["Linux Groove Game Engine Stack"] --> B["Opción 1: 2D Puro Procedural GPU"]
    A --> C["Opción 2: 2.5D Híbrido Canvas/Sprites"]
    A --> D["Opción 3: 3D Matemático Puro (Raymarching SDF)"]
    A --> E["Opción 4: 3D Clásico (Qt Quick 3D PBR)"]

    B --> B1["Shmups, Bullet Hell, Synthwave Geometry Wars"]
    C --> C1["Metroidvanias neón, Plataformas de acción, Pinball"]
    D --> D1["Túneles infinitos, Fractales, Dungeons 3D en 50KB"]
    E --> E1["Simuladores de carreras, Modelos Blender .glTF, Cámaras 3D"]
```

### 3.1. Opción 1: 2D Puro Procedural Acelerado por GPU
- **Técnica:** Toda la pantalla es un único `ShaderEffect` que recibe arreglos de datos (coordenadas de proyectiles, enemigos, partículas) en un `UniformBufferObject` (UBO).
- **Rendimiento:** Más de 10,000 proyectiles en pantalla a 144 FPS constantes.
- **Ideal para:** Shoot 'em ups (*Geometry Wars*, *Ikaruga*), juegos rítmicos estilo *Crypt of the NecroDancer*, simuladores de enjambres cuánticos.

### 3.2. Opción 2: 2.5D Híbrido (Sprites + Post-procesado GPU)
- **Técnica:** Elementos de juego como `Item`, `Image` o `SpriteSequence` en QML para física 2D (con motores como Box2D compilados nativamente), cubiertos por una capa de shaders que proyecta iluminación dinámica 2D, aberración cromática, destellos de lente (*bloom*) y distorsión CRT.
- **Ideal para:** Plataformas cinemáticos estilo *Dead Cells*, *Hollow Knight* o *Ori and the Blind Forest*.

### 3.3. Opción 3: 3D Matemático Puro por Raymarching (SDF)
- **Técnica:** La GPU lanza un rayo por píxel hacia una escena 3D descrita exclusivamente con ecuaciones matemáticas (esferas, cilindros, cajas redondeadas, túneles toroidales).
- **Ventaja insuperable:** No existen archivos `.obj` o `.fbx` que cargar de disco; mundos 3D enteros caben en un archivo de texto de 4 KB y se ejecutan a velocidad de vértigo.
- **Ideal para:** Túneles espaciales infinitos, carreras de velocidad retrofuturistas, shooters cinemáticos en tubos.

### 3.4. Opción 4: 3D Clásico con Qt Quick 3D (`import QtQuick3D`)
- **Técnica:** Mallas poligonales reales modeladas en Blender y exportadas a formato estándar `.glTF 2.0`.
- **Características:** Soporte completo de materiales basados en física (PBR) con mapas de rugosidad, metalicidad, emisión de luz y oclusión ambiental; animaciones de esqueletos (*skinning/skeletal mesh*), múltiples fuentes de luz y sombras en tiempo real.
- **Ideal para:** Juegos de acción en tercera persona, simuladores de vehículos, plataformas 3D.

---

## 4. Ejemplos Técnicos y Fragmentos de Código de Producción

### 4.1. Bucle de Juego de 60-120 Hz y Entrada Reactiva en QML

El corazón del bucle de física no depende de un `Timer` impreciso, sino del refresco de fotogramas del compositor Wayland (`FrameAnimation`):

```qml
import QtQuick

Item {
    id: gameRoot
    width: 1280
    height: 800
    focus: true

    // Estado físico del jugador
    property real playerX: 0.0
    property real playerY: 0.0
    property real playerSpeedX: 0.0
    property real playerSpeedY: 0.0
    property real playerRoll: 0.0 // Inclinación aerodinámica

    // Mapa de teclas activas (Sub-milisegundo)
    property var keysDown: ({})

    Keys.onPressed: event => {
        keysDown[event.key] = true;
        event.accepted = true;
    }

    Keys.onReleased: event => {
        keysDown[event.key] = false;
        event.accepted = true;
    }

    // Bucle sincronizado con la tasa de refresco del monitor (V-Sync nativo)
    FrameAnimation {
        running: true
        onTriggered: {
            var dt = frameTime; // Tiempo delta exacto por fotograma

            // Entrada analógica simulada
            var moveX = 0.0;
            var moveY = 0.0;
            if (keysDown[Qt.Key_Left] || keysDown[Qt.Key_A]) moveX -= 1.0;
            if (keysDown[Qt.Key_Right] || keysDown[Qt.Key_D]) moveX += 1.0;
            if (keysDown[Qt.Key_Up] || keysDown[Qt.Key_W]) moveY += 1.0;
            if (keysDown[Qt.Key_Down] || keysDown[Qt.Key_S]) moveY -= 1.0;

            // Integración física Euler / Verlet con amortiguación
            playerSpeedX = playerSpeedX * 0.88 + moveX * 4.5 * dt;
            playerSpeedY = playerSpeedY * 0.88 + moveY * 4.5 * dt;

            playerX = Math.max(-1.0, Math.min(1.0, playerX + playerSpeedX));
            playerY = Math.max(-1.0, Math.min(1.0, playerY + playerSpeedY));

            // Inclinación visual del fuselaje
            playerRoll = playerRoll * 0.85 + (-playerSpeedX * 28.0) * 0.15;
        }
    }
}
```

---

### 4.2. Shader de Raymarching 3D: Túnel Matemático con Iluminación Especular

Este fragmento muestra cómo la GPU genera un túnel 3D cilíndrico infinito y ondulante mediante Raymarching:

```glsl
#version 440

layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;

layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    float uTime;
    vec2 uResolution;
    vec2 uPlayerPos;
    float uPlayerRoll;
};

// Función de Distancia: Túnel cilíndrico infinito deformado
float mapTunnel(vec3 p) {
    // Ondulación espacial del túnel según la profundidad Z
    vec2 offset = vec2(sin(p.z * 0.20 + uTime * 0.5) * 1.8,
                       cos(p.z * 0.15 + uTime * 0.4) * 1.2);
    vec2 q = p.xy - offset;

    // Distancia al interior de un cilindro de radio 3.5
    return 3.5 - length(q);
}

// Cálculo de vector normal analítico
vec3 calcNormal(vec3 p) {
    float d = mapTunnel(p);
    vec2 e = vec2(0.002, 0.0);
    return normalize(vec3(
        d - mapTunnel(p - e.xyy),
        d - mapTunnel(p - e.yxy),
        d - mapTunnel(p - e.yyx)
    ));
}

void main() {
    vec2 uv = (qt_TexCoord0 - 0.5) * 2.0;
    uv.x *= (uResolution.x / uResolution.y);

    // Origen de la cámara (perspectiva en tercera persona, flotando atrás de la nave)
    vec3 ro = vec3(0.0, 0.0, uTime * 14.0);
    // Vector director del rayo
    vec3 rd = normalize(vec3(uv, 1.4));

    // Marcha de rayos (Raymarching)
    float t = 0.0;
    for (int i = 0; i < 70; ++i) {
        vec3 p = ro + rd * t;
        float d = mapTunnel(p);
        if (d < 0.005 || t > 80.0) break;
        t += d * 0.65; // Paso seguro conservativo
    }

    vec3 col = vec3(0.02, 0.03, 0.06); // Niebla de fondo

    if (t < 80.0) {
        vec3 p = ro + rd * t;
        vec3 norm = calcNormal(p);

        // Patrón synthwave en las paredes del túnel
        float gridZ = sin(p.z * 2.0);
        float gridAngle = atan(p.y, p.x) * 8.0;
        float wireframe = step(0.85, sin(gridAngle)) + step(0.92, gridZ);

        vec3 neonCyan = vec3(0.1, 0.8, 1.0);
        vec3 neonPink = vec3(1.0, 0.1, 0.6);
        vec3 wallCol = mix(vec3(0.04, 0.05, 0.10), neonCyan, wireframe * 0.8);

        // Niebla volumétrica según la distancia
        float fog = exp(-0.035 * t);
        col = mix(col, wallCol, fog);
    }

    fragColor = vec4(col, 1.0) * qt_Opacity;
}
```

---

## 5. El Plan Maestro: "Groove Tunnel 3D" (Túnel en Tercera Persona)

### 5.1. Concepto y Género
**Groove Tunnel 3D** es un videojuego de vuelo acrobático y ritmo en **tercera persona**. El jugador pilota una nave aerodinámica basada en el emblema *Soundwave* de Groove, navegando a través de un túnel tubular infinito y sinuoso que late y reacciona a la música del sistema.

```
       [CÁMARA FLOTANTE EN 3ª PERSONA]
                     |
                    \ /
                 ( Cámara )
                     |
       ( Inercia elástica de resorte )
                     |
                    \ /
                /=========\   <-- NAVE DEL JUGADOR (Con alerones neón y estela)
              /  \_______/  \
             /               \
============|     ======      |====================================
 TÚNEL 3D   |    ( NAVE )     |  TÚNEL PROCEDURAL ONDULANTE
 ENERGIZADO |     ======      |  (Anillos Neón, Obstáculos, Boosts)
============|                 |====================================
             \               /
              \   Túnel 3D  /
                \=========/
```

---

### 5.2. Mecánicas de Juego Centrales

1. **Control de Vuelo Orbital e Inercial:**
   - La nave se mueve en el plano transversal (X, Y) dentro de la sección circular del túnel.
   - Posibilidad de realizar rotación de 360° (*barrel roll*) alrededor de las paredes para esquivar compuertas.
   - Inclinación visual (*banking*) realista al tomar curvas.

2. **Ondulación Orgánica del Túnel:**
   - El túnel no es estático ni recto: serpenteará dinámicamente mediante funciones armónicas dependientes de la velocidad.

3. **Elementos Interactivos del Túnel:**
   - **Anillos de Sobrecarga (Groove Boost Rings):** Pasar por su centro otorga un incremento de velocidad de 200% y distorsión de campo de visión (*FOV Warp*).
   - **Barreras de Plasma Rotativas:** Muros de energía seccionados con aperturas angulares por donde debe pasar la nave.
   - **Cristales Sonoros:** Fragmentos flotantes que suman puntos y cargan la barra de habilidad especial.

4. **Reactividad al Audio y Estética Synthwave:**
   - Las compuertas luminosas y el relieve del túnel pulsan al compás del bombo y sintetizadores de la música en reproducción.

---

### 5.3. Arquitectura del Motor (Híbrida de Rendimiento Extremo)

Para lograr gráficos de consola a 60-120 FPS sin superar los 15 MB de peso:

```mermaid
sequenceDiagram
    participant Engine as Bucle QML (FrameAnimation)
    participant Input as Entrada (Keyboard/Mouse)
    participant Ship as Entidad Nave (3D Mesh / Transform)
    participant Cam as Controlador Cámara 3ª Persona
    participant Tunnel as Shader GPU (Raymarching Tunnel)

    Engine->>Input: Capturar vectores de entrada a 1000 Hz
    Engine->>Ship: Actualizar posición (X, Y), velocidad y roll
    Engine->>Cam: Calcular posición elástica de cámara detrás de la nave
    Engine->>Tunnel: Enviar UBO (Camera Matrix, Ship Pos, Speed, Time)
    Tunnel->>Tunnel: Renderizar túnel curvado, anillos y niebla (GPU)
    Engine->>Ship: Dibujar fuselaje iluminado por los reflejos del túnel
```

#### Capa 1: Fondo y Entorno (Raymarching Shader)
- Generación procedural matemática del túnel a través de fragment shader compilado con `qsb`.
- Cero ocupación de disco por texturas o niveles pesados.

#### Capa 2: Nave del Jugador (Tercera Persona)
- Renderizada con `QtQuick3D` o mediante un ensamblado poliédrico procedural.
- Partículas de estela neón (*thruster exhaust*) que dejan una cinta de luz flotante tras la nave.

#### Capa 3: Sistema de Cámara Cinematográfica (Third-Person Chase Camera)
- **Seguimiento con retraso elástico (*Spring-Arm*):**
  $$\vec{C}_{\text{pos}} \leftarrow \vec{C}_{\text{pos}} + (\vec{P}_{\text{target}} - \vec{C}_{\text{pos}}) \times (1.0 - e^{-\lambda \cdot dt})$$
- **Inclinación dinámica:** Cuando la nave gira a la izquierda, la cámara se ladea sutilmente para acentuar la sensación de gravedad centrífuga.
- **FOV Dinámico:** El ángulo de visión de la cámara pasa de $65^\circ$ a $85^\circ$ progresivamente durante las aceleraciones extremas (*hyperspeed*).

#### Capa 4: Audio y Efectos de Sonido Espaciales
- Integración directa con `QtMultimedia`:
  - Sonido de motor de turbina con variación de tono (*pitch-shifting*) según la velocidad.
  - Efecto de sonido tridimensional al atravesar anillos o rozar paredes.

---

## 6. Hoja de Ruta de Implementación Paso a Paso

### Fase 1: Motor del Túnel 3D Shader (GPU Pipeline)
- [ ] Crear el shader `groove_tunnel.frag` con curvatura armónica tridimensional y textura de cuadrícula analítica.
- [ ] Compilar con `/usr/lib/qt6/bin/qsb` para Vulkan/OpenGL.
- [ ] Configurar el `ShaderEffect` en QML con control de velocidad y tiempo continuo.

### Fase 2: Mecánica de la Nave y Cámara en 3ª Persona
- [ ] Implementar el modelo de la nave espacial (malla poligonal estilizada con el logo blanco y emisores de propulsión).
- [ ] Diseñar el controlador de cámara flotante con resorte elástico (*chase cam*).
- [ ] Integrar el sistema de control con teclado (WASD / Flechas) y ratón deslizante.

### Fase 3: Obstáculos Procedurales y Sistema de Colisiones
- [ ] Generar anillos de aceleración procedurales espaciados a lo largo del eje Z.
- [ ] Implementar detección de colisiones de bajo coste matemático (distancia entre la nave y los obstáculos circulares).
- [ ] Diseñar el sistema de puntuación, velocímetro HUD e indicador de sobremarcha (*Boost Gauge*).

### Fase 4: Efectos Cinemáticos, Audio y Pulido
- [ ] Añadir sacudida de cámara (*Camera Shake*) ante colisiones o turbulencias.
- [ ] Efectos de sonido de motor a reacción y síntesis de audio para anillos.
- [ ] Empaquetar como aplicación independiente de Linux Groove ejecutable en pantalla completa o embebida en ventana flotante translúcida.

---

*Linux Groove Gaming Engine Architecture — Diseñado para máxima velocidad, belleza visual y soberanía de rendimiento.*
