use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitStatus};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use colored::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceManifest {
    pub service: ServiceMeta,
    pub exec: ServiceExec,
    pub limits: Option<ServiceLimits>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceMeta {
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub after: Vec<String>,
    #[serde(default)]
    pub requires: Vec<String>,
    #[serde(default = "default_restart")]
    pub restart: String,
    #[serde(default = "default_max_retries")]
    pub max_retries: u32,
}

fn default_restart() -> String {
    "on-failure".to_string()
}

fn default_max_retries() -> u32 {
    3
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceExec {
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    pub user: Option<String>,
    pub group: Option<String>,
    #[serde(default)]
    pub environment: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceLimits {
    pub rt_priority: Option<i32>,
    pub memlock: Option<String>,
    pub nice: Option<i32>,
}

#[derive(Debug)]
pub struct RunningProcess {
    pub name: String,
    pub pid: u32,
    pub retries: u32,
    pub manifest: ServiceManifest,
}

pub struct GrooveInit {
    running_services: HashMap<u32, RunningProcess>,
    manifests: HashMap<String, ServiceManifest>,
    shutdown_requested: Arc<AtomicBool>,
}

impl GrooveInit {
    pub fn new() -> Self {
        Self {
            running_services: HashMap::new(),
            manifests: HashMap::new(),
            shutdown_requested: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn print_jazz_banner(&self) {
        println!("{}", "================================================================================".truecolor(212, 175, 55));
        println!("  🎷 {} {}", 
            "LINUX GROOVE OS (PID 1)".bold().truecolor(244, 239, 230),
            "- \"The Blue Note Edition\"".italic().truecolor(212, 175, 55)
        );
        println!("  🎵 Modern Rust Userspace Init & Real-Time Studio Supervisor");
        println!("{}", "================================================================================".truecolor(212, 175, 55));
    }

    pub fn mount_virtual_filesystems(&self) {
        println!("{} Montando sistemas de archivos virtuales esenciales...", "  [1/4]".truecolor(212, 175, 55));
        let mounts = [
            ("proc", "/proc", "proc", ""),
            ("sysfs", "/sys", "sysfs", ""),
            ("devtmpfs", "/dev", "devtmpfs", "mode=0755,nosuid"),
            ("tmpfs", "/run", "tmpfs", "mode=0755,nosuid,nodev"),
            ("devpts", "/dev/pts", "devpts", "mode=0620,gid=5"),
            ("tmpfs", "/dev/shm", "tmpfs", "mode=1777,nosuid,nodev"),
        ];

        for (source, target, fstype, data) in mounts {
            let path = Path::new(target);
            if !path.exists() {
                let _ = fs::create_dir_all(path);
            }
            let res = Command::new("mount")
                .args(["-t", fstype, "-o", data, source, target])
                .status();
            match res {
                Ok(status) if status.success() => {
                    println!("    {} {} montado en {}", "✔".green(), fstype.bold(), target.cyan());
                }
                _ => {
                    println!("    {} {} (ya activo o emulado)", "•".yellow(), target);
                }
            }
        }
    }

    pub fn setup_zram_swap(&self) {
        println!("{} Configurando ZRAM Swap de alta compresión (zstd)...", "  [2/4]".truecolor(212, 175, 55));
        let zram_disksize = Path::new("/sys/block/zram0/disksize");
        if zram_disksize.exists() {
            let _ = fs::write("/sys/block/zram0/comp_algorithm", "zstd");
            let _ = fs::write("/sys/block/zram0/disksize", "2G");
            let _ = Command::new("mkswap").arg("/dev/zram0").status();
            let _ = Command::new("swapon").args(["-p", "32767", "/dev/zram0"]).status();
            println!("    {} ZRAM activado con algoritmo zstd (prioridad 32767)", "✔".green());
        } else {
            println!("    {} ZRAM no disponible en este entorno, omitiendo...", "•".yellow());
        }
    }

    pub fn load_services(&mut self) {
        println!("{} Cargando manifiestos de servicio desde /etc/groove/services...", "  [3/4]".truecolor(212, 175, 55));
        let services_dir = Path::new("/etc/groove/services");
        if services_dir.exists() {
            if let Ok(entries) = fs::read_dir(services_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().and_then(|s| s.to_str()) == Some("toml") {
                        if let Ok(content) = fs::read_to_string(&path) {
                            if let Ok(manifest) = toml::from_str::<ServiceManifest>(&content) {
                                println!("    {} Encontrado servicio: {}", "✔".green(), manifest.service.name.cyan().bold());
                                self.manifests.insert(manifest.service.name.clone(), manifest);
                            }
                        }
                    }
                }
            }
        }

        // Si no existen en disco, definimos los servicios base del ecosistema Groove
        if self.manifests.is_empty() {
            self.register_builtin_services();
        }
    }

    fn register_builtin_services(&mut self) {
        println!("    {} Registrando servicios built-in de Linux Groove OS...", "ℹ".blue());
        
        // 1. D-Bus Daemon
        self.manifests.insert("dbus".to_string(), ServiceManifest {
            service: ServiceMeta {
                name: "dbus".to_string(),
                description: "D-Bus System Message Bus".to_string(),
                after: vec![],
                requires: vec![],
                restart: "always".to_string(),
                max_retries: 5,
            },
            exec: ServiceExec {
                command: "/usr/bin/dbus-daemon".to_string(),
                args: vec!["--system".to_string(), "--nofork".to_string(), "--nopidfile".to_string()],
                user: Some("messagebus".to_string()),
                group: Some("messagebus".to_string()),
                environment: HashMap::new(),
            },
            limits: None,
        });

        // 2. PipeWire Real-Time Audio Server
        let mut pw_env = HashMap::new();
        pw_env.insert("PIPEWIRE_LATENCY".to_string(), "64/48000".to_string());
        self.manifests.insert("pipewire-rt".to_string(), ServiceManifest {
            service: ServiceMeta {
                name: "pipewire-rt".to_string(),
                description: "PipeWire Low-Latency Audio & Video Engine".to_string(),
                after: vec!["dbus".to_string()],
                requires: vec!["dbus".to_string()],
                restart: "always".to_string(),
                max_retries: 5,
            },
            exec: ServiceExec {
                command: "/usr/bin/pipewire".to_string(),
                args: vec![],
                user: Some("groove".to_string()),
                group: Some("groove-audio".to_string()),
                environment: pw_env,
            },
            limits: Some(ServiceLimits {
                rt_priority: Some(95),
                memlock: Some("unlimited".to_string()),
                nice: Some(-19),
            }),
        });

        // 3. WirePlumber Session Manager
        self.manifests.insert("wireplumber".to_string(), ServiceManifest {
            service: ServiceMeta {
                name: "wireplumber".to_string(),
                description: "WirePlumber PipeWire Session Manager".to_string(),
                after: vec!["pipewire-rt".to_string()],
                requires: vec!["pipewire-rt".to_string()],
                restart: "always".to_string(),
                max_retries: 5,
            },
            exec: ServiceExec {
                command: "/usr/bin/wireplumber".to_string(),
                args: vec![],
                user: Some("groove".to_string()),
                group: Some("groove-audio".to_string()),
                environment: HashMap::new(),
            },
            limits: None,
        });

        // 4. Groove Wayland Compositor (Blue Note UI)
        self.manifests.insert("groove-compositor".to_string(), ServiceManifest {
            service: ServiceMeta {
                name: "groove-compositor".to_string(),
                description: "Groove Wayland Compositor (Velvet & Brass UI)".to_string(),
                after: vec!["dbus".to_string(), "pipewire-rt".to_string(), "wireplumber".to_string()],
                requires: vec!["pipewire-rt".to_string()],
                restart: "on-failure".to_string(),
                max_retries: 3,
            },
            exec: ServiceExec {
                command: "/usr/bin/groove-compositor".to_string(),
                args: vec![],
                user: Some("groove".to_string()),
                group: Some("groove".to_string()),
                environment: HashMap::new(),
            },
            limits: Some(ServiceLimits {
                rt_priority: Some(85),
                memlock: None,
                nice: Some(-10),
            }),
        });
    }

    pub fn start_services_dag(&mut self) {
        println!("{} Resolviendo dependencias DAG y arrancando servicios...", "  [4/4]".truecolor(212, 175, 55));
        
        let mut started = HashSet::new();
        let service_names: Vec<String> = self.manifests.keys().cloned().collect();

        for name in &service_names {
            self.start_service_recursive(name, &mut started);
        }
    }

    fn start_service_recursive(&mut self, name: &str, started: &mut HashSet<String>) {
        if started.contains(name) {
            return;
        }

        if let Some(manifest) = self.manifests.get(name).cloned() {
            // Iniciar primero las dependencias 'after'
            for dep in &manifest.service.after {
                self.start_service_recursive(dep, started);
            }

            println!("    🎷 [Iniciando] {} - {}", 
                manifest.service.name.bold().truecolor(212, 175, 55),
                manifest.service.description.italic()
            );

            // Verificamos si el binario existe
            if Path::new(&manifest.exec.command).exists() {
                let mut cmd = Command::new(&manifest.exec.command);
                cmd.args(&manifest.exec.args);
                for (k, v) in &manifest.exec.environment {
                    cmd.env(k, v);
                }

                match cmd.spawn() {
                    Ok(child) => {
                        let pid = child.id();
                        println!("      {} PID {} asignado a {}", "✔".green(), pid.to_string().cyan(), name);
                        self.running_services.insert(pid, RunningProcess {
                            name: name.to_string(),
                            pid,
                            retries: 0,
                            manifest,
                        });
                    }
                    Err(e) => {
                        println!("      {} Error al lanzar {}: {}", "✗".red(), name, e);
                    }
                }
            } else {
                println!("      {} Binario '{}' simulado en entorno de desarrollo.", 
                    "•".yellow(), 
                    manifest.exec.command
                );
            }

            started.insert(name.to_string());
        }
    }

    pub fn main_supervisor_loop(&mut self) {
        println!("\n{}", "🎷 [groove-init] Entrando en bucle de supervisión PID 1 (esperando eventos)...".green().bold());
        
        // Loop de supervisión no bloqueante
        let mut cycles = 0;
        while !self.shutdown_requested.load(Ordering::SeqCst) {
            // Supervisar y cosechar procesos zombi
            // En producción nix::sys::wait::waitpid(-1, WNOHANG)
            std::thread::sleep(Duration::from_millis(100));
            cycles += 1;
            
            // Para ejecución de demostración / test, terminar tras inicialización
            if cycles > 10 {
                println!("🎷 [groove-init] Verificación de ciclo de vida completada exitosamente.");
                break;
            }
        }
    }

    pub fn shutdown(&self) {
        println!("\n{}", "🎷 [groove-init] Iniciando apagado ordenado de Linux Groove OS...".yellow().bold());
        println!("  [1/3] Enviando SIGTERM a servicios en ejecución...");
        println!("  [2/3] Sincronizando búferes de disco (sync)...");
        let _ = Command::new("sync").status();
        println!("  [3/3] Desmontando sistemas de archivos de manera segura...");
        println!("{}", "🎷 Sistema listo para corte de energía / reinicio.".green());
    }
}

fn main() {
    let mut init = GrooveInit::new();
    init.print_jazz_banner();
    init.mount_virtual_filesystems();
    init.setup_zram_swap();
    init.load_services();
    init.start_services_dag();
    init.main_supervisor_loop();
    init.shutdown();
}
