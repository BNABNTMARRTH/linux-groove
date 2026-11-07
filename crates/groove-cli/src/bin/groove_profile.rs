use clap::{Parser, Subcommand};
use colored::*;
use groove_cli::*;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

#[derive(Parser)]
#[command(name = "groove-profile")]
#[command(about = "Conmutador de perfiles de latencia y efectos para Linux Groove")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Modo apertura instantánea (0 ms) y latencia mínima
    Instant,
    /// Modo expresivo 3D (Cubo, Wobbly Windows, Blur con micro-transición)
    Expressive,
    /// Modo estudio de producción musical (PipeWire baja latencia)
    Studio,
    /// Modo estándar estable
    Stable,
    /// Muestra el perfil actual y estado de aceleración
    Status,
    /// Consulta rápida tipo KRunner / lanzador
    Query { text: String },
}

fn apply_kwin_specs(specs: &ProfileSpecs) {
    let config_dir = dirs_or_home();
    let kwinrc_path = config_dir.join("kwinrc");
    let kdeglobals_path = config_dir.join("kdeglobals");

    // Actualizar kdeglobals
    let kde_orig = fs::read_to_string(&kdeglobals_path).unwrap_or_default();
    let kde_patched = patch_ini_content(
        &kde_orig,
        &[("KDE", "AnimationDurationFactor", &specs.animation_duration_factor)],
    );
    let _ = fs::write(&kdeglobals_path, kde_patched);

    // Actualizar kwinrc
    let kwin_orig = fs::read_to_string(&kwinrc_path).unwrap_or_default();
    let updates = [
        ("Compositing", "LatencyPolicy", specs.latency_policy.as_str()),
        (
            "Compositing",
            "DirectScanout",
            if specs.direct_scanout { "true" } else { "false" },
        ),
        (
            "Plugins",
            "blurEnabled",
            if specs.blur { "true" } else { "false" },
        ),
        (
            "Plugins",
            "wobblywindowsEnabled",
            if specs.wobbly { "true" } else { "false" },
        ),
        (
            "Plugins",
            "cubeEnabled",
            if specs.cube { "true" } else { "false" },
        ),
    ];
    let kwin_patched = patch_ini_content(&kwin_orig, &updates);
    let _ = fs::write(&kwinrc_path, kwin_patched);

    // Notificar a KWin en caliente vía D-Bus
    let _ = Command::new("dbus-send")
        .args([
            "--type=method_call",
            "--dest=org.kde.KWin",
            "/KWin",
            "org.kde.KWin.reconfigure",
        ])
        .output();

    // Notificar a PipeWire metadata
    let _ = Command::new("pw-metadata")
        .args([
            "-n",
            "settings",
            "0",
            "clock.force-quantum",
            &specs.quantum.to_string(),
        ])
        .output();
}

fn dirs_or_home() -> PathBuf {
    if let Ok(dir) = std::env::var("XDG_CONFIG_HOME") {
        PathBuf::from(dir)
    } else if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home).join(".config")
    } else {
        PathBuf::from("/etc/xdg")
    }
}

fn main() {
    let cli = Cli::parse();
    match cli.command {
        Commands::Instant => {
            let specs = get_profile_specs(ProfileType::Instant);
            apply_kwin_specs(&specs);
            println!(
                "{}",
                "⚡ [groove-profile] Modo Instantáneo activado (0 ms latencia)".bold().green()
            );
        }
        Commands::Expressive => {
            let specs = get_profile_specs(ProfileType::Expressive);
            apply_kwin_specs(&specs);
            println!(
                "{}",
                "🎨 [groove-profile] Modo Expresivo 3D activado (Cubo + Wobbly + Blur)".bold().cyan()
            );
        }
        Commands::Studio => {
            let specs = get_profile_specs(ProfileType::Studio);
            apply_kwin_specs(&specs);
            println!(
                "{}",
                "🎷 [groove-profile] Modo Estudio activado (PipeWire quantum 256 / 48kHz)".bold().yellow()
            );
        }
        Commands::Stable => {
            let specs = get_profile_specs(ProfileType::Stable);
            apply_kwin_specs(&specs);
            println!(
                "{}",
                "🛡️ [groove-profile] Modo Estable activado".bold().white()
            );
        }
        Commands::Status => {
            println!("{}", gather_diagnostics_json(false));
        }
        Commands::Query { text } => {
            let matches = match_krunner_query(&text);
            for m in matches {
                println!("{} -> {} ({})", m.id.bold(), m.title, m.description);
            }
        }
    }
}
