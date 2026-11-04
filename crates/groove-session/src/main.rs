use clap::{Parser, Subcommand};
use colored::*;

#[derive(Parser)]
#[command(name = "groove-session")]
#[command(about = "Gestor de Ensembles Creativos para Linux Groove OS")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Lista los ensembles para creadores disponibles
    ListEnsembles,
    /// Ejecuta el afinador y metrónomo analógico de baja latencia
    Tuner {
        #[arg(short, long, default_value = "440")]
        freq: f32,
    },
    /// Muestra la paleta de colores Blue Note para diseño
    Palette,
}

fn main() {
    let cli = Cli::parse();
    match cli.command {
        Commands::ListEnsembles => {
            println!("{}", "🎷 GROOVE ENSEMBLES (CREATIVE STUDIOS):".bold().truecolor(212, 175, 55));
            println!("  1. ensemble-jazz-audio    : Ardour, PipeWire RT, Jack2, Carla, Synth DSP");
            println!("  2. ensemble-visual-design : Inkscape, GIMP, Krita, FontManager");
            println!("  3. ensemble-cinema-video  : Kdenlive, OBS Studio, FFmpeg HW-Accel");
            println!("  4. ensemble-darkroom-photo: Darktable, RawTherapee, Exif Fast Loupe");
            println!("  5. ensemble-rust-dev      : Rustc, Cargo, Helix, Alacritty, LLVM");
        }
        Commands::Tuner { freq } => {
            println!("🎵 [groove-tuner] Frecuencia base de afinación: {} Hz (Concert Pitch A4)", freq);
            println!("   Metrónomo: 120 BPM - Swing 62% (Bebop Mode)");
        }
        Commands::Palette => {
            println!("🎨 Paleta Oficial 'Blue Note':");
            println!("   • Midnight Club : #0B0E17");
            println!("   • Vinyl Groove  : #141926");
            println!("   • Warm Brass    : #D4AF37");
            println!("   • Bebop Coral   : #E05A47");
            println!("   • Cream Sleeve  : #F4EFE6");
        }
    }
}

