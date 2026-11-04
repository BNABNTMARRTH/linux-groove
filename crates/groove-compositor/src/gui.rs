use font8x8::{UnicodeFonts, BASIC_FONTS};
use minifb::{Key, Window, WindowOptions};
use std::f32::consts::PI;

const WIDTH: usize = 960;
const HEIGHT: usize = 600;

// Paleta Oficial Blue Note (Format 0x00RRGGBB)
const COLOR_BG: u32 = 0x07090F;           // Deep Void
const COLOR_VINYL: u32 = 0x0B0E17;        // Midnight Club
const COLOR_SURFACE: u32 = 0x141926;      // Vinyl Surface
const COLOR_BORDER: u32 = 0x2A3348;       // Window Border
const COLOR_BRASS: u32 = 0xD4AF37;        // Warm Brass
const COLOR_BRASS_LIGHT: u32 = 0xF3E5AB;  // Cream Brass
const COLOR_CORAL: u32 = 0xE05A47;        // Bebop Coral (Clip)
const COLOR_CREAM: u32 = 0xF4EFE6;        // Cream Sleeve
const COLOR_EMERALD: u32 = 0x10B981;      // Safe audio
const COLOR_SLATE: u32 = 0x94A3B8;        // Dim text
const COLOR_MUTED: u32 = 0x64748B;        // Muted text
const COLOR_RED_DOT: u32 = 0xEF4444;
const COLOR_YELLOW_DOT: u32 = 0xF59E0B;
const COLOR_GREEN_DOT: u32 = 0x10B981;

