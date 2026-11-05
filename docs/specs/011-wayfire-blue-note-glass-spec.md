# Apariencia vigente

La spec 012 sustituye las dimensiones, iconos y terminal originales de esta spec.
Las dependencias y contratos de sesión de este documento se mantienen.

# 011 — Blue Note Glass con Wayfire

Fecha: 2026-11-05. Estado: en implementación, aceptación UTM pendiente.

## Construcción y compatibilidad

Mantener la referencia BLFS 12.2 y el runtime LFS existente. Las adiciones se
registran en `scripts/graphics/wayfire.sources.lock.json` con versión, URL y SHA256.
La combinación Wayfire/wf-config/wf-shell 0.9.0 con wlroots 0.17.4 se fija por su
compatibilidad con las bibliotecas actuales; no se siguen ramas master.
Waybar 0.10.4, Mesa 24.1.5 y pixdecor fijado a commit completan la sesión.
Las revisiones son entradas reproducibles; no constituyen una auditoría de
seguridad ni permiten afirmar que sean las versiones más recientes.

Prefijo nuevo `/opt/groove-wayfire`; base inalterada `/opt/groove-graphics`.
Los subproyectos wf-utils y wf-touch se descargan y verifican antes de compilar;
Meson usa `--wrap-mode=nodownload`. Los parches locales deben llevar SHA256.
No copiar bibliotecas de Debian al runtime. Auditar el cierre ELF de ambos prefijos.
La prueba UTM detectó un fallo en std::locale del libstdc++ heredado sin
versionado de símbolos. Compilar libstdc++ 12.2.0 desde GCC oficial en el prefijo
aislado, con symvers GNU y la ABI del compilador usado para los componentes.
Conservar el runtime base para las sesiones anteriores.

## Interfaces y ciclo de sesión

- Kernel: `groove.session=wayfire` selecciona `/etc/groove/wayfire-services`.
  `groove.text=1`/`single` tienen prioridad y seleccionan recuperación.
  `groove.wayland=1` y `groove.session=weston` conservan Weston.
- LightDM: sesión `groove-wayfire.desktop`, ejecutada como groove. El wrapper
  espera la liberación de Xorg, prepara XDG_RUNTIME_DIR y abre un bus de usuario.
- Grafo: runtime → udev/device-trigger, D-Bus y seatd → Wayfire. No depende de
  PipeWire ni simula servicios de audio. Reinicios limitados por groove-init.
- Wayfire inicia wf-background, Waybar y wf-dock; `autostart_wf_shell=false`
  impide iniciar wf-panel. Cerrar sesión termina Wayfire y permite regresar al
  selector cuando fue iniciado por LightDM. En arranque directo, queda la consola.
- No añadir autologin ni cambiar PAM. Contraseña vacía permitida únicamente por
  la detección explícita LiveUSB existente.

## GPU y alternativa de recuperación

La sesión nueva elimina LIBGL_ALWAYS_SOFTWARE y selecciona sus bibliotecas Mesa
mediante entorno local. Las sesiones anteriores conservan software/Pixman.
Compilar drivers Gallium swrast y virgl, GBM, EGL y GLES. UTM necesita una tarjeta
marcada GPU Supported y un backend compatible con VirGL; no cambiar silenciosamente
la configuración de la VM de trabajo. Verificar primero en una VM de QA.

`groove-gpu-info` crea un contexto EGL en renderD128, registra GBM, vendor y
renderer y devuelve 0 solo para VirGL; devuelve 2 para renderer no acreditado y
1 ante fallo. No habilitar el nuevo inicio predeterminado con una comprobación
por software. Conservar entrada Weston y recuperación aunque la GPU funcione.

## Apariencia y controles

Fondo: `/usr/share/backgrounds/groove-piano-background-4k.png`, copia íntegra del
asset del repositorio. Weston usa `groove-default.png`, actualizado en cada
empaquetado; Wayfire utiliza fill_and_crop centrado, sin deformación.

