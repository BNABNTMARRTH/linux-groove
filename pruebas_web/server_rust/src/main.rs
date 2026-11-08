use axum::{
    body::Body,
    extract::State,
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use bytes::Bytes;
use std::{net::SocketAddr, sync::Arc, time::Duration};
use tokio::sync::broadcast;
use tokio_stream::wrappers::BroadcastStream;
use tokio_stream::StreamExt;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

struct AppState {
    electric_stream: broadcast::Sender<Bytes>,
    labyrinth_stream: broadcast::Sender<Bytes>,
}

#[tokio::main]
async fn main() {
    println!("===========================================================");
    println!("  🎷 LINUX GROOVE - RUST PIXEL STREAMER & WEB ENGINE");
    println!("  Cero JavaScript en el Cliente | 60 FPS Nativo | CSS Scroll");
    println!("===========================================================");

    // Canales de difusión broadcast para múltiples clientes concurrentes
    let (tx_electric, _rx_elec) = broadcast::channel::<Bytes>(16);
    let (tx_labyrinth, _rx_maze) = broadcast::channel::<Bytes>(16);

    let state = Arc::new(AppState {
        electric_stream: tx_electric.clone(),
        labyrinth_stream: tx_labyrinth.clone(),
    });

    // Tarea 1: Renderizado continuo de Rayos Eléctricos (Shader Procedural)
    let tx_elec_render = tx_electric.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_millis(16)); // ~60 FPS
        let mut time: f32 = 0.0;
        let width = 640;
        let height = 360;

        loop {
            interval.tick().await;
            time += 0.025;
            let jpeg_bytes = render_electric_rays_frame(time, width, height);
            let _ = tx_elec_render.send(jpeg_bytes);
        }
    });

    // Tarea 2: Renderizado continuo del Laberinto 3D (Raymarching Volumétrico)
    let tx_maze_render = tx_labyrinth.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_millis(16)); // ~60 FPS
        let mut time: f32 = 0.0;
        let width = 640;
        let height = 360;

        loop {
            interval.tick().await;
            time += 0.022;
            let jpeg_bytes = render_labyrinth_3d_frame(time, width, height);
            let _ = tx_maze_render.send(jpeg_bytes);
        }
    });

    // Rutas HTTP: streaming en vivo y entrega estática desde public/
    let public_dir = std::env::var("GROOVE_PUBLIC_DIR").unwrap_or_else(|_| "../public".to_string());
    println!("📁 Sirviendo contenido estático desde: {}", public_dir);

    let app = Router::new()
        .route("/stream", get(stream_electric_handler))
        .route("/stream_labyrinth", get(stream_labyrinth_handler))
        .fallback_service(ServeDir::new(public_dir))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8088);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    println!("📡 Servidor activo en http://localhost:{}", port);
    println!("🌐 Rayos Eléctricos: http://localhost:{}/index.html", port);
    println!("🌌 Laberinto 3D:     http://localhost:{}/labyrinth.html", port);

    let listener = tokio::net::TcpListener::bind(addr).await.expect("Error al enlazar socket");
    axum::serve(listener, app).await.expect("Error en el servidor");
}

/// Handler HTTP para streaming continuo de Rayos Eléctricos
async fn stream_electric_handler(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    build_mjpeg_response(state.electric_stream.subscribe())
}

/// Handler HTTP para streaming continuo del Laberinto 3D
async fn stream_labyrinth_handler(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    build_mjpeg_response(state.labyrinth_stream.subscribe())
}

/// Construye una respuesta HTTP multipart/x-mixed-replace para reproducción MJPEG sin JavaScript
fn build_mjpeg_response(rx: broadcast::Receiver<Bytes>) -> Response {
    let stream = BroadcastStream::new(rx).filter_map(|res| {
        res.ok().map(|jpeg_bytes| {
            let chunk = format!(
                "--frame\r\nContent-Type: image/jpeg\r\nContent-Length: {}\r\n\r\n",
                jpeg_bytes.len()
            );
            let mut data = chunk.into_bytes();
            data.extend_from_slice(&jpeg_bytes);
            data.extend_from_slice(b"\r\n");
            Ok::<_, std::io::Error>(Bytes::from(data))
        })
    });

    Response::builder()
        .status(StatusCode::OK)
        .header(
            header::CONTENT_TYPE,
            "multipart/x-mixed-replace; boundary=frame",
        )
        .header(header::CACHE_CONTROL, "no-cache, private, no-store, must-revalidate")
        .header(header::PRAGMA, "no-cache")
        .header(header::EXPIRES, "0")
        .body(Body::from_stream(stream))
        .unwrap()
}