pub fn run_native_gui() {
    let mut buffer: Vec<u32> = vec![0; WIDTH * HEIGHT];

    let mut window = Window::new(
        "🎷 Linux Groove OS — The Blue Note Desktop Shell (Rust Native)",
        WIDTH,
        HEIGHT,
        WindowOptions {
            resize: false,
            scale: minifb::Scale::X1,
            ..WindowOptions::default()
        },
    )
    .expect("No se pudo abrir la ventana nativa de macOS");

    window.set_target_fps(60);

    let mut frame_count: usize = 0;
    let mut vinyl_angle: f32 = 0.0;
    let mut active_ensemble = 0; // 0: Audio, 1: Design, 2: Video, 3: Photo, 4: Rust
    let mut is_tiling = true;
    let mut tuner_active = true;

    while window.is_open() && !window.is_key_down(Key::Escape) {
        frame_count += 1;

        // Teclado interactivo
        if window.is_key_pressed(Key::Space, minifb::KeyRepeat::No) {
            is_tiling = !is_tiling;
        }
        if window.is_key_pressed(Key::Key1, minifb::KeyRepeat::No) { active_ensemble = 0; }
        if window.is_key_pressed(Key::Key2, minifb::KeyRepeat::No) { active_ensemble = 1; }
        if window.is_key_pressed(Key::Key3, minifb::KeyRepeat::No) { active_ensemble = 2; }
        if window.is_key_pressed(Key::Key4, minifb::KeyRepeat::No) { active_ensemble = 3; }
        if window.is_key_pressed(Key::Key5, minifb::KeyRepeat::No) { active_ensemble = 4; }
        if window.is_key_pressed(Key::T, minifb::KeyRepeat::No) { tuner_active = !tuner_active; }

        // Giro del vinilo
        if tuner_active {
            vinyl_angle += 0.05;
            if vinyl_angle > 2.0 * PI { vinyl_angle -= 2.0 * PI; }
        }

        // Simulación de vúmetro estéreo rebotando
        let jitter = ((frame_count as f32 * 0.15).sin() * 0.2) + ((frame_count as f32 * 0.37).cos() * 0.1);
        let vu_level_l = (0.65 + jitter).clamp(0.1, 0.98);
        let vu_level_r = (0.60 + jitter * 0.9 + 0.04).clamp(0.1, 0.98);

        // 1. Limpiar fondo
        buffer.fill(COLOR_BG);

        // 2. Barra Superior (Top Vinyl Bar)
        draw_rect(&mut buffer, 0, 0, WIDTH, 42, COLOR_VINYL);
        draw_line_h(&mut buffer, 0, WIDTH, 42, COLOR_BRASS);

        // Logo e Identidad
        draw_circle(&mut buffer, 24, 21, 10, COLOR_BRASS);
        draw_circle(&mut buffer, 24, 21, 4, COLOR_CORAL);
        draw_text(&mut buffer, 42, 14, "LINUX GROOVE", COLOR_CREAM, 2);
        draw_rect(&mut buffer, 245, 13, 62, 17, 0x1E293B);
        draw_text(&mut buffer, 252, 17, "RT 6.12", COLOR_BRASS, 1);

        // Vúmetro estéreo L & R
        draw_text(&mut buffer, 325, 17, "VU L/R", COLOR_BRASS, 1);
        draw_vu_meter(&mut buffer, 375, 14, 120, 6, vu_level_l);
        draw_vu_meter(&mut buffer, 375, 23, 120, 6, vu_level_r);
        let db_str = format!("{:+.1}dB", (vu_level_l * 12.0 - 12.0));
        draw_text(&mut buffer, 502, 17, &db_str, if vu_level_l > 0.9 { COLOR_CORAL } else { COLOR_BRASS }, 1);

        // Telemetría DSP
        draw_circle(&mut buffer, 570, 21, 4, COLOR_EMERALD);
        draw_text(&mut buffer, 580, 17, "0.8ms 48kHz (0 xruns)", COLOR_SLATE, 1);

        // Conmutador de Modo de Ventana
        let mode_name = if is_tiling { "[Bebop Tiling]" } else { "[Free Jazz Floating]" };
        let mode_c = if is_tiling { COLOR_EMERALD } else { COLOR_CORAL };
        draw_text(&mut buffer, 765, 17, mode_name, mode_c, 1);

        // 3. Ventanas de Trabajo (Tiled / Floating)
        if is_tiling {
            // Ventana Izquierda: Terminal Alacritty con Userspace Rust
            render_terminal_window(&mut buffer, 20, 56, 550, 465, frame_count);

            // Ventana Derecha: Panel de Estudios Creativos y Afinador
            render_studio_panel(&mut buffer, 585, 56, 355, 465, active_ensemble, vinyl_angle, tuner_active);
        } else {
            // Free Jazz Floating Mode
            render_studio_panel(&mut buffer, 480, 75, 450, 440, active_ensemble, vinyl_angle, tuner_active);
            render_terminal_window(&mut buffer, 30, 65, 570, 455, frame_count);
        }

        // 4. The Brass Dock (Lanzador Inferior)
        render_dock(&mut buffer, active_ensemble);

        // Actualizar el framebuffer de la ventana en pantalla
        window.update_with_buffer(&buffer, WIDTH, HEIGHT).unwrap();
    }
}

// -------------------------------------------------------------
// MOTOR DE RASTERIZACIÓN DE TIPOGRAFÍAS EN FRAMEBUFFER
// -------------------------------------------------------------
fn draw_text(buf: &mut [u32], start_x: usize, start_y: usize, text: &str, color: u32, scale: usize) {
    let mut cursor_x = start_x;

    for ch in text.chars() {
        if ch == '\n' {
            continue;
        }
        if let Some(glyph) = BASIC_FONTS.get(ch) {
            for (row, byte) in glyph.iter().enumerate() {
                for col in 0..8 {
                    if (byte >> col) & 1 == 1 {
                        // Dibujar pixel escalado
                        for sy in 0..scale {
                            let py = start_y + row * scale + sy;
                            if py >= HEIGHT { continue; }
                            let row_start = py * WIDTH;
                            for sx in 0..scale {
                                let px = cursor_x + col * scale + sx;
                                if px < WIDTH {
                                    buf[row_start + px] = color;
                                }
                            }
                        }
                    }
                }
            }
        }
        cursor_x += 8 * scale;
    }
}

// -------------------------------------------------------------
// DIBUJO GEOMÉTRICO BÁSICO (PRIMITIVAS RÁPIDAS)
// -------------------------------------------------------------
fn draw_rect(buf: &mut [u32], x: usize, y: usize, w: usize, h: usize, color: u32) {
    for cy in y..(y + h).min(HEIGHT) {
        let row_start = cy * WIDTH;
        for cx in x..(x + w).min(WIDTH) {
            buf[row_start + cx] = color;
        }
    }
}

