# Refinamiento Groove Blue Note

Fecha: 2026-11-05. Dirección aprobada: oscuro sobrio; solo escritorio.

## Resultado y decisiones

Conservar el piano; unificar GTK y pixdecor con carbón, texto claro,
radio de 12 px y controles monocromáticos a la derecha. Sustituir Weston
Terminal por xfce4-terminal en Weston y Wayfire: fondo opaco, 11 pt,
prompt sencillo y carpeta personal inicial. Las aplicaciones con marcos
propios se revisan por separado, sin prometer controles idénticos.

Wayfire continúa como candidato. Conservar Weston, XFCE y consola;
no promover el predeterminado antes de la aceptación UTM. Mantener LFS/BLFS,
compilación desde fuentes, acceso libre exclusivo LiveUSB y perfiles de movimiento.

## Etapas

1. Revisar una composición antes de empaquetar: barra 34 px, dock 64 px,
   cuatro iconos originales de 40 px con variantes 80 px, ventanas y terminal.
2. Centralizar Terminal, Archivos, Editor y Firefox en wrappers compartidos.
   Registrar errores y mostrar diálogo GTK. Retirar acciones incompletas.
3. Refinar Waybar y el shell de recuperación Weston. Mantener ventanas
   abiertas/activación en wf-dock y transiciones de 160–180 ms.
4. Construir otra ISO, conservando RC7. Probar ambas sesiones y recuperación.
5. Actualizar evidencia, especificaciones y seguimiento; promover solo al cerrar.

## Cierre

Arranque limpio en UTM ARM64; cuatro lanzadores, entrada, mover/redimensionar,
maximizar/minimizar/restaurar, espacios y salida al selector operativos.
Firefox HTTPS, sin procesos o títulos duplicados. Capturas a 1280×800,
1920×1080 y escala 2×, incluido contraste y menús. Confirmar VirGL y fallback
Weston sin aceleración. Registrar tamaño, hash, logs y fecha de cada prueba.

Audacity, Blender, gestor de aplicaciones, persistencia y Smithay quedan fuera.
Memoria, CPU, arranque, fluidez y audio no se dan por medidos sin resultados.

Seguimiento: [evidencia de refinamiento](../validation/BLUE_NOTE_REFINEMENT.md).
