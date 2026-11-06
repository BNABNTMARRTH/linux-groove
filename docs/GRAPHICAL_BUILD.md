# Construcción gráfica desde fuentes

Estado: integración en curso. Decisiones: [plan](plans/GRAPHICAL_DESKTOP_IMPLEMENTATION.md).
Referencia principal: [BLFS 12.2 System V](https://www.linuxfromscratch.org/blfs/view/12.2/).

## Qué se construye

Se preserva el rootfs LFS y se compila la pila gráfica nativamente para ARM64 en
`/opt/groove-graphics`. El contenedor usa herramientas de desarrollo de Debian;
esas herramientas no se copian al sistema entregado. Las bibliotecas gráficas
y aplicaciones de runtime proceden de las fuentes registradas. La libc y los
runtimes GCC/C++ siguen siendo los de la base LFS. Auditar el cierre ELF antes
de empaquetar; una dependencia del host ausente debe compilarse, no copiarse.

BLFS describe una base LFS completa. Esta imagen aún carece de componentes
necesarios; las recetas agregan primero paquetes base como libffi, zlib,
libxcrypt, util-linux y PAM, y adaptan los prefijos, ARM64 y servicios. No se
instalan scripts SysV ni systemd como PID 1: groove-init coordina los servicios.

## Fuentes y reproducibilidad

- `scripts/graphics/recipes.json`: orden y opciones de construcción.
- `scripts/graphics/lock_sources.py`: resuelve entidades de los libros fijados.
- `scripts/graphics/sources.lock.json`: URLs/versiones y SHA256 de los archivos;
  cuando el libro aporta MD5 también se comprueba contra esa referencia.
- `scripts/graphics/build_sources.py`: descargas independientes, hashes,
  compilación secuencial por dependencias, logs y stamps para reanudar.
- Firefox ESR usa una versión explícita y verifica las fuentes contra SHA512SUMS
  de Mozilla. Su bootstrap obtiene herramientas de desarrollo; el navegador se
  compila desde las fuentes, sin artifact mode.

Referencias fijadas de los libros:

- BLFS r12.2: `210c76f9f8a1cda4519a295f62611280cbfc4354`.
- LFS r12.2: `4b8c6b4f618ee1138c52633437063ae0d2d97a1c`.

Weston/eudev/seatd complementan las recetas del libro con versiones explícitas
de sus proyectos upstream. Registrar cualquier cambio de receta y volver a
probar los consumidores afectados. No confundir reproducibilidad de entradas
con garantía de una ISO idéntica byte a byte.

## Ejecución

Requisitos: Docker ARM64, imagen `linux-groove-builder` construida desde el
Dockerfile LFS, ISO base 0.1.0 verificada, kernel 6.12 fuente y almacenamiento
externo suficiente. El constructor conserva logs, tarballs y resultados para
reanudar. Firefox usa un archivo ext4 de 20 GiB en el almacenamiento grande;
el helper privilegiado solo monta ese archivo en el namespace del constructor.

```sh
./scripts/build_graphical_iso.sh          # construcción completa
./scripts/build_graphical_iso.sh sources  # bibliotecas/escritorios
./scripts/build_graphical_iso.sh firefox  # navegador
./scripts/build_graphical_iso.sh package  # verificar y empaquetar
```

`STORAGE`, `BUILDER` y `BUILD_IMAGE` permiten cambiar las rutas/nombres.
El empaquetado comprueba ejecutables, dependencias ELF, manifiestos y PAM antes
de crear `linux-groove-0.2.0-aarch64.iso`. Si ya existe ese resultado, se conserva
y el script no lo sobrescribe. La base y la nueva ISO mantienen checksums separados.

## Runtime y recuperación

El selector muestra Groove XFCE y Weston. El wrapper establece datos, fuentes,
esquemas GTK y un bus de usuario; LightDM ejecuta la sesión como groove. Solo
el initramfs crea `/run/groove/live` al encontrar el medio SquashFS. PAM verifica
usuario, servicio, contenido, propietario y ausencia de enlace simbólico.

Logs: `/var/log/groove/*.log`, `/var/log/lightdm/` y el log de sesión del usuario.
La entrada de consola en GRUB evita LightDM; hay una VT alternativa para getty.
El teclado inicial usa la configuración por defecto de Xorg y puede ajustarse
en XFCE. La interfaz selecciona español donde haya catálogos y locale instalado.

## Evidencia necesaria

Pruebas de init, PAM (permitir/rechazar), auditoría ELF, checksums, arranque ISO
UEFI en UTM, selector, ambas sesiones, teclado/ratón, logout, utilidades y HTTPS.
Anotar versión/hash de la ISO y características de la VM. Un boot directo
`-kernel` no sustituye el boot de la ISO. Consultar el tracker para resultados;
no atribuir éxito a pruebas todavía pendientes.

## Candidata Wayfire / Blue Note Glass

```sh
./scripts/build_wayfire_iso.sh sources  # prefijo separado, fuentes fijadas
./scripts/build_wayfire_iso.sh package  # copia nueva del rootfs 0.2.0
./scripts/build_wayfire_iso.sh          # ambas etapas
```

La candidata se publica como `linux-groove-0.3.0-aarch64.iso`, con checksum
separado; una salida existente produce error y se conserva. `VERSION` permite
nombrar una nueva candidata. Las dependencias y subproyectos están fijados en
`wayfire.sources.lock.json`; los logs quedan en `/tmp/groove-wayfire-build` del
constructor. El empaquetado necesita las fuentes y herramientas ya usadas para
0.2.0, incluido el kernel preparado en `/tmp/graphical-images`.

Weston sigue como opción inicial. Elegir la entrada Wayfire en GRUB o su sesión
en LightDM. Para probar GPU usar una VM UTM separada con tarjeta GPU Supported
(VirtIO GL), manteniendo UEFI/ACPI. Ejecutar dentro de esa sesión:

```sh
/opt/groove-wayfire/bin/groove-gpu-info
```

Guardar salida y log `~/.local/state/groove/wayfire.log`; la detección requiere
VirGL y rechaza software. Las capturas por sí solas no prueban aceleración.
El botón Movimiento alterna efectos completos/reducidos. Super+Shift+Escape
cierra la sesión; desde LightDM devuelve al selector. Weston y consola siguen
disponibles en GRUB. No cambiar el arranque por defecto hasta completar la
[aceptación](specs/011-wayfire-blue-note-glass-spec.md).

## Refinamiento Blue Note — 2026-11-05

Dirección aprobada: oscuro sobrio, terminal GTK opaca, controles monocromáticos
a la derecha y cuatro lanzadores compartidos (Terminal, Archivos, Editor, Firefox).
Barra 34 px con métricas en tooltip; dock 64 px con iconos propios de 40/80 px.
Sustituye la apariencia de las candidatas anteriores. Wayfire sigue candidato
hasta completar aceptación; Weston, XFCE y consola se conservan.
Audacity, Blender, persistencia y gestor de aplicaciones quedan para después.

Ver [spec 012](specs/012-blue-note-refinement-spec.md) y el informe de validación.

## Candidata GrooveWindow (spec 013)

Construcción XFCE con XFWM como compositor, sin promoción automática:

```sh
VERSION=0.3.0-rc21 DEFAULT_SESSION=xfce ./scripts/build_wayfire_iso.sh package
```

El constructor conserva archivos de salida existentes y exige staging nuevo.
Genera recursos SVG/PNG 1×/2× y verifica Inter dentro del rootfs. Configuración
XFCE propia en `/etc/xdg/groove-xfce`; no fuerza GTK_THEME ni escribe las
preferencias de apariencia de un HOME existente. Wayfire se adapta después.

[Evidencia y matriz UTM](validation/unified-window-design/README.md).
Las capturas Xvfb de apariencia no acreditan composición, GPU ni arranque UTM.
