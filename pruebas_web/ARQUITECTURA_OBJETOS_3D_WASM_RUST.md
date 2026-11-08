# Arquitectura y Especificacion Tecnica: Micro-Motor 3D en Rust (WASM)
## Objetos 3D (Esfera, Cubo, Dona) Formados por Particulas, Lineas y Frames
### Animacion por Scroll, Interaccion de Mouse y Deconstruccion Atomica

---

## 1. Resumen Ejecutivo y Vision

El presente documento detalla la arquitectura de software, fundamentos matematicos y especificaciones de implementacion para dotar a **Linux Groove Web** de un motor grafico tridimensional ultraligero escrito **100% en Rust** y compilado a **WebAssembly (`wasm32-unknown-unknown`)**.

El motor opera en el cliente con **cero dependencias de terceros** (sin Three.js, sin React, sin paquetes de npm), generando un binario `.wasm` de aproximadamente **18 KB a 24 KB** capaz de renderizar y simular mas de **6,000 particulas fisicas y cientos de aristas vectoriales a 60 FPS fijos**, consumiendo menos de **3 MB de memoria RAM**.

### Objetivos Clave
1. **Tres Modos de Interaccion Diferencial:**
   - **Modo 1 (Scroll):** Transmutacion continua entre Esfera, Cubo y Dona (Torus) al hacer scroll (*Scrollytelling 3D*).
   - **Modo 2 (Mouse):** Respuesta giroscopica 3D a 0 ms de latencia (*Tilt & Parallax*), halo magnetico de atraccion/repulsion sobre las particulas y luz especular interactiva.
   - **Modo 3 (Deconstruccion):** Ruptura progresiva de la geometria, dispersion caotica de aristas y particulas en un vortice turbulento y reensamblaje hacia la siguiente figura.
2. **Tres Elementos Estructurales por Geometria:**
   - **Particulas (Point Clouds):** Vertices luminosos flotantes.
   - **Lineas (Wireframes Vectoriales):** Aristas de conexion con atenuacion de profundidad.
   - **Frames (Rebanadas Estructurales):** Cortes transversales o lattices que exhiben el volumen interno de cada figura.
3. **Estricto Cero Emojis:** Diseno tecnico, elegante y minimalista con codigos de sistema (`[+]`, `//`, `[1]`, `[v]`).

---

## 2. Diagrama de Arquitectura Global

