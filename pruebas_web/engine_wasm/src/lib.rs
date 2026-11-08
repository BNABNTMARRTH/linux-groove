// ==========================================================================
// LINUX GROOVE - MOTOR 3D EN RUST (WASM)
// lib.rs: API Publica C-ABI para WebAssembly y Memoria Compartida Directa
// Soporte Completo para Geometrias Primarias y Modelos Anatomicos 3D
// Cero dependencias externas | Optimizacion a nivel de registros
// ==========================================================================

pub mod math3d;
pub mod geometry;
pub mod geometry_anatomy;
pub mod particles;

use math3d::{Camera, Vec3};
use geometry::GeometryModel;
use geometry_anatomy::AnatomyModel;
use particles::ParticleSystem;

pub const MAX_PARTICLES: usize = 6144;
pub const MAX_LINES: usize = 1024;

#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct ProjectedPoint {
    pub x: f32,
    pub y: f32,
    pub depth: f32,
    pub size: f32,
    pub alpha: f32,
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub _pad: u8,
}

#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct ProjectedLine {
    pub x1: f32,
    pub y1: f32,
    pub x2: f32,
    pub y2: f32,
    pub depth: f32,
    pub alpha: f32,
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub is_frame: u8,
}

struct EngineState {
    camera: Camera,
    geometry: GeometryModel,
    anatomy: AnatomyModel,
    particles: ParticleSystem,
    morph_t: f32,
    selected_geom: u32,
    selected_anatomy: u32,
    is_anatomy_mode: bool,
    time: f32,
    active_points: usize,
    active_lines: usize,
    smooth_mouse_x: f32,
    smooth_mouse_y: f32,
}

static mut ENGINE: Option<EngineState> = None;

static mut BUFFER_POINTS: [ProjectedPoint; MAX_PARTICLES] = [ProjectedPoint {
    x: 0.0, y: 0.0, depth: 0.0, size: 0.0, alpha: 0.0, r: 0, g: 0, b: 0, _pad: 0
}; MAX_PARTICLES];

static mut BUFFER_LINES: [ProjectedLine; MAX_LINES] = [ProjectedLine {
    x1: 0.0, y1: 0.0, x2: 0.0, y2: 0.0, depth: 0.0, alpha: 0.0, r: 0, g: 0, b: 0, is_frame: 0
}; MAX_LINES];

#[no_mangle]
pub extern "C" fn init_engine(count: usize) {
    let clamped_count = count.min(MAX_PARTICLES).max(256);
    let state = EngineState {
        camera: Camera::default(),
        geometry: GeometryModel::new(clamped_count),
        anatomy: AnatomyModel::new(clamped_count),
        particles: ParticleSystem::new(clamped_count),
        morph_t: 0.0,
        selected_geom: 2, // Por defecto: Dona (Torus)
        selected_anatomy: 2, // Por defecto anatomia: Corazon
        is_anatomy_mode: false,
        time: 0.0,
        active_points: clamped_count,
        active_lines: 0,
        smooth_mouse_x: 0.0,
        smooth_mouse_y: 0.0,
    };
    unsafe {
        ENGINE = Some(state);
    }
}

#[no_mangle]
pub extern "C" fn set_anatomy_mode(active: u32) {
    unsafe {
        if let Some(engine) = &mut ENGINE {
            engine.is_anatomy_mode = active != 0;
        }
    }
}

#[no_mangle]
pub extern "C" fn set_anatomy_geometry(geom_id: u32) {
    unsafe {
        if let Some(engine) = &mut ENGINE {
            engine.selected_anatomy = geom_id.min(2);
        }
    }
}

#[no_mangle]
pub extern "C" fn set_geometry(geom_id: u32) {
    unsafe {
        if let Some(engine) = &mut ENGINE {
            engine.selected_geom = geom_id.min(2);
        }
    }
}

#[no_mangle]
pub extern "C" fn set_morph(val: f32) {
    unsafe {
        if let Some(engine) = &mut ENGINE {
            engine.morph_t = val;
        }
    }
}

