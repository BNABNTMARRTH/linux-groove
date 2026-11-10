use std::env;
use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::UnixStream;
use std::os::unix::process::CommandExt;
use std::path::PathBuf;
use std::process::Command;

fn get_socket_path() -> PathBuf {
    let runtime_dir = env::var("XDG_RUNTIME_DIR").unwrap_or_else(|_| {
        let uid = unsafe { libc::getuid() };
        format!("/run/user/{}", uid)
    });
    PathBuf::from(runtime_dir).join("groove-warmer.sock")
}

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.is_empty() {
        eprintln!("Uso: groove-launch <aplicacion> [argumentos...]");
        std::process::exit(1);
    }

    let app = &args[0];
    let app_args = &args[1..];
    let sock_path = get_socket_path();

    // Intentar activacion de cero latencia via groove-warmer
    if sock_path.exists() {
        if let Ok(mut stream) = UnixStream::connect(&sock_path) {
            let msg = format!("LAUNCH {} {}\n", app, app_args.join(" "));
            if stream.write_all(msg.as_bytes()).is_ok() {
                let mut reader = BufReader::new(stream);
                let mut resp = String::new();
                if reader.read_line(&mut resp).is_ok() && resp.starts_with("OK") {
                    std::process::exit(0);
                }
            }
        }
    }

    // Fallback nativo transparente mediante exec
    let mut cmd = Command::new(app);
    cmd.args(app_args);
    let err = cmd.exec();
    eprintln!("Error ejecutando {}: {}", app, err);
    std::process::exit(1);
}