```
+-------------------------------------------------------------------------+
|                          NAVEGADOR WEB (CLIENTE)                        |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                 INTERFAZ HTML5 / CSS SCROLL-DRIVEN                |  |
|  |   [ objects_scroll.html | objects_mouse.html | objects_deconstruct ] |
|  +----------------------------------+--------------------------------+  |
|                                     | Eventos (Scroll, MouseMove, etc.)  |
|                                     v                                   |
|  +----------------------------------+--------------------------------+  |
|  |           MICRO-PUENTE JS (< 2 KB, ZERO-DEPENDENCIAS)             |  |
|  |   - WebAssembly.instantiateStreaming                              |  |
|  |   - Lectura Directa de Memoria Lineal (Zero-Copy SharedArrayBuffer)   |
|  |   - Canvas 2D / WebGL 2D Render Loop (requestAnimationFrame)      |  |
|  +----------------------------------+--------------------------------+  |
|                                     |                                   |
|               +---------------------+---------------------+             |
|               | Memoria Lineal Wasm (Puntero Compartido)   |             |
|               v                                           v             |
|  +-------------------------------------------------------------------+  |
|  |            MICRO-MOTOR MATEMATICO EN RUST (engine_3d.wasm)         |  |
|  |                                                                   |  |
|  |  +---------------------+  +-----------------+  +----------------+ |  |
|  |  |     math3d.rs       |  |   geometry.rs   |  |  particles.rs  | |  |
|  |  | - Matrices 4x4      |  | - Esfera UV     |  | - Integrador   | |  |
|  |  | - Proyeccion Camara |  | - Cubo Frames   |  |   Verlet       | |  |
|  |  | - Quaternions/Euler |  | - Torus Polar   |  | - Dispersion   | |  |
|  |  +---------------------+  +-----------------+  | - Reensamblaje | |  |
|  |                                                +----------------+ |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

---

## 3. Fundamentos Matematicos de las Geometrias 3D

Cada figura geometrica se genera analiticamente a partir de funciones parametricas continuas que permiten interpolar (hacer morphing) sus coordenadas vectoriales de destino $P_{target}(t)$.

### 3.1. Esfera Geodesica / UV Sphere
Una esfera centrada en el origen con radio $R_s$:
$$\begin{aligned}
x &= R_s \cdot \sin(\phi) \cdot \cos(\theta) \\
y &= R_s \cdot \cos(\phi) \\
z &= R_s \cdot \sin(\phi) \cdot \sin(\theta)
\end{aligned}$$
donde $\theta \in [0, 2\pi]$ representa la longitud y $\phi \in [0, \pi]$ la colatitud.

- **Wireframes:** Curvas meridianas ($\theta = \text{cte}$) y paralelas ($\phi = \text{cte}$).
- **Frames:** Anillos de seccion transversal horizontal a alturas $y_k = R_s \cdot \cos(k \cdot \pi / N)$.
- **Particulas:** Distribucion cuasi-uniforme mediante el algoritmo de espiral de Fibonacci en la esfera:
  $$y_i = 1 - \frac{2i}{N - 1}, \quad r_i = \sqrt{1 - y_i^2}, \quad \theta_i = \pi (3 - \sqrt{5}) \cdot i$$

### 3.2. Cubo Hiperbolico y Frames Concentricos
Un cubo de arista $2s$ centrado en el origen se define por sus 8 vertices primarios $V_i = (\pm s, \pm s, \pm s)$ y 12 aristas estructurales:
$$E = \{(v_a, v_b) \mid \|v_a - v_b\| = 2s\}$$

- **Sub-Frames Lattices:** Para conferir aspecto holografico volumetrico, se proyectan $K$ cajas concéntricas a escalas $s_k = s \cdot (k / K)$, interconectadas por lineas de arista radiales.
- **Particulas:** Distribuite uniformemente a lo largo del perimetro de las aristas y sobre el mallado de las 6 caras mediante muestreo baricentrico.

### 3.3. Dona / Toroide Parametrico (Torus)
Un toroide generado al rotar un circulo menor de radio $r$ alrededor de un eje coplanar a una distancia $R$ del centro ($R > r$):
$$\begin{aligned}
x &= (R + r \cdot \cos(v)) \cdot \cos(u) \\
y &= (R + r \cdot \cos(v)) \cdot \sin(u) \\
z &= r \cdot \sin(v)
\end{aligned}$$
donde $u \in [0, 2\pi)$ es el angulo toroidal (circulo mayor) y $v \in [0, 2\pi)$ es el angulo poloidal (circulo menor).

- **Wireframes:** Anillos poloidales que envuelven la rosquilla y espirales helicoidales que recorren la superficie.
- **Frames:** Secciones transversales en cortes radiales $u_k = k \cdot 2\pi / M$.
- **Particulas:** Nube de puntos orbitando la superficie toroidal en trayectorias armonicas.

---

## 4. Proyeccion en Perspectiva 3D a 2D y Camara Virtual

La transformacion de un vertice del espacio de mundo $P = (X, Y, Z)^T$ al espacio de pantalla $(x', y')$ se realiza mediante una camara pinhole con distancia focal $f$ y plano de corte frontal $Z_{near}$:

$$\begin{aligned}
X_{cam} &= X \cdot \cos(\alpha) - Z \cdot \sin(\alpha) \\
Z_{cam} &= X \cdot \sin(\alpha) + Z \cdot \cos(\alpha) + d_{cam} \\
Y_{cam} &= Y \cdot \cos(\beta) - Z_{cam} \cdot \sin(\beta)
\end{aligned}$$

Proyeccion con correccion de aspecto:
$$x' = \frac{X_{cam} \cdot f}{Z_{cam}} + \frac{W}{2}, \quad y' = \frac{Y_{cam} \cdot f}{Z_{cam}} + \frac{H}{2}$$

Factor de escala de profundidad (para atenuacion de luz y grosor de linea):
$$scale = \frac{f}{Z_{cam}}$$

---

## 5. Fisica de Deconstruccion y Dispersion Atomica

En la Web 3 (`objects_deconstruct.html`), cada particula no es un punto estatico, sino una entidad fisica con posicion $P$, velocidad $V$ y masa unitaria, integrada en cada fotograma mediante integracion de **Verlet / Euler semi-implicito**:

$$\begin{aligned}
V_{t+1} &= (V_t + F_{total} \cdot \Delta t) \cdot \mu \\
P_{t+1} &= P_t + V_{t+1} \cdot \Delta t
\end{aligned}$$
donde $\mu \approx 0.93$ es el coeficiente de friccion viscosa que evita oscilaciones infinitas.

### Fuerzas Actuantes:
1. **Fuerza Elastica hacia la Geometria Objetivo (Morphing):**
   $$F_{spring} = k_{spring} \cdot (P_{target} - P_t) \cdot (1.0 - \text{deconstruction})$$
2. **Fuerza de Dispersion / Explosion:**
   Al aumentar el factor de deconstruccion $D \in [0, 1]$, se inyecta un impulso radial desde el centro:
   $$F_{burst} = D \cdot \frac{P_t}{\|P_t\| + \epsilon} \cdot \text{magnitud}$$
3. **Turbulencia Curl Noise / Vortice:**
   Genera rotaciones y filamentos de plasma cuando las particulas flotan en el vacio:
   $$F_{vortex} = D \cdot (-P_y, P_x, 0.5 \cdot \sin(t \cdot 2.0))$$
4. **Lente Magnetica del Cursor:**
   Repulsion o atraccion calculada en 2D/3D con el cursor $(mouse_x, mouse_y)$:
   $$F_{mouse} = \frac{P_{2D} - Cursor}{\|P_{2D} - Cursor\|^2 + r_{core}^2} \cdot Q_{cursor}$$

---

## 6. Implementacion en Rust (Crate `engine_wasm`)

### 6.1. Estructura de Memoria Compartida (`lib.rs`)

Para lograr **cero copias de memoria (Zero-Copy)**, Rust define un buffer plano de vertices proyectados:

```rust
// pruebas_web/engine_wasm/src/lib.rs

