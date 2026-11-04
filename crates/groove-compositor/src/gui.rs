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
    let mut vu_level_l: f32;
    let mut vu_level_r: f32;
    let mut vinyl_angle: f32 = 0.0;
    let mut active_ensemble = 0; // 0: Audio, 1: Design, 2: Video, 3: Photo, 4: Rust
    let mut is_tiling = true;
    let mut tuner_active = true;

    while window.is_open() && !window.is_key_down(Key::Escape) {
        frame_count += 1;

        // Input handling
        if window.is_key_pressed(Key::Space, minifb::KeyRepeat::No) {
            is_tiling = !is_tiling;
        }
        if window.is_key_pressed(Key::Key1, minifb::KeyRepeat::No) { active_ensemble = 0; }
        if window.is_key_pressed(Key::Key2, minifb::KeyRepeat::No) { active_ensemble = 1; }
        if window.is_key_pressed(Key::Key3, minifb::KeyRepeat::No) { active_ensemble = 2; }
        if window.is_key_pressed(Key::Key4, minifb::KeyRepeat::No) { active_ensemble = 3; }
        if window.is_key_pressed(Key::Key5, minifb::KeyRepeat::No) { active_ensemble = 4; }
        if window.is_key_pressed(Key::T, minifb::KeyRepeat::No) { tuner_active = !tuner_active; }

        // Animation updates
        if tuner_active {
            vinyl_angle += 0.05;
            if vinyl_angle > 2.0 * PI { vinyl_angle -= 2.0 * PI; }
        }

        // Bouncing VU meters
        let jitter = ((frame_count as f32 * 0.15).sin() * 0.2) + ((frame_count as f32 * 0.37).cos() * 0.1);
        vu_level_l = (0.65 + jitter).clamp(0.1, 0.98);
        vu_level_r = (0.60 + jitter * 0.9 + 0.04).clamp(0.1, 0.98);

        // 1. Clear background
        buffer.fill(COLOR_BG);

        // 2. Render Top Vinyl Bar (Height: 42px)
        draw_rect(&mut buffer, 0, 0, WIDTH, 42, COLOR_VINYL);
        draw_line_h(&mut buffer, 0, WIDTH, 42, COLOR_BRASS);

        // Topbar: Logo / Blue Note Badge
        draw_circle(&mut buffer, 26, 21, 12, COLOR_BRASS);
        draw_circle(&mut buffer, 26, 21, 10, COLOR_VINYL);
        draw_circle(&mut buffer, 26, 21, 4, COLOR_CORAL);

        // Topbar: Real-Time Stereo VU Meter (L & R)
        draw_vu_meter(&mut buffer, 160, 14, 180, 7, vu_level_l);
        draw_vu_meter(&mut buffer, 160, 24, 180, 7, vu_level_r);

        // Topbar: DSP indicator (xruns: 0, 0.8ms)
        draw_rect(&mut buffer, 360, 12, 140, 20, COLOR_SURFACE);
        draw_circle(&mut buffer, 372, 22, 4, COLOR_EMERALD); // green dot
        draw_rect(&mut buffer, 384, 16, 50, 4, COLOR_BRASS);
        draw_rect(&mut buffer, 384, 23, 100, 3, COLOR_BORDER);

        // Topbar: Window mode tag
        let mode_color = if is_tiling { COLOR_EMERALD } else { COLOR_CORAL };
        draw_rect(&mut buffer, WIDTH - 220, 10, 120, 22, COLOR_SURFACE);
        draw_rect(&mut buffer, WIDTH - 220, 10, 120, 2, mode_color);

        // Topbar: Clock box
        draw_rect(&mut buffer, WIDTH - 80, 10, 65, 22, COLOR_SURFACE);

        // 3. Render Windows Area (Tiled or Floating)
        if is_tiling {
            // Window Left: Rust Userspace Terminal (Width 550)
            render_terminal_window(&mut buffer, 20, 58, 540, 460, frame_count);

            // Window Right: Ensembles & Tuner (Width 360)
            render_studio_panel(&mut buffer, 580, 58, 360, 460, active_ensemble, vinyl_angle, tuner_active);
        } else {
            // Free Jazz Floating Mode: Offset with overlapping effect
            render_studio_panel(&mut buffer, 480, 80, 440, 430, active_ensemble, vinyl_angle, tuner_active);
            render_terminal_window(&mut buffer, 40, 70, 580, 450, frame_count);
        }

        // 4. Render The Brass Dock (Bottom)
        render_dock(&mut buffer, active_ensemble);

        // Update the window framebuffer
        window
            .update_with_buffer(&buffer, WIDTH, HEIGHT)
            .unwrap();
    }
}

