# Referencia: Configuracion de Compilacion y Tamano Binario

Basado en el capitulo *"Shrinking .wasm Code Size"* de The Rust and WebAssembly Book.

---

## 1. Configuracion Optima en `Cargo.toml`

Para motores graficos en WebAssembly, la velocidad de ejecucion y el tamano compacto del archivo `.wasm` son cruciales:

```toml
[package]
name = "engine_3d"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[profile.release]
opt-level = 3        # Nivel de optimizacion LLVM (3 para maxima velocidad de CPU)
lto = true           # Link-Time Optimization en todo el programa
codegen-units = 1    # Compilacion en una sola unidad para eliminar funciones no usadas
panic = "abort"      # Elimina el arbol de excepciones y tablas de unwinding
```

### Explicacion de Parametros:
- `lto = true`: Permite que LLVM examine todas las llamadas cruzadas entre crates y elimine metodos no llamados.
- `codegen-units = 1`: Evita la fragmentacion del analisis inter-procedimental.
- `panic = "abort"`: Quita el soporte de recuperacion de panics (`catch_unwind`), ahorrando entre un 15% y un 30% del tamano del binario Wasm.

---

## 2. Buenas Practicas de Carga Asincrona

Para no inflar el ejecutable Wasm:
1. No incrustar modelos o geometrias pesadas superiores a 500 KB mediante `include_bytes!()`.
2. Mantener el `.wasm` con solo la logica de computo (~50 - 100 KB).
3. Cargar binarios de datos o modelos en paralelo con `fetch('modelo.bin')` o `WebAssembly.instantiateStreaming`.