pub const MAX_PARTICLES: usize = 6144;
pub const MAX_EDGES: usize = 2048;

#[repr(C)]
#[derive(Clone, Copy)]
pub struct ProjectedPoint {
    pub x: f32,
    pub y: f32,
    pub depth: f32,
    pub size: f32,
    pub alpha: f32,
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct ProjectedLine {
    pub x1: f32, pub y1: f32,
    pub x2: f32, pub y2: f32,
    pub depth: f32,
    pub alpha: f32,
    pub r: u8, pub g: u8, pub b: u8,
}

static mut PROJECTED_POINTS: [ProjectedPoint; MAX_PARTICLES] = [ProjectedPoint {
    x: 0.0, y: 0.0, depth: 0.0, size: 0.0, alpha: 0.0, r: 0, g: 0, b: 0
}; MAX_PARTICLES];

static mut PROJECTED_LINES: [ProjectedLine; MAX_EDGES] = [ProjectedLine {
    x1: 0.0, y1: 0.0, x2: 0.0, y2: 0.0, depth: 0.0, alpha: 0.0, r: 0, g: 0, b: 0
}; MAX_EDGES];

static mut NUM_ACTIVE_POINTS: usize = 0;
static mut NUM_ACTIVE_LINES: usize = 0;
```

### 6.2. Funciones Exportadas C-ABI

```rust
#[no_mangle]
pub extern "C" fn init_engine(total_particles: usize) {
    // Inicializa la piscina de particulas y aristas analiticas
}

#[no_mangle]
pub extern "C" fn set_target_geometry(geom_type: u32) {
    // 0: Esfera, 1: Cubo, 2: Dona (Torus)
}

#[no_mangle]
pub extern "C" fn update_scene(
    width: f32,
    height: f32,
    scroll_prog: f32,
    mouse_x: f32,
    mouse_y: f32,
    deconstruct_factor: f32,
    dt: f32,
) {
    // 1. Aplica la fisica de particulas segun el factor de deconstruccion
    // 2. Rota el espacio con lerp suave hacia el mouse (Tilt 3D)
    // 3. Proyecta puntos y aristas 3D a coordenadas de pantalla 2D
    // 4. Escribe en PROJECTED_POINTS y PROJECTED_LINES
}

#[no_mangle]
pub extern "C" fn get_points_ptr() -> *const ProjectedPoint {
    unsafe { PROJECTED_POINTS.as_ptr() }
}

#[no_mangle]
pub extern "C" fn get_points_count() -> usize {
    unsafe { NUM_ACTIVE_POINTS }
}

#[no_mangle]
pub extern "C" fn get_lines_ptr() -> *const ProjectedLine {
    unsafe { PROJECTED_LINES.as_ptr() }
}

#[no_mangle]
pub extern "C" fn get_lines_count() -> usize {
    unsafe { NUM_ACTIVE_LINES }
}
```

---

## 7. Puente de Integracion en el Navegador (`wasm_loader.js`)

El archivo JavaScript puente es estrictamente funcional, pesa menos de **2 KB**, no tiene dependencias y no realiza calculos matriciales (todo se ejecuta dentro del motor en Rust):

```javascript
// pruebas_web/public/wasm_loader.js
// Cero librerias externas | Zero-Copy Memory Access

export async function createGroove3DEngine(canvasId, options = {}) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d', { alpha: true });
    
