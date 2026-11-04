# Especificación Técnica 001: Orquestador LFS en Rust (`groove-lfs`)
*Documento de Diseño del Sistema — Spec-Driven Development (SDD)*

---

## 1. Alcance y Propósito

El crate `groove-lfs` es la herramienta de línea de comandos en Rust encargada de automatizar, validar y ejecutar la compilación paso a paso de la distribución Linux de acuerdo con la guía oficial **LFS 12.2** y las extensiones **BLFS**.

Su misión es eliminar el riesgo de errores manuales en scripts bash, garantizar reproducibilidad criptográfica con sumas SHA-256, gestionar el almacenamiento híbrido entre `/Volumes/HDEXTERNO` y `/Volumes/Backup/linux_groove_terabit`, y permitir la compilación en contenedores Linux multi-arquitectura (`aarch64` y `x86_64`).

---

## 2. Arquitectura de Datos y Manifiestos TOML

Cada capítulo de LFS se declara en un archivo TOML en `lfs/chapters/`:

```
lfs/chapters/
├── chapter02_host_prep.toml
├── chapter03_packages.toml
├── chapter04_final_prep.toml
├── chapter05_cross_toolchain.toml
├── chapter06_temp_tools_rust.toml
├── chapter07_chroot_env.toml
├── chapter08_system_rust.toml
├── chapter09_system_config.toml
└── chapter10_bootable_kernel_iso.toml
```

### Estructura de un Paquete LFS en TOML:
```toml
[chapter]
id = 5
title = "Compiling a Cross-Toolchain"
target = "tools"

[[packages]]
name = "binutils-pass-1"
version = "2.43.1"
tarball = "binutils-2.43.1.tar.xz"
url = "https://ftp.gnu.org/gnu/binutils/binutils-2.43.1.tar.xz"
sha256 = "657193c3b0eb68ab14e7a8e8093112cf2c8e312521199fc9be740e55ff6f96ec"
build_dir = "build"
configure_args = [
    "--prefix=$LFS/tools",
    "--with-sysroot=$LFS",
    "--target=$LFS_TGT",
    "--disable-nls",
    "--enable-gprofng=no",
    "--disable-werror",
    "--enable-default-hash-style=gnu"
]
```

---

## 3. Comandos de la CLI `groove-lfs`

1. **`groove-lfs status`:**
   - Muestra el estado del progreso LFS, paquetes descargados, espacio en disco y fase actual.
2. **`groove-lfs init-terabit`:**
   - Prepara los directorios en `/Volumes/Backup/linux_groove_terabit`.
   - Crea la imagen sparse de 40 GB `lfs_root.ext4` y la formatea con `mkfs.ext4`.
3. **`groove-lfs fetch-sources [--verify]`:**
   - Descarga todos los tarballs oficiales y clona los repositorios de Rust (`uutils/coreutils`, `sudo-rs`).
   - Verifica cada archivo con su hash SHA-256 declarado.
4. **`groove-lfs build --chapter <N> [--package <name>] [--dry-run]`:**
   - Ejecuta la construcción del capítulo indicado dentro del entorno de build Docker.
5. **`groove-lfs dashboard`:**
   - Interfaz en terminal interactiva con estética Jazz y colores Blue Note para monitorear el progreso de compilación en tiempo real.