fn draw_line_h(buf: &mut [u32], x1: usize, x2: usize, y: usize, color: u32) {
    if y >= HEIGHT { return; }
    let row_start = y * WIDTH;
    for cx in x1..x2.min(WIDTH) {
        buf[row_start + cx] = color;
    }
}

fn draw_circle(buf: &mut [u32], cx: usize, cy: usize, radius: usize, color: u32) {
    let r2 = (radius * radius) as isize;
    let r = radius as isize;
    for dy in -r..=r {
        let y = cy as isize + dy;
        if y < 0 || y >= HEIGHT as isize { continue; }
        let row_start = (y as usize) * WIDTH;
        for dx in -r..=r {
            let x = cx as isize + dx;
            if x < 0 || x >= WIDTH as isize { continue; }
            if dx * dx + dy * dy <= r2 {
                buf[row_start + x as usize] = color;
            }
        }
    }
}

fn draw_vu_meter(buf: &mut [u32], x: usize, y: usize, w: usize, h: usize, level: f32) {
    draw_rect(buf, x, y, w, h, COLOR_SURFACE);
    let fill_w = (w as f32 * level) as usize;
    for cx in 0..fill_w {
        let pos = cx as f32 / w as f32;
        let c = if pos < 0.70 {
            COLOR_EMERALD // Safe green
        } else if pos < 0.90 {
            COLOR_BRASS   // Warm brass
        } else {
            COLOR_CORAL   // Peak Bebop coral
        };
        for cy in y..(y + h).min(HEIGHT) {
            buf[cy * WIDTH + x + cx] = c;
        }
    }
}

// -------------------------------------------------------------
// RENDERIZADO DE VENTANA TERMINAL (ALACRITTY + RUST USERSPACE)
// -------------------------------------------------------------
fn render_terminal_window(buf: &mut [u32], x: usize, y: usize, w: usize, h: usize, frame: usize) {
    // Cuerpo y Borde
    draw_rect(buf, x, y, w, h, COLOR_VINYL);
    draw_line_h(buf, x, x + w, y, COLOR_BORDER);
    draw_line_h(buf, x, x + w, y + h - 1, COLOR_BORDER);
    for cy in y..y + h {
        buf[cy * WIDTH + x] = COLOR_BORDER;
        buf[cy * WIDTH + x + w - 1] = COLOR_BORDER;
    }

    // Titlebar
    draw_rect(buf, x + 1, y + 1, w - 2, 28, COLOR_SURFACE);
    draw_line_h(buf, x, x + w, y + 29, COLOR_BORDER);

    // Botones de ventana (Traffic lights)
    draw_circle(buf, x + 16, y + 14, 5, COLOR_RED_DOT);
    draw_circle(buf, x + 32, y + 14, 5, COLOR_YELLOW_DOT);
    draw_circle(buf, x + 48, y + 14, 5, COLOR_GREEN_DOT);

    draw_text(buf, x + 68, y + 10, "alacritty -- groove@bluenote:~ (Rust Userspace)", COLOR_CREAM, 1);

    // Texto real en la terminal
    let term_x = x + 16;
    let mut term_y = y + 42;

    draw_text(buf, term_x, term_y, "Linux Groove OS 0.1.0 - The Blue Note Edition", COLOR_BRASS, 1);
    term_y += 16;

    draw_text(buf, term_x, term_y, "Kernel: 6.12.0-groove-rt | PID 1: groove-init (Rust)", COLOR_MUTED, 1);
    term_y += 20;

    // Comando 1: uname -a
    draw_text(buf, term_x, term_y, "groove@bluenote:~$ ", COLOR_EMERALD, 1);
    draw_text(buf, term_x + 19 * 8, term_y, "uname -a", COLOR_CREAM, 1);
    term_y += 14;
    draw_text(buf, term_x, term_y, "Linux bluenote-groove 6.12.0-groove-rt aarch64", COLOR_SLATE, 1);
    term_y += 20;

    // Comando 2: uutils/coreutils
    draw_text(buf, term_x, term_y, "groove@bluenote:~$ ", COLOR_EMERALD, 1);
    draw_text(buf, term_x + 19 * 8, term_y, "coreutils --version", COLOR_CREAM, 1);
    term_y += 14;
    draw_text(buf, term_x, term_y, "coreutils 0.13.0 (multi-call binary - pure Rust)", COLOR_SLATE, 1);
    term_y += 20;

    // Comando 3: sudo whoami (sudo-rs)
    draw_text(buf, term_x, term_y, "groove@bluenote:~$ ", COLOR_EMERALD, 1);
    draw_text(buf, term_x + 19 * 8, term_y, "sudo whoami", COLOR_CREAM, 1);
    term_y += 14;
    draw_text(buf, term_x, term_y, "root (uid=0) [auth via sudo-rs & PAM]", COLOR_CORAL, 1);
    term_y += 20;

    // Comando 4: groove-session
    draw_text(buf, term_x, term_y, "groove@bluenote:~$ ", COLOR_EMERALD, 1);
    draw_text(buf, term_x + 19 * 8, term_y, "groove-session list-ensembles", COLOR_CREAM, 1);
    term_y += 14;
    draw_text(buf, term_x, term_y, "* ensemble-jazz-audio: Ardour 8, Carla, PipeWire RT", COLOR_BRASS_LIGHT, 1);
    term_y += 14;
    draw_text(buf, term_x, term_y, "* ensemble-visual-design: Inkscape, GIMP, Krita", COLOR_MUTED, 1);
    term_y += 20;

    // Línea activa con cursor parpadeante
    draw_text(buf, term_x, term_y, "groove@bluenote:~$ ", COLOR_EMERALD, 1);
    draw_text(buf, term_x + 19 * 8, term_y, "groove-tuner --freq 440", COLOR_CREAM, 1);
    if (frame / 20) % 2 == 0 {
        draw_rect(buf, term_x + 43 * 8, term_y, 8, 10, COLOR_BRASS);
    }
}

