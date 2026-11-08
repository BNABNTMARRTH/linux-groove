// ==========================================================================
// LINUX GROOVE - MOTOR 3D EN RUST (WASM)
// particles.rs: Sistema Fisico de Particulas, Integrador Verlet,
// Dispersion Atomica (Deconstruccion) y Lente Magnetica de Mouse
// ==========================================================================

use crate::math3d::Vec3;

#[derive(Clone, Copy, Debug)]
pub struct Particle {
    pub pos: Vec3,
    pub vel: Vec3,
    pub size: f32,
    pub phase: f32,
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

pub struct ParticleSystem {
    pub particles: Vec<Particle>,
}

impl ParticleSystem {
    pub fn new(count: usize) -> Self {
        let mut particles = Vec::with_capacity(count);
        let mut seed = 54321_f32;

        for i in 0..count {
            seed = (seed * 1103515245.0 + 12345.0) % 2147483648.0;
            let rx = (seed / 2147483648.0) * 0.4 - 0.2;
            seed = (seed * 1103515245.0 + 12345.0) % 2147483648.0;
            let ry = (seed / 2147483648.0) * 0.4 - 0.2;
            seed = (seed * 1103515245.0 + 12345.0) % 2147483648.0;
            let rz = (seed / 2147483648.0) * 0.4 - 0.2;

            // Paleta cyberpunk Groove: alternancia cian neon, ambar dorado y blanco fotonico
            let (r, g, b) = match i % 3 {
                0 => (0, 243, 255),   // Cian neon
                1 => (255, 170, 0),   // Ambar electrico
                _ => (240, 250, 255), // Blanco fotonico
            };

            particles.push(Particle {
                pos: Vec3::new(rx, ry, rz),
                vel: Vec3::zero(),
                size: if i % 4 == 0 { 2.2 } else { 1.4 },
                phase: (i as f32) * 0.17,
                r, g, b,
            });
        }

        Self { particles }
    }

    // Actualizacion fisica en cada fotograma
    pub fn update(
        &mut self,
        targets: &[Vec3],
        time: f32,
        dt: f32,
        deconstruct: f32,
        mouse_world: &Vec3,
        mouse_active: bool,
    ) {
        let n = self.particles.len();
        let target_len = targets.len();
        if target_len == 0 { return; }

        let spring_k = 0.08 * (1.0 - deconstruct * 0.85);
        let friction = 0.91;

        for i in 0..n {
            let p = &mut self.particles[i];
            let target = targets[i % target_len];

            // 1. Fuerza elastica hacia la posicion geometrica (Morphing)
            let dx = target.x - p.pos.x;
            let dy = target.y - p.pos.y;
            let dz = target.z - p.pos.z;

            let mut fx = dx * spring_k;
            let mut fy = dy * spring_k;
            let mut fz = dz * spring_k;

            // 2. Fuerza de deconstruccion / explosion atomica
            if deconstruct > 0.001 {
                let dist_sq = p.pos.length_sq().max(0.01);
                let inv_dist = 1.0 / dist_sq.sqrt();

                // Dispersion radial expansiva
                let burst = deconstruct * 2.8;
                fx += p.pos.x * inv_dist * burst;
                fy += p.pos.y * inv_dist * burst;
                fz += p.pos.z * inv_dist * burst;

                // Turbulencia armonica de vortice (Curl-like turbulence)
                let vortex_phase = time * 2.4 + p.phase;
                let vx_turb = -p.pos.y * 1.8 * deconstruct + (vortex_phase * 1.2).sin() * 0.6;
                let vy_turb =  p.pos.x * 1.8 * deconstruct + (vortex_phase * 0.8).cos() * 0.6;
                let vz_turb =  (vortex_phase * 1.5).sin() * 1.2 * deconstruct;

                fx += vx_turb;
                fy += vy_turb;
                fz += vz_turb;
            }

            // 3. Lente magnetica interactiva con el mouse
            if mouse_active {
                let mdx = p.pos.x - mouse_world.x;
                let mdy = p.pos.y - mouse_world.y;
                let mdz = p.pos.z - mouse_world.z;
                let m_dist_sq = mdx * mdx + mdy * mdy + mdz * mdz + 0.15;

                if m_dist_sq < 2.5 {
                    // Repulsion suave formando un halo circular alrededor del cursor
                    let m_force = 0.65 / m_dist_sq;
                    fx += mdx * m_force;
                    fy += mdy * m_force;
                    fz += mdz * m_force;
                }
            }

            // 4. Integracion fisica Euler semi-implicito con friccion
            p.vel.x = (p.vel.x + fx * dt) * friction;
            p.vel.y = (p.vel.y + fy * dt) * friction;
            p.vel.z = (p.vel.z + fz * dt) * friction;

            p.pos.x += p.vel.x;
            p.pos.y += p.vel.y;
            p.pos.z += p.vel.z;
        }
    }
}
