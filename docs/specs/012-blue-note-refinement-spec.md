# 012 — Blue Note sobrio y lanzadores compartidos

Fecha: 2026-11-05. Implementación y aceptación se registran por separado.

## Apariencia

Carbón #15181e para contenido, #20242b para superficies, texto #e8e6e0 y
acento #d4af37. Radio 12 px, sombra discreta; controles monocromáticos a la
derecha. Sin semáforos, terminal transparente ni marcos brillantes de iconos.
GTK conserva CSD cuando la aplicación lo requiere; pixdecor gestiona SSD.
Firefox necesita comprobación independiente de sus propias decoraciones.

Waybar: 34 px; Groove/espacios a la izquierda, reloj sin segundos al centro,
enlace, bandeja, perfil y salida a la derecha. CPU y RAM solo en tooltip de
estado. El enlace no acredita internet. Dock: 64 px, iconos 40 px, separación
8 px y SVG/PNG 1× y 2× originales. Weston comparte recursos y cuatro acciones;
su dock de recuperación no implementa el protocolo de ventanas de wf-dock.

## Interfaces

`groove-terminal`, `groove-files`, `groove-editor` y `groove-browser` delegan en
`groove-launch LABEL NAME COMMAND [ARG...]`. Conservan el entorno de sesión,
seleccionan rutas compiladas desde fuentes y arrancan en HOME. Cada acción
registra stdout/stderr en `~/.local/state/groove/launch-NAME.log`. Si falla,
`groove-launch-error LABEL LOG` muestra un diálogo GTK con la ruta del registro.
Las cadenas no se evalúan como código ni se insertan como markup.

Terminal: xfce4-terminal sin servidor compartido, 11 pt, opaca, prompt de una
línea; sistema utiliza la misma terminal. Entradas .desktop compartidas;
ninguna acción de fondos o sistema incompleta se expone en el dock.

`groove-system-status` produce JSON para Waybar cada cinco segundos; calcula
CPU por diferencias de /proc/stat y RAM usada como MemTotal−MemAvailable.
Estos indicadores no sustituyen una medición de rendimiento documentada.

## Construcción y compatibilidad

Weston y wf-shell se reconstruyen con parches fijados por SHA256. Diálogo GTK
compilado localmente contra el prefijo de fuentes. Biblioteca Mesa de Wayfire
aislada; Weston/XFCE conservados. RC7 permanece intacta. Sin aplicaciones
creativas nuevas ni cambios al alcance de persistencia/gestión de paquetes.

## Aceptación

Cuatro lanzadores pulsados desde arranque limpio, errores visibles, ventanas
sin marcos duplicados; abrir/enfocar/minimizar/restaurar/cerrar. Entrada y
espacios, HTTPS, cierre de sesión y ausencia de procesos residuales.
Capturas 1280×800, 1920×1080 y 2×; render VirGL y fallback sin GPU;
XFCE y consola conservadas. Promoción condicionada a evidencia UTM completa.

## Traspaso al cerrar sesión

El arranque directo utiliza un coordinador mínimo (`groove-desktop`) supervisado
por init. Solo ese coordinador permanece como root: el hijo crea sesión de
procesos y aplica initgroups/setgid/setuid antes de ejecutar Wayfire o el
fallback Weston como groove. Al terminar, el coordinador se reemplaza por
LightDM. LightDM conserva su autenticación PAM LiveUSB existente; no se añade
autologin ni se cambian los contratos TOML del supervisor.

Los atajos de flechas pertenecen exclusivamente a wm-actions/vswitch; grid
usa el teclado numérico para evitar colisiones. Pixdecor escala el texto con
el framebuffer y usa controles 32/48 px para mantener nitidez a 2×.