// -------------------------------------------------------------
// RENDERIZADO DEL PANEL DERECHO (ESTUDIOS CREATIVOS Y VINILO)
// -------------------------------------------------------------
fn render_studio_panel(buf: &mut [u32], x: usize, y: usize, w: usize, h: usize, active_ens: usize, angle: f32, tuner_on: bool) {
    // Cuerpo y Borde
    draw_rect(buf, x, y, w, h, COLOR_VINYL);
    draw_line_h(buf, x, x + w, y, COLOR_BORDER);
    draw_line_h(buf, x, x + w, y + h - 1, COLOR_BORDER);
    for cy in y..y + h {
        buf[cy * WIDTH + x] = COLOR_BORDER;
        buf[cy * WIDTH + x + w - 1] = COLOR_BORDER;
    }

    // Titlebar
    draw_rect(buf, x + 1, y + 1, w - 2, 28, COLOR_SURFACE);
    draw_line_h(buf, x, x + w, y + 29, COLOR_BORDER);
    draw_circle(buf, x + 16, y + 14, 5, COLOR_BRASS);
    draw_text(buf, x + 30, y + 10, "STUDIO ENSEMBLES & TUNER", COLOR_CREAM, 1);

    // 1. Vinilo Giratorio
    let vinyl_cx = x + w / 2;
    let vinyl_cy = y + 95;
    let vinyl_r = 48;

    // Surcos de vinilo
    draw_circle(buf, vinyl_cx, vinyl_cy, vinyl_r, 0x05070B);
    draw_circle(buf, vinyl_cx, vinyl_cy, vinyl_r - 8, 0x141926);
    draw_circle(buf, vinyl_cx, vinyl_cy, vinyl_r - 16, 0x0A0D14);
    draw_circle(buf, vinyl_cx, vinyl_cy, vinyl_r - 24, 0x181F30);

    // Etiqueta central Blue Note
    draw_circle(buf, vinyl_cx, vinyl_cy, 18, COLOR_CORAL);
    draw_circle(buf, vinyl_cx, vinyl_cy, 4, COLOR_BRASS);

    // Aguja / Tonearm
    if tuner_on {
        let needle_x = (vinyl_cx as f32 + angle.cos() * 12.0) as usize;
        let needle_y = (vinyl_cy as f32 + angle.sin() * 12.0) as usize;
        draw_circle(buf, needle_x, needle_y, 3, COLOR_CREAM);
    }

    // Frecuencia de afinación y DSP
    draw_text(buf, x + 40, y + 155, "THE BEBOP TUNER: 440.00 Hz (A4)", COLOR_BRASS, 1);
    draw_text(buf, x + 40, y + 170, "SCHED_FIFO 98  |  Latency: 0.8ms", COLOR_EMERALD, 1);

    // 2. Lista de Ensembles Creativos
    let ens_names = [
        ("1. The Bebop Audio Studio", "Ardour 8, Carla, PipeWire RT"),
        ("2. The Modern Canvas",      "Inkscape, GIMP, Krita"),
        ("3. The Cinema Cut",         "Kdenlive, OBS Studio, FFmpeg"),
        ("4. The Darkroom Photo",     "Darktable, RawTherapee"),
        ("5. The Systems Workshop",   "Rustc 1.99, Cargo, Helix"),
    ];

    let mut ens_y = y + 195;

    for (idx, (name, apps)) in ens_names.iter().enumerate() {
        let is_active = idx == active_ens;
        let card_bg = if is_active { 0x1E2738 } else { 0x0F1420 };
        let border_c = if is_active { COLOR_BRASS } else { COLOR_BORDER };

        draw_rect(buf, x + 16, ens_y, w - 32, 44, card_bg);
        draw_line_h(buf, x + 16, x + w - 16, ens_y, border_c);
        draw_line_h(buf, x + 16, x + w - 16, ens_y + 43, border_c);

        let icon_c = match idx {
            0 => COLOR_BRASS,
            1 => 0x3B82F6,
            2 => 0xA855F7,
            3 => 0xF59E0B,
            _ => COLOR_CORAL,
        };
        draw_circle(buf, x + 30, ens_y + 22, 6, icon_c);

        draw_text(buf, x + 46, ens_y + 8, name, if is_active { COLOR_CREAM } else { COLOR_SLATE }, 1);
        draw_text(buf, x + 46, ens_y + 24, apps, COLOR_MUTED, 1);

        let status_txt = if is_active { "MONTADO" } else { "SquashFS" };
        let status_c = if is_active { COLOR_BRASS } else { 0x475569 };
        draw_text(buf, x + w - 90, ens_y + 16, status_txt, status_c, 1);

        ens_y += 50;
    }
}

