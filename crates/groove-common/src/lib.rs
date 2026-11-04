use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use colored::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrooveConfig {
    pub storage: StorageConfig,
    pub system: SystemConfig,
    pub branding: BrandingConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    pub workspace_root: PathBuf,
    pub terabit_root: PathBuf,
    pub sources_dir: PathBuf,
    pub images_dir: PathBuf,
    pub iso_dir: PathBuf,
    pub ensembles_dir: PathBuf,
    pub cargo_target_dir: PathBuf,
    pub lfs_image_path: PathBuf,
    pub lfs_image_size_gb: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemConfig {
    pub distro_name: String,
    pub codename: String,
    pub version: String,
    pub lfs_version: String,
    pub kernel_version: String,
    pub default_target: String,
    pub secondary_target: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrandingConfig {
    pub colors: JazzColors,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JazzColors {
    pub midnight_club: String,
    pub vinyl_groove: String,
    pub warm_brass: String,
    pub bebop_coral: String,
    pub cool_mute: String,
    pub cream_sleeve: String,
}

impl GrooveConfig {
    pub fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let config: GrooveConfig = toml::from_str(&content)?;
        Ok(config)
    }

    pub fn default_path() -> PathBuf {
        PathBuf::from("/Volumes/HDEXTERNO/linux_groove/groove-config.toml")
    }

    pub fn print_banner(&self) {
        println!("{}", "========================================================".truecolor(212, 175, 55));
        println!("  🎷 {} - \"{}\" v{}", 
            self.system.distro_name.bold().truecolor(244, 239, 230),
            self.system.codename.italic().truecolor(212, 175, 55),
            self.system.version.truecolor(224, 90, 71)
        );
        println!("  Target: {} | LFS Standard: {}", 
            self.system.default_target.truecolor(60, 74, 99),
            self.system.lfs_version.truecolor(244, 239, 230)
        );
        println!("{}", "========================================================".truecolor(212, 175, 55));
    }
}

