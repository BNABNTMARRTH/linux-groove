// ==========================================================================
// LINUX GROOVE - MOTOR 3D EN RUST (WASM)
// geometry_anatomy.rs: Anatomia 100% Particulas Volumetricas 3D
// Modelos: Mano Humana Articulada, Cabeza Humana y Corazon en Latido
// Cero lineas wireframe en modo anatomia. Masa y volumen tangibles.
// ==========================================================================

use crate::math3d::Vec3;
use crate::geometry::Edge;
use std::f32::consts::PI;

pub const TAU: f32 = 2.0 * PI;

#[inline(always)]
fn lcg_next(seed: &mut u32) -> f32 {
    *seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
    (*seed as f32) / (4294967296.0)
}

pub struct AnatomyModel {
    pub hand_targets: Vec<Vec3>,
    pub head_targets: Vec<Vec3>,
    pub heart_targets: Vec<Vec3>,
    pub hand_edges: Vec<Edge>,
    pub head_edges: Vec<Edge>,
    pub heart_edges: Vec<Edge>,
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

    // 1. MANO HUMANA VOLUMETRICA (Palma maciza 3D + 5 Dedos tubulares concentricos)
    pub fn generate_hand(count: usize) -> (Vec<Vec3>, Vec<Edge>) {
        let mut targets = Vec::with_capacity(count);
        let edges = Vec::new(); // Cero aristas wireframe: 100% particulas puras
        let mut seed: u32 = 123456789;

        // Proporciones de particulas
        let palm_count = (count as f32 * 0.38) as usize;
        let thumb_count = (count as f32 * 0.12) as usize;
        let index_count = (count as f32 * 0.13) as usize;
        let middle_count = (count as f32 * 0.14) as usize;
        let ring_count = (count as f32 * 0.13) as usize;
        let pinky_count = count - palm_count - thumb_count - index_count - middle_count - ring_count;

        // A. PALMA VOLUMETRICA 3D (Bloque solido con curvatura de agarre)
        for _ in 0..palm_count {
            let u = lcg_next(&mut seed); // x normalizado
            let v = lcg_next(&mut seed); // y normalizado
            let w = lcg_next(&mut seed); // z espesor

            let x_raw = u * 2.0 - 1.0; // [-1.0, 1.0]
            let y_raw = v;              // [0.0, 1.0] de carpo a nudillos

            // Borde trapezoidal de la palma: mas estrecha en la muneca y ancha en nudillos
            let half_width = 0.36 + y_raw * 0.14;
            let x = x_raw * half_width;
            let y = -1.05 + y_raw * 0.90; // Y en [-1.05, -0.15]

            // Espesor Z con concavidad palmar anterior (arco palmar transverso)
            let z_arch = -0.06 * (1.0 - (x / half_width).powi(2));
            let thickness = 0.18 * (1.0 - (x_raw.abs()).powi(3) * 0.4);
            let z = z_arch + (w * 2.0 - 1.0) * thickness;

            targets.push(Vec3::new(x, y, z));
        }

        // B. GENERADOR DE DEDOS CILINDRICOS VOLUMETRICOS
        // Cada dedo se modela como un tubo 3D continuo a traves de sus 3 falanges
        let make_finger = |targets: &mut Vec<Vec3>, seed: &mut u32, n_pts: usize,
                           p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, r_base: f32, r_tip: f32| {
            for _ in 0..n_pts {
                let t = lcg_next(seed); // Longitud a lo largo del dedo [0.0, 1.0]
                let theta = lcg_next(seed) * TAU;
                let rad_rand = lcg_next(seed);
                // Distribucion volumetrica: mezcla de superficie y relleno interior
                let r_frac = if rad_rand < 0.35 {
                    rad_rand / 0.35 * 0.8 // nucleo oseo interior
                } else {
                    0.8 + (rad_rand - 0.35) / 0.65 * 0.25 // corteza cutanea exterior
                };

                let current_radius = (r_base + (r_tip - r_base) * t) * r_frac;

                // Spline de bezier cuadratico para curvatura anatomica de reposo
                let (center, tangent) = if t < 0.5 {
                    let local_t = t * 2.0;
                    let c = Vec3::lerp(Vec3::lerp(p0, p1, local_t), Vec3::lerp(p1, p2, local_t), local_t);
                    let tan = Vec3::new(p2.x - p0.x, p2.y - p0.y, p2.z - p0.z);
                    (c, tan)
                } else {
                    let local_t = (t - 0.5) * 2.0;
                    let c = Vec3::lerp(Vec3::lerp(p1, p2, local_t), Vec3::lerp(p2, p3, local_t), local_t);
                    let tan = Vec3::new(p3.x - p1.x, p3.y - p1.y, p3.z - p1.z);
                    (c, tan)
                };

                // Marco ortonormal para el plano transversal del dedo
                let norm_tan = if tangent.length_sq() > 0.001 { tangent.normalize() } else { Vec3::new(0.0, 1.0, 0.0) };
                let arbitrary = if norm_tan.x.abs() < 0.8 { Vec3::new(1.0, 0.0, 0.0) } else { Vec3::new(0.0, 0.0, 1.0) };
                let perp_u = norm_tan.cross(&arbitrary).normalize();
                let perp_v = norm_tan.cross(&perp_u).normalize();

                let offset_x = (perp_u.x * theta.cos() + perp_v.x * theta.sin()) * current_radius;
                let offset_y = (perp_u.y * theta.cos() + perp_v.y * theta.sin()) * current_radius;
                let offset_z = (perp_u.z * theta.cos() + perp_v.z * theta.sin()) * current_radius;

                targets.push(Vec3::new(center.x + offset_x, center.y + offset_y, center.z + offset_z));
            }
        };

        // Pulgar (Oponible, orientado hacia anterior y lateral)
        make_finger(&mut targets, &mut seed, thumb_count,
            Vec3::new(-0.45, -0.65,  0.06),
            Vec3::new(-0.72, -0.32,  0.16),
            Vec3::new(-0.96,  0.02,  0.24),
            Vec3::new(-1.12,  0.32,  0.30),
            0.14, 0.095);

        // Indice
        make_finger(&mut targets, &mut seed, index_count,
            Vec3::new(-0.30, -0.15,  0.03),
            Vec3::new(-0.33,  0.35,  0.03),
            Vec3::new(-0.36,  0.70,  0.02),
            Vec3::new(-0.38,  0.98,  0.01),
            0.115, 0.075);

        // Medio (Dedo mas largo)
        make_finger(&mut targets, &mut seed, middle_count,
            Vec3::new( 0.00, -0.12,  0.04),
            Vec3::new( 0.00,  0.42,  0.04),
            Vec3::new( 0.00,  0.82,  0.03),
            Vec3::new( 0.00,  1.18,  0.02),
            0.120, 0.080);

        // Anular
        make_finger(&mut targets, &mut seed, ring_count,
            Vec3::new( 0.28, -0.15,  0.03),
            Vec3::new( 0.31,  0.35,  0.03),
            Vec3::new( 0.34,  0.72,  0.02),
            Vec3::new( 0.36,  1.02,  0.01),
            0.112, 0.074);

        // Menique
        make_finger(&mut targets, &mut seed, pinky_count,
            Vec3::new( 0.50, -0.22,  0.01),
            Vec3::new( 0.55,  0.15,  0.01),
            Vec3::new( 0.60,  0.45,  0.00),
            Vec3::new( 0.64,  0.72, -0.01),
            0.095, 0.062);

        (targets, edges)
    }

