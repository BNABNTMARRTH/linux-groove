// ==========================================================================
// LINUX GROOVE - MOTOR 3D EN RUST (WASM)
// geometry_anatomy.rs: Modelos Anatomicos de Mano, Cabeza y Corazon
// Particulas, Wireframes (Lineas) y Rebanadas Volumetricas (Frames)
// ==========================================================================

use crate::math3d::Vec3;
use crate::geometry::Edge;
use std::f32::consts::PI;

pub const TAU: f32 = 2.0 * PI;

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

    // 1. MANO HUMANA ARTICULADA
    // Palma + 5 dedos con falanges articulables
    pub fn generate_hand(count: usize) -> (Vec<Vec3>, Vec<Edge>) {
        let mut targets = Vec::with_capacity(count);
        let mut edges = Vec::new();

        // 8 vertices del carpo / palma base
        let palm_vertices = [
            Vec3::new(-0.45, -1.10, -0.05), // 0: Carpo inferior izquierdo
            Vec3::new( 0.45, -1.10, -0.05), // 1: Carpo inferior derecho
            Vec3::new( 0.55, -0.20,  0.02), // 2: Nudillo menique
            Vec3::new( 0.28, -0.15,  0.04), // 3: Nudillo anular
            Vec3::new( 0.00, -0.12,  0.05), // 4: Nudillo medio
            Vec3::new(-0.28, -0.15,  0.04), // 5: Nudillo indice
            Vec3::new(-0.55, -0.55,  0.15), // 6: Nudillo pulgar base
            Vec3::new(-0.40, -0.25,  0.18), // 7: Nudillo pulgar medio
        ];

        for &p in &palm_vertices {
            targets.push(p);
        }

        // Aristas de la palma
        let palm_edges = [
            (0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 0),
            (0, 4), (1, 3), (6, 7), (5, 7),
        ];
        for &(a, b) in &palm_edges {
            edges.push(Edge { idx_a: a as u16, idx_b: b as u16, is_frame: true });
        }

        // 5 Rayos de Dedos: [Pulgar, Indice, Medio, Anular, Menique]
        // Cada dedo tiene 3 falanges (proximal, medial, distal)
        let finger_bases = [
            (7, Vec3::new(-0.75, -0.05, 0.25), Vec3::new(-0.95, 0.20, 0.30)), // Pulgar
            (5, Vec3::new(-0.35,  0.40, 0.04), Vec3::new(-0.40, 0.95, 0.02)), // Indice
            (4, Vec3::new( 0.00,  0.50, 0.05), Vec3::new( 0.00, 1.15, 0.02)), // Medio
            (3, Vec3::new( 0.32,  0.42, 0.04), Vec3::new( 0.36, 1.00, 0.02)), // Anular
            (2, Vec3::new( 0.60,  0.30, 0.02), Vec3::new( 0.68, 0.75, 0.00)), // Menique
        ];

        for (base_idx, mid_pos, tip_pos) in finger_bases {
            let start_idx = targets.len() as u16;
            targets.push(mid_pos);
            targets.push(tip_pos);

            edges.push(Edge { idx_a: base_idx as u16, idx_b: start_idx, is_frame: false });
            edges.push(Edge { idx_a: start_idx, idx_b: start_idx + 1, is_frame: false });
        }

        // Rellenar las particulas restantes a lo largo de las fibras de los dedos y palma
        let base_len = targets.len();
        let remaining = count.saturating_sub(base_len);
        let mut seed = 98765_f32;

        for _ in 0..remaining {
            seed = (seed * 1103515245.0 + 12345.0) % 2147483648.0;
            let edge_choice = (seed as usize) % edges.len();
            seed = (seed * 1103515245.0 + 12345.0) % 2147483648.0;
            let t = (seed / 2147483648.0);

            let e = &edges[edge_choice];
            let p1 = targets[e.idx_a as usize];
            let p2 = targets[e.idx_b as usize];

            let jitter_x = ((seed % 100.0) / 100.0 - 0.5) * 0.06;
            let p = Vec3::new(
                p1.x + (p2.x - p1.x) * t + jitter_x,
                p1.y + (p2.y - p1.y) * t,
                p1.z + (p2.z - p1.z) * t,
            );
            targets.push(p);
        }

        (targets, edges)
    }

    // 2. CABEZA HUMANA, CRANEO Y RED NEURAL
    // Perfil facial (nariz, ojos, mandibula) + Boveda craneal + Red encefalica
    pub fn generate_head(count: usize) -> (Vec<Vec3>, Vec<Edge>) {
        let mut targets = Vec::with_capacity(count);
        let mut edges = Vec::new();

        // Anillos craneales horizontales (Frames transversales de resonancia magnetica)
        let slices = 8;
        let points_per_slice = 16;

        for s in 0..slices {
            let y = -0.9 + (s as f32 / (slices - 1) as f32) * 1.9;
            // Modulacion del radio segun la anatomia de cuello a craneo
            let norm_y = (y + 0.9) / 1.9;
            let r_base = (1.0 - (norm_y - 0.65).powi(2) * 2.5).max(0.2).sqrt() * 0.95;

            let slice_start = targets.len() as u16;
            for p in 0..points_per_slice {
                let theta = (p as f32 / points_per_slice as f32) * TAU;
                let mut rx = r_base;
                let mut rz = r_base * 1.15; // Cabeza alargada anteroposteriormente

                // Perturbacion facial frontal (Nariz y Pomulos)
                if theta.cos() > 0.3 {
                    // Zona frontal de la cara
                    if norm_y > 0.35 && norm_y < 0.6 {
                        // Nariz
                        if (theta.sin()).abs() < 0.25 {
                            rz += 0.35 * (1.0 - (theta.sin()).abs() / 0.25);
                        }
                    } else if norm_y < 0.35 {
                        // Mandibula y menton
                        rx *= 0.75;
                        rz *= 0.85;
                    }
                }

                let x = rx * theta.sin();
                let z = rz * theta.cos();
                targets.push(Vec3::new(x, y, z));
            }

            // Aristas del frame horizontal
            for p in 0..points_per_slice {
                let next = if p + 1 < points_per_slice { slice_start + p as u16 + 1 } else { slice_start };
                edges.push(Edge { idx_a: slice_start + p as u16, idx_b: next, is_frame: true });
            }
        }

        // Aristas verticales de union (Meridianos faciales)
        for p in (0..points_per_slice).step_by(2) {
            for s in 0..(slices - 1) {
                let a = (s * points_per_slice + p) as u16;
                let b = ((s + 1) * points_per_slice + p) as u16;
                edges.push(Edge { idx_a: a, idx_b: b, is_frame: false });
            }
        }

        // Rellenar el nucleo encefalico interior con particulas de red neural
        let head_base_len = targets.len();
        let remaining = count.saturating_sub(head_base_len);
        let mut seed = 334455_f32;

        for _ in 0..remaining {
            seed = (seed * 1103515245.0 + 12345.0) % 2147483648.0;
            let u = (seed / 2147483648.0) * TAU;
            seed = (seed * 1103515245.0 + 12345.0) % 2147483648.0;
            let v = (seed / 2147483648.0) * PI;
            seed = (seed * 1103515245.0 + 12345.0) % 2147483648.0;
            let rad = (seed / 2147483648.0).powf(0.6) * 0.65; // Concentradas en el interior

            let x = rad * v.sin() * u.cos() * 0.8;
            let y = rad * v.cos() * 0.7 + 0.25; // Centro del encefalo
            let z = rad * v.sin() * u.sin() * 0.9 - 0.1;

            targets.push(Vec3::new(x, y, z));
        }

        (targets, edges)
    }

    // 3. CORAZON HUMANO CON CAYADO AORTICO
    // Cardioide 3D volumetrico con camaras y vasos sanguineos
    pub fn generate_heart(count: usize) -> (Vec<Vec3>, Vec<Edge>) {
        let mut targets = Vec::with_capacity(count);
        let mut edges = Vec::new();

        // Secciones transversales en cortes ventriculares
        let rings = 9;
        let points_per_ring = 16;

        for r in 0..rings {
            let t = r as f32 / (rings - 1) as f32;
            let y = 0.8 - t * 1.8; // De base a vertice inferior (apice)
            let ring_start = targets.len() as u16;

            for p in 0..points_per_ring {
                let u = (p as f32 / points_per_ring as f32) * TAU;
                // Ecuacion parametrica de corte de corazon
                let scale = (1.0 - t * 0.8).sqrt();
                let x = 1.1 * scale * u.sin().powi(3);
                let z = 0.9 * scale * (u.cos() - u.cos().powi(2) * 0.35);

                targets.push(Vec3::new(x, y, z));
            }

            // Aristas del anillo ventricular
            for p in 0..points_per_ring {
                let next = if p + 1 < points_per_ring { ring_start + p as u16 + 1 } else { ring_start };
                edges.push(Edge { idx_a: ring_start + p as u16, idx_b: next, is_frame: true });
            }
        }

        // Cayado Aortico (Tubo semicircular superior)
        let aorta_start = targets.len() as u16;
        let aorta_segs = 8;
        for i in 0..=aorta_segs {
            let theta = (i as f32 / aorta_segs as f32) * PI;
            let ax = 0.2 + 0.35 * theta.cos();
            let ay = 0.85 + 0.45 * theta.sin();
            let az = -0.15;
            targets.push(Vec3::new(ax, ay, az));

            if i > 0 {
                edges.push(Edge {
                    idx_a: aorta_start + (i as u16) - 1,
                    idx_b: aorta_start + (i as u16),
                    is_frame: false,
                });
            }
        }

        // Aristas coronarias longitudinales que recorren el miocardio
        for p in (0..points_per_ring).step_by(3) {
            for r in 0..(rings - 1) {
                let a = (r * points_per_ring + p) as u16;
                let b = ((r + 1) * points_per_ring + p) as u16;
                edges.push(Edge { idx_a: a, idx_b: b, is_frame: false });
            }
        }

        // Rellenar con particulas miocardicas y flujo sanguineo
        let heart_base_len = targets.len();
        let remaining = count.saturating_sub(heart_base_len);
        let mut seed = 778899_f32;

        for _ in 0..remaining {
            seed = (seed * 1103515245.0 + 12345.0) % 2147483648.0;
            let u = (seed / 2147483648.0) * TAU;
            seed = (seed * 1103515245.0 + 12345.0) % 2147483648.0;
            let t = (seed / 2147483648.0);
            seed = (seed * 1103515245.0 + 12345.0) % 2147483648.0;
            let rad_mod = 0.75 + (seed / 2147483648.0) * 0.35;

            let scale = (1.0 - t * 0.82).sqrt() * rad_mod;
            let x = 1.15 * scale * u.sin().powi(3);
            let y = 0.85 - t * 1.85;
            let z = 0.95 * scale * (u.cos() - u.cos().powi(2) * 0.35);

            targets.push(Vec3::new(x, y, z));
        }

        (targets, edges)
    }

    // Calcula el punto objetivo interpolado entre Mano -> Cabeza -> Corazon
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

    // Corazon con latido ritmico asistido por ecuacion de onda QRS
    pub fn get_pulsing_heart(&self, idx: usize, time: f32) -> Vec3 {
        let base = self.heart_targets[idx % self.heart_targets.len()];
        let omega = 7.54; // ~72 BPM
        let pulse = 1.0 + 0.14 * (time * omega).sin().powi(4) - 0.05 * (time * omega + 0.35).sin().powi(2);
        Vec3::new(base.x * pulse, base.y * (1.1 - pulse * 0.1), base.z * pulse)
    }
}
