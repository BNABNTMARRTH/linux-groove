use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::{UnixListener, UnixStream};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;

pub struct WindowPool {
    pub dolphin_running: bool,
    pub konsole_running: bool,
}

impl WindowPool {
    pub fn new() -> Self {
        Self {
            dolphin_running: false,
            konsole_running: false,
        }
    }

    /// Comprueba si ya existe una instancia de Dolphin en el bus de sesion
    pub fn find_dolphin_dbus_service() -> Option<String> {
        let output = Command::new("qdbus6").output().ok()?;
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("org.kde.dolphin-") {
                return Some(trimmed.to_string());
            }
        }
        None
    }

    /// Activa la ventana de Dolphin de manera instantanea (< 15 ms)
    pub fn activate_dolphin(target_path: &str) -> bool {
        let path = if target_path.is_empty() {
            dirs::home_dir().unwrap_or_else(|| PathBuf::from("/home/groove"))
        } else {
            PathBuf::from(target_path)
        };
        let uri = format!("file://{}", path.to_string_lossy());

        // 1. Intentar mediante la instancia D-Bus existente
        if let Some(svc) = Self::find_dolphin_dbus_service() {
            let status = Command::new("qdbus6")
                .args([
                    &svc,
                    "/org/freedesktop/FileManager1",
                    "org.freedesktop.FileManager1.ShowFolders",
                    &uri,
                    "",
                ])
                .status();
            if let Ok(st) = status {
                if st.success() {
                    return true;
                }
            }
        }

        // 2. Si no hay instancia, lanzar de inmediato
        let child = Command::new("dolphin")
            .arg(&uri)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn();
        child.is_ok()
    }

    /// Precarga silenciosa en segundo plano de Dolphin en el pool de memoria
    pub fn warm_dolphin_standby() -> Option<Child> {
        if Self::find_dolphin_dbus_service().is_some() {
            return None; // Ya hay una instancia viva en memoria
        }
        // Iniciar en modo silencioso
        Command::new("dolphin")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .ok()
    }
}

pub fn get_socket_path() -> PathBuf {
    let runtime_dir = std::env::var("XDG_RUNTIME_DIR").unwrap_or_else(|_| {
        let uid = unsafe { libc::getuid() };
        format!("/run/user/{}", uid)
    });
    PathBuf::from(runtime_dir).join("groove-warmer.sock")
}

fn handle_client(mut stream: UnixStream) {
    let mut reader = BufReader::new(stream.try_clone().unwrap());
    let mut line = String::new();
    if reader.read_line(&mut line).is_ok() {
        let t0 = Instant::now();
        let parts: Vec<&str> = line.trim().splitn(2, ' ').collect();
        let cmd = parts.get(0).copied().unwrap_or("");
        let arg = parts.get(1).copied().unwrap_or("");

        let response = match cmd {
            "LAUNCH" => {
                let mut app_parts = arg.splitn(2, ' ');
                let app = app_parts.next().unwrap_or("");
                let path = app_parts.next().unwrap_or("");
                if app == "dolphin" {
                    let ok = WindowPool::activate_dolphin(path);
                    let elapsed = t0.elapsed().as_micros();
                    format!("OK dolphin {}us activated={}\n", elapsed, ok)
                } else if app == "konsole" {
                    let _ = Command::new("konsole")
                        .stdout(Stdio::null())
                        .stderr(Stdio::null())
                        .spawn();
                    let elapsed = t0.elapsed().as_micros();
                    format!("OK konsole {}us\n", elapsed)
                } else {
                    let _ = Command::new(app)
                        .stdout(Stdio::null())
                        .stderr(Stdio::null())
                        .spawn();
                    let elapsed = t0.elapsed().as_micros();
                    format!("OK {} {}us\n", app, elapsed)
                }
            }
            "WARM" => {
                let _ = WindowPool::warm_dolphin_standby();
                "OK WARMED\n".to_string()
            }
            "PING" => "PONG\n".to_string(),
            _ => "ERR Unknown command\n".to_string(),
        };

        let _ = stream.write_all(response.as_bytes());
    }
}

mod dirs {
    use std::path::PathBuf;
    pub fn home_dir() -> Option<PathBuf> {
        std::env::var_os("HOME").map(PathBuf::from)
    }
}

fn main() {
    let socket_path = get_socket_path();
    if socket_path.exists() {
        let _ = fs::remove_file(&socket_path);
    }

    let listener = match UnixListener::bind(&socket_path) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("Error enlazando socket {}: {}", socket_path.display(), e);
            std::process::exit(1);
        }
    };

    println!(
        "[groove-warmer] Motor de precarga de ventanas activo en {}",
        socket_path.display()
    );

    // Precargar inicialmente en segundo plano
    let _ = WindowPool::warm_dolphin_standby();

    let running = Arc::new(AtomicBool::new(true));
    let r = running.clone();
    let sock_clone = socket_path.clone();

    ctrlc_handler(move || {
        r.store(false, Ordering::SeqCst);
        let _ = fs::remove_file(&sock_clone);
        std::process::exit(0);
    });

    for stream in listener.incoming() {
        if !running.load(Ordering::SeqCst) {
            break;
        }
        match stream {
            Ok(s) => {
                std::thread::spawn(move || {
                    handle_client(s);
                });
            }
            Err(e) => {
                eprintln!("Error aceptando conexion: {}", e);
            }
        }
    }

    let _ = fs::remove_file(&socket_path);
}

fn ctrlc_handler<F>(f: F)
where
    F: FnOnce() + Send + 'static,
{
    // Handler minimal sin dependencias externas
    unsafe {
        static mut HANDLER: Option<Box<dyn FnOnce() + Send>> = None;
        HANDLER = Some(Box::new(f));
        extern "C" fn sig_handler(_: libc::c_int) {
            unsafe {
                if let Some(h) = (*std::ptr::addr_of_mut!(HANDLER)).take() {
                    h();
                }
                libc::_exit(0);
            }
        }
        libc::signal(libc::SIGINT, sig_handler as *const () as libc::sighandler_t);
        libc::signal(libc::SIGTERM, sig_handler as *const () as libc::sighandler_t);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_socket_path_generation() {
        let path = get_socket_path();
        assert!(path.to_string_lossy().contains("groove-warmer.sock"));
    }

    #[test]
    fn test_window_pool_struct() {
        let pool = WindowPool::new();
        assert!(!pool.dolphin_running);
        assert!(!pool.konsole_running);
    }
}
