---
name: rust-wasm-book
description: >-
  Guia y estandares arquitectonicos de alto rendimiento para Rust y WebAssembly basados en The Rust and WebAssembly Book (rustwasm.github.io/docs/book). Usa esta skill al disenar, auditar o implementar sistemas graficos 3D, simulaciones de particulas o motores computacionales en Rust WebAssembly y Canvas/WebGL. Enseña memoria lineal compartida (Zero-Copy), bucles de simulacion libres de asignaciones en el heap (Zero-Allocation Tick), eliminacion de la presion del Garbage Collector en JavaScript (Zero GC Pressure con claves empaquetadas de 32 bits), sombreado fotometrico en espacio de vista (Eye Space) y optimizacion binaria con LTO.
---

# Rust and WebAssembly High-Performance Architecture (The Book Skill)

Esta skill sintetiza las directrices, patrones y advertencias tecnicas de [The Rust and WebAssembly Book](https://rustwasm.github.io/docs/book/) para el desarrollo de motores interactivos a 60 FPS con WebAssembly puro, HTML5 y CSS.

---

## 1. Cuando Activar esta Skill

Activa esta skill siempre que:
- Se implementen o refactoricen motores graficos, simulaciones fisicas o procesamiento matematico en Rust WebAssembly (`wasm32-unknown-unknown`).
- Se requiera comunicar datos masivos (mas de 1,000 elementos: particulas, vertices, celdas) entre Rust y JavaScript a 60 FPS sin caidas de cuadros.
- Se diagnostiquen problemas de consumo de CPU, microtirones causados por el Garbage Collector (GC pauses) o lentitud en renderizado sobre HTML5 `<canvas>`.
- Se optimice el tamano del binario `.wasm` o la configuracion del perfil en `Cargo.toml`.

---

## 2. Los 4 Pilares Arquitectonicos Fundamentales

```
+---------------------------------------------------------------------------------------------------------+
|                                    LOS 4 PILARES DEL RUST AND WASM BOOK                                 |
+---------------------------------------------------------------------------------------------------------+
| 1. MEMORIA LINEAL COMPARTIDA   | Estructuras planas #[repr(C)], cero serializacion JSON/String.         |
|                                | JavaScript lee punteros directos via Float32Array(memory.buffer).     |
+--------------------------------+-------------------------------------------------------------------------+
| 2. ZERO-ALLOCATION TICK        | Prohibido alocar en heap (Vec::new/with_capacity) dentro de 60 FPS.     |
|                                | Reusar buffers prealocados en la estructura estatica del motor.         |
+--------------------------------+-------------------------------------------------------------------------+
| 3. ZERO GC PRESSURE EN JS      | Prohibido concatenar strings rgba(...) por particula/celda.            |
|                                | Empaquetar colores en enteros de 32 bits y usar Map de cache perenne.   |
+--------------------------------+-------------------------------------------------------------------------+
| 4. OPTIMIZACION DE COMPILACION | Cargo.toml con opt-level = 3, lto = true, codegen-units = 1,           |
|                                | panic = "abort" para eliminar todo el codigo muerto de LLVM.           |
+--------------------------------+-------------------------------------------------------------------------+
```

---

## 3. Guia de Implementacion Paso a Paso

### Pilar 1: Memoria Lineal Compartida (Zero-Copy FFI)
Nunca serialices objetos JSON ni crees instancias compuestas a traves del puente FFI en cada cuadro.

**En Rust (`src/lib.rs`):**
```rust
#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct ProjectedPoint {
    pub x: f32,
    pub y: f32,
    pub depth: f32,
    pub size: f32,
    pub alpha: f32,
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub _pad: u8, // Alineacion a 24 bytes exactos
}

static mut BUFFER_POINTS: [ProjectedPoint; MAX_PARTICLES] = [ProjectedPoint { ... }; MAX_PARTICLES];

#[no_mangle]
pub extern "C" fn get_points_ptr() -> *const ProjectedPoint {
    unsafe { BUFFER_POINTS.as_ptr() }
}
```

**En JavaScript:**
```javascript
const memoryBuffer = wasm.memory.buffer;
const pointsPtr = wasm.get_points_ptr();
const count = wasm.get_points_count();

// Acceso directo a la memoria fisica de Wasm sin copiar nada
const pointFloats = new Float32Array(memoryBuffer, pointsPtr, count * 6);
const pointBytes = new Uint8Array(memoryBuffer, pointsPtr, count * 24);
```

---

### Pilar 2: Bucle de Simulacion Zero-Allocation
Cualquier invocacion a `Vec::with_capacity` o `Vec::new` dentro del bucle de 60 FPS produce fragmentacion de memoria y obliga al asignador de Wasm a ejecutar ciclos de gestion de heap innecesarios.

**Regla de Oro:** Todo buffer de calculo o cache temporal debe pertenecer a la estructura `EngineState` y ser prealocado una sola vez en `init_engine()`.

```rust
struct EngineState {
    // Buffers prealocados de tamano MAX_PARTICLES
    target_pos_cache: Vec<Vec3>,
    target_nrm_cache: Vec<Vec3>,
}

#[no_mangle]
pub extern "C" fn update_scene(width: f32, height: f32, dt: f32) {
    let engine = unsafe { ENGINE.as_mut().unwrap() };
    let count = engine.active_points;

    // Correcto: sobreescribir por indice, NUNCA empujar con push() o alocar
    for i in 0..count {
        let (pos, norm) = compute_geometry_step(i, engine.time);
        engine.target_pos_cache[i] = pos;
        engine.target_nrm_cache[i] = norm;
    }

    // Pasar slice prestado de longitud fija
    engine.particles.update(&engine.target_pos_cache[..count], dt);
}
```

---

### Pilar 3: Renderizado Front-End Zero GC (Cache de Cadenas CSS)
En JavaScript, la asignacion de cadenas `ctx.fillStyle = \`rgba(${r}, ${g}, ${b}, ${alpha})\`` crea 48 bytes de basura en el heap de V8 por cada llamada. Si se dibuja una nube de 8,192 particulas a 60 FPS, esto arroja **23.6 MB/s** a la memoria, provocando recolecciones forzadas de basura.

**Solucion:**
1. Cuantiza el canal alfa (por ejemplo, a 20 escalones de `0.05`).
2. Empaqueta el color en un entero de 32 bits: `(alphaIdx << 24) | (r << 16) | (g << 8) | b`.
3. Almacena las cadenas resultantes en un `Map` persistente fuera del bucle de renderizado.
4. Solo reasigna `ctx.fillStyle` cuando el color cambie respecto a la particula anterior.

```javascript
const colorCache = new Map();
let lastColorKey = -1;

for (let i = 0; i < pointsCount; i++) {
    const fBase = i * 6;
    const bBase = i * 24;

    const alpha = pointFloats[fBase + 4];
    if (alpha <= 0.02) continue;

    const x = pointFloats[fBase];
    const y = pointFloats[fBase + 1];
    const size = pointFloats[fBase + 3];

    const r = pointBytes[bBase + 20];
    const g = pointBytes[bBase + 21];
    const b = pointBytes[bBase + 22];

    const aIdx = (alpha * 20) | 0;
    const colorKey = (aIdx << 24) | (r << 16) | (g << 8) | b;

    if (colorKey !== lastColorKey) {
        let cssStr = colorCache.get(colorKey);
        if (!cssStr) {
            cssStr = `rgba(${r},${g},${b},${(aIdx * 0.05).toFixed(2)})`;
            colorCache.set(colorKey, cssStr);
        }
        ctx.fillStyle = cssStr;
        lastColorKey = colorKey;
    }

    ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
}
```

---

### Pilar 4: Optimizacion en `Cargo.toml`
Para maxima velocidad y menor tamano de descarga:

```toml
[package]
name = "engine_3d"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[profile.release]
opt-level = 3        # Optimizacion maxima de velocidad y vectorizacion SIMD
lto = true           # Link-Time Optimization en todo el programa
codegen-units = 1    # Permite al compilador eliminar todo codigo muerto no alcanzable
panic = "abort"      # Elimina el arbol de unwinding de excepciones
```

---

## 4. Iluminacion Fotometrica en Espacio de Vista (*Eye Space*)

Cuando la camara orbita alrededor de un objeto 3D, calcular la iluminacion en espacio de mundo puede causar que las caras visibles frontales queden en sombra total si la luz esta fija en el mundo.

**Formula en Espacio de Vista:**
1. Rota el vector normal con la matriz de la camara: $\vec{N}_{\text{eye}} = R_{\text{cam}} \cdot \vec{N}$.
2. Define la luz clave en el espacio de vista (fija en la pantalla, cuadrante superior derecho):
   $$\vec{L}_{\text{eye}} = \text{normalize}(0.35, 0.65, 0.65)$$
3. Calcula el producto escalar difuso y especular:
   $$\text{dot} = \max(0.0, \vec{N}_{\text{eye}} \cdot \vec{L}_{\text{eye}})$$
   $$\text{spec} = \max(0.0, \vec{N}_{\text{eye}} \cdot \vec{H}_{\text{eye}})^8$$
   $$\text{fill} = \max(0.0, -0.30 N_x - 0.20 N_y + 0.40 N_z) \times 0.25$$
   $$\text{intensity} = \text{clamp}(0.22 + 0.78 \cdot \text{dot} + \text{fill} + 0.40 \cdot \text{spec}, 0.15, 1.35)$$

De esta manera, el modelo mantiene su volumen tridimensional y brillo fotometrico en los 360 grados de rotacion.

---

## 5. Documentos de Referencia Detallados

Para explicaciones profundas, revisa los archivos en `references/`:
- [Memoria Lineal Compartida y Typed Arrays](./references/zero_copy_memory.md)
- [Patron Zero-Allocation Tick en Rust](./references/zero_allocation_tick.md)
- [Cache de Colorimetria Zero GC en Canvas 2D](./references/canvas_zero_gc.md)
- [Configuracion de Compilacion y Tamano Binario](./references/binary_shrinking.md)

