# Arquitectura y Modelado Matematico: Modelos Anatomicos 3D en Rust (Wasm)
## Mano Humana Articulada, Cabeza/Craneo con Red Neural y Corazon Pulsante (ECG)
### Particulas Cuanticas, Wireframes Vectoriales y Rebanadas Volumetricas

---

## 1. Resumen y Proposito Tecnico

Este documento especifica la formulacion matematica, estructura de datos y pipeline de renderizado para dotar al motor grafico **Rust WebAssembly (`engine_wasm`)** de tres figuras anatomicas humanas de alta fidelidad:
1. **La Mano Humana (Cinematica de Falanges y Tendones):** Malla articular compuesta por carpo, metacarpo y 5 dedos articulados capaces de flexion y extension biomecanica.
2. **La Cabeza Humana (Perfil Craneofacial y Malla Neural):** Envolvente craneal elipsoidal con relieve facial (arcos orbitarios, puente nasal, pomulos, mandibula) y nucleo encefalico de red sinaptica con impulsos de pensamiento.
3. **El Corazon Humano (Cardioide 3D y Contraccion Ritmica Sistolica/Diastolica):** Modelado ventricular y auricular con cayado aortico y funcion de latido continuo a 72 LPM gobernada por ecuaciones electrofisiologicas analiticas.

Todo el procesamiento espacial, proyeccion en perspectiva $4 \times 4$, cinematica y fisica de particulas se ejecuta en **Rust puro**, transfiriendo los vertices directamente a la memoria de la GPU sin dependencias externas (cero Three.js, cero librerias npm), con **estricto cero emojis** y garantizando **100% de visibilidad despejada** mediante un *Control Dock* inferior flotante de solo 46px.

---

## 2. Formulacion Matematica de las Tres Geometrias Anatomicas

### 2.1. Mano Humana Biomecanica (Articulacion de 14 Falanges)

La mano se modela como un arbol cinematico jerarquico con raiz en el carpo $(0, -1.2, 0)$:

- **Palma / Carpo:** Red trapezoidal en el plano $XY$ acotada por:
  $$V_{carpo} = \{(x_i, y_i, z_i)\} \quad \text{donde} \quad x \in [-0.55, 0.55], \; y \in [-1.2, -0.2], \; z \approx 0.08 \cdot (1 - x^2)$$

- **Dedos (5 Rayos Cineticos):**
  Para cada dedo $k \in \{0: \text{Pulgar}, 1: \text{Indice}, 2: \text{Medio}, 3: \text{Anular}, 4: \text{Menique}\}$:
  El dedo posee una base metacarpiana $B_k$, una falange proximal de longitud $L_{p,k}$, falange media $L_{m,k}$ y falange distal $L_{d,k}$.

  La posicion de cualquier punto a lo largo del dedo con parametro de flexion $f \in [0, 1]$ se calcula de forma recursiva:
  $$\begin{aligned}
  P_{prox, k} &= B_k + L_{p,k} \cdot \vec{u}_k(\theta_{base, k}) \\
  P_{med, k}  &= P_{prox, k} + L_{m,k} \cdot \vec{u}_k(\theta_{base, k} + 0.8 \cdot f) \\
  P_{dist, k} &= P_{med, k} + L_{d,k} \cdot \vec{u}_k(\theta_{base, k} + 1.4 \cdot f)
  \end{aligned}$$
  donde $\vec{u}_k(\alpha) = (\cos(\phi_k) \cdot \sin(\alpha), \; \cos(\alpha), \; \sin(\phi_k) \cdot \sin(\alpha))^T$.

- **Canales Nerviosos y Fibras:** A lo largo de cada rayo se muestrean particulas luminosas que fluyen desde el carpo hacia la yema de los dedos, simulando impulsos tactiles.

---

### 2.2. Cabeza Humana y Red Neural Encefalica

La cabeza se estructura en dos capas concentricas: la corteza morfologica exterior y el nucleo sinaptico interior.

1. **Boveda Craneana (Elipsoide Asimetrico):**
   $$\begin{aligned}
   x &= R_x \cdot \sin(\phi) \cdot \cos(\theta) \\
   y &= R_y \cdot \cos(\phi) + Y_{offset} \\
   z &= R_z \cdot \sin(\phi) \cdot \sin(\theta) \cdot (1.0 + 0.15 \cdot \cos(\phi))
   \end{aligned}$$
   con semi-ejes $R_x = 0.95$, $R_y = 1.30$, $R_z = 1.10$.

2. **Relieve y Mascara Facial:**
   Para $\theta \in [-\pi/2, \pi/2]$ y $\phi \in [\pi/4, 3\pi/4]$, los vertices se perturban analiticamente para trazar:
   - **Arcos Superciliares:** Elevacion en $y \approx 0.35$, $z \approx 0.95$.
   - **Puente Nasal:** Proyeccion triangular frontal $z_{nariz} = 1.15 \cdot (1.0 - |x| / 0.18)$ para $y \in [-0.1, 0.3]$.
   - **Menton y Mandibula:** Cono paraboloide en $y \in [-1.2, -0.6]$, convergiendo hacia $x = 0$.

3. **Nucleo Neural (Red Sinaptica):**
   Dentro del hemisferio superior ($y > 0.1, \rho < 0.7$), 1,200 particulas flotan en formacion de sustancia gris y blanca, interconectadas por arcos de plasma de distancia minima que destellan con impulsos cognitivos.

