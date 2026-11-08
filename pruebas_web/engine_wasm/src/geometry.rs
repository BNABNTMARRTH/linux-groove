// ==========================================================================
// LINUX GROOVE - MOTOR 3D EN RUST (WASM)
// geometry.rs: Generadores Analiticos de Esfera, Cubo y Dona (Torus)
// Wireframes (lineas), Frames (cortes volumetricos) y Nubes de Vertices
// ==========================================================================

use crate::math3d::Vec3;
use std::f32::consts::PI;

pub const TAU: f32 = 2.0 * PI;

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum GeometryType {
    Sphere = 0,
    Cube = 1,
    Torus = 2,
}

#[derive(Clone, Copy, Debug)]
pub struct Edge {
    pub idx_a: u16,
    pub idx_b: u16,
    pub is_frame: bool, // true si es una rebanada estructural
}

pub struct GeometryModel {
    pub sphere_targets: Vec<Vec3>,
    pub cube_targets: Vec<Vec3>,
    pub torus_targets: Vec<Vec3>,
    pub edges_sphere: Vec<Edge>,
    pub edges_cube: Vec<Edge>,
    pub edges_torus: Vec<Edge>,
}

impl GeometryModel {
    pub fn new(count: usize) -> Self {
        let sphere_targets = Self::generate_sphere_targets(count, 1.4);
        let cube_targets = Self::generate_cube_targets(count, 1.25);
        let torus_targets = Self::generate_torus_targets(count, 1.3, 0.55);

        let edges_sphere = Self::generate_sphere_edges();
        let edges_cube = Self::generate_cube_edges();
        let edges_torus = Self::generate_torus_edges();

        Self {
            sphere_targets,
            cube_targets,
            torus_targets,
            edges_sphere,
            edges_cube,
            edges_torus,
        }
    }

    // 1. ESFERA UV & FIBONACCI
    pub fn generate_sphere_targets(count: usize, radius: f32) -> Vec<Vec3> {
        let mut targets = Vec::with_capacity(count);
        let phi = (1.0 + 5.0_f32.sqrt()) * 0.5; // Proporcion aurea
        let golden_angle = TAU * (1.0 - 1.0 / phi);

        for i in 0..count {
            // Muestreo esferico de Fibonacci para distribucion uniforme
            let y = 1.0 - (i as f32 / (count - 1) as f32) * 2.0;
            let radius_at_y = (1.0 - y * y).max(0.0).sqrt();
            let theta = golden_angle * i as f32;

            let x = theta.cos() * radius_at_y * radius;
            let y_pos = y * radius;
            let z = theta.sin() * radius_at_y * radius;

            targets.push(Vec3::new(x, y_pos, z));
        }
        targets
    }

    // 2. CUBO HIPERBOLICO & FRAMES CONCENTRICOS
    pub fn generate_cube_targets(count: usize, half_size: f32) -> Vec<Vec3> {
        let mut targets = Vec::with_capacity(count);
        let s = half_size;

        // Distribucion sobre las aristas y caras del cubo
        let segments_per_edge = (count / 12).max(1);
        let mut idx = 0;

        // 12 aristas primarias
        let corners = [
            Vec3::new(-s, -s, -s), Vec3::new( s, -s, -s),
            Vec3::new( s,  s, -s), Vec3::new(-s,  s, -s),
            Vec3::new(-s, -s,  s), Vec3::new( s, -s,  s),
            Vec3::new( s,  s,  s), Vec3::new(-s,  s,  s),
        ];

        let edge_pairs = [
            (0, 1), (1, 2), (2, 3), (3, 0), // Base trasera
            (4, 5), (5, 6), (6, 7), (7, 4), // Base frontal
            (0, 4), (1, 5), (2, 6), (3, 7), // Aristas de union
        ];

        for &(a, b) in &edge_pairs {
            let start = corners[a];
            let end = corners[b];
            for step in 0..segments_per_edge {
                if idx >= count { break; }
                let t = step as f32 / segments_per_edge as f32;
                targets.push(Vec3::lerp(start, end, t));
                idx += 1;
            }
        }

        // Vertices interiores (Frames concentricos interiores a 70% y 40% de escala)
        let inner_scales = [0.72, 0.45];
        for &scale in &inner_scales {
            let si = s * scale;
            let inner_corners = [
                Vec3::new(-si, -si, -si), Vec3::new( si, -si, -si),
                Vec3::new( si,  si, -si), Vec3::new(-si,  si, -si),
                Vec3::new(-si, -si,  si), Vec3::new( si, -si,  si),
                Vec3::new( si,  si,  si), Vec3::new(-si,  si,  si),
            ];
            for &(a, b) in &edge_pairs {
                let start = inner_corners[a];
                let end = inner_corners[b];
                for step in 0..(segments_per_edge / 2).max(1) {
                    if idx >= count { break; }
                    let t = step as f32 / (segments_per_edge / 2) as f32;
                    targets.push(Vec3::lerp(start, end, t));
                    idx += 1;
                }
            }
        }

        // Rellenar restantes con puntos sobre las 6 caras del cubo
        let mut face_seed = 0.123_f32;
        while targets.len() < count {
            face_seed = (face_seed * 1103515245.0 + 12345.0) % 2147483648.0;
            let u = (face_seed / 2147483648.0) * 2.0 - 1.0;
            face_seed = (face_seed * 1103515245.0 + 12345.0) % 2147483648.0;
            let v = (face_seed / 2147483648.0) * 2.0 - 1.0;
            let face = (targets.len() % 6) as u8;

            let p = match face {
                0 => Vec3::new( s, u * s, v * s),
                1 => Vec3::new(-s, u * s, v * s),
                2 => Vec3::new(u * s,  s, v * s),
                3 => Vec3::new(u * s, -s, v * s),
                4 => Vec3::new(u * s, v * s,  s),
                _ => Vec3::new(u * s, v * s, -s),
            };
            targets.push(p);
        }

        targets
    }

