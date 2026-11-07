use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{self, Write};
use std::path::Path;

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum ProfileType {
    Instant,
    Expressive,
    Studio,
    Stable,
}

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
pub struct ProfileSpecs {
    pub name: String,
    pub animation_duration_factor: String,
    pub latency_policy: String,
    pub direct_scanout: bool,
    pub blur: bool,
    pub wobbly: bool,
    pub cube: bool,
    pub quantum: u32,
    pub rate: u32,
}

pub fn get_profile_specs(profile: ProfileType) -> ProfileSpecs {
    match profile {
        ProfileType::Instant => ProfileSpecs {
            name: "instant".to_string(),
            animation_duration_factor: "0".to_string(),
            latency_policy: "ExtremelyLow".to_string(),
            direct_scanout: true,
            blur: false,
            wobbly: false,
            cube: false,
            quantum: 1024,
            rate: 48000,
        },
        ProfileType::Expressive => ProfileSpecs {
            name: "expressive".to_string(),
            animation_duration_factor: "0.15".to_string(),
            latency_policy: "Low".to_string(),
            direct_scanout: true,
            blur: true,
            wobbly: true,
            cube: true,
            quantum: 1024,
            rate: 48000,
        },
        ProfileType::Studio => ProfileSpecs {
            name: "studio".to_string(),
            animation_duration_factor: "0".to_string(),
            latency_policy: "ExtremelyLow".to_string(),
            direct_scanout: true,
            blur: false,
            wobbly: false,
            cube: false,
            quantum: 256,
            rate: 48000,
        },
        ProfileType::Stable => ProfileSpecs {
            name: "stable".to_string(),
            animation_duration_factor: "1.0".to_string(),
            latency_policy: "Normal".to_string(),
            direct_scanout: false,
            blur: false,
            wobbly: false,
            cube: false,
            quantum: 1024,
            rate: 48000,
        },
    }
}

pub fn patch_ini_content(original: &str, updates: &[(&str, &str, &str)]) -> String {
    // Parser e inyector determinista de INI que preserva comentarios y secciones
    let mut lines: Vec<String> = original.lines().map(|s| s.to_string()).collect();
    let mut current_section = "".to_string();

    let mut pending: Vec<(&str, &str, &str)> = updates.to_vec();

    for line in lines.iter_mut() {
        let trimmed = line.trim();
        if trimmed.starts_with('[') && trimmed.ends_with(']') {
            current_section = trimmed[1..trimmed.len() - 1].trim().to_string();
            continue;
        }

        if let Some(eq_idx) = line.find('=') {
            let key = line[..eq_idx].trim();
            if let Some(pos) = pending
                .iter()
                .position(|&(s, k, _)| s == current_section && k == key)
            {
                let (_, _, val) = pending.remove(pos);
                *line = format!("{}={}", key, val);
            }
        }
    }

    // Agregar claves pendientes a sus secciones correspondientes
    for (sec, key, val) in pending {
        let sec_header = format!("[{}]", sec);
        if let Some(sec_idx) = lines.iter().position(|l| l.trim() == sec_header) {
            lines.insert(sec_idx + 1, format!("{}={}", key, val));
        } else {
            lines.push(sec_header);
            lines.push(format!("{}={}", key, val));
        }
    }

    let mut result = lines.join("\n");
    if !result.ends_with('\n') {
        result.push('\n');
    }
    result
}

pub fn build_kwin_reconfigure_command() -> Vec<&'static str> {
    vec![
        "dbus-send",
        "--type=method_call",
        "--dest=org.kde.KWin",
        "/KWin",
        "org.kde.KWin.reconfigure",
    ]
}

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
pub struct QueryMatch {
    pub id: String,
    pub title: String,
    pub description: String,
    pub score: f32,
}

pub fn match_krunner_query(query: &str) -> Vec<QueryMatch> {
    let q = query.trim().to_lowercase();
    let mut matches = Vec::new();

    let items = [
        (
            "groove-instant",
            "Linux Groove: Modo Instantáneo (0 ms)",
            "Apertura inmediata de ventanas y latencia mínima",
            &["instant", "rapido", "velocidad", "cero"][..],
        ),
        (
            "groove-3d",
            "Linux Groove: Efectos 3D Expresivos",
            "Cubo 3D, Wobbly Windows y Blur acelerados",
            &["3d", "cubo", "wobbly", "expressive", "blur"][..],
        ),
        (
            "groove-studio",
            "Linux Groove: Estudio de Producción Musical",
            "PipeWire quantum 256 / 48kHz de ultra baja latencia",
            &["studio", "audio", "pipewire", "musica", "jack"][..],
        ),
        (
            "groove-status",
            "Linux Groove: Diagnóstico del Sistema",
            "Ver telemetría y estado de precarga en RAM",
            &["status", "diag", "ram", "memoria"][..],
        ),
    ];

    for (id, title, desc, keywords) in items {
        if q == id || q == keywords[0] {
            matches.push(QueryMatch {
                id: id.to_string(),
                title: title.to_string(),
                description: desc.to_string(),
                score: 1.0,
            });
        } else if keywords.iter().any(|&k| k.contains(&q) || q.contains(k)) {
            matches.push(QueryMatch {
                id: id.to_string(),
                title: title.to_string(),
                description: desc.to_string(),
                score: 0.8,
            });
        }
    }

    matches.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    matches
}

