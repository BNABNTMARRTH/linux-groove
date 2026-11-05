# Arranque ARM64 en UTM

La ISO usa una VM QEMU `aarch64`, máquina `virt`, arranque UEFI y una
pantalla `virtio-gpu-pci`. El medio LiveUSB puede conectarse como CD USB.
El sistema actual inicia la interfaz de texto Blue Note.

## Pantalla «Display output is not active»

Este mensaje también puede aparecer si el kernel falla antes de inicializar
la pantalla. En el kernel anterior se reprodujo este error al arrancar la
ISO mediante EDK2/GRUB:

```text
Failed to find device node for boot cpu
timer_probe: no matching timers found
Kernel panic - not syncing: Unable to initialise architected timer.
```

El arranque directo con `-kernel` sí funcionaba. EDK2 presenta el hardware
mediante ACPI y el kernel anterior no incluía `CONFIG_ACPI=y`. Activarlo en
`kernel/groove_arm64_defconfig` también habilita `CONFIG_ACPI_GTDT`, necesario
para detectar el temporizador ARM en este caso.

Para diagnosticar fallos anteriores a la consola normal, agregar temporalmente
`earlycon=pl011,0x9000000` a la línea del kernel en GRUB y capturar el puerto
serie. Esta dirección corresponde a la máquina QEMU `virt`.

Como solución temporal para la ISO anterior, agregar `-machine acpi=off` en
los argumentos QEMU de UTM permite arrancar mediante Device Tree. Retirar ese
argumento al utilizar el kernel corregido.

Al regenerar la ISO, copiar el kernel y el initramfs recién compilados al
staging: copiar únicamente el contenido de la ISO anterior conserva el kernel
defectuoso. `scripts/build_uefi_hybrid_iso.sh` actualiza ambos archivos.

La comprobación del arranque debe incluir UEFI/GRUB desde la ISO; una prueba
con `-kernel` solamente no detecta esta regresión.

Verificación de la corrección: arranque de la ISO mediante EDK2/GRUB en QEMU
con ACPI activado, detección de GTDT y temporizador a 62,50 MHz, dos CPU y
framebuffer VirtIO. En UTM con aceleración HVF y sin argumentos adicionales,
el LiveUSB montó SquashFS/OverlayFS e inició `groove-init` y el prompt
`groove@bluenote:~$`. El SHA256 de la ISO se actualizó y verificó.

## Wayfire / GPU (candidata 0.3.0)

La configuración de trabajo de 0.2.0 usa `virtio-gpu-pci`, SPICE sin GL y Weston
Pixman: no acredita aceleración. Para Wayfire probar una VM separada con VirtIO
GPU GL, UEFI/ACPI y Mesa VirGL del prefijo nuevo. Ejecutar `groove-gpu-info` dentro
de la sesión y conservar su salida junto al log de Wayfire. No considerar
llvmpipe/softpipe como GPU acelerada. La candidata conserva Weston como inicio
normal hasta completar la aceptación; `groove.session=wayfire` elige el nuevo
escritorio y `groove.text=1` mantiene prioridad de recuperación.

## Refinamiento Blue Note — 2026-11-05

Dirección aprobada: oscuro sobrio, terminal GTK opaca, controles monocromáticos
a la derecha y cuatro lanzadores compartidos (Terminal, Archivos, Editor, Firefox).
Barra 34 px con métricas en tooltip; dock 64 px con iconos propios de 40/80 px.
Sustituye la apariencia de las candidatas anteriores. Wayfire sigue candidato
hasta completar aceptación; Weston, XFCE y consola se conservan.
Audacity, Blender, persistencia y gestor de aplicaciones quedan para después.

Ver [spec 012](specs/012-blue-note-refinement-spec.md) y el informe de validación.