    // 3. DONA / TOROIDE PARAMETRICO (TORUS)
    pub fn generate_torus_targets(count: usize, r_major: f32, r_minor: f32) -> Vec<Vec3> {
        let mut targets = Vec::with_capacity(count);
        // Usamos una espiral toroidal continua (solenoide) para cubrir toda la superficie
        let loops_major = 32.0;
        let loops_minor = 128.0;

        for i in 0..count {
            let t = i as f32 / count as f32;
            let u = t * TAU * loops_major;
            let v = t * TAU * loops_minor;

            let r_curr = r_major + r_minor * v.cos();
            let x = r_curr * u.cos();
            let y = r_minor * v.sin();
            let z = r_curr * u.sin();

            targets.push(Vec3::new(x, y, z));
        }
        targets
    }

    // Generadores de aristas vectoriales para el render de wireframes
    fn generate_sphere_edges() -> Vec<Edge> {
        let mut edges = Vec::new();
        // 5 anillos paralelos (latitud)
        let rings = 5;
        let segs = 16;
        let mut idx: u16 = 0;
        for _ in 0..rings {
            let start = idx;
            for s in 0..segs {
                let next = if s + 1 < segs { idx + 1 } else { start };
                edges.push(Edge { idx_a: idx, idx_b: next, is_frame: true });
                idx += 1;
            }
        }
        // 4 meridianos
        for _ in 0..4 {
            let start = idx;
            for s in 0..segs {
                let next = if s + 1 < segs { idx + 1 } else { start };
                edges.push(Edge { idx_a: idx, idx_b: next, is_frame: false });
                idx += 1;
            }
        }
        edges
    }

    fn generate_cube_edges() -> Vec<Edge> {
        let mut edges = Vec::new();
        // Cubo exterior
        let pairs = [
            (0, 1), (1, 2), (2, 3), (3, 0),
            (4, 5), (5, 6), (6, 7), (7, 4),
            (0, 4), (1, 5), (2, 6), (3, 7),
        ];
        for &(a, b) in &pairs {
            edges.push(Edge { idx_a: a, idx_b: b, is_frame: false });
        }
        // Sub-frames interiores
        let inner_offset = 8;
        for &(a, b) in &pairs {
            edges.push(Edge {
                idx_a: a + inner_offset,
                idx_b: b + inner_offset,
                is_frame: true,
            });
        }
        // Lineas radiales conectando exterior con interior
        for i in 0..8 {
            edges.push(Edge {
                idx_a: i,
                idx_b: i + inner_offset,
                is_frame: true,
            });
        }
        edges
    }

    fn generate_torus_edges() -> Vec<Edge> {
        let mut edges = Vec::new();
        // 8 anillos poloidales (cortes del tubo)
        let rings = 8;
        let segs = 16;
        let mut idx: u16 = 0;
        for _ in 0..rings {
            let start = idx;
            for s in 0..segs {
                let next = if s + 1 < segs { idx + 1 } else { start };
                edges.push(Edge { idx_a: idx, idx_b: next, is_frame: true });
                idx += 1;
            }
        }
        // 3 anillos toroidales (longitudinales)
        for _ in 0..3 {
            let start = idx;
            for s in 0..segs {
                let next = if s + 1 < segs { idx + 1 } else { start };
                edges.push(Edge { idx_a: idx, idx_b: next, is_frame: false });
                idx += 1;
            }
        }
        edges
    }

    // Calcula la posicion objetivo interpolada segun morph_t en [0.0, 3.0)
    // 0.0 -> Esfera
    // 1.0 -> Cubo
    // 2.0 -> Dona (Torus)
    // 3.0 -> Ciclo a Esfera
    pub fn get_morph_target(&self, idx: usize, morph_t: f32) -> Vec3 {
        let t = morph_t.rem_euclid(3.0);
        if t < 1.0 {
            // Esfera -> Cubo
            let p_a = self.sphere_targets[idx % self.sphere_targets.len()];
            let p_b = self.cube_targets[idx % self.cube_targets.len()];
            Vec3::lerp(p_a, p_b, t)
        } else if t < 2.0 {
            // Cubo -> Dona
            let local_t = t - 1.0;
            let p_a = self.cube_targets[idx % self.cube_targets.len()];
            let p_b = self.torus_targets[idx % self.torus_targets.len()];
            Vec3::lerp(p_a, p_b, local_t)
        } else {
            // Dona -> Esfera
            let local_t = t - 2.0;
            let p_a = self.torus_targets[idx % self.torus_targets.len()];
            let p_b = self.sphere_targets[idx % self.sphere_targets.len()];
            Vec3::lerp(p_a, p_b, local_t)
        }
    }
}