// Bucle de actualizacion llamado por requestAnimationFrame a 60 FPS
#[no_mangle]
pub extern "C" fn update_scene(
    width: f32,
    height: f32,
    scroll_prog: f32,
    mouse_norm_x: f32,
    mouse_norm_y: f32,
    deconstruct: f32,
    dt: f32,
) {
    unsafe {
        let engine = match &mut ENGINE {
            Some(e) => e,
            None => return,
        };

        engine.time += dt;

        // Amortiguacion inercial del mouse (lerp a 60 FPS)
        engine.smooth_mouse_x += (mouse_norm_x - engine.smooth_mouse_x) * 0.12;
        engine.smooth_mouse_y += (mouse_norm_y - engine.smooth_mouse_y) * 0.12;

        // Control de orientacion de camara
        let base_rot_y = scroll_prog * std::f32::consts::TAU + engine.time * 0.22;
        let base_rot_x = 0.22 + (scroll_prog * std::f32::consts::PI * 0.5).sin() * 0.18;

        // Giroscopo 3D inercial con mouse (Tilt)
        let tilt_x = engine.smooth_mouse_y * 0.85;
        let tilt_y = engine.smooth_mouse_x * 1.25;

        engine.camera.rot_x = base_rot_x + tilt_x;
        engine.camera.rot_y = base_rot_y + tilt_y;
        engine.camera.rot_z = (engine.time * 0.08).sin() * 0.04;

        // Posicion del cursor en el plano de mundo para el lente magnetico
        let mouse_world = Vec3::new(
            engine.smooth_mouse_x * 2.2,
            -engine.smooth_mouse_y * 1.8,
            0.0,
        );
        let mouse_active = mouse_norm_x.abs() > 0.01 || mouse_norm_y.abs() > 0.01;

        // Determinar coordenadas objetivo de los vertices
        let target_positions: Vec<Vec3> = if engine.is_anatomy_mode {
            // MODO ANATOMIA: Mano, Cabeza o Corazon
            if engine.morph_t > 0.001 {
                // Morphing continuo con el scroll
                (0..engine.active_points)
                    .map(|i| engine.anatomy.get_morph_target(i, engine.morph_t, engine.time))
                    .collect()
            } else {
                match engine.selected_anatomy {
                    0 => {
                        // MANO: flexiona dedos si el mouse se mueve verticalmente
                        let flex = (engine.smooth_mouse_y.abs() * 0.8).clamp(0.0, 1.0);
                        engine.anatomy.hand_targets.iter().map(|p| {
                            if p.y > 0.0 {
                                Vec3::new(p.x, p.y * (1.0 - flex * 0.25), p.z + flex * 0.35)
                            } else {
                                *p
                            }
                        }).collect()
                    },
                    1 => engine.anatomy.head_targets.clone(),
                    _ => {
                        // CORAZON: latido cardiaco ritmico continuo en tiempo real (72 BPM)
                        (0..engine.active_points)
                            .map(|i| engine.anatomy.get_pulsing_heart(i, engine.time))
                            .collect()
                    }
                }
            }
        } else {
            // MODO PRIMITIVAS: Esfera, Cubo o Dona
            if engine.morph_t > 0.001 {
                (0..engine.active_points)
                    .map(|i| engine.geometry.get_morph_target(i, engine.morph_t))
                    .collect()
            } else {
                match engine.selected_geom {
                    0 => engine.geometry.sphere_targets.clone(),
                    1 => engine.geometry.cube_targets.clone(),
                    _ => engine.geometry.torus_targets.clone(),
                }
            }
        };

        // Actualizar fisica de particulas con dispersion atomica y magnetismo
        engine.particles.update(
            &target_positions,
            engine.time,
            dt,
            deconstruct,
            &mouse_world,
            mouse_active,
        );

        // Paleta de color segun el modelo anatomico activo
        let (pt_color_r, pt_color_g, pt_color_b) = if engine.is_anatomy_mode {
            match engine.selected_anatomy {
                2 => (255, 34, 85),   // Corazon: carmesi y rubi
                1 => (0, 243, 255),   // Cabeza: cian neural
                _ => (0, 255, 170),   // Mano: esmeralda bio-digital
            }
        } else {
            (0, 243, 255)
        };

        // 1. Proyectar particulas 3D -> 2D
        let mut pt_idx = 0;
        for (i, p) in engine.particles.particles.iter().enumerate() {
            if pt_idx >= MAX_PARTICLES { break; }
            let (sx, sy, depth, scale, visible) = engine.camera.project(&p.pos, width, height);
            if visible {
                let alpha = (1.4 - depth * 0.18).clamp(0.15, 1.0);
                
                // Color modulado si es corazon con pulso
                let (r, g, b) = if engine.is_anatomy_mode && engine.selected_anatomy == 2 {
                    if i % 3 == 0 { (255, 220, 100) } else { (255, 34, 85) }
                } else if engine.is_anatomy_mode && engine.selected_anatomy == 0 {
                    if i % 3 == 0 { (240, 255, 250) } else { (0, 255, 170) }
                } else {
                    (p.r, p.g, p.b)
                };

                BUFFER_POINTS[pt_idx] = ProjectedPoint {
                    x: sx,
                    y: sy,
                    depth,
                    size: (p.size * scale * 0.008).clamp(1.0, 6.0),
                    alpha,
                    r, g, b,
                    _pad: 0,
                };
                pt_idx += 1;
            }
        }
        engine.active_points = pt_idx;

        // 2. Proyectar aristas vectoriales (Wireframes & Frames)
        let line_alpha_mod = (1.0 - deconstruct * 1.4).max(0.0);
        let mut ln_idx = 0;

        if line_alpha_mod > 0.02 {
            let edges = if engine.is_anatomy_mode {
                match engine.selected_anatomy {
                    0 => &engine.anatomy.hand_edges,
                    1 => &engine.anatomy.head_edges,
                    _ => &engine.anatomy.heart_edges,
                }
            } else {
                match engine.selected_geom {
                    0 => &engine.geometry.edges_sphere,
                    1 => &engine.geometry.edges_cube,
                    _ => &engine.geometry.edges_torus,
                }
            };

            for e in edges {
                if ln_idx >= MAX_LINES { break; }
                let idx_a = (e.idx_a as usize) % target_positions.len();
                let idx_b = (e.idx_b as usize) % target_positions.len();

                let p1 = &engine.particles.particles[idx_a].pos;
                let p2 = &engine.particles.particles[idx_b].pos;

                let (x1, y1, d1, _, v1) = engine.camera.project(p1, width, height);
                let (x2, y2, d2, _, v2) = engine.camera.project(p2, width, height);

                if v1 && v2 {
                    let avg_depth = (d1 + d2) * 0.5;
                    let alpha = (1.2 - avg_depth * 0.16).clamp(0.1, 0.9) * line_alpha_mod;

                    let (r, g, b) = if engine.is_anatomy_mode {
                        match engine.selected_anatomy {
                            2 => if e.is_frame { (255, 200, 80) } else { (255, 50, 90) },
                            1 => if e.is_frame { (255, 170, 0) } else { (0, 243, 255) },
                            _ => if e.is_frame { (255, 255, 255) } else { (0, 255, 170) },
                        }
                    } else {
                        if e.is_frame { (255, 170, 0) } else { (0, 243, 255) }
                    };

                    BUFFER_LINES[ln_idx] = ProjectedLine {
                        x1, y1, x2, y2,
                        depth: avg_depth,
                        alpha,
                        r, g, b,
                        is_frame: if e.is_frame { 1 } else { 0 },
                    };
                    ln_idx += 1;
                }
            }
        }
        engine.active_lines = ln_idx;
    }
}

#[no_mangle]
pub extern "C" fn get_points_ptr() -> *const ProjectedPoint {
    unsafe { BUFFER_POINTS.as_ptr() }
}

#[no_mangle]
pub extern "C" fn get_points_count() -> usize {
    unsafe {
        match &ENGINE {
            Some(e) => e.active_points,
            None => 0,
        }
    }
}

#[no_mangle]
pub extern "C" fn get_lines_ptr() -> *const ProjectedLine {
    unsafe { BUFFER_LINES.as_ptr() }
}

#[no_mangle]
pub extern "C" fn get_lines_count() -> usize {
    unsafe {
        match &ENGINE {
            Some(e) => e.active_lines,
            None => 0,
        }
    }
}
