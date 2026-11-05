# Groove Blue Note Glass — Wayfire + Waybar

Decisión aprobada: 2026-11-05. Estado: en implementación.

## Entrega y decisiones

Escritorio ARM64 compilado desde fuentes sobre LFS/BLFS, Wayfire + Waybar,
wf-background y wf-dock. Estética propia de estudio: piano original, superficies
carbón/azul noche, latón y cian. Barra de 34 px, dock flotante, decoraciones
redondeadas, sombras, blur Kawase y animaciones expresivas con cubo/vista general.
Sin recursos de Apple ni promesas de decoraciones idénticas entre toolkits.

Weston conserva el arranque predeterminado hasta verificar Wayfire en la ISO
UEFI mediante UTM con VirGL. XFCE, LightDM, groove-init, ACPI y recuperación se
conservan. Smithay sigue en una etapa posterior; persistencia y suites creativas
no forman parte de esta entrega.

## Etapas y cierre

1. Corregir el empaquetado del fondo: copiar siempre el PNG del piano, incluyendo
   cuando el staging conserva un fondo antiguo. Comprobar integridad.
2. Fijar fuentes y hashes; compilar en `/opt/groove-wayfire`, reutilizando las
   dependencias de `/opt/groove-graphics` sin reemplazar sus bibliotecas.
3. Integrar Mesa VirGL/EGL/GLES, Wayfire/wlroots, decoraciones, shell y Waybar.
   Mantener nodownload para subproyectos y fijar también sus fuentes.
4. Añadir sesión de LightDM, entrada GRUB `groove.session=wayfire`, grafo propio
   de groove-init y perfil de movimiento reducido. El usuario es groove y el
   acceso LiveUSB conserva la política PAM existente.
5. Generar ISO candidata 0.3.0 y checksum sin sobrescribir 0.2.0. Arrancar una VM
   de prueba separada: comprobar renderer, entradas, aplicaciones y recuperación.
6. Promover Wayfire solo tras obtener evidencia funcional y visual. Mientras
   falte evidencia, mantener Weston y registrar exactamente lo pendiente.

## Criterios de aceptación

- PNG original íntegro visible en Weston y Wayfire desde arranque limpio.
- Selector, inicio directo como groove, entrada y salida funcionales, sin procesos
  duplicados; escritorio independiente del audio.
- Barra y dock reales; lanzadores, ventanas abiertas y espacios funcionales.
- Blur, esquinas y sombras visibles; cubo, vista general y movimiento reducido.
- Renderer VirGL comprobado, sin aceptar softpipe/llvmpipe como aceleración.
- Terminal, Thunar, Mousepad y Firefox Wayland; navegación HTTPS.
- Recuperación por Weston y consola; XFCE conservado y probado.
- Fecha, ISO, hash, configuración UTM, capturas, logs y mediciones reales.

Referencias: [spec 011](../specs/011-wayfire-blue-note-glass-spec.md),
[check de avance](../PROGRESS_TRACKER.md).