// Helpers de dibujo en framebuffer 32-bit (ARGB)
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

fn render_terminal_window(buf: &mut [u32], x: usize, y: usize, w: usize, h: usize, frame: usize) {
    // Window Body
    draw_rect(buf, x, y, w, h, COLOR_VINYL);
    // Window Border
    for cy in y..y + h {
        buf[cy * WIDTH + x] = COLOR_BORDER;
        buf[cy * WIDTH + x + w - 1] = COLOR_BORDER;
    }
    draw_line_h(buf, x, x + w, y, COLOR_BORDER);
    draw_line_h(buf, x, x + w, y + h - 1, COLOR_BORDER);

    // Titlebar
    draw_rect(buf, x + 1, y + 1, w - 2, 28, COLOR_SURFACE);
    draw_line_h(buf, x, x + w, y + 29, COLOR_BORDER);

    // Traffic light dots
    draw_circle(buf, x + 18, y + 14, 5, COLOR_RED_DOT);
    draw_circle(buf, x + 34, y + 14, 5, COLOR_YELLOW_DOT);
    draw_circle(buf, x + 50, y + 14, 5, COLOR_GREEN_DOT);

    // Simulated terminal text lines
    let term_x = x + 20;
    let mut term_y = y + 46;

    // Line 1: Welcome Header
    draw_rect(buf, term_x, term_y, 380, 8, COLOR_BRASS);
    term_y += 18;

    // Line 2: Kernel & Init
    draw_rect(buf, term_x, term_y, 440, 6, 0x64748B);
    term_y += 14;

    // Line 3: Shell Prompt
    draw_rect(buf, term_x, term_y, 110, 6, COLOR_EMERALD); // groove@bluenote:~$
    draw_rect(buf, term_x + 120, term_y, 70, 6, COLOR_CREAM); // uname -a
    term_y += 14;

    // Line 4: uname output
    draw_rect(buf, term_x, term_y, 480, 6, 0x94A3B8);
    term_y += 18;

    // Line 5: Prompt 2: coreutils
    draw_rect(buf, term_x, term_y, 110, 6, COLOR_EMERALD);
    draw_rect(buf, term_x + 120, term_y, 130, 6, COLOR_CREAM); // coreutils --version
    term_y += 14;

    // Line 6: coreutils 0.13 output
    draw_rect(buf, term_x, term_y, 320, 6, 0x94A3B8);
    term_y += 18;

    // Line 7: sudo-rs prompt
    draw_rect(buf, term_x, term_y, 110, 6, COLOR_EMERALD);
    draw_rect(buf, term_x + 120, term_y, 90, 6, COLOR_CREAM); // sudo whoami
    term_y += 14;
    draw_rect(buf, term_x, term_y, 140, 6, COLOR_CORAL); // root (uid=0)
    term_y += 18;

    // Line 8: Active Command line with blinking cursor
    draw_rect(buf, term_x, term_y, 110, 6, COLOR_EMERALD);
    draw_rect(buf, term_x + 120, term_y, 160, 6, COLOR_BRASS_LIGHT); // groove-session
    if (frame / 20) % 2 == 0 {
        draw_rect(buf, term_x + 285, term_y - 2, 7, 10, COLOR_BRASS); // cursor
    }
}

