# Pruebas Web: Pixel Streaming con Rust & CSS Scroll-Driven (Cero JavaScript)

Este directorio contiene las experiencias web interactivas, servidores de streaming de ultra bajo consumo y documentacion arquitectonica de **Linux Groove**, ejecutando animaciones y mundos tridimensionales con renderizado nativo en el servidor transmitidos a 60 FPS mediante **Rust Pixel Streaming** y controlados por **CSS Scroll-Driven Animations nativas (cero JavaScript)**.

---

## Experiencias Disponibles

| Experiencia | URL de Navegacion | Endpoint de Video MJPEG | Descripcion Visual |
| :--- | :--- | :--- | :--- |
| **1. Rayos Electricos** | [`http://localhost:8089/index.html`](http://localhost:8089/index.html) | `/stream` | Rayos y ondas de audio de Groove generadas proceduralmente con GLSL en Rust. |
| **2. Laberinto 3D Scroll** | [`http://localhost:8089/labyrinth.html`](http://localhost:8089/labyrinth.html) | `/labyrinth_filmstrip.jpg` | Laberinto tridimensional con Filmstrip 3D pre-renderizado en Rust (64 fr), congelado si no hay scroll y reversible al 100%. |
| **3. Ciudad Lluviosa & Dashboard** | [`http://localhost:8089/city.html`](http://localhost:8089/city.html) | `/stream_city` | Avenida urbana nocturna con asfalto reflectante, lluvia y paneles acrilicos con graficas animadas y ecualizador de audio. |

---

## Documentacion Tecnica y Arquitectura

1. **[`ARQUITECTURA_SCROLL_DRIVEN_FILMSTRIP_ZERO_JS.md`](./ARQUITECTURA_SCROLL_DRIVEN_FILMSTRIP_ZERO_JS.md)**  
   *La tecnica definitiva de Apple Scrollytelling para computadoras de hace 10 anos: Filmstrip 3D pre-renderizado en Rust, 0% CPU en cliente, reversible y controlado con CSS `steps()` sin JavaScript.*

2. **[`OPTIMIZACION_MULTIHILO_RAYON_60FPS.md`](./OPTIMIZACION_MULTIHILO_RAYON_60FPS.md)**  
   *Diagnostico del cuello de botella mononucleo, solucion multihilo con Rayon a 10 nucleos, temporizador fixed-timestep a 60 FPS, normales por tetraedro y metricas comparativas.*

3. **[`ARQUITECTURA_LABERINTO_3D_RAYMARCHING_RUST.md`](./ARQUITECTURA_LABERINTO_3D_RAYMARCHING_RUST.md)**  
   *Fundamentos matematicos de Raymarching (Sphere Tracing), funciones de distancia signada (SDF), camara parametrica 3D, niebla volumetrica y orquestacion con CSS Scroll-Driven.*

4. **[`PLAN_LABERINTO_3D_SCROLL_DRIVEN.md`](./PLAN_LABERINTO_3D_SCROLL_DRIVEN.md)**  
   *Plan de ejecucion detallado para el Laberinto 3D.*

5. **[`ARQUITECTURA_RUST_PIXEL_STREAMING_SCROLL_DRIVEN.md`](./ARQUITECTURA_RUST_PIXEL_STREAMING_SCROLL_DRIVEN.md)**  
   *Explicacion arquitectonica completa del motor de Pixel Streaming en Rust (Axum + Tokio), comparativa con Python y especificaciones Zero-JS.*

6. **[`PLAN_IMPLEMENTACION_WEB_SCROLL_DRIVEN.md`](./PLAN_IMPLEMENTACION_WEB_SCROLL_DRIVEN.md)**  
   *Plan de implementacion del proyecto base de rayos electricos.*

---

## Ejecucion y Pruebas Rapidas

```bash
# Iniciar el servidor (si no esta corriendo en background)
cd pruebas_web/server_rust
GROOVE_PUBLIC_DIR=../public PORT=8089 cargo run --release

# O abrir directamente en el navegador:
# http://localhost:8089/index.html
# http://localhost:8089/labyrinth.html
# http://localhost:8089/city.html
```