    // 2. CABEZA HUMANA VOLUMETRICA (Boveda craneal, corteza neural, relieve facial 3D y cuello)
    pub fn generate_head(count: usize) -> (Vec<Vec3>, Vec<Edge>) {
        let mut targets = Vec::with_capacity(count);
        let edges = Vec::new(); // Cero aristas: 100% particulas puras
        let mut seed: u32 = 987654321;

        // Distribucion de particulas anatomicas
        let cranium_count = (count as f32 * 0.44) as usize; // Boveda craneal y cerebro
        let face_count = (count as f32 * 0.40) as usize;    // Pomulos, nariz, ojos, mandibula, labios
        let neck_count = count - cranium_count - face_count; // Cuello

        // A. BOVEDA CRANEAL Y VOLUMEN ENCEFALICO
        // Elipsoide con masa cortical y nucleo sinaptico denso
        for _ in 0..cranium_count {
            let u = lcg_next(&mut seed) * TAU;
            let v = lcg_next(&mut seed) * PI;
            let rad_dice = lcg_next(&mut seed);

            // Capa externa cortical vs red sinaptica profunda
            let rad_factor = if rad_dice < 0.65 {
                0.90 + (rad_dice / 0.65) * 0.18 // Corteza externa
            } else {
                0.25 + ((rad_dice - 0.65) / 0.35).powf(0.6) * 0.65 // Materia blanca interna
            };

            let ax = 0.82 * rad_factor;
            let ay = 0.95 * rad_factor;
            let az = 1.05 * rad_factor;

            let x = ax * v.sin() * u.cos();
            let y = ay * v.cos() + 0.32; // Centro craneal elevado
            let z = az * v.sin() * u.sin() - 0.12; // Desplazado ligeramente hacia posterior

            targets.push(Vec3::new(x, y, z));
        }

        // B. RELIEVE FACIAL DETALLADO 3D
        for _ in 0..face_count {
            let feature_type = lcg_next(&mut seed);

            if feature_type < 0.22 {
                // 1. Nariz piramidal 3D sobresaliente (Tabique, dorso y lobulo)
                let t_len = lcg_next(&mut seed); // De raiz a punta [0.0, 1.0]
                let t_width = lcg_next(&mut seed) * 2.0 - 1.0;
                let y = 0.32 - t_len * 0.38; // Y en [0.32, -0.06]
                let base_w = 0.08 + t_len * 0.12;
                let x = t_width * base_w;
                let z = 0.58 + t_len * 0.34 - (t_width.abs()).powi(2) * 0.12;
                targets.push(Vec3::new(x, y, z));
            } else if feature_type < 0.40 {
                // 2. Cuencas oculares y globos oculares (Orbitas bilaterales)
                let side = if lcg_next(&mut seed) < 0.5 { -1.0 } else { 1.0 };
                let is_eyeball = lcg_next(&mut seed) < 0.5;
                if is_eyeball {
                    // Esfera ocular volumetrica
                    let theta = lcg_next(&mut seed) * TAU;
                    let phi = lcg_next(&mut seed) * PI;
                    let r = 0.11 * lcg_next(&mut seed).sqrt();
                    let x = side * 0.28 + r * phi.sin() * theta.cos();
                    let y = 0.24 + r * phi.cos();
                    let z = 0.52 + r * phi.sin() * theta.sin();
                    targets.push(Vec3::new(x, y, z));
                } else {
                    // Borde orbitario / ceja
                    let theta = lcg_next(&mut seed) * TAU;
                    let r = 0.18 + lcg_next(&mut seed) * 0.06;
                    let x = side * 0.28 + r * theta.cos();
                    let y = 0.25 + r * theta.sin() * 0.8;
                    let z = 0.58 + (theta.sin()).max(0.0) * 0.14; // Arco superciliar prominente
                    targets.push(Vec3::new(x, y, z));
                }
            } else if feature_type < 0.58 {
                // 3. Labios anatomicos (Labio superior con arco de cupido y labio inferior carnoso)
                let side = lcg_next(&mut seed) * 2.0 - 1.0; // [-1.0, 1.0]
                let is_upper = lcg_next(&mut seed) < 0.5;
                let x = side * 0.26;
                let mouth_curve = 1.0 - (side.abs()).powi(2);

                if is_upper {
                    let cupid_notch = (side.abs() - 0.35).abs() * 0.03;
                    let y = -0.17 + mouth_curve * 0.04 - cupid_notch;
                    let z = 0.72 + mouth_curve * 0.12 + (lcg_next(&mut seed) - 0.5) * 0.06;
                    targets.push(Vec3::new(x, y, z));
                } else {
                    let y = -0.27 - mouth_curve * 0.05;
                    let z = 0.70 + mouth_curve * 0.14 + (lcg_next(&mut seed) - 0.5) * 0.06;
                    targets.push(Vec3::new(x, y, z));
                }
            } else if feature_type < 0.82 {
                // 4. Pomulos y mejillas (Arco cigomatico)
                let side = if lcg_next(&mut seed) < 0.5 { -1.0 } else { 1.0 };
                let u = lcg_next(&mut seed);
                let v = lcg_next(&mut seed);
                let x = side * (0.35 + u * 0.32);
                let y = 0.02 + v * 0.22;
                let z = 0.52 + (1.0 - u) * 0.22 - v * 0.08;
                targets.push(Vec3::new(x, y, z));
            } else {
                // 5. Mandibula y menton prominente
                let t_jaw = lcg_next(&mut seed); // 0.0 en menton, 1.0 en angulo mandibular
                let side = if lcg_next(&mut seed) < 0.5 { -1.0 } else { 1.0 };
                let x = side * (0.16 + t_jaw * 0.55);
                let y = -0.52 + t_jaw * 0.40;
                let z = 0.68 - t_jaw * 0.75 + (lcg_next(&mut seed) - 0.5) * 0.08;
                targets.push(Vec3::new(x, y, z));
            }
        }

        // C. CUELLO VOLUMETRICO CILINDRICO
        for _ in 0..neck_count {
            let t = lcg_next(&mut seed); // De -0.55 a -1.15
            let theta = lcg_next(&mut seed) * TAU;
            let rad_factor = 0.75 + lcg_next(&mut seed) * 0.25;
            let radius = (0.46 + t * 0.08) * rad_factor;

            let x = radius * theta.cos() * 0.88;
            let y = -0.55 - t * 0.60;
            let z = radius * theta.sin() - 0.15; // Centrado bajo el eje del craneo

            targets.push(Vec3::new(x, y, z));
        }

        (targets, edges)
    }

