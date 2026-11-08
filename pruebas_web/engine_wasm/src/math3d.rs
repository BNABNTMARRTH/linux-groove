// ==========================================================================
// LINUX GROOVE - MOTOR 3D EN RUST (WASM)
// math3d.rs: Vectores 3D, Matrices 4x4 y Proyeccion en Perspectiva
// Cero dependencias externas | Optimizacion nativa Wasm
// ==========================================================================

#[derive(Clone, Copy, Debug, Default)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Vec3 {
    pub const fn new(x: f32, y: f32, z: f32) -> Self {
        Self { x, y, z }
    }

    pub const fn zero() -> Self {
        Self { x: 0.0, y: 0.0, z: 0.0 }
    }

    pub fn length_sq(&self) -> f32 {
        self.x * self.x + self.y * self.y + self.z * self.z
    }

    pub fn length(&self) -> f32 {
        self.length_sq().sqrt()
    }

    pub fn normalize(&self) -> Self {
        let len = self.length();
        if len > 0.00001 {
            Self {
                x: self.x / len,
                y: self.y / len,
                z: self.z / len,
            }
        } else {
            Self::zero()
        }
    }

    pub fn lerp(a: Self, b: Self, t: f32) -> Self {
        Self {
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            z: a.z + (b.z - a.z) * t,
        }
    }

    pub fn dot(&self, other: &Self) -> f32 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }

    pub fn cross(&self, other: &Self) -> Self {
        Self {
            x: self.y * other.z - self.z * other.y,
            y: self.z * other.x - self.x * other.z,
            z: self.x * other.y - self.y * other.x,
        }
    }
}

// Proyeccion de perspectiva 3D con camara orbital
#[derive(Clone, Copy, Debug)]
pub struct Camera {
    pub distance: f32,
    pub focal_length: f32,
    pub rot_x: f32,
    pub rot_y: f32,
    pub rot_z: f32,
}

impl Default for Camera {
    fn default() -> Self {
        Self {
            distance: 4.5,
            focal_length: 500.0,
            rot_x: 0.25,
            rot_y: 0.0,
            rot_z: 0.0,
        }
    }
}

impl Camera {
    // Transforma un punto 3D en el espacio de mundo a pantalla 2D
    // Retorna: (screen_x, screen_y, depth_z, scale, is_visible)
    pub fn project(&self, p: &Vec3, width: f32, height: f32) -> (f32, f32, f32, f32, bool) {
        // Rotacion alrededor del eje Y
        let cy = self.rot_y.cos();
        let sy = self.rot_y.sin();
        let x1 = p.x * cy - p.z * sy;
        let z1 = p.x * sy + p.z * cy;

        // Rotacion alrededor del eje X
        let cx = self.rot_x.cos();
        let sx = self.rot_x.sin();
        let y2 = p.y * cx - z1 * sx;
        let z2 = p.y * sx + z1 * cx;

        // Rotacion alrededor del eje Z
        let cz = self.rot_z.cos();
        let sz = self.rot_z.sin();
        let x3 = x1 * cz - y2 * sz;
        let y3 = x1 * sz + y2 * cz;

        // Traslacion por distancia de camara
        let z_cam = z2 + self.distance;

        if z_cam <= 0.1 {
            return (0.0, 0.0, z_cam, 0.0, false);
        }

        let scale = self.focal_length / z_cam;
        let screen_x = width * 0.5 + x3 * scale;
        let screen_y = height * 0.5 - y3 * scale;

        (screen_x, screen_y, z_cam, scale, true)
    }
}