// =========================================================================
// RENDERIZADOR 1: Rayos Eléctricos Procedurales de Linux Groove
// =========================================================================

fn render_electric_rays_frame(time: f32, width: usize, height: usize) -> Bytes {
    let mut rgb_buf = vec![0u8; width * height * 3];
    let inv_w = 1.0 / (width as f32);
    let inv_h = 1.0 / (height as f32);

    let col_cyan = [0.0f32, 0.90, 1.0];
    let col_magenta = [0.90f32, 0.20, 1.0];
    let col_amber = [1.0f32, 0.65, 0.05];

    for y in 0..height {
        let uv_y = (y as f32) * inv_h - 0.5;
        let row_idx = y * width * 3;

        for x in 0..width {
            let uv_x = (x as f32) * inv_w - 0.5;

            let mut r = 0.0f32;
            let mut g = 0.0f32;
            let mut b = 0.0f32;

            for k in 0..3 {
                let fk = k as f32;
                let col = match k {
                    0 => col_cyan,
                    1 => col_magenta,
                    _ => col_amber,
                };

                let speed = 1.8 + fk * 0.4;
                let phase = fk * 2.094;
                let t = time * speed + phase;

                let wave_y = 0.28 * (uv_x * 6.0 + t * 1.5).sin()
                    + 0.12 * (uv_x * 14.0 - t * 2.3 + fk).cos()
                    + 0.05 * (uv_x * 28.0 + t * 4.1).sin();

                let dist = (uv_y - wave_y).abs();
                let glow = 0.012 / (dist * dist * 45.0 + dist * 3.5 + 0.008);
                let core = (1.0 - dist / 0.035).max(0.0).powi(2) * 1.4;

                r += col[0] * glow + core;
                g += col[1] * glow + core;
                b += col[2] * glow + core;
            }

            let px_idx = row_idx + x * 3;
            rgb_buf[px_idx] = (r.min(1.0) * 255.0) as u8;
            rgb_buf[px_idx + 1] = (g.min(1.0) * 255.0) as u8;
            rgb_buf[px_idx + 2] = (b.min(1.0) * 255.0) as u8;
        }
    }

    let mut jpeg_buf = Vec::with_capacity(32768);
    let encoder = jpeg_encoder::Encoder::new(&mut jpeg_buf, 75);
    let _ = encoder.encode(
        &rgb_buf,
        width as u16,
        height as u16,
        jpeg_encoder::ColorType::Rgb,
    );

    Bytes::from(jpeg_buf)
}

// =========================================================================
// RENDERIZADOR 2: Laberinto 3D Cyberpunk con Raymarching Volumétrico (SDF)
// =========================================================================

#[inline(always)]
fn dot3(a: [f32; 3], b: [f32; 3]) -> f32 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

#[inline(always)]
fn norm3(v: [f32; 3]) -> [f32; 3] {
    let l = dot3(v, v).sqrt();
    if l > 1e-6 {
        [v[0] / l, v[1] / l, v[2] / l]
    } else {
        [0.0, 1.0, 0.0]
    }
}

