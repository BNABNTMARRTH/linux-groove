# Especificación Técnica 002: Kernel RT & Driver Development en Rust
*Documento de Diseño del Sistema — Spec-Driven Development (SDD)*

---

## 1. Alcance y Arquitectura del Kernel

El kernel de **Linux Groove OS** se basa en **Linux 6.12 LTS** con el parche **PREEMPT_RT** aplicado y el soporte oficial de **Rust para el Kernel (`CONFIG_RUST=y`)** habilitado.

### 1.1 Configuración Crítica del Kernel
```ini
# Real-Time Scheduling
CONFIG_PREEMPT_RT=y
CONFIG_HZ_1000=y
CONFIG_HZ=1000
CONFIG_NO_HZ_FULL=y
CONFIG_HIGH_RES_TIMERS=y

# Rust for Linux
CONFIG_RUST=y
CONFIG_RUST_BUILD_ASSERT_ALLOW=y
CONFIG_SAMPLES_RUST=n

# Drivers para Multimedia y Gráficos
CONFIG_SND_USB_AUDIO=m
CONFIG_SND_HDA_INTEL=m
CONFIG_DRM=y
CONFIG_DRM_VIRTIO_GPU=y
CONFIG_DRM_AMDGPU=m
CONFIG_DRM_I915=m
CONFIG_DRM_XE=m

# Contenedores y Seguridad
CONFIG_OVERLAY_FS=y
CONFIG_SQUASHFS=y
CONFIG_SQUASHFS_ZSTD=y
CONFIG_ZRAM=y
```

---

## 2. Driver en Rust: `groove_rt_kmod` (`/dev/groove_rt`)

Para resolver de manera definitiva la latencia y los saltos de audio (*xruns*) sin requerir que las aplicaciones del creador se ejecuten como `root`, implementamos un driver de kernel escrito enteramente en Rust bajo el árbol de `rust/kernel`.

### 2.1 Misión del Driver
1. Registrar procesos multimedia creados por usuarios autorizados (grupo `@groove-audio`).
2. Elevar dinámicamente la prioridad del hilo registrado a `SCHED_FIFO` con prioridad `98` sin necesidad de `setuid root`.
3. Ofrecer un contador de latencia en nanosegundos y detección precisa de demoras en el planificador (*scheduler jitter*).
4. Proporcionar telemetría en tiempo real a `groove-compositor` mediante `sysfs` en `/sys/kernel/groove_rt/jitter_ns`.

### 2.2 Estructura del Código en Rust (`driver/groove_rt_kmod`)

```
driver/groove_rt_kmod/
├── Kbuild
├── Makefile
└── src/
    ├── lib.rs          # Inicialización del módulo kernel
    ├── device.rs       # Registro del character device /dev/groove_rt
    ├── ioctl.rs        # Definición de códigos IOCTL para gestión de hilos RT
    └── telemetry.rs    # Interfaz sysfs para monitoreo de jitter
```

### 2.3 Interfaz IOCTL (`ioctl.rs`)
- `GROOVE_IOCTL_REGISTER_RT_THREAD (0x4701)`: Registra el TID del proceso actual y le asigna prioridad `SCHED_FIFO 98`.
- `GROOVE_IOCTL_GET_JITTER (0x4702)`: Devuelve la varianza de tiempo entre ciclos del scheduler en nanosegundos.
- `GROOVE_IOCTL_UNREGISTER (0x4703)`: Restaura el hilo a `SCHED_OTHER` normal.

