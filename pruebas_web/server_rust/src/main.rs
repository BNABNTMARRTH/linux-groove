use axum::{
    body::Body,
    extract::State,
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use bytes::Bytes;
use rayon::prelude::*;
use std::{net::SocketAddr, sync::Arc, time::Duration};
use tokio::sync::broadcast;
use tokio_stream::wrappers::BroadcastStream;
use tokio_stream::StreamExt;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

struct AppState {
    electric_stream: broadcast::Sender<Bytes>,
    labyrinth_stream: broadcast::Sender<Bytes>,
    city_stream: broadcast::Sender<Bytes>,
    tesla_stream: broadcast::Sender<Bytes>,
    storm_stream: broadcast::Sender<Bytes>,
    synapse_stream: broadcast::Sender<Bytes>,
    filmstrip_bytes: Bytes,
}

#[tokio::main]
async fn main() {
    println!("===========================================================");
    println!("  [+] LINUX GROOVE - RUST PIXEL STREAMER (RAYON MULTICORE)");
    println!("  Scroll-Driven 3D Filmstrip | 0% CPU Cliente | 0 JS");
    println!("===========================================================");

    let num_cpus = num_cpus();
    println!("  [+] Inicializando pool de hilos Rayon con {} nucleos de CPU...", num_cpus);

    // Pre-generar tira de fotogramas 3D en paralelo para Scroll-Driven Puro
    println!("  [+] Pre-renderizando secuencia de 64 fotogramas 3D del laberinto...");
    let t_start = std::time::Instant::now();
    let filmstrip_bytes = generate_labyrinth_filmstrip(64, 480, 270);
    println!(
        "  [OK] Tira 3D completada en {:?}: {:.1} KB (64 fotogramas listos)",
        t_start.elapsed(),
        (filmstrip_bytes.len() as f32) / 1024.0
    );

    // Canales de difusión broadcast para clientes de streaming en vivo
    let (tx_electric, _rx_elec) = broadcast::channel::<Bytes>(16);
    let (tx_labyrinth, _rx_maze) = broadcast::channel::<Bytes>(16);
    let (tx_city, _rx_city) = broadcast::channel::<Bytes>(16);
    let (tx_tesla, _rx_tesla) = broadcast::channel::<Bytes>(16);
    let (tx_storm, _rx_storm) = broadcast::channel::<Bytes>(16);
    let (tx_synapse, _rx_synapse) = broadcast::channel::<Bytes>(16);

    let state = Arc::new(AppState {
        electric_stream: tx_electric.clone(),
        labyrinth_stream: tx_labyrinth.clone(),
        city_stream: tx_city.clone(),
        tesla_stream: tx_tesla.clone(),
        storm_stream: tx_storm.clone(),
        synapse_stream: tx_synapse.clone(),
        filmstrip_bytes,
    });

    // Subproceso dedicado 1: Rayos Eléctricos Neón (60 FPS exactos)
    let tx_elec_render = tx_electric.clone();
    std::thread::Builder::new()
        .name("electric-render-worker".to_string())
        .spawn(move || {
            let width = 640;
            let height = 360;
            let frame_target = Duration::from_micros(16_666);
            let mut next_frame = std::time::Instant::now();
            let mut time: f32 = 0.0;

            loop {
                next_frame += frame_target;
                time += 0.025;

                let jpeg_bytes = render_electric_rays_parallel(time, width, height);
                let _ = tx_elec_render.send(jpeg_bytes);

                let now = std::time::Instant::now();
                if now < next_frame {
                    std::thread::sleep(next_frame - now);
                } else {
                    next_frame = now;
                }
            }
        })
        .expect("Error al iniciar subproceso de rayos");

    // Subproceso dedicado 2: Laberinto 3D Streaming continuo (60 FPS fluidos)
    let tx_maze_render = tx_labyrinth.clone();
    std::thread::Builder::new()
        .name("labyrinth-raymarching-worker".to_string())
        .spawn(move || {
            let width = 512;
            let height = 288;
            let frame_target = Duration::from_micros(16_666);
            let mut next_frame = std::time::Instant::now();
            let mut time: f32 = 0.0;

            loop {
                next_frame += frame_target;
                time += 0.024;

                let jpeg_bytes = render_labyrinth_3d_parallel(time, width, height);
                let _ = tx_maze_render.send(jpeg_bytes);

                let now = std::time::Instant::now();
                if now < next_frame {
                    std::thread::sleep(next_frame - now);
                } else {
                    next_frame = now;
                }
            }
        })
        .expect("Error al iniciar subproceso de laberinto");

    // Subproceso dedicado 3: Ciudad Cyberpunk con Lluvia y Asfalto Mojado (60 FPS fluidos)
    let tx_city_render = tx_city.clone();
    std::thread::Builder::new()
        .name("city-rain-worker".to_string())
        .spawn(move || {
            let width = 512;
            let height = 288;
            let frame_target = Duration::from_micros(16_666);
            let mut next_frame = std::time::Instant::now();
            let mut time: f32 = 0.0;

            loop {
                next_frame += frame_target;
                time += 0.022;

                let jpeg_bytes = render_rainy_city_parallel(time, width, height);
                let _ = tx_city_render.send(jpeg_bytes);

                let now = std::time::Instant::now();
                if now < next_frame {
                    std::thread::sleep(next_frame - now);
                } else {
                    next_frame = now;
                }
            }
        })
        .expect("Error al iniciar subproceso de ciudad");

    // Subproceso dedicado 4: Rayos Tesla / Bobina de Plasma Radial (60 FPS)
    let tx_tesla_render = tx_tesla.clone();
    std::thread::Builder::new()
        .name("tesla-render-worker".to_string())
        .spawn(move || {
            let width = 640;
            let height = 360;
            let frame_target = Duration::from_micros(16_666);
            let mut next_frame = std::time::Instant::now();
            let mut time: f32 = 0.0;

            loop {
                next_frame += frame_target;
                time += 0.025;

                let jpeg_bytes = render_tesla_coil_parallel(time, width, height);
                let _ = tx_tesla_render.send(jpeg_bytes);

                let now = std::time::Instant::now();
                if now < next_frame {
                    std::thread::sleep(next_frame - now);
                } else {
                    next_frame = now;
                }
            }
        })
        .expect("Error al iniciar subproceso de tesla");

    // Subproceso dedicado 5: Tormenta de Relampagos Bifurcados (60 FPS)
    let tx_storm_render = tx_storm.clone();
    std::thread::Builder::new()
        .name("storm-render-worker".to_string())
        .spawn(move || {
            let width = 640;
            let height = 360;
            let frame_target = Duration::from_micros(16_666);
            let mut next_frame = std::time::Instant::now();
            let mut time: f32 = 0.0;

            loop {
                next_frame += frame_target;
                time += 0.028;

                let jpeg_bytes = render_lightning_storm_parallel(time, width, height);
                let _ = tx_storm_render.send(jpeg_bytes);

                let now = std::time::Instant::now();
                if now < next_frame {
                    std::thread::sleep(next_frame - now);
                } else {
                    next_frame = now;
                }
            }
        })
        .expect("Error al iniciar subproceso de tormenta");

    // Subproceso dedicado 6: Red Neuronal Sinaptica Cuantica (60 FPS)
    let tx_synapse_render = tx_synapse.clone();
    std::thread::Builder::new()
        .name("synapse-render-worker".to_string())
        .spawn(move || {
            let width = 640;
            let height = 360;
            let frame_target = Duration::from_micros(16_666);
            let mut next_frame = std::time::Instant::now();
            let mut time: f32 = 0.0;

            loop {
                next_frame += frame_target;
                time += 0.024;

                let jpeg_bytes = render_synaptic_lattice_parallel(time, width, height);
                let _ = tx_synapse_render.send(jpeg_bytes);

                let now = std::time::Instant::now();
                if now < next_frame {
                    std::thread::sleep(next_frame - now);
                } else {
                    next_frame = now;
                }
            }
        })
        .expect("Error al iniciar subproceso de sinapsis");

    // Servidor HTTP Axum para servir páginas, filmstrip y flujos MJPEG
    let public_dir = std::env::var("GROOVE_PUBLIC_DIR").unwrap_or_else(|_| "../public".to_string());
    println!(">> Sirviendo contenido estatico desde: {}", public_dir);

    let app = Router::new()
        .route("/stream", get(stream_electric_handler))
        .route("/stream_labyrinth", get(stream_labyrinth_handler))
        .route("/stream_city", get(stream_city_handler))
        .route("/stream_tesla", get(stream_tesla_handler))
        .route("/stream_storm", get(stream_storm_handler))
        .route("/stream_synapse", get(stream_synapse_handler))
        .route("/labyrinth_filmstrip.jpg", get(filmstrip_handler))
        .fallback_service(ServeDir::new(public_dir))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8088);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    println!(">> Servidor activo en http://localhost:{}", port);
    println!("   [1] Rayos 1 (Ondas):       http://localhost:{}/index.html", port);
    println!("   [2] Rayos 2 (Tesla):       http://localhost:{}/rays_tesla.html", port);
    println!("   [3] Rayos 3 (Tormenta):    http://localhost:{}/rays_storm.html", port);
    println!("   [4] Rayos 4 (Sinapsis):    http://localhost:{}/rays_synapse.html", port);
    println!("   [5] Laberinto 3D Scroll:   http://localhost:{}/labyrinth.html", port);
    println!("   [6] Ciudad Lluviosa:       http://localhost:{}/city.html", port);

    let listener = tokio::net::TcpListener::bind(addr).await.expect("Error al enlazar socket");
    axum::serve(listener, app).await.expect("Error en el servidor");
}

