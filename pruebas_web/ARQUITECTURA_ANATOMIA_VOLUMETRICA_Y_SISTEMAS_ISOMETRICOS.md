# Arquitectura y Especificacion Tecnica: Anatomia Volumetrica por Particulas & Sistemas Isometricos
## Motor Rust WebAssembly (8,192 Particulas Puras) & Sistemas Mecanicos con Skill 'Anatomy'

---

## 1. Vision General del Sistema

Este documento establece la arquitectura integral de las dos ramas tridimensionales de **Linux Groove**:

1. **Bloque A - Anatomia 100% Particulas Volumétricas (Rust Wasm):**
   - La Mano, Cabeza y Corazon se generan **exclusivamente mediante nubes densas de 8,192 particulas cuanticas**, suprimiendo por completo los alambres (*wireframes*).
   - Se aplican principios geometricos de extrusión tubular (`tube`), cadenas de bisagras (*hinge chains*) y sombreado 3D por producto punto ($\vec{n} \cdot \vec{L}$) para crear volumen, espesor y masa reconocible a simple vista.
2. **Bloque B - Sistemas Mecanicos e Ilustracion Isometrica 3D (Skill 'Anatomy'):**
   - Integracion de tres sistemas fisicos reales de alta complejidad:
     - **Motor Cohete Espacial (Raptor Rocket Engine):** Tobera regenerativa con `lathe.mjs`, tuberias 3D con `tube.mjs` y penacho de escape WebGL con diamantes de choque.
     - **Comparador de Caratula (Precision Dial Indicator):** Bisel moleteado giratorio, engranajes y palpador micrometrico en vivo.
     - **Tanque de Ondas (Ripple Tank):** Difraccion acustica/optica con causticas de refraccion WebGL en tiempo real.
3. **Ergonomia Visual:**
   - Todas las vistas implementan el **Dock de Control Minimalista de 46px**, dejando el centro del viewport 100% visible y libre de obstrucciones.
   - **Estricto Cero Emojis:** Diseno tecnico de precision con codigos tipograficos limpios (`[+]`, `//`, `[1]`, `[v]`).

---

## 2. Formulacion Matematica del Bloque A: Anatomia Volumetrica Pura

### 2.1. Mano Humana Volumétrica (Extrusion Tubular de Falanges)

Cada dedo de la mano se modela como una secuencia de 3 segmentos cilindricos volumétricos concéntricos (falange proximal, medial y distal):

$$\vec{P}_{dedo}(s, \theta, r) = \vec{C}(s) + r(s) \cdot \left(\cos\theta \cdot \vec{U}(s) + \sin\theta \cdot \vec{V}(s)\right) + \vec{\delta}_{vol}$$

donde:
- $\vec{C}(s)$ es la linea central del hueso (curva spline de falanges).
- $r(s)$ es el radio anatomico decreciente: $r \approx 0.11$ en la base metacarpiana hasta $r \approx 0.065$ en la yema.
- $\vec{U}(s)$ y $\vec{V}(s)$ son los vectores directores perpendiculares ortonormales (marco de Frenet-Serret).
- $\vec{\delta}_{vol}$ es un vector estocastico interno que rellena la masa carnosa y tendinosa sub-superficial.
- La palma se modela con masa elipsoidal anterior y posterior ($z \in [-0.22, 0.22]$).

### 2.2. Cabeza Humana y Relieve Facial Volumétrico

La morfologia craneofacial se estructura a traves de coordenadas parametricas elipsoidales con densidad diferenciada en facciones faciales:

$$\begin{aligned}
x &= R_x \cdot \sin\phi \cdot \cos\theta + \Delta x_{facial} \\
y &= R_y \cdot \cos\phi + \Delta y_{facial} \\
z &= R_z \cdot \sin\phi \cdot \sin\theta + \Delta z_{facial}
\end{aligned}$$

- **Puente y Fosas Nasales:** Elevacion frontal concentrada en $\theta \approx 0, \phi \in [0.45\pi, 0.55\pi]$ con proyeccion piramidal de 3 capas de particulas.
- **Arcos Orbitarios y Pomulos:** Prominencia lateral en $\phi \approx 0.4\pi, \theta \approx \pm 0.25\pi$.
- **Boveda Craneal:** Casquete elipsoidal uniforme en la region posterior ($\theta < 0$) con relleno sinaptico encefalico.

### 2.3. Corazon Humano Volumétrico y Ecuacion Fisiologica de Latido

El miocardio ventricular se genera como una doble capa muscular (endocardio interno y epicardio externo):

