// ==========================================================================
// LINUX GROOVE - MOTOR 3D EN RUST (WASM)
// geometry_anatomy.rs: Paredes Volumetricas Densas de Particulas (8,192 Pts)
// Malla 100% Transparente (Invisible) | Claroscuro Real con Normales de Pared
// Modelos: Mano Articulada (30 Huesos), Craneo Tomografico y Corazon Miocardico
// ==========================================================================

use crate::math3d::Vec3;
use crate::geometry::Edge;
use std::f32::consts::PI;

pub const TAU: f32 = 2.0 * PI;

static BAKED_ANATOMY: &[u8] = include_bytes!("../assets/anatomy_models_baked.bin");

pub struct AnatomyModel {
    pub hand_poses_pts: [Vec<Vec3>; 4],
    pub hand_poses_nrm: [Vec<Vec3>; 4],
    pub heart_targets: Vec<Vec3>,
    pub heart_normals: Vec<Vec3>,
    pub heart_deltas: Vec<Vec3>,
    pub head_targets: Vec<Vec3>,
    pub head_normals: Vec<Vec3>,
    pub head_deltas: Vec<Vec3>,
    pub hand_edges: Vec<Edge>,
    pub head_edges: Vec<Edge>,
    pub heart_edges: Vec<Edge>,
}

