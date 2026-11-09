# Referencia: Patron Zero-Allocation Tick en Rust

Basado en el capitulo *"Time Profiling & Designing for Concurrency"* de The Rust and WebAssembly Book.

---

## 1. El Problema de Alocar en el Tick

Alocar memoria en cada fotograma (`60 FPS`) introduce tres problemas graves:
1. **Llamadas al asignador del sistema:** Cada `Vec::with_capacity` busca bloques libres en la memoria lineal de Wasm.
2. **Fragmentacion:** Bloques continuos se fragmentan rapidamente, provocando llamadas a `memory.grow` en Wasm, lo cual invalida las vistas de `TypedArray` existentes en JavaScript.
3. **Pausas de latencia:** La variacion en los tiempos de alocacion produce fluctuaciones perceptibles en el framerate.

---

## 2. Implementacion de Reuso Estatico

En lugar de crear vectores locales dentro de la funcion `update_scene`, se definen arrays o vectores prealocados en el estado del motor:

```rust
pub struct EngineState {
    pub target_pos_cache: Vec<Vec3>,
    pub target_nrm_cache: Vec<Vec3>,
}

impl EngineState {
    pub fn new(capacity: usize) -> Self {
        Self {
            target_pos_cache: vec![Vec3::zero(); capacity],
            target_nrm_cache: vec![Vec3::new(0.0, 1.0, 0.0); capacity],
        }
    }
}
```

En cada fotograma, se itera sobre los indices y se sobreescriben los valores sin cambiar la capacidad ni alocar:

```rust
pub fn update_scene(engine: &mut EngineState) {
    let count = engine.active_points;
    for i in 0..count {
        engine.target_pos_cache[i] = compute_target(i);
        engine.target_nrm_cache[i] = compute_normal(i);
    }

    // Pasamos una referencia de slice a la funcion de fisica
    update_physics(&engine.target_pos_cache[..count]);
}
```

Resultado: **Exactamente 0 bytes de alocacion en el heap de Wasm por cuadro**.