Barra de 34 px: identidad Groove, espacios reales, reloj, CPU/RAM, enlace de red,
tray, movimiento y salida. Wayfire 0.9 no publica wlr/workspaces: el helper
`groove-workspace` consulta IPC y cambia espacios mediante vswitch. Sin valores
simulados; estado de enlace no equivale a acceso a Internet.

Dock: wf-dock con parche de lanzadores fijos y lista upstream de ventanas abiertas.
Iconos propios existentes de Groove, 48 px; superficie carbón translúcida.
GTK CSD se tematiza por separado de las decoraciones pixdecor. No garantizar
redondeado uniforme en clientes que gestionen su propio contenido/decoración.

Atajos: Super+Enter terminal, Super+E archivos, Super+B Firefox, Super+Space vista
de espacios, Super+W vista de ventanas, Super+flechas cambio de espacio,
Ctrl+Alt+flechas cubo, Ctrl+Alt+arrastre izquierdo giro de cubo,
Ctrl+Alt+arrastre derecho giro de ventana, Alt+F4 cerrar,
Super+Shift+Escape salir. Movimiento reducido elimina blur/animate/cube/wrot y
pone la duración de vswitch a cero; la selección se aplica a la sesión actual.

## Validación y promoción

Comprobar hashes y regeneración del fondo sobre staging antiguo; tests de
selección de grafos y prioridad de recuperación; auditoría ELF y política PAM.
Arrancar ISO UEFI en UTM y registrar renderer, entrada, ambas sesiones Wayland,
GTK/Firefox, HTTPS, cierre de sesión, XFCE y consola. Capturar antes/después,
resoluciones, memoria, CPU y comportamiento de las animaciones. No declarar
60 FPS ni límites de memoria sin medición. Registrar estados y evidencia en el
tracker; promover Wayfire solo después de completar esta aceptación.

## Fuentes primarias

- https://github.com/WayfireWM/wayfire/tree/v0.9.0
- https://github.com/WayfireWM/wf-shell/tree/v0.9.0
- https://github.com/Alexays/Waybar/tree/0.10.4
- https://docs.getutm.app/settings-qemu/devices/display/

## Reloj

Habilitar RTC EFI además de PL031 para recuperar la hora del host en arranque
UEFI/ACPI. Instalar tzcode/tzdata IANA 2024a, fijados a la base LFS 12.2; la
configuración inicial usa America/Mexico_City. Waybar necesita una base de zonas
real para su reloj. Verificar fecha y certificados desde el invitado.

## Compatibilidad gráfica comprobada durante QA

UTM con ANGLE/Metal expone VirGL y permite EGL/GLES, pero el decorador fijado
usaba shaders de cómputo GLSL ES 3.10. El parche local de pixdecor sustituye
únicamente el modo rounded_corners + effect_type=none por un pase GPU de
fragmentos GLSL ES 1.00, con distancia a rectángulo redondeado y sombra suave.
No simular blur con opacidad: el blur sigue siendo el plugin Kawase de Wayfire.
Los efectos de humo/cómputo de pixdecor quedan fuera de esta configuración.

Instalar gsettings-desktop-schemas 46.1 y compilar los overrides de Groove.
Validar su esquema y el runtime C++ con call_once/streams dentro del chroot
antes de empaquetar; ELF resuelto no basta para acreditar ABI ni datos de sesión.

## Refinamiento Blue Note — 2026-11-05

Dirección aprobada: oscuro sobrio, terminal GTK opaca, controles monocromáticos
a la derecha y cuatro lanzadores compartidos (Terminal, Archivos, Editor, Firefox).
Barra 34 px con métricas en tooltip; dock 64 px con iconos propios de 40/80 px.
Sustituye la apariencia de las candidatas anteriores. Wayfire sigue candidato
hasta completar aceptación; Weston, XFCE y consola se conservan.
Audacity, Blender, persistencia y gestor de aplicaciones quedan para después.

Ver [spec 012](012-blue-note-refinement-spec.md) y el informe de validación.