fn num_cpus() -> usize {
    std::thread::available_parallelism()
        .map(|p| p.get())
        .unwrap_or(4)
}

/// Handler HTTP para servir la tira de fotogramas 3D con caché inmutable
async fn filmstrip_handler(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "image/jpeg")
        .header(header::CACHE_CONTROL, "public, max-age=86400, immutable")
        .body(Body::from(state.filmstrip_bytes.clone()))
        .unwrap()
}

/// Handler HTTP para streaming continuo de Rayos Eléctricos
async fn stream_electric_handler(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    build_mjpeg_response(state.electric_stream.subscribe())
}

/// Handler HTTP para streaming continuo del Laberinto 3D
async fn stream_labyrinth_handler(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    build_mjpeg_response(state.labyrinth_stream.subscribe())
}

/// Handler HTTP para streaming continuo de la Ciudad Lluviosa
async fn stream_city_handler(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    build_mjpeg_response(state.city_stream.subscribe())
}

/// Handler HTTP para streaming continuo de Rayos Tesla / Bobina Radial
async fn stream_tesla_handler(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    build_mjpeg_response(state.tesla_stream.subscribe())
}

/// Handler HTTP para streaming continuo de Tormenta de Relampagos
async fn stream_storm_handler(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    build_mjpeg_response(state.storm_stream.subscribe())
}

