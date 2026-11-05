# Implementación del escritorio gráfico — Linux Groove

Fecha de decisión: 2026-11-04. Plataforma de aceptación: UTM/QEMU ARM64,
UEFI, HVF, virtio-gpu-pci. Base: LFS 12.2 y groove-init; ACPI permanece activo.

## Decisiones acordadas

- Compilar los componentes gráficos desde fuentes siguiendo BLFS 12.2
  System V, adaptando sus servicios a groove-init. No sustituir LFS por otra
  distribución ni introducir paquetes Nix en la imagen.
- LightDM + GTK Greeter presenta un selector de sesiones, sin autologin.
- XFCE/X11 proporciona el escritorio principal con tema Blue Note, archivos,
  terminal, editor, ajustes y Firefox ESR ARM64.
- Weston proporciona una sesión Wayland alternativa. No ejecutar XFCE dentro
  de Weston ni lanzar dos compositores sobre la misma sesión.
- El usuario groove entra sin contraseña solamente en LiveUSB. Una marca
  de runtime creada por el initramfs habilita esa política; nunca se instala
  una excepción universal de PAM.
- La consola de recuperación queda disponible desde GRUB.
- El escritorio propio Rust/Smithay sigue dentro del proyecto, como etapa
  posterior. La TUI y la demo minifb no son un compositor Wayland terminado.
- Esta entrega no incluye persistencia, x86_64, aceleración 3D ni nuevas
  suites creativas. Tamaño y rendimiento se medirán, sin prometer los KPIs
  anteriores para la ISO con XFCE y navegador.

## Etapas y criterios de cierre

1. **Preparación:** preservar ISO/kernel/rootfs originales, fijar fuentes,
   dependencias y hashes; construir en staging aislado y registrar logs.
2. **Gráficos:** compilar bibliotecas, Xorg, Mesa, entrada, Wayland, Weston,
   XFCE y LightDM; comprobar dependencias ELF y habilitar INPUT_EVDEV.
3. **Init:** validar DAG, aplicar usuarios/grupos, esperar disponibilidad,
   recolectar hijos, limitar reinicios y mantener recuperación.
4. **Acceso:** selector XFCE/Weston, sesiones como groove, PAM limitado al
   LiveUSB, retorno al selector al cerrar sesión y apariencia Blue Note.
5. **Aplicaciones:** utilidades, Firefox ESR, DHCP/DNS y certificados HTTPS.
6. **Release:** regenerar SquashFS/initramfs/ISO híbrida y checksums sin
   reemplazar la ISO funcional hasta pasar las pruebas.

## Aceptación

- Arranque real de la ISO por UEFI en UTM, sin acpi=off ni arranque directo
  -kernel como sustituto de la prueba de release.
- Selector visible; teclado/ratón funcionales; entrar y salir de ambas sesiones.
- Aplicaciones ejecutadas como groove, terminal/archivos/editor operativos,
  Firefox abre una página HTTPS con red y certificados válidos.
- Acceso sin contraseña rechazado sin la marca de LiveUSB o para otro usuario.
- Errores de servicios no generan zombies, ciclos, reinicios ilimitados ni
  bloqueo de la consola de recuperación.
- Fuentes, versiones, hashes, logs, tamaño de ISO y resultados documentados.

El seguimiento vigente y la evidencia de cada etapa están en
[PROGRESS_TRACKER](../PROGRESS_TRACKER.md). Una etapa solo se marca verificada
cuando cumple su criterio; un binario compilado no acredita integración.
