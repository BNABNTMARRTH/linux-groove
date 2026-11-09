# Referencia: Memoria Lineal Compartida y Typed Arrays (Zero-Copy)

Basado en el capitulo *"Interfacing Rust and JavaScript"* de The Rust and WebAssembly Book.

---

## 1. La Barrera de Memoria

WebAssembly opera sobre un bloque contiguo y plano de memoria lineal no administrada por el recolector de basura de JavaScript.
- JavaScript **no puede** pasar punteros de objetos complejos de su heap a Wasm.
- WebAssembly **no puede** interactuar directamente con objetos del recolector de basura de JS.
- La solucion de maximo rendimiento es exponer un buffer plano en la memoria lineal de Wasm y crear vistas `TypedArray` en JavaScript sobre `WebAssembly.Memory.buffer`.

---

## 2. Alineacion de Memoria con `#[repr(C)]`

Para evitar desalineaciones de bytes entre arquitecturas, define las estructuras con representacion C:

```rust
#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct ProjectedPoint {
    pub x: f32,       // Offset 0, 4 bytes
    pub y: f32,       // Offset 4, 4 bytes
    pub depth: f32,   // Offset 8, 4 bytes
    pub size: f32,    // Offset 12, 4 bytes
    pub alpha: f32,   // Offset 16, 4 bytes
    pub r: u8,        // Offset 20, 1 byte
    pub g: u8,        // Offset 21, 1 byte
    pub b: u8,        // Offset 22, 1 byte
    pub _pad: u8,     // Offset 23, 1 byte (relleno para alineacion de 24 bytes)
}
```

Cada elemento ocupa exactamente **24 bytes** (6 palabras de 4 bytes).

---

## 3. Acceso Dual con Float32Array y Uint8Array en JavaScript

En JavaScript podemos mapear el mismo buffer de memoria con dos vistas tipadas sobre el mismo puntero base:

```javascript
const memoryBuffer = wasm.memory.buffer;
const ptr = wasm.get_points_ptr();
const count = wasm.get_points_count();

// Vista de 32 bits (6 floats por elemento)
const floats = new Float32Array(memoryBuffer, ptr, count * 6);

// Vista de 8 bits (24 bytes por elemento)
const bytes = new Uint8Array(memoryBuffer, ptr, count * 24);

for (let i = 0; i < count; i++) {
    const fIdx = i * 6;
    const bIdx = i * 24;

    const x = floats[fIdx];
    const y = floats[fIdx + 1];
    const depth = floats[fIdx + 2];
    const size = floats[fIdx + 3];
    const alpha = floats[fIdx + 4];

    const r = bytes[bIdx + 20];
    const g = bytes[bIdx + 21];
    const b = bytes[bIdx + 22];
}
```

Este patron permite leer posiciones flotantes y canales de color en bytes sin ninguna copia de memoria intermedia.