// -------------------------------------------------------------
// RENDERIZADO DEL BRASS DOCK (LANZADOR INFERIOR)
// -------------------------------------------------------------
fn render_dock(buf: &mut [u32], active_ens: usize) {
    let dock_w = 480;
    let dock_h = 48;
    let dock_x = (WIDTH - dock_w) / 2;
    let dock_y = HEIGHT - dock_h - 12;

    draw_rect(buf, dock_x, dock_y, dock_w, dock_h, 0x0E121C);
    draw_line_h(buf, dock_x, dock_x + dock_w, dock_y, COLOR_BRASS);
    draw_line_h(buf, dock_x, dock_x + dock_w, dock_y + dock_h, COLOR_BORDER);

    let items = [
        ("Term", COLOR_EMERALD),
        ("Ardour", COLOR_BRASS),
        ("Design", 0x3B82F6),
        ("Video", 0xA855F7),
        ("Rust", COLOR_CORAL),
        ("Install", COLOR_BRASS_LIGHT),
    ];

    for (i, (label, color)) in items.iter().enumerate() {
        let ix = dock_x + 18 + i * 76;
        let iy = dock_y + 8;
        draw_rect(buf, ix, iy, 68, 30, 0x181F30);
        draw_circle(buf, ix + 12, iy + 15, 5, *color);
        draw_text(buf, ix + 22, iy + 11, label, COLOR_CREAM, 1);

        if i == active_ens {
            draw_circle(buf, ix + 34, iy + 33, 2, COLOR_BRASS);
        }
    }
}
