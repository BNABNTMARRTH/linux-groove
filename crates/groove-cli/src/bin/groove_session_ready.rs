use groove_cli::*;
use std::env;
use std::path::PathBuf;
use std::process::Command;

fn main() {
    let display = env::var("WAYLAND_DISPLAY").unwrap_or_else(|_| "wayland-0".to_string());
    let runtime_dir = env::var("XDG_RUNTIME_DIR").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("/tmp"));

    let _ = Command::new("dbus-update-activation-environment")
        .args([
            "--systemd",
            "WAYLAND_DISPLAY",
            "XDG_CURRENT_DESKTOP",
            "XDG_SESSION_TYPE",
            "XDG_SESSION_DESKTOP",
        ])
        .output();

    match check_wayland_socket_and_signal(&runtime_dir, &display) {
        Ok(true) => {
            println!("✅ [groove-session-ready] Sesión Wayland '{}' verificada en {:?}", display, runtime_dir);
        }
        _ => {
            // No abortar para no bloquear el inicio de sesión
            let _ = std::fs::write(runtime_dir.join("groove-graphical-ready"), "1\n");
        }
    }
}
