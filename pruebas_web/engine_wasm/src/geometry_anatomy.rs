// ==========================================================================
// LINUX GROOVE - MOTOR 3D EN RUST (WASM)
// geometry_anatomy.rs: Anatomia 100% Particulas Volumetricas y Malla 3D
// Modelos: Mano Humana Articulada con Malla Estructural de 3,652 Aristas
// Mapeados directamente desde hand_animation.glb, craneo.glb y anim_heart.glb
// ==========================================================================

use crate::math3d::Vec3;
use crate::geometry::Edge;
use std::f32::consts::PI;

pub const TAU: f32 = 2.0 * PI;

static BAKED_ANATOMY: &[u8] = include_bytes!("../assets/anatomy_models_baked.bin");

pub struct AnatomyModel {
    pub hand_targets: Vec<Vec3>,
    pub head_targets: Vec<Vec3>,
    pub heart_targets: Vec<Vec3>,
    pub hand_poses: [Vec<Vec3>; 4],
    pub heart_deltas: Vec<Vec3>,
    pub head_deltas: Vec<Vec3>,
    pub hand_edges: Vec<Edge>,
    pub head_edges: Vec<Edge>,
    pub heart_edges: Vec<Edge>,
}

impl AnatomyModel {
    pub fn new(count: usize) -> Self {
        let target_count = count.min(4096);

        // Header: 20 bytes ("GROOVE3D" 8B + version 4B + count 4B + num_edges 4B)
        let num_hand_edges = if BAKED_ANATOMY.len() >= 20 {
            u32::from_le_bytes([BAKED_ANATOMY[16], BAKED_ANATOMY[17], BAKED_ANATOMY[18], BAKED_ANATOMY[19]]) as usize
        } else {
            0
        };

        let offset_hand = 20;
        let pose_bytes = 4096 * 12; // 49,152 bytes por pose

        let mut hand_poses: [Vec<Vec3>; 4] = [
            Vec::with_capacity(target_count),
            Vec::with_capacity(target_count),
            Vec::with_capacity(target_count),
            Vec::with_capacity(target_count),
        ];

        for p_idx in 0..4 {
            let start = offset_hand + p_idx * pose_bytes;
            let end = start + pose_bytes;
            hand_poses[p_idx] = Self::read_vec3_slice(&BAKED_ANATOMY[start..end], target_count);
        }

        // Cargar aristas estructurales de la mano (malla poligonal original)
        let offset_edges = offset_hand + 4 * pose_bytes;
        let edges_bytes = num_hand_edges * 4;
        let mut hand_edges = Vec::with_capacity(num_hand_edges);

        if BAKED_ANATOMY.len() >= offset_edges + edges_bytes {
            for chunk in BAKED_ANATOMY[offset_edges..offset_edges + edges_bytes].chunks_exact(4) {
                let u = u16::from_le_bytes([chunk[0], chunk[1]]);
                let v = u16::from_le_bytes([chunk[2], chunk[3]]);
                hand_edges.push(Edge {
                    idx_a: u,
                    idx_b: v,
                    is_frame: false,
                });
            }
        }

        // Corazon
        let offset_heart = offset_edges + edges_bytes;
        let heart_targets = Self::read_vec3_slice(&BAKED_ANATOMY[offset_heart..offset_heart + pose_bytes], target_count);
        let heart_deltas = Self::read_vec3_slice(&BAKED_ANATOMY[offset_heart + pose_bytes..offset_heart + 2 * pose_bytes], target_count);

        // Craneo
        let offset_skull = offset_heart + 2 * pose_bytes;
        let head_targets = Self::read_vec3_slice(&BAKED_ANATOMY[offset_skull..offset_skull + pose_bytes], target_count);
        let head_deltas = Self::read_vec3_slice(&BAKED_ANATOMY[offset_skull + pose_bytes..offset_skull + 2 * pose_bytes], target_count);

        let hand_targets = hand_poses[0].clone();

        Self {
            hand_targets,
            head_targets,
            heart_targets,
            hand_poses,
            heart_deltas,
            head_deltas,
            hand_edges,
            head_edges: Vec::new(),
            heart_edges: Vec::new(),
        }
    }