pub fn check_wayland_socket_and_signal(runtime_dir: &Path, display_name: &str) -> io::Result<bool> {
    let socket_path = runtime_dir.join(display_name);
    if !socket_path.exists() {
        return Ok(false);
    }

    let ready_file = runtime_dir.join("groove-graphical-ready");
    let mut f = fs::File::create(ready_file)?;
    f.write_all(b"1\n")?;
    Ok(true)
}

#[derive(Serialize, Deserialize)]
pub struct DiagnosticsReport {
    pub timestamp: String,
    pub kernel: String,
    pub memory: String,
    pub compositors: Vec<String>,
    pub rust_boost_active: bool,
}

pub fn gather_diagnostics_json(mock: bool) -> String {
    let report = if mock {
        DiagnosticsReport {
            timestamp: "2026-11-06T20:30:00Z".to_string(),
            kernel: "Linux groove 7.3.1-2-aarch64-ARCH".to_string(),
            memory: "4096MB total / 3200MB free".to_string(),
            compositors: vec!["kwin_wayland".to_string()],
            rust_boost_active: true,
        }
    } else {
        let k = std::fs::read_to_string("/proc/version")
            .unwrap_or_else(|_| "Linux Groove aarch64".to_string());
        DiagnosticsReport {
            timestamp: "live".to_string(),
            kernel: k.trim().to_string(),
            memory: "RAM live OK".to_string(),
            compositors: vec!["kwin_wayland".to_string()],
            rust_boost_active: Path::new("/usr/lib/libgroove_fast.so").exists(),
        }
    };
    serde_json::to_string_pretty(&report).unwrap_or_else(|_| "{}".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_profile_instant_config_values() {
        // UT-CLI-01
        let specs = get_profile_specs(ProfileType::Instant);
        assert_eq!(specs.animation_duration_factor, "0");
        assert_eq!(specs.latency_policy, "ExtremelyLow");
        assert!(specs.direct_scanout);
        assert!(!specs.blur);
    }

    #[test]
    fn test_profile_expressive_config_values() {
        // UT-CLI-02
        let specs = get_profile_specs(ProfileType::Expressive);
        assert_eq!(specs.animation_duration_factor, "0.15");
        assert_eq!(specs.latency_policy, "Low");
        assert!(specs.cube);
        assert!(specs.wobbly);
        assert!(specs.blur);
    }

    #[test]
    fn test_profile_studio_low_latency_audio() {
        // UT-CLI-03
        let specs = get_profile_specs(ProfileType::Studio);
        assert_eq!(specs.quantum, 256);
        assert_eq!(specs.rate, 48000);
        assert_eq!(specs.animation_duration_factor, "0");
        assert!(!specs.blur);
    }

    #[test]
    fn test_ini_patcher_preserves_existing_sections() {
        // UT-CLI-04
        let original = "[General]\nColorScheme=Groove\n[KDE]\nAnimationDurationFactor=1.0\n[Windows]\nButtonsOnLeft=XIA\n";
        let updates = [
            ("KDE", "AnimationDurationFactor", "0"),
            ("Compositing", "LatencyPolicy", "ExtremelyLow"),
        ];
        let patched = patch_ini_content(original, &updates);

        assert!(patched.contains("[General]\nColorScheme=Groove"));
        assert!(patched.contains("[Windows]\nButtonsOnLeft=XIA"));
        assert!(patched.contains("AnimationDurationFactor=0"));
        assert!(patched.contains("[Compositing]\nLatencyPolicy=ExtremelyLow"));
    }

    #[test]
    fn test_session_ready_socket_validation() {
        // UT-CLI-05
        let dir = std::env::temp_dir().join("groove_test_runtime");
        let _ = fs::create_dir_all(&dir);

        let sock_path = dir.join("wayland-0");
        fs::File::create(&sock_path).unwrap();

        let ok = check_wayland_socket_and_signal(&dir, "wayland-0").unwrap();
        assert!(ok);
        assert!(dir.join("groove-graphical-ready").exists());

        let missing = check_wayland_socket_and_signal(&dir, "wayland-missing").unwrap();
        assert!(!missing);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_diagnostics_json_schema_serialization() {
        // UT-CLI-06
        let json_str = gather_diagnostics_json(true);
        let parsed: serde_json::Value = serde_json::from_str(&json_str).unwrap();
        assert_eq!(parsed["rust_boost_active"], true);
        assert!(parsed["compositors"].is_array());
        assert_eq!(parsed["compositors"][0], "kwin_wayland");
    }

    #[test]
    fn test_kwin_dbus_reconfigure_command_builder() {
        // UT-CLI-07
        let cmd = build_kwin_reconfigure_command();
        assert_eq!(cmd[0], "dbus-send");
        assert_eq!(cmd[1], "--type=method_call");
        assert_eq!(cmd[2], "--dest=org.kde.KWin");
        assert_eq!(cmd[3], "/KWin");
        assert_eq!(cmd[4], "org.kde.KWin.reconfigure");
    }

    #[test]
    fn test_krunner_query_matcher_instant_response() {
        // UT-CLI-08
        let res_instant = match_krunner_query("instant");
        assert!(!res_instant.is_empty());
        assert_eq!(res_instant[0].id, "groove-instant");
        assert_eq!(res_instant[0].score, 1.0);

        let res_3d = match_krunner_query("cubo");
        assert!(!res_3d.is_empty());
        assert_eq!(res_3d[0].id, "groove-3d");

        let res_audio = match_krunner_query("musica");
        assert!(!res_audio.is_empty());
        assert_eq!(res_audio[0].id, "groove-studio");
    }
}