$$P_{miocardio}(u, v, \lambda) = (1.0 + \lambda \cdot 0.18) \cdot P_{cardioide}(u, v)$$
con $\lambda \in [0, 1]$ que distribuye particulas a lo largo del grosor de la pared muscular.

**Funcion de Contraccion Sistolica/Diastolica (ECG 72 LPM):**
$$S(t) = 1.0 + 0.15 \cdot \sin(7.54 t)^4 - 0.06 \cdot \sin(7.54 t + 0.35)^2$$
En cada sistole ventricular, el eje vertical se comprime un 15% y las particulas de la aorta se aceleran hacia arriba, simulando el pulso sanguineo.

### 2.4. Sombreado 3D por Pseudo-Normales ($\vec{n} \cdot \vec{L}$)

Cada particula $i$ calcula su orientacion espacial respecto a la fuente de luz $\vec{L} = (0.55, 0.70, 0.45)^T$:

$$\text{factor} = 0.25 + 0.75 \cdot \max\left(0.0, \; \frac{\vec{P}_i}{\|\vec{P}_i\|} \cdot \vec{L}\right)$$

- Las particulas frontales expuestas a la luz reciben:
  $$\text{size} = 3.6\text{px}, \quad \text{alpha} = 1.0, \quad \text{color} = \text{brillante}$$
- Las particulas en sombra reciben:
  $$\text{size} = 1.2\text{px}, \quad \text{alpha} = 0.35, \quad \text{color} = \text{atenuado}$$
Esto confiere un claroscuro continuo que esculpe el volumen tridimensional ante los ojos del usuario sin requerir poligonos tradicionales.

---

## 3. Especificacion del Bloque B: Sistemas Fisicos con Skill 'Anatomy'

### 3.1. `machine_rocket.html` (Motor Cohete Raptor 3D)
- **Campana de Tobera:** Torneada analiticamente con `kit/lathe.mjs` y costillas axiales de refrigeracion regenerativa.
- **Tuberias:** Generadas con `kit/tube.mjs` respetando radios de doblado reales y abrazaderas.
- **Shader WebGL:** Proyectado en la misma camara isometrica mediante `kit/gl.mjs`. Renderiza un chorro de gas ionizado con 4 diamantes de choque que oscilan con la presion de camara.

### 3.2. `machine_dial.html` (Comparador de Caratula Mecanico 3D)
- **Bisel Moleteado:** Aro exterior giratorio con agarre dentado analitico.
- **Vastago de Medicion:** Husillo vertical que se desplaza hacia arriba y abajo con resorte de retorno.
- **Reloj de Medicion:** Aguja de barrido acoplada a un tren de engranajes que reporta la desviacion en micras en tiempo real.

### 3.3. `machine_ripple.html` (Tanque de Ondas e Interferencia 3D)
- **Cuba de Vidrio Acrilico:** Tanque transparente sobre patas metalicas con fondo milimetrado.
- **Percutor Motorizado:** Varillas gemelas que oscilan verticalmente generando frentes de onda circulares.
- **Shader WebGL de Causticas:** Calculo de refraccion optica sobre el fondo con dispersion y patrones nodales de interferencia.

---

## 4. Catalogo Completo de 15 Mundos Web

| Grupo | Experiencias | Tecnologias |
| :--- | :--- | :--- |
| **Rayos Electricos** | Ondas, Tesla Radial, Tormenta, Sinapsis | Rust Pixel Streaming MJPEG 60 FPS |
| **Mundos 3D** | Laberinto Filmstrip, Ciudad Lluviosa | Rust Rayon Multicore & CSS Scroll |
| **Primitivas 3D** | Scroll Morph, Mouse Tilt, Deconstruccion | Rust WebAssembly (Esfera, Cubo, Torus) |
| **Anatomia 3D** | Scroll Morph, Mouse ECG, Deconstruccion Celular | Rust WebAssembly (8,192 Particulas Volumetricas) |
| **Maquinas 3D** | Motor Cohete, Comparador Caratula, Tanque Ondas | Skill Anatomy (SVG Isométrico + Shaders WebGL) |

---

## 5. Estandar de Diseno Visual

- **Dock Inferior Flotante de 46px:** En todas las pantallas interactivas, los controles se comprimen en una franja horizontal inferior de vidrio oscuro translúcido (`background: rgba(3, 7, 5, 0.78); backdrop-filter: blur(16px)`).
- **100% Espacio Central Libre:** Mas de 250px de margen alrededor del modelo 3D para inspeccion pura.
- **Estricto Cero Emojis:** Todos los badges, botones y lecturas se implementan con tipografia tecnica limpia.

