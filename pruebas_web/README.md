# Pruebas Web: Pixel Streaming con Rust & CSS Scroll-Driven (Cero JavaScript)

Este directorio contiene las experiencias web interactivas, servidores de streaming de ultra bajo consumo y documentación arquitectónica de **Linux Groove**, ejecutando animaciones y mundos tridimensionales con renderizado nativo en el servidor transmitidos a 60 FPS mediante **Rust Pixel Streaming** y controlados por **CSS Scroll-Driven Animations nativas (cero JavaScript)**.

---

## 🚀 Experiencias Disponibles

| Experiencia | URL de Navegación | Endpoint de Video MJPEG | Descripción Visual |
| :--- | :--- | :--- | :--- |
| **1. Rayos Eléctricos Neón** | [`http://localhost:8089/index.html`](http://localhost:8089/index.html) | `/stream` | Rayos y ondas de audio de Groove generadas proceduralmente con GLSL en Rust. |
| **2. Laberinto 3D Cyberpunk** | [`http://localhost:8089/labyrinth.html`](http://localhost:8089/labyrinth.html) | `/stream_labyrinth` | Laberinto tridimensional infinito con Raymarching (SDF), columnas de neón, niebla y HUD holográfico. |

---

## 📚 Documentación Técnica y Arquitectura

1. ⚡ **[`OPTIMIZACION_MULTIHILO_RAYON_60FPS.md`](./OPTIMIZACION_MULTIHILO_RAYON_60FPS.md)**  
   *Diagnóstico del cuello de botella mononúcleo, solución multihilo con Rayon a 10 núcleos, temporizador fixed-timestep a 60 FPS, normales por tetraedro y métricas comparativas.*

2. 🌌 **[`ARQUITECTURA_LABERINTO_3D_RAYMARCHING_RUST.md`](./ARQUITECTURA_LABERINTO_3D_RAYMARCHING_RUST.md)**  
   *Fundamentos matemáticos de Raymarching (Sphere Tracing), funciones de distancia signada (SDF), cámara paramétrica 3D, niebla volumétrica y orquestación con CSS Scroll-Driven.*

3. 📋 **[`PLAN_LABERINTO_3D_SCROLL_DRIVEN.md`](./PLAN_LABERINTO_3D_SCROLL_DRIVEN.md)**  
   *Plan de ejecución detallado para el Laberinto 3D.*

4. 🏛️ **[`ARQUITECTURA_RUST_PIXEL_STREAMING_SCROLL_DRIVEN.md`](./ARQUITECTURA_RUST_PIXEL_STREAMING_SCROLL_DRIVEN.md)**  
   *Explicación arquitectónica completa del motor de Pixel Streaming en Rust (Axum + Tokio), comparativa con Python y especificaciones Zero-JS.*

5. 📋 **[`PLAN_IMPLEMENTACION_WEB_SCROLL_DRIVEN.md`](./PLAN_IMPLEMENTACION_WEB_SCROLL_DRIVEN.md)**  
   *Plan de implementación del proyecto base de rayos eléctricos.*

---

## 🛠️ Ejecución y Pruebas Rápidas

```bash
# Iniciar el servidor (si no está corriendo en background)
cd pruebas_web/server_rust
GROOVE_PUBLIC_DIR=../public PORT=8089 cargo run --release

# O abrir directamente en el navegador:
# http://localhost:8089/index.html
# http://localhost:8089/labyrinth.html
```