    // Carga binaria instantanea del archivo compilado en Rust
    const response = await fetch('engine_3d.wasm');
    const bytes = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes);
    const wasm = instance.exports;

    wasm.init_engine(options.particleCount || 4096);
    
    let mouse = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX / window.innerWidth;
        mouse.y = e.clientY / window.innerHeight;
    });

    function render(timestamp) {
        const width = canvas.width = window.innerWidth;
        const height = canvas.height = window.innerHeight;

        // Llamada a Rust para computar fisica y proyeccion a 60 FPS
        wasm.update_scene(width, height, options.scrollProg || 0, mouse.x, mouse.y, options.deconstruct || 0, 0.016);

        // Lectura de punteros directos de la memoria lineal de Rust
        const pointsPtr = wasm.get_points_ptr();
        const pointsCount = wasm.get_points_count();
        const linesPtr = wasm.get_lines_ptr();
        const linesCount = wasm.get_lines_count();

        const memory = wasm.memory.buffer;
        // Pinta aristas vectoriales
        const lineView = new Float32Array(memory, linesPtr, linesCount * 8);
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < linesCount; i++) {
            const base = i * 8;
            ctx.strokeStyle = `rgba(0, 243, 255, ${lineView[base + 5]})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(lineView[base], lineView[base + 1]);
            ctx.lineTo(lineView[base + 2], lineView[base + 3]);
            ctx.stroke();
        }

        // Pinta nubes de particulas
        const pointView = new Float32Array(memory, pointsPtr, pointsCount * 6);
        for (let i = 0; i < pointsCount; i++) {
            const base = i * 6;
            ctx.fillStyle = `rgba(255, 230, 120, ${pointView[base + 4]})`;
            ctx.fillRect(pointView[base], pointView[base + 1], pointView[base + 3], pointView[base + 3]);
        }

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}
```

---

## 8. Especificacion de las 3 Vistas Web

### 8.1. `objects_scroll.html` (Scrollytelling 3D)
- Pista de desplazamiento de 300vh estructurada en 3 secciones:
  1. `// GEO_01: ESFERA UV & RED FIBONACCI`
  2. `// GEO_02: HIPER-CUBO LATTICE CONCENTRICO`
  3. `// GEO_03: TOROIDE PARAMETRICO & ESPIRALES`
- Al scrollear, la camara rota suavemente alrededor del modelo y el factor `geom_t` interpola la posicion de cada vertice de forma analitica.

### 8.2. `objects_mouse.html` (Interaccion Reactiva al Mouse)
- Viewport de alta precision con HUD en las 4 esquinas:
  - `[+] TILT X/Y: Giroscopo inercial calculado en Rust.`
  - `[+] CAMPO MAGNETICO: Lente de repulsion al mover el cursor.`
  - `[+] MODO GEOMETRICO: Selector en pantalla [ Esfera ] [ Cubo ] [ Dona ].`
- El vector normal de luz en Rust se calcula relativo al puntero, generando un brillo especular volumetrico sobre las particulas.

### 8.3. `objects_deconstruct.html` (Deconstruccion y Dispersion Atomica)
- Control deslizante de precision `ENTROPIA: 0% -> 100%`.
- Al 0%, la dona/cubo/esfera es estructuralmente perfecta con aristas vectoriales tensas.
- Al incrementar al 50%, las aristas se fracturan y flotan en el espacio mientras las caras se disuelven en micro-particulas.
- Al 100%, el objeto entra en dispersion total por turbulencia armonica y se transfigura en la siguiente geometria mediante campos gravitacionales.

---

## 9. Plan de Implementacion y Cronograma

| Fase | Tarea | Entregable |
| :--- | :--- | :--- |
| **Fase 1** | Creacion del Crate Rust `engine_wasm` | `Cargo.toml`, `math3d.rs`, `geometry.rs`, `particles.rs`, `lib.rs` |
| **Fase 2** | Compilacion y Optimizacion Wasm | `pruebas_web/public/engine_3d.wasm` (< 25 KB) |
| **Fase 3** | Desarrollo del Micro-Puente de Render | `pruebas_web/public/wasm_loader.js` |
| **Fase 4** | Creacion de `objects_scroll.html` & CSS | Web 1 con transmutacion por scroll y HUD |
| **Fase 5** | Creacion de `objects_mouse.html` & CSS | Web 2 con interaccion giroscopica y magnetismo |
| **Fase 6** | Creacion de `objects_deconstruct.html` & CSS | Web 3 con dispersion atomica y slider de entropia |
| **Fase 7** | Integracion de Navegacion Global y README | 9 experiencias conectadas sin emojis |
| **Fase 8** | Verificacion de Rendimiento (60 FPS) | Pruebas de consumo, memoria y latencia |

