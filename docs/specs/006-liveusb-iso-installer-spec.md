# Especificación Técnica 006: LiveUSB, Generación de ISO e Instalador
*Documento de Diseño del Sistema — Spec-Driven Development (SDD)*

## Actualización del arranque gráfico — 2026-11-04

La implementación actual usa GRUB2 ARM64/UEFI e initramfs shell con BusyBox
empaquetado en cpio.gz; el diagrama Rust/zstd siguiente es una visión futura.
La detección busca groove/rootfs.squashfs y activa OverlayFS. Conservar ACPI:
sin CONFIG_ACPI=y, EDK2 puede causar un panic temprano del temporizador ARM.

Para la entrega gráfica se crea /run/groove/live únicamente tras montar el
medio LiveUSB, y se trasladan /proc, /sys, /dev y /run al nuevo root antes de
switch_root. PID 1 debe preservar los montajes existentes. La marca no forma
parte del SquashFS ni de una instalación normal.

La entrada normal inicia el selector LightDM; la entrada single/groove.text=1
inicia recuperación. Conservar la ISO anterior y construir una imagen nueva.
Copiar siempre kernel/initramfs actualizados antes de regenerar la ISO híbrida,
verificar su arranque UEFI y publicar sus SHA256. Ver spec 007.

Las capacidades del instalador descritas después son requisitos; su modo de
simulación no acredita particionado, instalación ni política PAM funcionales.

---

## 1. Alcance y Arquitectura de Booteo

**Linux Groove OS** se distribuye como una imagen híbrida `.iso` booteable tanto en hardware moderno (**UEFI** con partición ESP) como en hardware heredado (**BIOS MBR** en `x86_64`), así como en plataformas **ARM64 / aarch64** (Apple Silicon y SBCs compatibles con UEFI/EDK2).

---

## 2. Secuencia de Arranque LiveUSB (Initramfs en Rust)

```
+-----------------------------------------------------------------------------+
| Bootloader (Limine / GRUB2) con tema Blue Note                              |
| Carga Kernel Linux 6.12 RT + initramfs.cpio.zst                             |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
| initramfs (escrito en Rust: /init)                                          |
| 1. Busca dispositivo de almacenamiento con LABEL="LINUX_GROOVE_LIVE"        |
| 2. Monta partición ISO en /mnt/cdrom                                        |
| 3. Monta /mnt/cdrom/groove/rootfs.squashfs (Solo Lectura) en /mnt/squash     |
| 4. Crea tmpfs en memoria RAM con compresión zram                            |
| 5. Configura OverlayFS: lower=/mnt/squash, upper=/mnt/ram/upper             |
| 6. switch_root a /mnt/merged y transfiere control a /sbin/groove-init        |
+-----------------------------------------------------------------------------+
```

---

## 3. The Soundcheck Installer (`groove-installer`)

El instalador `groove-installer` cuenta con un motor en Rust que puede ejecutarse tanto en modo texto enriquecido (**TUI** sobre `ratatui`) como en modo gráfico sobre **Wayland**.

### 3.1 Flujo de Pasos ("The 5 Soundchecks")
1. **Take 1 (Localization & Keyboard):** Selección de idioma y disposición del teclado.
2. **Take 2 (Target Drive):** Detección de discos NVMe/SSD, análisis SMART y advertencia destructiva.
3. **Take 3 (Partitioning Scheme):**
   - Automático: Creación de partición EFI (512 MB, FAT32) + Partición Raíz (EXT4 con compresión y journal rápido).
   - Manual: Selección de particiones preexistentes.
4. **Take 4 (Studio Profile):** Selección de los Ensembles creativos que se copiarán al disco local.
5. **Take 5 (User Credentials):** Creación de usuario principal con pertenencia automática a grupos de alta prioridad (`wheel`, `groove-audio`, `video`).

### 3.2 Modo `--dry-run`
`groove-installer` incluye un modo de simulación segura que valida las operaciones de escritura sin modificar la tabla de particiones real, ideal para pruebas de integración continua y desarrollo local en macOS.

