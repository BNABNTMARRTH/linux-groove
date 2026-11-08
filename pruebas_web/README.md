# Pruebas Web: Pixel Streaming con Rust & CSS Scroll-Driven (Cero JavaScript)

Este directorio contiene las experiencias web interactivas, servidores de streaming de ultra bajo consumo y documentacion arquitectonica de **Linux Groove**, ejecutando animaciones y mundos tridimensionales con renderizado nativo en el servidor transmitidos a 60 FPS mediante **Rust Pixel Streaming** y controlados por **CSS Scroll-Driven Animations nativas (cero JavaScript)**.

---

## Catalogo Completo de Experiencias (6 Mundos Web)

| # | Experiencia | URL de Navegacion | Endpoint de Video MJPEG / Asset | Descripcion Matematica y Visual |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Rayos: Ondas Armonicas** | [`http://localhost:8089/index.html`](http://localhost:8089/index.html) | `/stream` | Rayos y ondas de audio de Groove generadas proceduralmente con superposicion senoidal y bloom cian/violeta. |
| **2** | **Rayos: Bobina Tesla Radial** | [`http://localhost:8089/rays_tesla.html`](http://localhost:8089/rays_tesla.html) | `/stream_tesla` | Esfera de plasma central con descarga radial en coordenadas polares $(r, \theta)$, 8 arcos caoticos de alta tension y chispas perifericas. |
| **3** | **Rayos: Tormenta Bifurcada** | [`http://localhost:8089/rays_storm.html`](http://localhost:8089/rays_storm.html) | `/stream_storm` | Relampagos fractales estocasticos tipo nube-tierra con zigzag, 3 ramificaciones secundarias, estroboscopio y niebla tormentosa. |
| **4** | **Rayos: Red Sinaptica Cuantica** | [`http://localhost:8089/rays_synapse.html`](http://localhost:8089/rays_synapse.html) | `/stream_synapse` | Malla cibernetica de 12 nodos orbitando en Lissajous, conectados por arcos de distancia analitica con paquetes luminosos de datos. |
| **5** | **Laberinto 3D Scroll-Driven** | [`http://localhost:8089/labyrinth.html`](http://localhost:8089/labyrinth.html) | `/labyrinth_filmstrip.jpg` | Laberinto tridimensional con Filmstrip 3D pre-renderizado en Rust (64 fr), congelado si no hay scroll y reversible al 100%. |
| **6** | **Ciudad Lluviosa & Dashboard** | [`http://localhost:8089/city.html`](http://localhost:8089/city.html) | `/stream_city` | Avenida urbana nocturna con asfalto reflectante, lluvia y paneles acrilicos con graficas animadas y ecualizador de audio. |

---

## Fundamentos Matematicos de las 3 Nuevas Variantes de Rayos

### 1. Bobina Tesla Radial / Esfera de Plasma (`/stream_tesla`)
- **Coordenadas Polares:** Transforma cada pixel $(x, y)$ respecto al centro $(cx, cy)$ en radio $r$ y angulo $\theta = \operatorname{atan2}(dy, dx)$.
- **Corazon Incandescente:** Nucleo esferico de plasma con atenuacion exponencial $I_{core} = \exp(-r \cdot 18.0)$.
- **Arcos Caoticos:** 8 filamentos radiales donde la trayectoria de cada arco esta modulada por armónicos polares:
  $$\Delta \theta_k = 0.22 \cdot \sin(r \cdot 24.0 - t \cdot 12.0 + k \cdot 1.7) + 0.12 \cdot \sin(r \cdot 48.0 + t \cdot 18.0)$$
- **Chispas Perifericas:** Emisiones en el borde mediante pulsos modulados por ruido pseudoaleatorio cuando $r > 0.65$.

### 2. Tormenta de Relampagos Bifurcados (`/stream_storm`)
- **Cadencia Estocastica:** Ciclos de descarga cada 2.4 segundos con una fase de caida subita que simula la iluminacion estroboscopica de la atmosfera.
- **Rayo Principal Fractal:** Arco troncal vertical con desviacion horizontal zigzag:
  $$x_{bolt}(y) = cx + 0.18 \cdot \sin(y \cdot 18.0 + t_{pulse}) + 0.08 \cdot \sin(y \cdot 45.0 - t_{pulse} \cdot 1.5) + 0.03 \cdot \sin(y \cdot 110.0)$$
- **Ramificaciones Hijas (Forked Branches):** 3 bifurcaciones secundarias que nacen a alturas $y_0 \in \{0.32, 0.50, 0.68\}$ y se desvian hacia los lados con intensidad atenuada proporcional a la distancia a la fuente.
- **Resplandor de Nubes (Cloud Ambient):** Ruido de fondo en la parte superior $y < 0.35$ que se ilumina con el flash de la descarga.

### 3. Red Sinaptica Cuantica / Malla de Nodos (`/stream_synapse`)
- **Nodos Orbitantes (Lissajous):** 12 nodos orbitando en patrones armonicos parametricos:
  $$P_i(t) = \left(cx + R_{x,i} \cdot \cos(\omega_{x,i} \cdot t + \phi_i), \; cy + R_{y,i} \cdot \sin(\omega_{y,i} \cdot t + \psi_i)\right)$$
- **Segmentos de Arco Voltaico:** Para cada par de nodos con distancia euclidiana inferior a un umbral $D_{max} = 0.48$:
  $$d_{\perp}(P, A, B) = \frac{|(B_x - A_x)(A_y - P_y) - (A_x - P_x)(B_y - A_y)|}{\|B - A\|}$$
  con ondulacion senoidal que simula la inestabilidad de la descarga de plasma entre electrodos.
- **Paquetes Cuanticos de Datos (Photons):** Paquetes luminosos de alta intensidad que se desplazan sobre la cuerda del arco en funcion del tiempo, indicando transmision de datos en tiempo real.

---

## Documentacion Tecnica y Arquitectura

1. **[`ARQUITECTURA_SCROLL_DRIVEN_FILMSTRIP_ZERO_JS.md`](./ARQUITECTURA_SCROLL_DRIVEN_FILMSTRIP_ZERO_JS.md)**  
   *La tecnica definitiva de Apple Scrollytelling para computadoras de hace 10 anos: Filmstrip 3D pre-renderizado en Rust, 0% CPU en cliente, reversible y controlado con CSS `steps()` sin JavaScript.*

2. **[`OPTIMIZACION_MULTIHILO_RAYON_60FPS.md`](./OPTIMIZACION_MULTIHILO_RAYON_60FPS.md)**  
   *Diagnostico del cuello de botella mononucleo, solucion multihilo con Rayon a 10 nucleos, temporizador fixed-timestep a 60 FPS, normales por tetraedro y metricas comparativas.*

3. **[`ARQUITECTURA_LABERINTO_3D_RAYMARCHING_RUST.md`](./ARQUITECTURA_LABERINTO_3D_RAYMARCHING_RUST.md)**  
   *Fundamentos matematicos de Raymarching (Sphere Tracing), funciones de distancia signada (SDF), camara parametrica 3D, niebla volumetrica y orquestacion con CSS Scroll-Driven.*

4. **[`ARQUITECTURA_RUST_PIXEL_STREAMING_SCROLL_DRIVEN.md`](./ARQUITECTURA_RUST_PIXEL_STREAMING_SCROLL_DRIVEN.md)**  
   *Explicacion arquitectonica completa del motor de Pixel Streaming en Rust (Axum + Tokio), comparativa con Python y especificaciones Zero-JS.*

---

## Ejecucion y Pruebas Rapidas

```bash
# Compilar y arrancar el servidor en modo Release
cd pruebas_web/server_rust
GROOVE_PUBLIC_DIR=../public PORT=8089 cargo run --release

# O abrir directamente en el navegador cualquiera de los 6 mundos:
# http://localhost:8089/index.html          -> Rayos: Ondas Armonicas
# http://localhost:8089/rays_tesla.html     -> Rayos: Bobina Tesla Radial
# http://localhost:8089/rays_storm.html     -> Rayos: Tormenta Bifurcada
# http://localhost:8089/rays_synapse.html   -> Rayos: Red Sinaptica Cuantica
# http://localhost:8089/labyrinth.html      -> Laberinto 3D Filmstrip
# http://localhost:8089/city.html           -> Ciudad Lluviosa & Telemetria
```