    // 3. CORAZON HUMANO VOLUMETRICO (Miocardio grueso, cavidades y cayado aortico 3D)
    pub fn generate_heart(count: usize) -> (Vec<Vec3>, Vec<Edge>) {
        let mut targets = Vec::with_capacity(count);
        let edges = Vec::new(); // Cero aristas: 100% particulas puras
        let mut seed: u32 = 55667788;

        // Distribucion anatomica
        let myocardium_count = (count as f32 * 0.62) as usize; // Pared muscular ventricular
        let aorta_count = (count as f32 * 0.22) as usize;      // Cayado aortico y vasos
        let cavity_count = count - myocardium_count - aorta_count; // Septo y trabeculas

        // A. MIOCARDIO MUSCULAR VENTRICULAR 3D
        // Geometria cardioide volumetrica con pared gruesa
        for _ in 0..myocardium_count {
            let u = lcg_next(&mut seed) * TAU;
            let t_height = lcg_next(&mut seed); // De base superior a vertice inferior (apice)
            let wall_t = lcg_next(&mut seed);  // Espesor transmural del musculo [0.0, 1.0]

            // Contorno cardioide caracteristico
            let sin_u = u.sin();
            let cos_u = u.cos();
            let cardioid_x = 1.18 * sin_u.powi(3);
            let cardioid_z = 0.98 * (cos_u - 0.36 * cos_u.powi(2));

            // Escala descendente hacia el apice conico
            let height_scale = (1.0 - t_height * 0.84).sqrt();
            // Espesor muscular: epicardio (exterior) a endocardio (interior)
            let wall_radius = 0.78 + wall_t * 0.28;

            let x = cardioid_x * height_scale * wall_radius;
            let y = 0.55 - t_height * 1.70; // Y en [0.55, -1.15]
            let z = cardioid_z * height_scale * wall_radius;

            targets.push(Vec3::new(x, y, z));
        }

        // B. CAYADO AORTICO Y TRONCO PULMONAR 3D
        // Tubos cilindricos continuos curvados sobre la base del corazon
        let aorta_tubes = aorta_count / 2;
        let pulmonary_tubes = aorta_count - aorta_tubes;

        // 1. Cayado Aortico (Tubo curvado de gran calibre)
        for _ in 0..aorta_tubes {
            let t = lcg_next(&mut seed); // Trayectoria a lo largo del arco
            let theta = lcg_next(&mut seed) * TAU;
            let r = 0.14 * (0.6 + lcg_next(&mut seed) * 0.4);

            // Trayectoria 3D del cayado: emerge del ventriculo izq, asciende y gira hacia dorsal
            let arch_angle = t * PI * 1.15;
            let center_x = 0.08 + 0.38 * (1.0 - arch_angle.cos()) * 0.7;
            let center_y = 0.50 + 0.65 * arch_angle.sin();
            let center_z = 0.05 - 0.42 * (1.0 - arch_angle.cos());

            let x = center_x + r * theta.cos();
            let y = center_y + r * theta.sin() * 0.5;
            let z = center_z + r * theta.sin() * 0.85;

            targets.push(Vec3::new(x, y, z));
        }

        // 2. Arteria Pulmonar y Vena Cava
        for _ in 0..pulmonary_tubes {
            let is_cava = lcg_next(&mut seed) < 0.4;
            let theta = lcg_next(&mut seed) * TAU;
            let t = lcg_next(&mut seed);

            if is_cava {
                // Vena cava superior derecha (tubo vertical)
                let r = 0.11 * (0.7 + lcg_next(&mut seed) * 0.3);
                let x = 0.52 + r * theta.cos();
                let y = 0.35 + t * 0.75;
                let z = -0.12 + r * theta.sin();
                targets.push(Vec3::new(x, y, z));
            } else {
                // Tronco pulmonar cruzando anterior a la aorta
                let r = 0.12 * (0.7 + lcg_next(&mut seed) * 0.3);
                let x = -0.12 + t * 0.42 + r * theta.cos();
                let y = 0.45 + t * 0.35 + r * theta.sin() * 0.5;
                let z = 0.28 - t * 0.32 + r * theta.sin() * 0.8;
                targets.push(Vec3::new(x, y, z));
            }
        }

        // C. TABIQUE INTERVENTRICULAR Y TRABECULAS INTERNAS
        for _ in 0..cavity_count {
            let t_height = lcg_next(&mut seed);
            let s_depth = lcg_next(&mut seed) * 2.0 - 1.0;
            let s_trans = (lcg_next(&mut seed) - 0.5) * 0.18;

            let y = 0.40 - t_height * 1.45;
            let max_span = (1.0 - t_height * 0.75).sqrt() * 0.82;
            let z = s_depth * max_span * 0.65;
            let x = s_trans * max_span; // Tabique medial

            targets.push(Vec3::new(x, y, z));
        }

        (targets, edges)
    }