#[inline(always)]
fn cross3(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

/// Función de Distancia Signada (SDF) de la escena del Laberinto 3D
/// Retorna: (distancia mínima, identificador de material, proximidad al neón)
#[inline(always)]
fn map_labyrinth(p: [f32; 3], time: f32) -> (f32, u8, f32) {
    // Límites del túnel / pasillo principal (ancho: ±2.5, alto: ±1.6)
    let d_floor = 1.6 - p[1];  // Suelo en y = -1.6
    let d_ceil  = 1.6 + p[1];  // Techo en y = 1.6
    let d_walls = 2.6 - p[0].abs(); // Muros laterales en x = ±2.6
    let d_corridor = d_floor.min(d_ceil).min(d_walls);

    // Módulos periódicos de columnas cilíndricas neón a los lados cada 4.0 unidades
    let rep_z = ((p[2] % 4.0) + 4.0) % 4.0 - 2.0;
    let col_left = ((p[0] + 1.8).powi(2) + rep_z.powi(2)).sqrt() - 0.22;
    let col_right = ((p[0] - 1.8).powi(2) + rep_z.powi(2)).sqrt() - 0.22;
    let d_pillars = col_left.min(col_right);

    // Obstáculos y esquinas del laberinto (bloques flotantes rítmicos)
    let block_z = ((p[2] % 12.0) + 12.0) % 12.0 - 6.0;
    let block_shift = if ((p[2] / 12.0).floor() as i32) % 2 == 0 { 0.8 } else { -0.8 };
    let d_block = ((p[0] - block_shift).abs() - 0.9)
        .max(p[1].abs() - 1.1)
        .max(block_z.abs() - 0.45);

    // Emblema holográfico de onda de audio central flotante
    let wave_y = (p[2] * 1.5 - time * 3.0).sin() * 0.35;
    let d_wave = (p[0].abs() - 0.15)
        .max((p[1] - wave_y).abs() - 0.08);

    // Distancia al objeto sólido más cercano
    let mut d_scene = d_corridor.min(d_pillars).min(d_block);
    let mut mat = 0u8; // 0=túnel base

    if d_pillars < d_corridor && d_pillars < d_block {
        mat = 1; // 1=columnas de neón
    } else if d_block < d_corridor {
        mat = 2; // 2=bloques del laberinto
    }

    if d_wave < d_scene {
        d_scene = d_wave;
        mat = 3; // 3=onda sonora de Groove
    }

    // Proximidad a fuentes de luz neón (para acumulación de resplandor volumétrico)
    let neon_proximity = d_pillars.min(d_wave).max(0.0);

    (d_scene, mat, neon_proximity)
}

/// Cálculo analítico del vector normal en un punto mediante diferencias finitas
fn calc_normal(p: [f32; 3], time: f32) -> [f32; 3] {
    let e = 0.005;
    let dx = map_labyrinth([p[0] + e, p[1], p[2]], time).0 - map_labyrinth([p[0] - e, p[1], p[2]], time).0;
    let dy = map_labyrinth([p[0], p[1] + e, p[2]], time).0 - map_labyrinth([p[0], p[1] - e, p[2]], time).0;
    let dz = map_labyrinth([p[0], p[1], p[2] + e], time).0 - map_labyrinth([p[0], p[1], p[2] - e], time).0;
    norm3([dx, dy, dz])
}

fn render_labyrinth_3d_frame(time: f32, width: usize, height: usize) -> Bytes {
    let mut rgb_buf = vec![0u8; width * height * 3];
    let inv_w = 1.0 / (width as f32);
    let inv_h = 1.0 / (height as f32);
    let aspect = (width as f32) / (height as f32);

    // Cámara 3D navegando en trayectoria curva por el laberinto
    let cam_x = (time * 0.35).sin() * 1.1;
    let cam_y = (time * 0.25).cos() * 0.35;
    let cam_z = time * 3.8;
    let ro = [cam_x, cam_y, cam_z];

    // Objetivo hacia el que mira la cámara (adelantada en Z con ligera curvatura)
    let target = [
        cam_x + (time * 0.35).cos() * 0.35,
        cam_y - (time * 0.25).sin() * 0.2,
        cam_z + 6.0,
    ];

    // Base ortonormal de la cámara
    let fwd = norm3([target[0] - ro[0], target[1] - ro[1], target[2] - ro[2]]);
    let world_up = [0.0f32, 1.0, 0.0];
    let right = norm3(cross3(fwd, world_up));
    let up = cross3(right, fwd);

    // Color de la niebla volumétrica del laberinto (Deep Cyberpunk Navy)
    let fog_color = [0.03f32, 0.05, 0.12];

    for y in 0..height {
        // Coordenadas normalizadas con corrección de relación de aspecto
        let uv_y = (0.5 - (y as f32) * inv_h) * 2.0;
        let row_idx = y * width * 3;

        for x in 0..width {
            let uv_x = ((x as f32) * inv_w - 0.5) * 2.0 * aspect;

            // Dirección del rayo con campo de visión (FOV)
            let fov = 1.35;
            let rd = norm3([
                fwd[0] * fov + right[0] * uv_x + up[0] * uv_y,
                fwd[1] * fov + right[1] * uv_x + up[1] * uv_y,
                fwd[2] * fov + right[2] * uv_x + up[2] * uv_y,
            ]);

            // Bucle de Raymarching (Sphere Tracing acelerado)
            let mut t = 0.12f32;
            let mut hit_mat = 0u8;
            let mut hit_p = [0.0f32; 3];
            let mut glow_cyan = 0.0f32;
            let mut glow_amber = 0.0f32;
            let mut hit = false;

            for _step in 0..26 {
                let p = [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t];
                let (d, mat, neon_dist) = map_labyrinth(p, time);

                // Acumulación de luz volumétrica al pasar cerca de los neones
                glow_cyan += 0.015 / (neon_dist + 0.12);
                if p[2].sin() > 0.0 {
                    glow_amber += 0.012 / (neon_dist + 0.14);
                }

                if d < 0.01 {
                    hit = true;
                    hit_mat = mat;
                    hit_p = p;
                    break;
                }

                t += d * 0.88;
                if t > 28.0 {
                    break;
                }
            }

            let mut r: f32;
            let mut g: f32;
            let mut b: f32;

            if hit {
                let normal = calc_normal(hit_p, time);
                let light_dir = norm3([0.2, 0.8, -0.5]);
                let diff = dot3(normal, light_dir).max(0.0) * 0.7 + 0.3;

                // Atenuación de niebla exponencial según la distancia
                let fog_factor = (-t * 0.12).exp().clamp(0.0, 1.0);

                let base_color = match hit_mat {
                    1 => [0.0f32, 0.95, 1.0],   // Columna Neón Cian
                    2 => [0.85f32, 0.20, 0.95],  // Bloque Magenta Cyberpunk
                    3 => [1.0f32, 0.90, 0.40],   // Onda Sonora Dorada
                    _ => {
                        // Suelo y techo cuadriculados con rejilla de perspectiva
                        let grid_x = ((hit_p[0] * 3.0).floor() as i32).abs() % 2;
                        let grid_z = ((hit_p[2] * 2.0).floor() as i32).abs() % 2;
                        if grid_x == grid_z {
                            [0.08f32, 0.11, 0.22]
                        } else {
                            [0.04f32, 0.06, 0.14]
                        }
                    }
                };

                r = base_color[0] * diff * fog_factor + fog_color[0] * (1.0 - fog_factor);
                g = base_color[1] * diff * fog_factor + fog_color[1] * (1.0 - fog_factor);
                b = base_color[2] * diff * fog_factor + fog_color[2] * (1.0 - fog_factor);
            } else {
                // Fondo cósmico del laberinto
                let grad = (rd[1] * 0.5 + 0.5).clamp(0.0, 1.0);
                r = fog_color[0] * grad;
                g = fog_color[1] * grad + 0.02;
                b = fog_color[2] * grad + 0.06;
            }

            // Aplicar resplandores volumétricos de neón acumulados
            r += glow_amber * 0.9 + glow_cyan * 0.1;
            g += glow_cyan * 0.85 + glow_amber * 0.4;
            b += glow_cyan * 1.1 + glow_amber * 0.05;

            let px_idx = row_idx + x * 3;
            rgb_buf[px_idx] = (r.min(1.0) * 255.0) as u8;
            rgb_buf[px_idx + 1] = (g.min(1.0) * 255.0) as u8;
            rgb_buf[px_idx + 2] = (b.min(1.0) * 255.0) as u8;
        }
    }

    // Compresión JPEG a memoria
    let mut jpeg_buf = Vec::with_capacity(32768);
    let encoder = jpeg_encoder::Encoder::new(&mut jpeg_buf, 75);
    let _ = encoder.encode(
        &rgb_buf,
        width as u16,
        height as u16,
        jpeg_encoder::ColorType::Rgb,
    );

    Bytes::from(jpeg_buf)
}
