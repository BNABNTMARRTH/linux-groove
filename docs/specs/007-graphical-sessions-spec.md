# Spec 007 — Sesiones gráficas XFCE/Weston

Actualización 2026-11-05: la [spec 011](011-wayfire-blue-note-glass-spec.md) añade
Wayfire como sesión opcional y `groove.session=wayfire` como grafo independiente.
Weston conserva el inicio normal hasta validar GPU/funcionalidad en UTM; el fondo
piano se instala explícitamente. Esta etapa no implementa Rust/Smithay.


Estado: en implementación. Fecha: 2026-11-04 (Actualizado 2026-11-05).
Requisitos y decisiones: [plan de integración](../plans/GRAPHICAL_DESKTOP_IMPLEMENTATION.md) y [Spec 009 (Wayland Standalone y Traspaso DRM)](009-wayland-standalone-and-session-handoff-spec.md).

## Arquitectura y dependencias

LFS 12.2 conserva su libc, herramientas Rust, kernel ARM64 y groove-init.
Las dependencias gráficas se compilan desde fuentes; BLFS 12.2 System V es
la referencia de recetas/versiones para el conjunto XFCE/Xorg. Weston y las
actualizaciones necesarias para Firefox se fijan explícitamente desde upstream.

Separar herramientas del contenedor constructor de las bibliotecas de runtime.
No copiar silenciosamente bibliotecas de Debian al rootfs. Cada componente
entregado debe tener procedencia, versión, URL, checksum y log de compilación.
Instalar el stack gráfico en un prefijo aislado para no sobrescribir la base
LFS; registrar sus rutas de bibliotecas, datos, fuentes, módulos y ejecutables.

Orden funcional: bibliotecas base y PAM → D-Bus/dispositivos → Xorg/Mesa/
Wayland/libinput/libxkbcommon → GTK/XFCE/Weston → LightDM/Greeter → aplicaciones.
El driver DRM VirtIO, framebuffer y ACPI permanecen integrados. INPUT_EVDEV,
PTY Unix y memoria compartida son obligatorios. Usar renderizado por software
como configuración inicial de la VM, sin requerir virgl.

## Servicios y disponibilidad

- groove-init ejecuta servicios reales, valida el grafo antes del arranque y
  registra ausencias como fallos, no como servicios simulados exitosos.
- Dispositivos y D-Bus deben estar disponibles antes de LightDM. Un servicio
  de audio ausente no es dependencia obligatoria de la sesión gráfica.
- El gestor de sesiones de usuario debe proveer runtime privado 0700, UID/GID
  correctos y permisos de dispositivos administrados por sesión/seat.
- Usuarios de daemon separados para LightDM y D-Bus. LightDM inicia con los
  privilegios requeridos y lanza sesiones de escritorio como groove (UID 1000).
- Logs en /var/log/groove y /var/log/lightdm, escribibles mediante OverlayFS.

## Selector y contratos de sesión

LightDM GTK Greeter muestra «Groove XFCE» y «Weston». Registrar archivos
.desktop en /usr/share/xsessions y /usr/share/wayland-sessions. Los wrappers
establecen PATH, XDG_DATA_DIRS y la configuración del prefijo gráfico.
No imponer DISPLAY ni WAYLAND_DISPLAY globalmente: los asigna cada sesión.
Crear un bus D-Bus de usuario por sesión. Logout vuelve al selector y limpia
los procesos y archivos de runtime de esa sesión.

La apariencia usa Midnight Club #0B0E17, Vinyl Groove #141926, Warm Brass
#D4AF37 y Cream Sleeve #F4EFE6. Identidad inspirada en vinilos, estudio,
partitura, latón y sesiones/takes; acento dorado solo para foco/acciones.
Usar un fondo sobrio con motivo de vinilo, tipografía legible y foco visible.
La telemetría simulada no se muestra como medición real.

## Política LiveUSB y recuperación

El initramfs crea /run/groove/live únicamente tras encontrar y montar el medio
con groove/rootfs.squashfs. La marca debe sobrevivir al switch_root y los
montajes posteriores. No incluirla en el SquashFS ni en un rootfs instalado.

PAM permite acceso sin contraseña solo cuando PAM_USER=groove y la marca
root-owned existe. En cualquier otro caso debe usar autenticación normal o
rechazar el acceso. Conservar el grupo y las cuentas de daemon protegidos.
No habilitar autologin: el usuario siempre elige sesión.

GRUB conserva una entrada groove.text=1/single que inicia servicios de
recuperación sin LightDM. Mantener getty en otra VT. Un fallo repetido del
selector debe dejar la consola disponible.

## Aplicaciones, red y navegador

Incluir Thunar, terminal XFCE, editor, panel, gestor de ventanas y ajustes.
Firefox ESR se compila desde una versión upstream mantenida y fijada antes
del build; incluir lanzador y certificados CA. Activar loopback y DHCP para
VirtIO, aplicar DNS y validar HTTPS. Sin persistencia, perfiles y cambios se
pierden al reiniciar. La selección de idioma inicial será español cuando los
catálogos del componente estén disponibles.

## Pruebas de aceptación

1. Dependencia ausente/cíclica: error explícito sin recursión infinita.
2. Spawn con UID/GID y grupos suplementarios; recolección y reinicios limitados.
3. ISO UEFI → selector → XFCE → utilidades/Firefox HTTPS → logout → selector.
4. Selector → Weston → cliente Wayland y teclado/ratón → logout → selector.
5. Sin marca LiveUSB y con otro usuario: denegar el acceso sin contraseña.
6. Matar compositor/daemon; verificar recuperación y logs sin zombies.
7. Arrancar entrada de consola. Verificar hashes y medir artefactos finales.

No declarar esta spec completa sin realizar las pruebas 3–7 en la imagen.