    // Calcula la posicion interpolada continua para transiciones suaves
    // 0.0 -> Mano
    // 1.0 -> Cabeza
    // 2.0 -> Corazon
    // 3.0 -> Ciclo de retorno a Mano
    pub fn get_morph_target(&self, idx: usize, morph_t: f32, time: f32) -> Vec3 {
        let t = morph_t.rem_euclid(3.0);
        if t < 1.0 {
            // Mano -> Cabeza
            let p_a = self.hand_targets[idx % self.hand_targets.len()];
            let p_b = self.head_targets[idx % self.head_targets.len()];
            Vec3::lerp(p_a, p_b, t)
        } else if t < 2.0 {
            // Cabeza -> Corazon
            let local_t = t - 1.0;
            let p_a = self.head_targets[idx % self.head_targets.len()];
            let p_b = self.get_pulsing_heart(idx, time);
            Vec3::lerp(p_a, p_b, local_t)
        } else {
            // Corazon -> Mano
            let local_t = t - 2.0;
            let p_a = self.get_pulsing_heart(idx, time);
            let p_b = self.hand_targets[idx % self.hand_targets.len()];
            Vec3::lerp(p_a, p_b, local_t)
        }
    }

    // Corazon con latido ritmico asistido por ecuacion cardiaca QRS a 72 BPM
    pub fn get_pulsing_heart(&self, idx: usize, time: f32) -> Vec3 {
        let base = self.heart_targets[idx % self.heart_targets.len()];
        let omega = 7.54; // ~72 BPM

        // Fase de contraccion sistolica rapida y relajacion diastolica
        let phase = (time * omega).rem_euclid(TAU);
        let pulse = if phase < 1.2 {
            // Sistole: contraccion vigorosa ventricular
            1.0 - 0.16 * (phase / 1.2 * PI).sin().powi(2)
        } else if phase < 2.0 {
            // Rebote elastico y expansion
            1.0 + 0.08 * ((phase - 1.2) / 0.8 * PI).sin()
        } else {
            // Diastole en reposo
            1.0
        };

        // El cayado aortico superior se dilata ligeramente en sistole
        if base.y > 0.45 {
            let aorta_dilation = 1.0 + (1.0 - pulse) * 0.55;
            Vec3::new(base.x * aorta_dilation, base.y, base.z * aorta_dilation)
        } else {
            Vec3::new(base.x * pulse, base.y * (1.12 - pulse * 0.12), base.z * pulse)
        }
    }
}
