# Pruebas Web: Pixel Streaming & Motor 3D en Rust (WASM) con CSS Scroll-Driven

Este directorio contiene las experiencias web interactivas, servidores de streaming de ultra bajo consumo, motores tridimensionales en WebAssembly y documentacion arquitectonica de **Linux Groove**, ejecutando animaciones y mundos tridimensionales con renderizado nativo en el servidor y micro-motores matematicos en Rust a 60 FPS.

---

## Catalogo Completo de Experiencias (9 Mundos Web)

| # | Experiencia | URL de Navegacion | Tipo de Motor | Descripcion Matematica y Visual |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Rayos: Ondas Armonicas** | [`http://localhost:8089/index.html`](http://localhost:8089/index.html) | Rust Pixel Streaming | Rayos y ondas de audio de Groove generadas proceduralmente con superposicion senoidal y bloom cian/violeta. |
| **2** | **Rayos: Bobina Tesla Radial** | [`http://localhost:8089/rays_tesla.html`](http://localhost:8089/rays_tesla.html) | Rust Pixel Streaming | Esfera de plasma central con descarga radial en coordenadas polares $(r, \theta)$, 8 arcos caoticos de alta tension y chispas perifericas. |
| **3** | **Rayos: Tormenta Bifurcada** | [`http://localhost:8089/rays_storm.html`](http://localhost:8089/rays_storm.html) | Rust Pixel Streaming | Relampagos fractales estocasticos tipo nube-tierra con zigzag, 3 ramificaciones secundarias, estroboscopio y niebla tormentosa. |
| **4** | **Rayos: Red Sinaptica Cuantica** | [`http://localhost:8089/rays_synapse.html`](http://localhost:8089/rays_synapse.html) | Rust Pixel Streaming | Malla cibernetica de 12 nodos orbitando en Lissajous, conectados por arcos de distancia analitica con paquetes luminosos de datos. |
| **5** | **Laberinto 3D Scroll-Driven** | [`http://localhost:8089/labyrinth.html`](http://localhost:8089/labyrinth.html) | Rust 3D Filmstrip | Laberinto tridimensional con Filmstrip 3D pre-renderizado en Rust (64 fr), congelado si no hay scroll y reversible al 100%. |
| **6** | **Ciudad Lluviosa & Dashboard** | [`http://localhost:8089/city.html`](http://localhost:8089/city.html) | Rust Pixel Streaming | Avenida urbana nocturna con asfalto reflectante, lluvia y paneles acrilicos con graficas animadas y ecualizador de audio. |
| **7** | **Objetos 3D: Scroll-Driven** | [`http://localhost:8089/objects_scroll.html`](http://localhost:8089/objects_scroll.html) | Rust WebAssembly (38 KB) | Transmutacion continua y rotacion 3D por scroll: Esfera de Fibonacci -> Hiper-Cubo -> Toroide Cuantico (Torus). |
| **8** | **Objetos 3D: Interaccion Mouse** | [`http://localhost:8089/objects_mouse.html`](http://localhost:8089/objects_mouse.html) | Rust WebAssembly (38 KB) | Tilt giroscopico inercial 3D a 0 ms de lag, lente magnetica de repulsion/dispersion de particulas y selector de geometria en vivo. |
| **9** | **Objetos 3D: Deconstruccion** | [`http://localhost:8089/objects_deconstruct.html`](http://localhost:8089/objects_deconstruct.html) | Rust WebAssembly (38 KB) | Fractura procedural de aristas, dispersion de 3,840 particulas atomicas en vortice turbulento y reensamblaje gravitatorio. |

---

## Documentacion Tecnica y Arquitectura

1. **[`ARQUITECTURA_OBJETOS_3D_WASM_RUST.md`](./ARQUITECTURA_OBJETOS_3D_WASM_RUST.md)**  
   *Especificacion tecnica y matematica del Micro-Motor 3D en Rust compilado a WebAssembly: Proyeccion 4x4, memoria compartida Zero-Copy, fisica Verlet de particulas, aristas vectoriales y geometria parametrica.*

2. **[`ARQUITECTURA_SCROLL_DRIVEN_FILMSTRIP_ZERO_JS.md`](./ARQUITECTURA_SCROLL_DRIVEN_FILMSTRIP_ZERO_JS.md)**  
   *La tecnica definitiva de Apple Scrollytelling para computadoras de hace 10 anos: Filmstrip 3D pre-renderizado en Rust, 0% CPU en cliente, reversible y controlado con CSS `steps()` sin JavaScript.*

3. **[`OPTIMIZACION_MULTIHILO_RAYON_60FPS.md`](./OPTIMIZACION_MULTIHILO_RAYON_60FPS.md)**  
   *Diagnostico del cuello de botella mononucleo, solucion multihilo con Rayon a 10 nucleos, temporizador fixed-timestep a 60 FPS, normales por tetraedro y metricas comparativas.*

4. **[`ARQUITECTURA_LABERINTO_3D_RAYMARCHING_RUST.md`](./ARQUITECTURA_LABERINTO_3D_RAYMARCHING_RUST.md)**  
   *Fundamentos matematicos de Raymarching (Sphere Tracing), funciones de distancia signada (SDF), camara parametrica 3D, niebla volumetrica y orquestacion con CSS Scroll-Driven.*

5. **[`ARQUITECTURA_RUST_PIXEL_STREAMING_SCROLL_DRIVEN.md`](./ARQUITECTURA_RUST_PIXEL_STREAMING_SCROLL_DRIVEN.md)**  
   *Explicacion arquitectonica completa del motor de Pixel Streaming en Rust (Axum + Tokio), comparativa con Python y especificaciones Zero-JS.*

---

## Compilacion y Ejecucion

### Compilar el Micro-Motor 3D en WebAssembly (Rust)
```bash
cd pruebas_web/engine_wasm
cargo build --target wasm32-unknown-unknown --release
cp target/wasm32-unknown-unknown/release/engine_3d.wasm ../public/engine_3d.wasm
```

### Iniciar el Servidor Web (Rust Axum)
```bash
cd pruebas_web/server_rust
GROOVE_PUBLIC_DIR=../public PORT=8089 cargo run --release
```

### Acceso a las 9 Experiencias
- `http://localhost:8089/index.html`          -> Rayos: Ondas Armonicas
- `http://localhost:8089/rays_tesla.html`     -> Rayos: Bobina Tesla Radial
- `http://localhost:8089/rays_storm.html`     -> Rayos: Tormenta Bifurcada
- `http://localhost:8089/rays_synapse.html`   -> Rayos: Red Sinaptica Cuantica
- `http://localhost:8089/labyrinth.html`      -> Laberinto 3D Filmstrip
- `http://localhost:8089/city.html`           -> Ciudad Lluviosa & Telemetria
- `http://localhost:8089/objects_scroll.html` -> Objetos 3D: Transmutacion por Scroll
- `http://localhost:8089/objects_mouse.html`  -> Objetos 3D: Giroscopo y Mouse
- `http://localhost:8089/objects_deconstruct.html` -> Objetos 3D: Deconstruccion Atomica
