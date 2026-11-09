use std::fs::File;
use std::io::{self, Read, Seek, SeekFrom};
use std::path::Path;

pub fn warm_file_into_ram(path: &Path) -> io::Result<(usize, usize)> {
    let mut file = match File::open(path) {
        Ok(f) => f,
        Err(e) => return Err(e),
    };
    let meta = file.metadata()?;
    let size = meta.len() as usize;
    if size == 0 {
        return Ok((0, 0));
    }

    let page_size = 4096;
    let pages = (size + page_size - 1) / page_size;
    let mut touched = 0;
    let mut buf = [0u8; 1];

    for i in 0..pages {
        let offset = (i * page_size) as u64;
        if file.seek(SeekFrom::Start(offset)).is_ok() && file.read_exact(&mut buf).is_ok() {
            touched += 1;
        }
    }

    Ok((touched, size))
}

pub fn is_critical_library(filename: &str) -> bool {
    if !filename.contains(".so") || filename.ends_with(".a") || filename.ends_with(".cmake") {
        return false;
    }
    let critical_prefixes = [
        "libQt6Core",
        "libQt6Gui",
        "libQt6Quick",
        "libQt6Qml",
        "libQt6Widgets",
        "libQt6WaylandClient",
        "libKF6",
        "libkwin",
        "libwayland",
        "libEGL",
        "libGL",
        "libdolphin",
        "libkonsole",
    ];
    critical_prefixes
        .iter()
        .any(|&prefix| filename.starts_with(prefix))
}

pub fn low_latency_sysctl_params() -> Vec<(&'static str, &'static str)> {
    vec![
        ("vm.swappiness", "10"),
        ("vm.vfs_cache_pressure", "50"),
        ("vm.dirty_ratio", "15"),
    ]
}

pub fn apply_sysctl_tuning() {
    #[cfg(target_os = "linux")]
    for (param, val) in low_latency_sysctl_params() {
        let path = format!("/proc/sys/{}", param.replace('.', "/"));
        let _ = std::fs::write(path, val);
    }
}

pub fn warm_system_libraries() -> (usize, usize) {
    let search_dirs = ["/usr/lib", "/usr/lib64", "/usr/bin"];
    let mut total_files = 0;
    let mut total_bytes = 0;

    for dir in &search_dirs {
        let p = Path::new(dir);
        if let Ok(entries) = std::fs::read_dir(p) {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if is_critical_library(name) || name == "dolphin" || name == "konsole" {
                        if let Ok((_pages, bytes)) = warm_file_into_ram(&path) {
                            total_files += 1;
                            total_bytes += bytes;
                        }
                    }
                }
            }
        }
    }
    (total_files, total_bytes)
}

fn main() {
    println!("🚀 [groove-boostd] Iniciando daemon de aceleración en RAM para Linux Groove...");
    apply_sysctl_tuning();
    let (files, bytes) = warm_system_libraries();
    let mb = bytes as f64 / (1024.0 * 1024.0);
    println!(
        "⚡ [groove-boostd] Precarga completada: {} bibliotecas/binarios cacheados ({:.1} MB en RAM).",
        files, mb
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_page_warmer_touches_all_pages() {
        // UT-BST-01
        let dir = std::env::temp_dir();
        let path = dir.join("test_warm_128k.bin");
        {
            let mut f = File::create(&path).unwrap();
            let data = vec![0xAAu8; 128 * 1024]; // 128 KB = 32 páginas de 4096
            f.write_all(&data).unwrap();
        }

        let res = warm_file_into_ram(&path);
        let _ = std::fs::remove_file(&path);

        assert!(res.is_ok());
        let (touched, size) = res.unwrap();
        assert_eq!(size, 131072);
        assert_eq!(touched, 32);
    }

    #[test]
    fn test_page_warmer_handles_empty_and_missing() {
        // UT-BST-02
        let dir = std::env::temp_dir();
        let empty_path = dir.join("test_empty.bin");
        File::create(&empty_path).unwrap();

        let empty_res = warm_file_into_ram(&empty_path);
        let _ = std::fs::remove_file(&empty_path);
        assert_eq!(empty_res.unwrap(), (0, 0));

        let missing_path = dir.join("non_existent_file_groove.bin");
        let missing_res = warm_file_into_ram(&missing_path);
        assert!(missing_res.is_err());
    }

    #[test]
    fn test_library_discovery_filter() {
        // UT-BST-03
        assert!(is_critical_library("libQt6Core.so.6.8.0"));
        assert!(is_critical_library("libQt6Gui.so.6"));
        assert!(is_critical_library("libQt6Quick.so"));
        assert!(is_critical_library("libKF6CoreAddons.so.6"));
        assert!(is_critical_library("libkwin.so.6"));

        assert!(!is_critical_library("libQt6Core.a"));
        assert!(!is_critical_library("libQt6Core.prl"));
        assert!(!is_critical_library("libQt6Core.cmake"));
        assert!(!is_critical_library("README.txt"));
        assert!(!is_critical_library("foo.so.bak.cmake"));
    }

    #[test]
    fn test_sysctl_profile_generation() {
        // UT-BST-04
        let params = low_latency_sysctl_params();
        assert_eq!(params.len(), 3);
        assert_eq!(params[0], ("vm.swappiness", "10"));
        assert_eq!(params[1], ("vm.vfs_cache_pressure", "50"));
        assert_eq!(params[2], ("vm.dirty_ratio", "15"));
    }
}