impl AnatomyModel {
    pub fn new(count: usize) -> Self {
        let target_count = count.min(8192);

        // Header: 16 bytes ("GROOVE3D" 8B + version 4B + count 4B)
        let offset_hand = 16;
        let pts_bytes = 8192 * 12; // 98,304 bytes por array de vec3
        let pose_bytes = pts_bytes * 2; // 196,608 bytes por pose (pts + nrm)

        let mut hand_poses_pts: [Vec<Vec3>; 4] = [
            Vec::with_capacity(target_count),
            Vec::with_capacity(target_count),
            Vec::with_capacity(target_count),
            Vec::with_capacity(target_count),
        ];
        let mut hand_poses_nrm: [Vec<Vec3>; 4] = [
            Vec::with_capacity(target_count),
            Vec::with_capacity(target_count),
            Vec::with_capacity(target_count),
            Vec::with_capacity(target_count),
        ];

        for p_idx in 0..4 {
            let start_pts = offset_hand + p_idx * pose_bytes;
            let start_nrm = start_pts + pts_bytes;
            hand_poses_pts[p_idx] = Self::read_vec3_slice(&BAKED_ANATOMY[start_pts..start_pts + pts_bytes], target_count);
            hand_poses_nrm[p_idx] = Self::read_vec3_slice(&BAKED_ANATOMY[start_nrm..start_nrm + pts_bytes], target_count);
        }

        // Corazon: Base Pts + Base Nrm + Deltas Pts
        let offset_heart = offset_hand + 4 * pose_bytes;
        let heart_targets = Self::read_vec3_slice(&BAKED_ANATOMY[offset_heart..offset_heart + pts_bytes], target_count);
        let heart_normals = Self::read_vec3_slice(&BAKED_ANATOMY[offset_heart + pts_bytes..offset_heart + 2 * pts_bytes], target_count);
        let heart_deltas = Self::read_vec3_slice(&BAKED_ANATOMY[offset_heart + 2 * pts_bytes..offset_heart + 3 * pts_bytes], target_count);

        // Craneo: Base Pts + Base Nrm + Deltas Pts
        let offset_skull = offset_heart + 3 * pts_bytes;
        let head_targets = Self::read_vec3_slice(&BAKED_ANATOMY[offset_skull..offset_skull + pts_bytes], target_count);
        let head_normals = Self::read_vec3_slice(&BAKED_ANATOMY[offset_skull + pts_bytes..offset_skull + 2 * pts_bytes], target_count);
        let head_deltas = Self::read_vec3_slice(&BAKED_ANATOMY[offset_skull + 2 * pts_bytes..offset_skull + 3 * pts_bytes], target_count);

        Self {
            hand_poses_pts,
            hand_poses_nrm,
            heart_targets,
            heart_normals,
            heart_deltas,
            head_targets,
            head_normals,
            head_deltas,
            // Malla 100% transparente en modo anatomia: CERO lineas wireframe visibles
            hand_edges: Vec::new(),
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

    // Mano articulada: interpola posicion y vector normal de la pared para claroscuro
    pub fn get_animated_hand_target(&self, idx: usize, time: f32) -> (Vec3, Vec3) {
        let cycle = 4.62;
        let t = (time.rem_euclid(cycle)) / cycle;
        let scaled_t = t * 4.0;
        let pose_a = (scaled_t as usize) % 4;
        let pose_b = (pose_a + 1) % 4;
        let alpha = scaled_t - (scaled_t as usize as f32);
        let smooth_alpha = (1.0 - (alpha * PI).cos()) * 0.5;

        let pa = self.hand_poses_pts[pose_a][idx % self.hand_poses_pts[pose_a].len()];
        let pb = self.hand_poses_pts[pose_b][idx % self.hand_poses_pts[pose_b].len()];
        let pos = Vec3::lerp(pa, pb, smooth_alpha);

        let na = self.hand_poses_nrm[pose_a][idx % self.hand_poses_nrm[pose_a].len()];
        let nb = self.hand_poses_nrm[pose_b][idx % self.hand_poses_nrm[pose_b].len()];
        let norm = Vec3::lerp(na, nb, smooth_alpha).normalize();

        (pos, norm)
    }

    // Corazon en latido: posicion expandida con normal de pared
    pub fn get_pulsing_heart_target(&self, idx: usize, time: f32) -> (Vec3, Vec3) {
        let base = self.heart_targets[idx % self.heart_targets.len()];
        let delta = self.heart_deltas[idx % self.heart_deltas.len()];
        let norm = self.heart_normals[idx % self.heart_normals.len()];

        let omega = 7.54;
        let phase = (time * omega).rem_euclid(TAU);

        let morph_factor = if phase < 1.35 {
            (phase / 1.35 * PI).sin().powi(2) * 1.35
        } else {
            let rel = (phase - 1.35) / (TAU - 1.35);
            (1.0 - rel.min(1.0)).powi(3) * 0.15
        };

        let pos = Vec3::new(
            base.x + delta.x * morph_factor,
            base.y + delta.y * morph_factor,
            base.z + delta.z * morph_factor,
        );

        (pos, norm)
    }

    // Craneo en despiece: posicion desplazada con normal osea
    pub fn get_skull_target(&self, idx: usize, deconstruct_t: f32) -> (Vec3, Vec3) {
        let base = self.head_targets[idx % self.head_targets.len()];
        let delta = self.head_deltas[idx % self.head_deltas.len()];
        let norm = self.head_normals[idx % self.head_normals.len()];

        let pos = Vec3::new(
            base.x + delta.x * deconstruct_t * 1.6,
            base.y + delta.y * deconstruct_t * 1.6,
            base.z + delta.z * deconstruct_t * 1.6,
        );

        (pos, norm)
    }

    // Morphing continuo entre modelos para la experiencia scroll-driven
    pub fn get_morph_target(&self, idx: usize, morph_t: f32, time: f32) -> (Vec3, Vec3) {
        let t = morph_t.clamp(0.0, 2.0);
        if t < 1.0 {
            let (pa, na) = self.get_animated_hand_target(idx, time);
            let pb = self.head_targets[idx % self.head_targets.len()];
            let nb = self.head_normals[idx % self.head_normals.len()];
            (Vec3::lerp(pa, pb, t), Vec3::lerp(na, nb, t).normalize())
        } else {
            let local_t = (t - 1.0).clamp(0.0, 1.0);
            let pa = self.head_targets[idx % self.head_targets.len()];
            let na = self.head_normals[idx % self.head_normals.len()];
            let (pb, nb) = self.get_pulsing_heart_target(idx, time);
            (Vec3::lerp(pa, pb, local_t), Vec3::lerp(na, nb, local_t).normalize())
        }
    }
}
