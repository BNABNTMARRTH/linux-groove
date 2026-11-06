# Historias de Usuario (User Stories & Gherkin Scenarios)
## Linux Groove OS — "The Blue Note Edition"

---

## Épica 1: Orquestación y Compilación LFS en Rust (`groove-lfs`)

### Historia US-01: Verificación de Entorno y Almacenamiento Dual
- **Como:** Desarrollador del sistema operativo.
- **Quiero:** Que `groove-lfs` verifique el estado de `/Volumes/HDEXTERNO` y `/Volumes/Backup/linux_groove_terabit`.
- **Para:** Asegurar que cuento con espacio libre, permisos de escritura y que el disco ExFAT alojará la imagen EXT4 sin el límite de 4 GB.

```gherkin
Escenario: Inicialización exitosa del almacenamiento Terabit
  Dado que el volumen "/Volumes/Backup/linux_groove_terabit" está montado en ExFAT con más de 100 GB libres
  Cuando ejecuto "cargo run -p groove-lfs -- init-terabit"
  Entonces se crean las carpetas "sources", "images", "iso" y "ensembles"
  Y se genera el archivo de imagen sparse "images/lfs_root.ext4" de 40 GB
  Y el comando retorna código de salida 0.
```

### Historia US-02: Descarga Verificada de Fuentes y Repositorios Rust
- **Como:** Ingeniero de integración continua.
- **Quiero:** Que el orquestador descargue los paquetes oficiales de LFS 12.2 y clone los repositorios de Rust (`uutils`, `sudo-rs`).
- **Para:** Garantizar la integridad criptográfica de cada componente antes de iniciar la compilación.

```gherkin
Escenario: Detección de suma SHA-256 corrupta
  Dado un paquete declarado en un manifiesto TOML con un hash SHA-256 esperado
  Cuando el archivo descargado no coincide con el hash declarado
  Entonces el orquestador detiene inmediatamente el proceso
  Y emite una alerta roja indicando el archivo comprometido.
```

---

## Épica 2: Inicialización del Sistema (`groove-init`)

### Historia US-03: Arranque Ultrarrápido del Espacio de Usuario
- **Como:** Artista que enciende su laptop en un concierto o sesión de estudio.
- **Quiero:** Que el sistema operativo arranque en menos de 3 segundos directo al escritorio gráfico.
- **Para:** Empezar a tocar o grabar inmediatamente sin demoras de inicio de servicios innecesarios.

```gherkin
Escenario: Ejecución paralela de servicios esenciales
  Dado que el kernel Linux transfiere el control a "/sbin/groove-init"
  Cuando "groove-init" procesa el DAG de servicios en "/etc/groove/services/"
  Entonces monta los sistemas virtuales (proc, sys, dev) en menos de 50 ms
  Y lanza en paralelo los servicios independientes sin bloquearse mutuamente
  Y alcanza el entorno gráfico Wayland en menos de 3.0 segundos totales.
```

---

## Épica 3: Driver RT y Rendimiento de Audio en Tiempo Real

### Historia US-04: Grabación Multitrack sin Xruns
- **Como:** Músico y productor de jazz.
- **Quiero:** Que mi tarjeta de sonido USB opere a 48kHz con un buffer de 64 muestras (latencia < 2.5 ms).
- **Para:** Monitorear mi interpretación con instrumentos virtuales en tiempo real sin chasquidos ni latencia perceptible.

```gherkin
Escenario: Registro de hilo de audio en el driver groove_rt_kmod
  Dado que el usuario pertenece al grupo "groove-audio"
  Cuando una aplicación de audio abre "/dev/groove_rt" y emite el IOCTL de registro
  Entonces el driver asigna al hilo prioridad SCHED_FIFO 98
  Y reporta cero pérdidas de ciclos durante 60 minutos continuos de reproducción.
```

---

## Épica 4: Experiencia Visual del Jazz Desktop (`groove-compositor`)

### Historia US-05: Monitorización Visual en el Top Vinyl Bar
- **Como:** Diseñador sonoro o creador multimedia.
- **Quiero:** Ver un vúmetro estéreo animado en la barra superior del escritorio.
- **Para:** Tener conciencia visual constante de los niveles de salida de audio y evitar distorsión digital (*clipping*).