/// Handler HTTP para streaming continuo de Red Sinaptica Cuantica
async fn stream_synapse_handler(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    build_mjpeg_response(state.synapse_stream.subscribe())
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
// RENDERIZADOR 1: Rayos Eléctricos Paralelizado con Rayon
// =========================================================================

fn render_electric_rays_parallel(time: f32, width: usize, height: usize) -> Bytes {
    let mut rgb_buf = vec![0u8; width * height * 3];
    let inv_w = 1.0 / (width as f32);
    let inv_h = 1.0 / (height as f32);

    let col_cyan = [0.0f32, 0.90, 1.0];
    let col_magenta = [0.90f32, 0.20, 1.0];
    let col_amber = [1.0f32, 0.65, 0.05];

    rgb_buf
        .par_chunks_mut(width * 3)
        .enumerate()
        .for_each(|(y, row)| {
            let uv_y = (y as f32) * inv_h - 0.5;

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

                let px_idx = x * 3;
                row[px_idx] = (r.min(1.0) * 255.0) as u8;
                row[px_idx + 1] = (g.min(1.0) * 255.0) as u8;
                row[px_idx + 2] = (b.min(1.0) * 255.0) as u8;
            }
        });

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
// RENDERIZADOR 2: Laberinto 3D y Generador de Filmstrip 3D con Rayon
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

/// Función de Distancia Signada (SDF) del Laberinto 3D
#[inline(always)]
fn map_labyrinth(p: [f32; 3], time: f32) -> (f32, u8, f32) {
    let d_floor = 1.6 - p[1];
    let d_ceil  = 1.6 + p[1];
    let d_walls = 2.6 - p[0].abs();
    let d_corridor = d_floor.min(d_ceil).min(d_walls);

    let rep_z = ((p[2] % 4.0) + 4.0) % 4.0 - 2.0;
    let col_left = ((p[0] + 1.8).powi(2) + rep_z.powi(2)).sqrt() - 0.22;
    let col_right = ((p[0] - 1.8).powi(2) + rep_z.powi(2)).sqrt() - 0.22;
    let d_pillars = col_left.min(col_right);

    let block_z = ((p[2] % 12.0) + 12.0) % 12.0 - 6.0;
    let block_shift = if ((p[2] / 12.0).floor() as i32) % 2 == 0 { 0.8 } else { -0.8 };
    let d_block = ((p[0] - block_shift).abs() - 0.9)
        .max(p[1].abs() - 1.1)
        .max(block_z.abs() - 0.45);

    let wave_y = (p[2] * 1.5 - time * 3.0).sin() * 0.35;
    let d_wave = (p[0].abs() - 0.15).max((p[1] - wave_y).abs() - 0.08);

    let mut d_scene = d_corridor.min(d_pillars).min(d_block);
    let mut mat = 0u8;

    if d_pillars < d_corridor && d_pillars < d_block {
        mat = 1;
    } else if d_block < d_corridor {
        mat = 2;
    }

    if d_wave < d_scene {
        d_scene = d_wave;
        mat = 3;
    }

    let neon_proximity = d_pillars.min(d_wave).max(0.0);
    (d_scene, mat, neon_proximity)
}

/// Normal analítica acelerada por tetraedro de 4 puntos
#[inline(always)]
fn calc_normal_tetra(p: [f32; 3], time: f32) -> [f32; 3] {
    let e = 0.008;
    let d0 = map_labyrinth([p[0] + e, p[1] - e, p[2] - e], time).0;
    let d1 = map_labyrinth([p[0] - e, p[1] - e, p[2] + e], time).0;
    let d2 = map_labyrinth([p[0] - e, p[1] + e, p[2] - e], time).0;
    let d3 = map_labyrinth([p[0] + e, p[1] + e, p[2] + e], time).0;
    norm3([
        d0 - d1 - d2 + d3,
        -d0 - d1 + d2 + d3,
        -d0 + d1 - d2 + d3,
    ])
}

/// Renderiza un fotograma tridimensional en un slice de bytes RGB
fn render_labyrinth_frame_raw(time: f32, width: usize, height: usize, out_rgb: &mut [u8]) {
    let inv_w = 1.0 / (width as f32);
    let inv_h = 1.0 / (height as f32);
    let aspect = (width as f32) / (height as f32);

    let cam_x = (time * 0.35).sin() * 1.1;
    let cam_y = (time * 0.25).cos() * 0.35;
    let cam_z = time * 3.8;
    let ro = [cam_x, cam_y, cam_z];

    let target = [
        cam_x + (time * 0.35).cos() * 0.35,
        cam_y - (time * 0.25).sin() * 0.2,
        cam_z + 6.0,
    ];

    let fwd = norm3([target[0] - ro[0], target[1] - ro[1], target[2] - ro[2]]);
    let world_up = [0.0f32, 1.0, 0.0];
    let right = norm3(cross3(fwd, world_up));
    let up = cross3(right, fwd);

    let fog_color = [0.03f32, 0.05, 0.12];

    for y in 0..height {
        let uv_y = (0.5 - (y as f32) * inv_h) * 2.0;
        let row_start = y * width * 3;

        for x in 0..width {
            let uv_x = ((x as f32) * inv_w - 0.5) * 2.0 * aspect;

            let fov = 1.35;
            let rd = norm3([
                fwd[0] * fov + right[0] * uv_x + up[0] * uv_y,
                fwd[1] * fov + right[1] * uv_x + up[1] * uv_y,
                fwd[2] * fov + right[2] * uv_x + up[2] * uv_y,
            ]);

            let mut t = 0.12f32;
            let mut hit_mat = 0u8;
            let mut hit_p = [0.0f32; 3];
            let mut glow_cyan = 0.0f32;
            let mut glow_amber = 0.0f32;
            let mut hit = false;

            for _step in 0..22 {
                let p = [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t];
                let (d, mat, neon_dist) = map_labyrinth(p, time);

                glow_cyan += 0.015 / (neon_dist + 0.12);
                if p[2].sin() > 0.0 {
                    glow_amber += 0.012 / (neon_dist + 0.14);
                }

                if d < 0.012 {
                    hit = true;
                    hit_mat = mat;
                    hit_p = p;
                    break;
                }

                t += d * 0.92;
                if t > 26.0 {
                    break;
                }
            }

            let (mut r, mut g, mut b) = if hit {
                let normal = calc_normal_tetra(hit_p, time);
                let light_dir = norm3([0.2, 0.8, -0.5]);
                let diff = dot3(normal, light_dir).max(0.0) * 0.7 + 0.3;
                let fog_factor = (-t * 0.12).exp().clamp(0.0, 1.0);

                let base_color = match hit_mat {
                    1 => [0.0f32, 0.95, 1.0],
                    2 => [0.85f32, 0.20, 0.95],
                    3 => [1.0f32, 0.90, 0.40],
                    _ => {
                        let grid_x = ((hit_p[0] * 3.0).floor() as i32).abs() % 2;
                        let grid_z = ((hit_p[2] * 2.0).floor() as i32).abs() % 2;
                        if grid_x == grid_z {
                            [0.08f32, 0.11, 0.22]
                        } else {
                            [0.04f32, 0.06, 0.14]
                        }
                    }
                };

                (
                    base_color[0] * diff * fog_factor + fog_color[0] * (1.0 - fog_factor),
                    base_color[1] * diff * fog_factor + fog_color[1] * (1.0 - fog_factor),
                    base_color[2] * diff * fog_factor + fog_color[2] * (1.0 - fog_factor),
                )
            } else {
                let grad = (rd[1] * 0.5 + 0.5).clamp(0.0, 1.0);
                (fog_color[0] * grad, fog_color[1] * grad + 0.02, fog_color[2] * grad + 0.06)
            };

            r += glow_amber * 0.9 + glow_cyan * 0.1;
            g += glow_cyan * 0.85 + glow_amber * 0.4;
            b += glow_cyan * 1.1 + glow_amber * 0.05;

            let px_idx = row_start + x * 3;
            out_rgb[px_idx] = (r.min(1.0) * 255.0) as u8;
            out_rgb[px_idx + 1] = (g.min(1.0) * 255.0) as u8;
            out_rgb[px_idx + 2] = (b.min(1.0) * 255.0) as u8;
        }
    }
}

/// Renderiza un solo frame de streaming continuo (usado para /stream_labyrinth)
fn render_labyrinth_3d_parallel(time: f32, width: usize, height: usize) -> Bytes {
    let mut rgb_buf = vec![0u8; width * height * 3];

    // Paralelización por filas con Rayon
    rgb_buf
        .par_chunks_mut(width * 3)
        .enumerate()
        .for_each(|(y, row)| {
            let inv_w = 1.0 / (width as f32);
            let inv_h = 1.0 / (height as f32);
            let aspect = (width as f32) / (height as f32);

            let cam_x = (time * 0.35).sin() * 1.1;
            let cam_y = (time * 0.25).cos() * 0.35;
            let cam_z = time * 3.8;
            let ro = [cam_x, cam_y, cam_z];

            let target = [
                cam_x + (time * 0.35).cos() * 0.35,
                cam_y - (time * 0.25).sin() * 0.2,
                cam_z + 6.0,
            ];

            let fwd = norm3([target[0] - ro[0], target[1] - ro[1], target[2] - ro[2]]);
            let world_up = [0.0f32, 1.0, 0.0];
            let right = norm3(cross3(fwd, world_up));
            let up = cross3(right, fwd);
            let fog_color = [0.03f32, 0.05, 0.12];

            let uv_y = (0.5 - (y as f32) * inv_h) * 2.0;

            for x in 0..width {
                let uv_x = ((x as f32) * inv_w - 0.5) * 2.0 * aspect;
                let rd = norm3([
                    fwd[0] * 1.35 + right[0] * uv_x + up[0] * uv_y,
                    fwd[1] * 1.35 + right[1] * uv_x + up[1] * uv_y,
                    fwd[2] * 1.35 + right[2] * uv_x + up[2] * uv_y,
                ]);

                let mut t = 0.12f32;
                let mut hit_mat = 0u8;
                let mut hit_p = [0.0f32; 3];
                let mut glow_cyan = 0.0f32;
                let mut glow_amber = 0.0f32;
                let mut hit = false;

                for _step in 0..22 {
                    let p = [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t];
                    let (d, mat, neon_dist) = map_labyrinth(p, time);
                    glow_cyan += 0.015 / (neon_dist + 0.12);
                    if p[2].sin() > 0.0 {
                        glow_amber += 0.012 / (neon_dist + 0.14);
                    }
                    if d < 0.012 {
                        hit = true;
                        hit_mat = mat;
                        hit_p = p;
                        break;
                    }
                    t += d * 0.92;
                    if t > 26.0 { break; }
                }

                let (mut r, mut g, mut b) = if hit {
                    let normal = calc_normal_tetra(hit_p, time);
                    let diff = dot3(normal, [0.2, 0.8, -0.5]).max(0.0) * 0.7 + 0.3;
                    let fog_factor = (-t * 0.12).exp().clamp(0.0, 1.0);
                    let base_color = match hit_mat {
                        1 => [0.0f32, 0.95, 1.0],
                        2 => [0.85f32, 0.20, 0.95],
                        3 => [1.0f32, 0.90, 0.40],
                        _ => {
                            let grid_x = ((hit_p[0] * 3.0).floor() as i32).abs() % 2;
                            let grid_z = ((hit_p[2] * 2.0).floor() as i32).abs() % 2;
                            if grid_x == grid_z { [0.08f32, 0.11, 0.22] } else { [0.04f32, 0.06, 0.14] }
                        }
                    };
                    (
                        base_color[0] * diff * fog_factor + fog_color[0] * (1.0 - fog_factor),
                        base_color[1] * diff * fog_factor + fog_color[1] * (1.0 - fog_factor),
                        base_color[2] * diff * fog_factor + fog_color[2] * (1.0 - fog_factor),
                    )
                } else {
                    let grad = (rd[1] * 0.5 + 0.5).clamp(0.0, 1.0);
                    (fog_color[0] * grad, fog_color[1] * grad + 0.02, fog_color[2] * grad + 0.06)
                };

                r += glow_amber * 0.9 + glow_cyan * 0.1;
                g += glow_cyan * 0.85 + glow_amber * 0.4;
                b += glow_cyan * 1.1 + glow_amber * 0.05;

                let px_idx = x * 3;
                row[px_idx] = (r.min(1.0) * 255.0) as u8;
                row[px_idx + 1] = (g.min(1.0) * 255.0) as u8;
                row[px_idx + 2] = (b.min(1.0) * 255.0) as u8;
            }
        });

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

/// Genera la tira completa de 64 fotogramas en memoria apilados verticalmente
pub fn generate_labyrinth_filmstrip(num_frames: usize, frame_w: usize, frame_h: usize) -> Bytes {
    let frame_bytes = frame_w * frame_h * 3;
    let total_h = frame_h * num_frames;
    let mut filmstrip_buf = vec![0u8; frame_w * total_h * 3];

    // Renderizado en paralelo de los 64 fotogramas repartidos entre los 10 núcleos
    filmstrip_buf
        .par_chunks_mut(frame_bytes)
        .enumerate()
        .for_each(|(frame_idx, frame_slice)| {
            // Avance suave a lo largo del recorrido 3D del laberinto (Sector 1 -> Sector 4)
            let progress = (frame_idx as f32) / ((num_frames - 1) as f32);
            let time_val = progress * 7.5; // Recorrido cinematográfico completo

            render_labyrinth_frame_raw(time_val, frame_w, frame_h, frame_slice);
        });

    // Compresión JPEG de la tira completa a memoria (calidad 72 para balance perfecto de peso < 800 KB)
    let mut jpeg_buf = Vec::with_capacity(700 * 1024);
    let encoder = jpeg_encoder::Encoder::new(&mut jpeg_buf, 72);
    let _ = encoder.encode(
        &filmstrip_buf,
        frame_w as u16,
        total_h as u16,
        jpeg_encoder::ColorType::Rgb,
    );

    Bytes::from(jpeg_buf)
}

// =========================================================================
// RENDERIZADOR 3: Ciudad Cyberpunk Nocturna con Lluvia y Asfalto Mojado
// =========================================================================

pub fn render_rainy_city_parallel(time: f32, width: usize, height: usize) -> Bytes {
    let mut rgb_buf = vec![0u8; width * height * 3];
    let inv_w = 1.0 / (width as f32);
    let inv_h = 1.0 / (height as f32);
    let aspect = (width as f32) / (height as f32);

    let cam_x = (time * 0.18).sin() * 0.45;
    let cam_y = 1.35 + (time * 0.25).cos() * 0.04;
    let cam_z = time * 4.2;
    let ro = [cam_x, cam_y, cam_z];

    let target = [cam_x * 0.7, 1.25, cam_z + 8.0];

    let fwd = norm3([target[0] - ro[0], target[1] - ro[1], target[2] - ro[2]]);
    let world_up = [0.0f32, 1.0, 0.0];
    let right = norm3(cross3(fwd, world_up));
    let up = cross3(right, fwd);

    rgb_buf
        .par_chunks_mut(width * 3)
        .enumerate()
        .for_each(|(y, row)| {
            let uv_y = (0.5 - (y as f32) * inv_h) * 2.0;

            for x in 0..width {
                let uv_x = ((x as f32) * inv_w - 0.5) * 2.0 * aspect;

                let rd = norm3([
                    fwd[0] * 1.3 + right[0] * uv_x + up[0] * uv_y,
                    fwd[1] * 1.3 + right[1] * uv_x + up[1] * uv_y,
                    fwd[2] * 1.3 + right[2] * uv_x + up[2] * uv_y,
                ]);

                let fog_color = [0.015f32, 0.022, 0.055];
                let mut r = fog_color[0];
                let mut g = fog_color[1];
                let mut b = fog_color[2];

                if rd[1] < -0.001 {
                    // Impacto analítico en plano de suelo y = 0.0
                    let t_ground = ro[1] / -rd[1];
                    if t_ground < 45.0 {
                        let hit_p = [ro[0] + rd[0] * t_ground, 0.0, ro[2] + rd[2] * t_ground];

                        let center_line = hit_p[0].abs() < 0.08 && ((hit_p[2] * 0.45) % 2.0).abs() < 1.0;
                        let curb_line = (hit_p[0].abs() - 2.8).abs() < 0.06;

                        let puddle = ((hit_p[0] * 1.1).sin() * (hit_p[2] * 0.55).cos() + (hit_p[0] * 2.8 + hit_p[2] * 2.1).sin() * 0.3).max(0.0);
                        let is_puddle = puddle > 0.08 || hit_p[0].abs() < 2.5;

                        let ripple = ((hit_p[0] * 22.0 + time * 7.0).sin() * (hit_p[2] * 22.0 - time * 9.0).cos()) * 0.04 * puddle;
                        let n = norm3([ripple, 1.0, ripple * 0.7]);

                        let refl_rd = norm3([
                            rd[0] - 2.0 * dot3(rd, n) * n[0],
                            rd[1] - 2.0 * dot3(rd, n) * n[1],
                            rd[2] - 2.0 * dot3(rd, n) * n[2],
                        ]);

                        let base_col = if center_line {
                            [1.0f32, 0.75, 0.10]
                        } else if curb_line {
                            [0.4f32, 0.85, 1.0]
                        } else {
                            [0.05f32, 0.06, 0.09]
                        };

                        let mut refl_col = [0.015f32, 0.025, 0.06];

                        // Neón cian en edificio izquierdo
                        if refl_rd[0] < -0.1 && refl_rd[1] > 0.05 {
                            let sign_y = refl_rd[1] * 10.0;
                            if sign_y > 2.0 && sign_y < 7.0 {
                                refl_col[0] += 0.05;
                                refl_col[1] += 0.85;
                                refl_col[2] += 1.0;
                            }
                        }

                        // Neón magenta en edificio derecho
                        if refl_rd[0] > 0.1 && refl_rd[1] > 0.05 {
                            let sign_y = refl_rd[1] * 10.0;
                            if sign_y > 1.5 && sign_y < 6.5 {
                                refl_col[0] += 0.95;
                                refl_col[1] += 0.15;
                                refl_col[2] += 0.85;
                            }
                        }

                        // Farolas ámbar
                        let lamp_z = ((hit_p[2] % 8.0) + 8.0) % 8.0 - 4.0;
                        let lamp_glow = 0.04 / (lamp_z.abs() + 0.3);
                        refl_col[0] += 1.0 * lamp_glow;
                        refl_col[1] += 0.7 * lamp_glow;
                        refl_col[2] += 0.15 * lamp_glow;

                        let cos_theta = (-rd[1]).clamp(0.0, 1.0);
                        let fresnel = 0.25 + 0.75 * (1.0 - cos_theta).powi(3);
                        let wet_factor = if is_puddle { 0.85 } else { 0.35 };
                        let fog_factor = (-t_ground * 0.07).exp().clamp(0.0, 1.0);

                        r = (base_col[0] * (1.0 - fresnel * wet_factor) + refl_col[0] * fresnel * wet_factor) * fog_factor + fog_color[0] * (1.0 - fog_factor);
                        g = (base_col[1] * (1.0 - fresnel * wet_factor) + refl_col[1] * fresnel * wet_factor) * fog_factor + fog_color[1] * (1.0 - fog_factor);
                        b = (base_col[2] * (1.0 - fresnel * wet_factor) + refl_col[2] * fresnel * wet_factor) * fog_factor + fog_color[2] * (1.0 - fog_factor);
                    }
                } else {
                    let sky_grad = (rd[1] * 0.7).clamp(0.0, 1.0);
                    r = fog_color[0] + 0.01 * sky_grad;
                    g = fog_color[1] + 0.02 * sky_grad;
                    b = fog_color[2] + 0.07 * sky_grad;

                    if rd[0].abs() > 0.15 {
                        let t_bldg = (3.5 - ro[0].abs()) / rd[0].abs();
                        if t_bldg > 0.0 && t_bldg < 35.0 {
                            let bldg_y = ro[1] + rd[1] * t_bldg;
                            let bldg_z = ro[2] + rd[2] * t_bldg;
                            if bldg_y > 0.0 {
                                let win_x = ((bldg_z * 1.5).floor() as i32).abs() % 3 == 0;
                                let win_y = ((bldg_y * 1.8).floor() as i32).abs() % 4 == 0;
                                if win_x && win_y {
                                    let win_amber = (bldg_z * 0.7).sin() > 0.0;
                                    if win_amber {
                                        r += 0.85; g += 0.65; b += 0.20;
                                    } else {
                                        r += 0.20; g += 0.75; b += 0.95;
                                    }
                                }

                                if rd[0] < 0.0 && bldg_y > 3.0 && bldg_y < 6.0 && ((bldg_z * 0.3).sin() > 0.2) {
                                    r += 0.1; g += 0.85; b += 1.0;
                                } else if rd[0] > 0.0 && bldg_y > 2.5 && bldg_y < 5.5 && ((bldg_z * 0.35).cos() > 0.2) {
                                    r += 0.95; g += 0.15; b += 0.8;
                                }
                            }
                        }
                    }
                }

                // Vetas de lluvia diagonal
                let rain_x = uv_x * 8.0 + uv_y * 1.8 + time * 12.0;
                let rain_y = uv_y * 14.0 + time * 24.0;
                let rain_streak = ((rain_x * 4.0).sin() * (rain_y % 1.0).sin()).max(0.0).powi(6);
                let rain_glow = rain_streak * 0.18;

                r += rain_glow * 0.7;
                g += rain_glow * 0.9;
                b += rain_glow * 1.1;

                let px_idx = x * 3;
                row[px_idx] = (r.min(1.0) * 255.0) as u8;
                row[px_idx + 1] = (g.min(1.0) * 255.0) as u8;
                row[px_idx + 2] = (b.min(1.0) * 255.0) as u8;
            }
        });

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
// RENDERIZADOR 4: Rayos Tesla / Bobina de Plasma Radial en Coordenadas Polares
// =========================================================================

pub fn render_tesla_coil_parallel(time: f32, width: usize, height: usize) -> Bytes {
    let mut rgb_buf = vec![0u8; width * height * 3];
    let inv_w = 1.0 / (width as f32);
    let inv_h = 1.0 / (height as f32);
    let aspect = (width as f32) / (height as f32);

    let col_blue = [0.12f32, 0.40, 1.0];
    let col_cyan = [0.0f32, 0.95, 1.0];
    let col_violet = [0.75f32, 0.20, 1.0];

    rgb_buf
        .par_chunks_mut(width * 3)
        .enumerate()
        .for_each(|(y, row)| {
            let uv_y = (0.5 - (y as f32) * inv_h) * 2.0;

            for x in 0..width {
                let uv_x = ((x as f32) * inv_w - 0.5) * 2.0 * aspect;

                let r = (uv_x * uv_x + uv_y * uv_y).sqrt();
                let theta = uv_y.atan2(uv_x);

                // Núcleo central de plasma incandescente
                let core_glow = 0.025 / (r * r * 16.0 + 0.012);
                let core_disc = (1.0 - r / 0.15).max(0.0).powi(2) * 1.8;

                let mut arc_glow = 0.0f32;
                let mut arc_core = 0.0f32;

                // 8 arcos voltaicos radiales caóticos
                for i in 0..8 {
                    let fi = i as f32;
                    let dir = if i % 2 == 0 { 1.0 } else { -1.0 };
                    let base_angle = fi * (std::f32::consts::PI * 2.0 / 8.0) + time * 0.45 * dir;

                    let angle_offset = 0.32 * (r * 12.0 - time * 9.0 + fi * 1.8).sin()
                        + 0.14 * (r * 26.0 + time * 15.0 - fi).cos();

                    let mut d_theta = (theta - (base_angle + angle_offset)).abs();
                    if d_theta > std::f32::consts::PI {
                        d_theta = 2.0 * std::f32::consts::PI - d_theta;
                    }

                    let dist = d_theta * r;
                    let intensity = (0.0035 / (dist * dist * 80.0 + dist * 4.0 + 0.002)) * (1.0 - r * 0.4).max(0.0);
                    let filament = (1.0 - dist / 0.018).max(0.0).powi(2) * (1.0 - r * 0.5).max(0.0);

                    arc_glow += intensity;
                    arc_core += filament;
                }

                // Chispas periféricas de alta frecuencia
                let spark_noise = ((theta * 16.0 + time * 28.0).sin() * (r * 32.0 - time * 14.0).cos()).max(0.0).powi(7);
                let sparks = spark_noise * (r > 0.35 && r < 1.1) as u32 as f32 * 0.8;

                let red = col_blue[0] * arc_glow + col_cyan[0] * arc_core + core_disc + core_glow * col_violet[0] + sparks * 0.8;
                let green = col_blue[1] * arc_glow + col_cyan[1] * arc_core + core_disc + core_glow * col_violet[1] + sparks * 0.95;
                let blue = col_blue[2] * arc_glow + col_cyan[2] * arc_core + core_disc + core_glow * 1.2 + sparks * 1.2;

                let px_idx = x * 3;
                row[px_idx] = (red.min(1.0) * 255.0) as u8;
                row[px_idx + 1] = (green.min(1.0) * 255.0) as u8;
                row[px_idx + 2] = (blue.min(1.0) * 255.0) as u8;
            }
        });

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
// RENDERIZADOR 5: Tormenta de Relámpagos Bifurcados (Forked Lightning)
// =========================================================================

pub fn render_lightning_storm_parallel(time: f32, width: usize, height: usize) -> Bytes {
    let mut rgb_buf = vec![0u8; width * height * 3];
    let inv_w = 1.0 / (width as f32);
    let inv_h = 1.0 / (height as f32);
    let aspect = (width as f32) / (height as f32);

    let t_cycle = time % 1.7;
    let flash = (-t_cycle * 9.0).exp() * 0.42;
    let strike = if t_cycle < 0.32 {
        (1.0 - t_cycle / 0.32).powi(2)
    } else {
        0.0
    };

    let storm_seed = (time / 1.7).floor() * 17.31;

    rgb_buf
        .par_chunks_mut(width * 3)
        .enumerate()
        .for_each(|(y, row)| {
            let uv_y = (0.5 - (y as f32) * inv_h) * 2.0;

            for x in 0..width {
                let uv_x = ((x as f32) * inv_w - 0.5) * 2.0 * aspect;

                let bolt_x = 0.35 * (uv_y * 4.5 + storm_seed).sin()
                    + 0.16 * (uv_y * 14.0 - storm_seed * 1.3).cos()
                    + 0.05 * (uv_y * 38.0 + storm_seed * 2.1).sin();

                let dist_main = (uv_x - bolt_x).abs();

                let branch1_x = bolt_x - (uv_y + 0.25) * 0.75 + 0.1 * (uv_y * 18.0).sin();
                let dist_br1 = if uv_y > -0.25 { (uv_x - branch1_x).abs() } else { 10.0 };

                let branch2_x = bolt_x + (uv_y - 0.1) * 0.85 + 0.08 * (uv_y * 22.0).cos();
                let dist_br2 = if uv_y > 0.1 { (uv_x - branch2_x).abs() } else { 10.0 };

                let branch3_x = bolt_x - (uv_y - 0.4) * 0.9 + 0.06 * (uv_y * 26.0).sin();
                let dist_br3 = if uv_y > 0.4 { (uv_x - branch3_x).abs() } else { 10.0 };

                let glow_main = 0.009 / (dist_main * dist_main * 70.0 + dist_main * 4.5 + 0.003);
                let glow_branches = 0.004 / (dist_br1 * 40.0 + 0.008)
                    + 0.004 / (dist_br2 * 40.0 + 0.008)
                    + 0.003 / (dist_br3 * 45.0 + 0.008);

                let core_main = (1.0 - dist_main / 0.022).max(0.0).powi(2) * 1.5;
                let core_branches = (1.0 - dist_br1 / 0.016).max(0.0).powi(2)
                    + (1.0 - dist_br2 / 0.016).max(0.0).powi(2);

                let cloud_noise = ((uv_x * 3.0).sin() * (uv_y * 2.5 + time * 0.5).cos() * 0.5 + 0.5) * 0.08;
                let sky_r = 0.03 + flash * 0.45 + cloud_noise;
                let sky_g = 0.02 + flash * 0.35 + cloud_noise;
                let sky_b = 0.07 + flash * 0.65 + cloud_noise;

                let total_glow = (glow_main + glow_branches) * strike;
                let total_core = (core_main + core_branches) * strike;

                let red = sky_r + total_glow * 0.3 + total_core;
                let green = sky_g + total_glow * 0.85 + total_core;
                let blue = sky_b + total_glow * 1.1 + total_core;

                let px_idx = x * 3;
                row[px_idx] = (red.min(1.0) * 255.0) as u8;
                row[px_idx + 1] = (green.min(1.0) * 255.0) as u8;
                row[px_idx + 2] = (blue.min(1.0) * 255.0) as u8;
            }
        });

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
// RENDERIZADOR 6: Red Neuronal Sináptica y Malla Cuántica
// =========================================================================

pub fn render_synaptic_lattice_parallel(time: f32, width: usize, height: usize) -> Bytes {
    let mut rgb_buf = vec![0u8; width * height * 3];
    let inv_w = 1.0 / (width as f32);
    let inv_h = 1.0 / (height as f32);
    let aspect = (width as f32) / (height as f32);

    let mut nodes = [[0.0f32; 2]; 12];
    for i in 0..12 {
        let fi = i as f32;
        let speed = 0.4 + fi * 0.08;
        let phase = fi * 1.047;
        nodes[i] = [
            (time * speed + phase).sin() * 0.75 * aspect,
            (time * (speed * 1.3) + phase * 1.7).cos() * 0.65,
        ];
    }

    rgb_buf
        .par_chunks_mut(width * 3)
        .enumerate()
        .for_each(|(y, row)| {
            let uv_y = (0.5 - (y as f32) * inv_h) * 2.0;

            for x in 0..width {
                let uv_x = ((x as f32) * inv_w - 0.5) * 2.0 * aspect;

                let mut node_glow = 0.0f32;
                let mut arc_glow = 0.0f32;
                let mut pulse_glow = 0.0f32;

                for i in 0..12 {
                    let dx = uv_x - nodes[i][0];
                    let dy = uv_y - nodes[i][1];
                    let dist = (dx * dx + dy * dy).sqrt();
                    node_glow += 0.003 / (dist * dist * 45.0 + dist * 3.0 + 0.005);
                }

                for i in 0..12 {
                    let next = (i + 1) % 12;
                    let p1 = nodes[i];
                    let p2 = nodes[next];

                    let seg_x = p2[0] - p1[0];
                    let seg_y = p2[1] - p1[1];
                    let seg_len_sq = seg_x * seg_x + seg_y * seg_y;

                    if seg_len_sq > 1e-4 {
                        let t = (((uv_x - p1[0]) * seg_x + (uv_y - p1[1]) * seg_y) / seg_len_sq).clamp(0.0, 1.0);
                        let proj_x = p1[0] + t * seg_x;
                        let proj_y = p1[1] + t * seg_y;

                        let dist_seg = ((uv_x - proj_x).powi(2) + (uv_y - proj_y).powi(2)).sqrt();
                        arc_glow += 0.0018 / (dist_seg * dist_seg * 120.0 + dist_seg * 6.0 + 0.003);

                        let pulse_t = (time * 1.8 + (i as f32) * 0.7) % 1.0;
                        let pulse_x = p1[0] + pulse_t * seg_x;
                        let pulse_y = p1[1] + pulse_t * seg_y;
                        let dist_pulse = ((uv_x - pulse_x).powi(2) + (uv_y - pulse_y).powi(2)).sqrt();
                        pulse_glow += 0.004 / (dist_pulse * dist_pulse * 60.0 + dist_pulse * 3.5 + 0.004);
                    }
                }

                let red = arc_glow * 1.0 + node_glow * 0.9 + pulse_glow * 1.0;
                let green = arc_glow * 0.65 + node_glow * 1.0 + pulse_glow * 0.95;
                let blue = arc_glow * 0.15 + node_glow * 0.7 + pulse_glow * 0.4;

                let px_idx = x * 3;
                row[px_idx] = (red.min(1.0) * 255.0) as u8;
                row[px_idx + 1] = (green.min(1.0) * 255.0) as u8;
                row[px_idx + 2] = (blue.min(1.0) * 255.0) as u8;
            }
        });

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
