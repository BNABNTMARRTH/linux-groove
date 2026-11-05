# Spec 008 — Groove Desktop propio con Rust y Smithay

Estado: pendiente; parte vigente de la hoja de ruta. Fecha: 2026-11-04.

## Objetivo

Convertir groove-compositor en un servidor Wayland real con shell Blue Note.
XFCE es el entorno utilizable durante el desarrollo; Weston verifica la base
Wayland. La implementación actual TUI/minifb es una demostración, no este servidor.

## Etapas ordenadas

1. **Compositor anidado:** Smithay, loop de eventos, socket Wayland,
   wl_compositor, shm, xdg-shell, teclado/puntero y una ventana de terminal real.
   Validar creación/destrucción, foco y cierre del cliente.
2. **Backend directo:** DRM/KMS, GBM/EGL, libinput, udev y libseat sobre VirtIO.
   Manejar hotplug, cambios de modo, suspensión/reactivación de VT y liberación
   del seat; conservar un renderer por software de diagnóstico si el backend
   elegido lo soporta. Comenzar con la ruta documentada por Smithay; evaluar
   WGPU después, sin convertirlo en condición para mostrar la primera ventana.
3. **Shell Blue Note:** fondo, topbar, dock, cuatro Takes, foco, mover/redimensionar,
   modo flotante inicial y mosaico posterior con Super+Space. El dock lanza
   procesos reales y distingue aplicaciones instaladas de no disponibles.
4. **Integración:** añadir «Groove Desktop» al selector solamente después de
   superar las pruebas de aplicaciones y logout. XFCE y Weston siguen disponibles.
5. **Telemetría:** conectar PipeWire/driver con lecturas reales; mostrar «sin datos»
   si no existen. Nunca presentar animaciones o constantes como latencia/xruns reales.

## Interfaces y compatibilidad

Mantener el crate groove-compositor; separar explícitamente el modo TUI del
modo compositor. La sesión establece XDG_SESSION_TYPE=wayland y crea su socket
bajo XDG_RUNTIME_DIR privado del usuario. Los clientes descubren el socket por
WAYLAND_DISPLAY. No ejecutar el compositor con UID 0.

Xwayland, aceleración avanzada, más arquitecturas y funciones de estudio quedan
fuera del primer compositor. Conservar referencias a la spec 004 para el diseño
visual, distinguiendo objetivos de capacidades implementadas.

## Criterios de aceptación por hito

- Anidado: terminal Wayland recibe texto y ratón; ventanas abren/cierran sin fuga.
- Directo: sesión de UTM pinta mediante DRM, maneja entrada y devuelve el seat.
- Shell: múltiples aplicaciones reales, foco correcto y controles operativos.
- Selector: entrar como groove y cerrar sesión devuelve a LightDM; fallo permite
  volver a otra sesión o consola. No registrar la sesión antes de cumplirlo.
- Rendimiento: medir memoria y frame timing con metodología y hardware anotados.
  Los objetivos originales de FPS/memoria son metas, no resultados garantizados.