```gherkin
Escenario: Renderizado del vúmetro analógico
  Dado que existe señal de audio activa reproduciéndose en el sistema
  Cuando la señal supera los -6 dB
  Entonces la barra dorada "Warm Brass" del vúmetro se ilumina proporcionalmente
  Y si la señal alcanza 0 dB, el extremo del vúmetro parpadea en color "Bebop Coral".
```

### Historia US-06: Conmutación de Modo de Ventanas (Bebop vs Free Jazz)
- **Como:** Desarrollador y creador que utiliza múltiples programas a la vez.
- **Quiero:** Cambiar entre modo mosaico automático (tiling) y ventanas flotantes libres con `Super + Space`.
- **Para:** Adaptar el espacio de trabajo instantáneamente según esté escribiendo código o manipulando un lienzo de diseño.

```gherkin
Escenario: Cambio ágil de disposición de ventanas
  Dado que el usuario tiene abiertas 3 ventanas en el espacio de trabajo actual
  Cuando presiona la combinación de teclas "Super + Space"
  Entonces las ventanas hacen una transición fluida con resortes al modo opuesto
  Y la barra superior muestra el modo activo: "Bebop (Tiling)" o "Free Jazz (Floating)".
```

---

## Épica 5: Instalación Limpia con "The Soundcheck Installer"

### Historia US-07: Instalación Guiada y Segura
- **Como:** Usuario final probando la distribución en modo LiveUSB.
- **Quiero:** Instalar Linux Groove OS en el almacenamiento interno de mi máquina mediante un asistente interactivo.
- **Para:** Disfrutar de la máxima velocidad de lectura/escritura y persistencia de mis proyectos de arte.

```gherkin
Escenario: Simulación de instalación sin riesgo (Dry-Run)
  Dado que el instalador se ejecuta con el modificador "--dry-run"
  Cuando el usuario completa los 5 pasos del asistente "The Soundcheck"
  Entonces el sistema valida la secuencia de particiones y copia de archivos
  Y muestra un resumen en consola sin alterar ningún byte del disco físico.
```



## Entrega gráfica inicial — aceptación vigente (2026-11-04)

Las metas de tiempo/audio anteriores son requisitos pendientes de medición.

```gherkin
Escenario: Elegir un escritorio en LiveUSB
  Dado un arranque UEFI en la VM ARM64 de aceptación
  Cuando aparece el selector LightDM
  Entonces puedo elegir Groove XFCE o Weston
  Y entrar como groove sin contraseña únicamente en LiveUSB
  Y al cerrar sesión vuelvo al selector.

Escenario: Usar aplicaciones reales
  Dado que entré en Groove XFCE
  Entonces puedo abrir terminal, archivos, editor y ajustes
  Y Firefox carga una página HTTPS con certificados válidos.

Escenario: Recuperación sin gráficos
  Dado un fallo del selector o compositor
  Cuando arranco la entrada de recuperación de GRUB
  Entonces dispongo de una consola
  Y los logs permiten identificar el fallo sin reinicios ilimitados.

Escenario: Conservar el escritorio propio
  Dado que Groove Desktop todavía está en desarrollo
  Entonces XFCE y Weston siguen siendo sesiones utilizables
  Y Groove Desktop solo aparece tras pasar los criterios de la spec 008.
```

## Blue Note Glass / Wayfire — 2026-11-05

- Como artista quiero ver el piano de Groove desde el primer arranque en Weston y Wayfire.
- Como usuario quiero lanzar aplicaciones desde el dock, cambiar espacios y volver al selector.
- Como usuario quiero efectos 3D expresivos y poder reducir el movimiento durante el trabajo.
- Como desarrollador quiero distinguir aceleración VirGL real de renderizado por software.
- Como usuario quiero recuperar Weston o una consola si la nueva sesión falla.

Aceptación y evidencia: [spec 011](specs/011-wayfire-blue-note-glass-spec.md).

## Ventanas coherentes — spec 013

Como creador, quiero reconocer los controles de ventana al cambiar entre editor,
archivos, terminal y navegador, con texto nítido y sin fondos accidentales del dock.
Aceptación: matriz de aplicaciones/estados de spec 013, tema oscuro ONLYOFFICE
sin cambiar documentos, preferencias previas conservadas y capturas nativas UTM.
Wayfire y modificaciones al código de aplicaciones quedan fuera de esta entrega.