---

### 2.3. Corazon Humano y Contraccion Sistolica/Diastolica (ECG)

El miocardio se genera a partir de la superficie cardioide de Taubin tridimensional enriquecida con camaras ventriculares y el arco aortico superior.

1. **Geometria Base del Miocardio:**
   $$(x^2 + \frac{9}{4}y^2 + z^2 - 1)^3 - x^2 z^3 - \frac{9}{80} y^2 z^3 = 0$$
   Parametrizada mediante coordenadas toroidales-cardioides en el espacio $(u, v)$:
   $$\begin{aligned}
   x &= 1.1 \cdot \sin(u) \cdot \cos(v) \cdot \sqrt{|\cos(v)|} \\
   y &= 1.2 \cdot (1.0 - \sin(v)) \cdot \cos(u) \\
   z &= 0.85 \cdot \sin(u) \cdot \sin(v)
   \end{aligned}$$

2. **Cayado Aortico:**
   Tubo semicircular superior en $y \in [0.8, 1.4]$ con curvatura $\theta \in [0, \pi]$ simulando la aorta ascendente, el arco y la aorta descendente.

3. **Ciclo Cardiaco y Pulsacion Sistolica/Diastolica:**
   La contraccion no es un simple seno simetrico, sino que replica la mecanica del complejo QRS y la onda T del electrocardiograma:
   $$S(t) = 1.0 + 0.16 \cdot \sin(\omega t)^4 - 0.07 \cdot \sin(\omega t + 0.35)^2$$
   donde $\omega = 2\pi \cdot (72 / 60) \approx 7.54 \text{ rad/s}$ (72 latidos por minuto).
   - En la **fase sistolica** ($\sin(\omega t) \approx 1$), el corazon se contrae energicamente hacia su eje vertical y expulsa particulas a traves de la aorta.
   - En la **fase diastolica**, se expande suavemente recargando volumen sanguineo.

---

## 3. Arquitectura del Motor en Rust (`engine_wasm`)

### 3.1. Modulo `geometry_anatomy.rs`

```rust
// pruebas_web/engine_wasm/src/geometry_anatomy.rs
use crate::math3d::Vec3;
use std::f32::consts::PI;

pub struct AnatomyModel {
    pub hand_targets: Vec<Vec3>,
    pub head_targets: Vec<Vec3>,
    pub heart_targets: Vec<Vec3>,
    pub hand_edges: Vec<crate::geometry::Edge>,
    pub head_edges: Vec<crate::geometry::Edge>,
    pub heart_edges: Vec<crate::geometry::Edge>,
}

impl AnatomyModel {
    pub fn new(count: usize) -> Self {
        let (hand_targets, hand_edges) = Self::generate_hand(count);
        let (head_targets, head_edges) = Self::generate_head(count);
        let (heart_targets, heart_edges) = Self::generate_heart(count);

        Self {
            hand_targets,
            head_targets,
            heart_targets,
            hand_edges,
            head_edges,
            heart_edges,
        }
    }

    // Genera el corazon con pulsacion sistolica en funcion del tiempo
    pub fn get_pulsing_heart(&self, idx: usize, time: f32) -> Vec3 {
        let base = self.heart_targets[idx % self.heart_targets.len()];
        let omega = 7.54; // 72 LPM
        let pulse = 1.0 + 0.14 * (time * omega).sin().powi(4) - 0.05 * (time * omega + 0.35).sin().powi(2);
        Vec3::new(base.x * pulse, base.y * (2.0 - pulse), base.z * pulse)
    }
}
```

---

## 4. Diseno Visual: Control Dock Minimalista de 46px

Siguiendo las observaciones de usabilidad, ningun elemento gráfico tapa el centro del viewport:
- **Altura Total:** 46px fijada a `bottom: 1.2rem`.
- **Fondo:** Vidrio esmerilado translúcido con desenfoque de 16px (`background: rgba(3, 7, 5, 0.76); backdrop-filter: blur(16px)`).
- **Contenido Horizontal en una Sola Linea:**
  `[ // FIGURA: ] [ Mano ] [ Cabeza ] [ Corazon ] | [ Latido ECG: 72 BPM ] | [ ? ]`
- **Zona Central:** 100% despejada con mas de 250px de margen libre para admirar el modelo anatomico.

---

## 5. Cronograma de Implementacion

1. **Fase 1:** Implementacion del modulo `geometry_anatomy.rs` en Rust con Mano, Cabeza y Corazón.
2. **Fase 2:** Integracion en `lib.rs` del crate `engine_wasm` con soporte de latido cardiaco en tiempo real.
3. **Fase 3:** Compilacion standalone a `engine_3d.wasm` y copia a `public/`.
4. **Fase 4:** Creacion de las 3 vistas web:
   - `anatomy_scroll.html` (Transmutacion Mano -> Cabeza -> Corazon).
   - `anatomy_inspect.html` (Giroscopo, flexion de dedos y monitor de pulso ECG).
   - `anatomy_deconstruct.html` (Dispersion de fibras y reensamblaje celular).
5. **Fase 5:** Enlace unificado en la barra superior en los 12 mundos web sin emojis.
6. **Fase 6:** Verificacion en vivo a 60 FPS y auditoria de cero emojis.