    #[inline(always)]
    fn read_vec3_slice(slice: &[u8], count: usize) -> Vec<Vec3> {
        let mut pts = Vec::with_capacity(count);
        for chunk in slice.chunks_exact(12).take(count) {
            let x = f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]);
            let y = f32::from_le_bytes([chunk[4], chunk[5], chunk[6], chunk[7]]);
            let z = f32::from_le_bytes([chunk[8], chunk[9], chunk[10], chunk[11]]);
            pts.push(Vec3::new(x, y, z));
        }
        pts
    }

    // Mano articulada viva: interpola suavemente entre las 4 poses cinematicas
    // correspondientes al ciclo completo de hand_animation.glb
    pub fn get_animated_hand(&self, idx: usize, time: f32) -> Vec3 {
        let cycle = 4.62; // Duracion del clip Anim01
        let t = (time.rem_euclid(cycle)) / cycle;
        let scaled_t = t * 4.0;
        let pose_a = (scaled_t as usize) % 4;
        let pose_b = (pose_a + 1) % 4;
        let alpha = scaled_t - (scaled_t as usize as f32);

        // Interpolacion cosenoidal suave
        let smooth_alpha = (1.0 - (alpha * PI).cos()) * 0.5;

        let pa = self.hand_poses[pose_a][idx % self.hand_poses[pose_a].len()];
        let pb = self.hand_poses[pose_b][idx % self.hand_poses[pose_b].len()];
        Vec3::lerp(pa, pb, smooth_alpha)
    }

    // Corazon en latido ritmico asistido por los Morph Targets de anim_heart.glb
    pub fn get_pulsing_heart(&self, idx: usize, time: f32) -> Vec3 {
        let base = self.heart_targets[idx % self.heart_targets.len()];
        let delta = self.heart_deltas[idx % self.heart_deltas.len()];

        let omega = 7.54;
        let phase = (time * omega).rem_euclid(TAU);

        let morph_factor = if phase < 1.35 {
            (phase / 1.35 * PI).sin().powi(2) * 1.35
        } else {
            let rel = (phase - 1.35) / (TAU - 1.35);
            (1.0 - rel.min(1.0)).powi(3) * 0.15
        };

        Vec3::new(
            base.x + delta.x * morph_factor,
            base.y + delta.y * morph_factor,
            base.z + delta.z * morph_factor,
        )
    }

    // Craneo en despiece asistido por los 25 huesos de craneo.glb
    pub fn get_skull_deconstructed(&self, idx: usize, deconstruct_t: f32) -> Vec3 {
        let base = self.head_targets[idx % self.head_targets.len()];
        let delta = self.head_deltas[idx % self.head_deltas.len()];
        Vec3::new(
            base.x + delta.x * deconstruct_t * 1.6,
            base.y + delta.y * deconstruct_t * 1.6,
            base.z + delta.z * deconstruct_t * 1.6,
        )
    }

    // Morphing continuo entre modelos para experiencias scroll-driven
    pub fn get_morph_target(&self, idx: usize, morph_t: f32, time: f32) -> Vec3 {
        let t = morph_t.rem_euclid(3.0);
        if t < 1.0 {
            let p_a = self.get_animated_hand(idx, time);
            let p_b = self.head_targets[idx % self.head_targets.len()];
            Vec3::lerp(p_a, p_b, t)
        } else if t < 2.0 {
            let local_t = t - 1.0;
            let p_a = self.head_targets[idx % self.head_targets.len()];
            let p_b = self.get_pulsing_heart(idx, time);
            Vec3::lerp(p_a, p_b, local_t)
        } else {
            let local_t = t - 2.0;
            let p_a = self.get_pulsing_heart(idx, time);
            let p_b = self.get_animated_hand(idx, time);
            Vec3::lerp(p_a, p_b, local_t)
        }
    }
}
