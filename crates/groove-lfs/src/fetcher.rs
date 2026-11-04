use std::fs::File;
use std::io::{copy, BufReader};
use std::path::{Path, PathBuf};
use sha2::{Digest, Sha256};
use colored::*;

pub struct TarballFetcher;

impl TarballFetcher {
    pub fn download_and_verify(
        url: &str,
        dest: &Path,
        expected_sha256: &str,
    ) -> Result<bool, Box<dyn std::error::Error>> {
        if dest.exists() {
            println!("  [i] Archivo ya presente: {}", dest.display());
            if Self::verify_sha256(dest, expected_sha256)? {
                println!("  [✓] Verificación SHA-256 correcta.");
                return Ok(true);
            } else {
                println!("  [!] Hash incorrecto, redescargando...");
            }
        }

        println!("  [➜] Descargando desde {}...", url.truecolor(212, 175, 55));
        
        let status = std::process::Command::new("curl")
            .args(["-L", "-o", dest.to_str().unwrap(), url])
            .status()?;

        if !status.success() {
            return Err(format!("Fallo al descargar {}", url).into());
        }

        if Self::verify_sha256(dest, expected_sha256)? {
            println!("  [✓] Descarga y suma SHA-256 verificadas exitosamente.");
            Ok(true)
        } else {
            Err("Error crítico: la suma SHA-256 no coincide con el manifiesto oficial de LFS 12.2.".into())
        }
    }

    pub fn verify_sha256(path: &Path, expected: &str) -> Result<bool, Box<dyn std::error::Error>> {
        let file = File::open(path)?;
        let mut reader = BufReader::new(file);
        let mut hasher = Sha256::new();
        copy(&mut reader, &mut hasher)?;
        let hash = format!("{:x}", hasher.finalize());
        Ok(hash.eq_ignore_ascii_case(expected))
    }
}

