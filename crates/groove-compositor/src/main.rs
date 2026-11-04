use colored::*;
use std::io::{self, Write};
use std::thread;
use std::time::Duration;

fn main() {
    print_banner();

    println!("\n{}", "🎷 [GROOVE COMPOSITOR] Modo Interactivo Blue Note iniciado.".bold().truecolor(212, 175, 55));
    println!("Escribe un comando o presiona Enter para ver la animación del vúmetro.");
    println!("Comandos: [vu] [tuner] [ensembles] [palette] [clear] [exit]\n");

    loop {
        print!("{}", "groove@bluenote:~$ ".bold().green());
        io::stdout().flush().unwrap();

        let mut input = String::new();
        if io::stdin().read_line(&mut input).is_err() {
            break;
        }

        let cmd = input.trim();
        if cmd.is_empty() {
            animate_vu_meters(5);
            continue;
        }

        match cmd {
            "exit" | "quit" => {
                println!("{}", "🎷 Hasta luego. Keep on groovin'!".truecolor(212, 175, 55));
                break;
            }
            "clear" => {
                print!("\x1B[2J\x1B[1;1H");
                print_banner();
            }
            "vu" => {
                animate_vu_meters(12);
            }
            "tuner" => {
                println!("{}", "🎵 [groove-tuner] Frecuencia base de afinación: 440.00 Hz (A4 Concert Pitch)".bold().cyan());
                println!("   Metrónomo: 120 BPM - Swing 62% (Bebop Mode)");
                println!("   Latencia DSP: 0.8 ms | Buffer: 64 samples | Xruns: 0");
            }
            "ensembles" => {
                println!("{}", "🎛️  GROOVE ENSEMBLES (ESTUDIOS CREATIVOS MONTABLES):".bold().truecolor(212, 175, 55));
                println!("  1. {} - Ardour 8, Carla, PipeWire RT, Jack2, Synth DSP", "jazz-audio.ensemble".bold().green());
                println!("  2. {} - Inkscape, GIMP, Krita, FontManager", "visual-design.ensemble".bold().blue());
                println!("  3. {} - Kdenlive, OBS Studio, FFmpeg HW-Accel", "cinema-video.ensemble".bold().magenta());
                println!("  4. {} - Darktable, RawTherapee, Exif Loupe en Rust", "darkroom-photo.ensemble".bold().yellow());
                println!("  5. {} - Rustc 1.99, Cargo, Helix Blue Note, Alacritty", "rust-dev.ensemble".bold().truecolor(224, 90, 71));
            }
            "palette" => {
                println!("{}", "🎨 PALETA OFICIAL BLUE NOTE (Velvet & Brass):".bold().truecolor(212, 175, 55));
                println!("   • Midnight Club : #0B0E17 (Fondo de terciopelo)");
                println!("   • Vinyl Groove  : #141926 (Superficies de ventanas)");
                println!("   • Warm Brass    : #D4AF37 (Acentos de bronce pulido)");
                println!("   • Bebop Coral   : #E05A47 (Picos de saturación)");
                println!("   • Cream Sleeve  : #F4EFE6 (Tipografía de partitura)");
            }
            "help" => {
                println!("Comandos disponibles: vu, tuner, ensembles, palette, clear, exit");
            }
            other => {
                println!("groove-compositor: ejecutando '{}' en shell...", other);
                if other == "uname -a" {
                    println!("Linux bluenote-groove 6.12.0-groove-rt #1 SMP PREEMPT_RT aarch64 GNU/Linux");
                } else if other == "sudo whoami" {
                    println!("🔐 [sudo-rs] root");
                } else {
                    println!("Comando '{}' reconocido. Escribe 'help' para ver más opciones.", other);
                }
            }
        }
    }
}

fn print_banner() {
    println!("{}", "🎷 ======================================================================".truecolor(212, 175, 55));
    println!("  {} - \"Velvet & Brass Shell\"", "LINUX GROOVE COMPOSITOR (WAYLAND)".bold().truecolor(244, 239, 230));
    println!("{}", "==========================================================================".truecolor(212, 175, 55));
    println!("  [Mode] Bebop Tiling (Auto) | Super+Space: Free Jazz Floating");
    println!("  [Topbar] [O] GROOVE  |  Take 1: Rhythm  |  VU: [||||||||..]  |  PipeWire RT");
    println!("  [Dock]   (Alacritty) (Ardour) (Inkscape) (Kdenlive) (Helix) (Installer)");
    println!("{}", "==========================================================================".truecolor(212, 175, 55));
}

fn animate_vu_meters(steps: usize) {
    println!("{}", "🎶 [Stereo Analog VU Meter - Live Stream]".bold().yellow());
    let levels = [
        (8, 7, "-4.2 dB"),
        (12, 11, "-2.1 dB"),
        (16, 15, "-0.8 dB"),
        (18, 17, "-0.1 dB"),
        (14, 13, "-1.5 dB"),
        (10, 9, "-3.4 dB"),
        (15, 14, "-1.0 dB"),
    ];

    for i in 0..steps {
        let (l, r, db) = levels[i % levels.len()];
        let bar_l: String = (0..20)
            .map(|idx| if idx < l { "▮" } else { " " })
            .collect();
        let bar_r: String = (0..20)
            .map(|idx| if idx < r { "▮" } else { " " })
            .collect();

        print!("\r  L: [{}]  R: [{}]  {}", 
            bar_l.truecolor(212, 175, 55), 
            bar_r.truecolor(212, 175, 55), 
            db.bold().truecolor(224, 90, 71)
        );
        io::stdout().flush().unwrap();
        thread::sleep(Duration::from_millis(120));
    }
    println!("\n");
}