fn render_studio_panel(buf: &mut [u32], x: usize, y: usize, w: usize, h: usize, active_ens: usize, angle: f32, tuner_on: bool) {
    // Window Body & Border
    draw_rect(buf, x, y, w, h, COLOR_VINYL);
    for cy in y..y + h {
        buf[cy * WIDTH + x] = COLOR_BORDER;
        buf[cy * WIDTH + x + w - 1] = COLOR_BORDER;
    }
    draw_line_h(buf, x, x + w, y, COLOR_BORDER);
    draw_line_h(buf, x, x + w, y + h - 1, COLOR_BORDER);

    // Titlebar
    draw_rect(buf, x + 1, y + 1, w - 2, 28, COLOR_SURFACE);
    draw_line_h(buf, x, x + w, y + 29, COLOR_BORDER);
    draw_circle(buf, x + 18, y + 14, 5, COLOR_BRASS);

    // 1. Spinning Vinyl Record
    let vinyl_cx = x + w / 2;
    let vinyl_cy = y + 105;
    let vinyl_r = 55;

    // Outer Vinyl body (black grooves)
    draw_circle(buf, vinyl_cx, vinyl_cy, vinyl_r, 0x05070B);
    draw_circle(buf, vinyl_cx, vinyl_cy, vinyl_r - 8, 0x141926);
    draw_circle(buf, vinyl_cx, vinyl_cy, vinyl_r - 16, 0x0A0D14);
    draw_circle(buf, vinyl_cx, vinyl_cy, vinyl_r - 24, 0x181F30);

    // Center Red Label
    draw_circle(buf, vinyl_cx, vinyl_cy, 20, COLOR_CORAL);
    draw_circle(buf, vinyl_cx, vinyl_cy, 5, COLOR_BRASS);

    // Tonearm / Needle
    if tuner_on {
        let needle_x = vinyl_cx + (angle.cos() * 16.0) as usize;
        let needle_y = vinyl_cy + (angle.sin() * 16.0) as usize;
        draw_circle(buf, needle_x, needle_y, 3, COLOR_CREAM);
    }

    // 2. Frequency Bar: 440 Hz (Concert Pitch A4)
    draw_rect(buf, x + 30, y + 175, w - 60, 24, COLOR_SURFACE);
    draw_rect(buf, x + 40, y + 182, 120, 10, COLOR_BRASS); // 440.00 Hz badge
    draw_rect(buf, x + w - 110, y + 182, 60, 10, COLOR_EMERALD); // SCHED_FIFO

    // 3. Studio Ensembles Selection Cards
    let ens_names = ["1. The Bebop Audio Studio", "2. The Modern Canvas", "3. The Cinema Cut", "4. The Darkroom Photo", "5. The Systems Workshop (Rust)"];
    let mut ens_y = y + 215;

    for (idx, _name) in ens_names.iter().enumerate() {
        let is_active = idx == active_ens;
        let card_bg = if is_active { 0x1E2738 } else { 0x0F1420 };
        let border_c = if is_active { COLOR_BRASS } else { COLOR_BORDER };

        draw_rect(buf, x + 20, ens_y, w - 40, 36, card_bg);
        draw_line_h(buf, x + 20, x + w - 20, ens_y, border_c);
        draw_line_h(buf, x + 20, x + w - 20, ens_y + 35, border_c);

        // Icon indicator
        let icon_color = match idx {
            0 => COLOR_BRASS,
            1 => 0x3B82F6,
            2 => 0xA855F7,
            3 => 0xF59E0B,
            _ => COLOR_CORAL,
        };
        draw_circle(buf, x + 38, ens_y + 18, 7, icon_color);

        // Name and status bars
        draw_rect(buf, x + 56, ens_y + 10, 180, 6, if is_active { COLOR_CREAM } else { 0x64748B });
        draw_rect(buf, x + 56, ens_y + 20, 130, 4, 0x475569);

        // Status tag
        let status_c = if is_active { COLOR_BRASS } else { 0x334155 };
        draw_rect(buf, x + w - 85, ens_y + 12, 50, 12, status_c);

        ens_y += 44;
    }
}

fn render_dock(buf: &mut [u32], active_ens: usize) {
    let dock_w = 420;
    let dock_h = 52;
    let dock_x = (WIDTH - dock_w) / 2;
    let dock_y = HEIGHT - dock_h - 12;

    // Floating Glass Pill
    draw_rect(buf, dock_x, dock_y, dock_w, dock_h, 0x0E121C);
    draw_line_h(buf, dock_x, dock_x + dock_w, dock_y, COLOR_BRASS);
    draw_line_h(buf, dock_x, dock_x + dock_w, dock_y + dock_h, COLOR_BORDER);

    // 6 App Launcher Icons
    let icons = [
        (COLOR_EMERALD, "Terminal"),
        (COLOR_BRASS, "Ardour"),
        (0x3B82F6, "Inkscape"),
        (0xA855F7, "Kdenlive"),
        (COLOR_CORAL, "Helix"),
        (COLOR_BRASS_LIGHT, "Soundcheck"),
    ];

    for (i, (c, _)) in icons.iter().enumerate() {
        let ix = dock_x + 30 + i * 62;
        let iy = dock_y + 10;
        draw_rect(buf, ix, iy, 32, 32, 0x181F30);
        draw_line_h(buf, ix, ix + 32, iy, COLOR_BORDER);
        draw_circle(buf, ix + 16, iy + 16, 9, *c);

        // Active indicator dot
        if i == active_ens {
            draw_circle(buf, ix + 16, iy + 36, 2, COLOR_BRASS);
        }
    }
}
