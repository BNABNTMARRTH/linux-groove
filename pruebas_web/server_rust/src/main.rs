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
    frame_sender: broadcast::Sender<Bytes>,
}

#[tokio::main]
async fn main() {
    println!("===========================================================");
    println!("  🎷 LINUX GROOVE - RUST PIXEL STREAMER & WEB ENGINE");
    println!("  Cero JavaScript en el Cliente | 60 FPS Nativo | CSS Scroll");
    println!("===========================================================");

    // Canal de difusión broadcast para múltiples clientes concurrentes
    let (tx, _rx) = broadcast::channel::<Bytes>(16);
    let state = Arc::new(AppState {
        frame_sender: tx.clone(),
    });

    // Tarea asíncrona de renderizado a 60 FPS
    let tx_render = tx.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_millis(16)); // ~60 FPS
        let mut time: f32 = 0.0;
        let width = 640;
        let height = 360;

        loop {
            interval.tick().await;
            time += 0.025; // Avance temporal fluido

            // Renderizar el frame de los rayos eléctricos (GLSL procedural en Rust)
            let jpeg_bytes = render_electric_rays_frame(time, width, height);

            // Transmitir a todos los clientes web conectados
            let _ = tx_render.send(jpeg_bytes);
        }
    });

    // Rutas HTTP: /stream para video MJPEG en vivo, y archivos estáticos desde public/
    let public_dir = std::env::var("GROOVE_PUBLIC_DIR").unwrap_or_else(|_| "../public".to_string());
    println!("📁 Sirviendo contenido estático desde: {}", public_dir);

    let app = Router::new()
        .route("/stream", get(stream_handler))
        .fallback_service(ServeDir::new(public_dir))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8088);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    println!("📡 Servidor activo en http://localhost:{}", port);
    println!("🌐 Visualiza la web en tu navegador: http://localhost:{}/index.html", port);

    let listener = tokio::net::TcpListener::bind(addr).await.expect("Error al enlazar socket");
    axum::serve(listener, app).await.expect("Error en el servidor");
}

/// Handler HTTP para streaming continuo multipart/x-mixed-replace (Nativo HTML5 sin JS)
async fn stream_handler(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let rx = state.frame_sender.subscribe();
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

/// Generador procedural de los rayos eléctricos de Linux Groove (Fórmulas idénticas al shader ribbons.frag)
fn render_electric_rays_frame(time: f32, width: usize, height: usize) -> Bytes {
    let mut rgb_buf = vec![0u8; width * height * 3];
    let inv_w = 1.0 / (width as f32);
    let inv_h = 1.0 / (height as f32);

    // Paleta cromática de los rayos eléctricos
    let col_cyan = [0.0f32, 0.90, 1.0];
    let col_magenta = [0.90f32, 0.20, 1.0];
    let col_amber = [1.0f32, 0.65, 0.05];

    for y in 0..height {
        let uv_y = (y as f32) * inv_h - 0.5; // [-0.5, 0.5]
        let row_idx = y * width * 3;

        for x in 0..width {
            let uv_x = (x as f32) * inv_w - 0.5; // [-0.5, 0.5]

            let mut r = 0.0f32;
            let mut g = 0.0f32;
            let mut b = 0.0f32;

            // 3 conjuntos de rayos eléctricos ondulantes libres
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

                // Forma de rayo eléctrico mediante suma armónica de senos
                let wave_y = 0.28 * (uv_x * 6.0 + t * 1.5).sin()
                    + 0.12 * (uv_x * 14.0 - t * 2.3 + fk).cos()
                    + 0.05 * (uv_x * 28.0 + t * 4.1).sin();

                let dist = (uv_y - wave_y).abs();

                // Intensidad luminosa y núcleo blanco incandescente
                let glow = 0.012 / (dist * dist * 45.0 + dist * 3.5 + 0.008);
                let core = (1.0 - dist / 0.035).max(0.0).powi(2) * 1.4;

                r += col[0] * glow + core;
                g += col[1] * glow + core;
                b += col[2] * glow + core;
            }

            // Mapeo tonal y saturación
            let px_idx = row_idx + x * 3;
            rgb_buf[px_idx] = (r.min(1.0) * 255.0) as u8;
            rgb_buf[px_idx + 1] = (g.min(1.0) * 255.0) as u8;
            rgb_buf[px_idx + 2] = (b.min(1.0) * 255.0) as u8;
        }
    }

    // Compresión JPEG con jpeg_encoder a memoria
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
