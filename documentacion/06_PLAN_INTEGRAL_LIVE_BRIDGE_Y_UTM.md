# 06 — Plan Integral: Motor de Control Total en Tiempo Real (Tipo MCP en Puerto 8080), Animaciones Veloces en Rust, Tuning UTM y Edición en Vivo

Este documento define la arquitectura completa para que **Linux Groove 0.4.1** integre un **Servidor de Control Total del Sistema Operativo en Tiempo Real (estilo MCP)** escrito en Rust (`groove-bridged` en el puerto `8080`), capaz de mover el puntero del mouse, hacer clics, arrastrar ventanas, escribir en el teclado, controlar ventanas de KWin, controlar terminales, capturar la pantalla, sincronizar el portapapeles con el Mac y guardar modificaciones de código en tiempo real.

---

## 1. Sí es 100% Posible: Cómo Funciona el Control Total (Tipo MCP) en Rust + Linux Kernel

En entornos Wayland modernos (como KDE Plasma 6), las herramientas antiguas de X11 no pueden mover el cursor globalmente. Sin embargo, al escribir nuestro daemon **`groove-bridged` en Rust a nivel de sistema**, nos conectamos directamente a **3 interfaces nativas del Kernel y de KWin**:

1. **Control Físico Virtual de Mouse y Teclado (`/dev/uinput` del Kernel Linux):**
   - El kernel `7.3.1-2-aarch64-ARCH` incluye el módulo `drivers/input/misc/uinput.ko`.
   - `groove-bridged` carga `uinput` al arrancar y registra un dispositivo de entrada virtual de alta precisión (`Groove MCP Virtual Tablet & Keyboard`) con coordenadas absolutas (`ABS_X`, `ABS_Y` de `0..65535`), botones de ratón (`BTN_LEFT`, `BTN_RIGHT`, `BTN_MIDDLE`), rueda de scroll y todas las teclas del teclado (`EV_KEY`).
   - **Efecto en vivo:** Cuando enviamos `POST /mcp/mouse_move` o `POST /mcp/mouse_drag`, **tú ves la flecha del mouse moverse sola en tu pantalla de UTM**, agarrar ventanas, arrastrarlas para probar el efecto *Wobbly Windows*, hacer clic en menús y escribir texto en vivo.

2. **Control Nativo de Ventanas en KDE Plasma 6 (`KWin Scripting + D-Bus`):**
   - A través del bus de sesión de usuario (`unix:path=/run/user/1000/bus`), `groove-bridged` se comunica con `org.kde.KWin`:
     - Lista todas las ventanas abiertas con su título, clase, geometría `(x, y, ancho, alto)` y estado.
     - Abre aplicaciones, enfoca ventanas, las mueve, redimensiona, maximiza, minimiza o cierra en `< 2 ms`.
     - Dispara efectos globales (como abrir la vista general, rotar el Cubo 3D o recargar shaders).

3. **Visión en Tiempo Real (`GET /mcp/screenshot`) y Control de Terminal (`POST /mcp/terminal`):**
   - Permite tomar capturas instantáneas de la pantalla de la VM para inspeccionar visualmente cada cambio de interfaz y ejecutar comandos tanto en segundo plano como escribiéndolos en vivo dentro de una ventana visible de `Konsole`.

---

## 2. API Completa del Servidor Rust `groove-bridged` (Puerto `8080`)

| Endpoint HTTP / MCP | Acción en Tiempo Real dentro de la VM |
| :--- | :--- |
| **`GET /status`** | Telemetría JSON: CPU, RAM, GPU (`eglinfo`), procesos con `libgroove_fast.so`, configuración activa de KWin. |
| **`POST /mcp/mouse`** | `{ "action": "move" \| "click" \| "double_click" \| "drag" \| "scroll", "x": 500, "y": 300, "to_x": 800, "to_y": 400, "duration_ms": 150 }` — Mueve el puntero con interpolación suave o directa, hace clic o arrastra ventanas en vivo. |
| **`POST /mcp/keyboard`** | `{ "action": "type" \| "key" \| "shortcut", "text": "hola", "keys": ["CTRL", "F11"] }` — Escribe texto o presiona atajos del sistema en tiempo real. |
| **`GET /mcp/windows`** | Devuelve el listado JSON de todas las ventanas abiertas en Plasma 6 y sus coordenadas en pantalla. |
| **`POST /mcp/windows`** | `{ "action": "open" \| "focus" \| "move" \| "resize" \| "minimize" \| "maximize" \| "close", "target": "dolphin", "x": 100, "y": 100, "w": 900, "h": 600 }` — Control total del gestor de ventanas. |
| **`POST /mcp/terminal`** | `{ "cmd": "...", "visible": true }` — Abre o envía comandos a la terminal `Konsole` en pantalla o en segundo plano y devuelve `stdout`/`stderr`. |
| **`GET /mcp/screenshot`** | Captura la pantalla actual de la sesión Wayland y devuelve la imagen PNG en vivo. |
| **`GET /read` & `POST /write`** | Lee y modifica cualquier archivo del sistema o código en vivo, guardándolo en el disco persistente (`/dev/vda`) y sincronizándolo con el Mac. |

---

## 3. Optimización de Animaciones "Activas pero Súper Veloces" (Rust + KWin)

1. **`/etc/ld.so.preload` + `/etc/security/limits.d/10-groove-realtime.conf`:**
   - Inyecta `libgroove_fast.so` en `kwin_wayland` y `plasmashell` con prioridad `nice -15` y `rtprio 99`.
2. **Micro-Animación Elástica de 80 ms (`AnimationDurationFactor=0.25`):**
   - Configurada en `/home/groove/.config/kdeglobals`, `/etc/xdg/kdeglobals` y `/etc/skel/.config/kdeglobals`.
3. **Shaders 3D Rápidos en `kwinrc`:**
   - `LatencyPolicy=ExtremelyLow`, `DirectScanout=true`, `AnimationSpeed=1`.
   - `WobblyWindows` firme (`Drag=85`, `Friction=90`, `Stiffness=15`) y `Blur` optimizado (`BlurStrength=3`, `NoiseStrength=0`).

---

## 4. Configuración Óptima de UTM (`Linux.utm/config.plist` en tu Apple M4)

- **RAM:** `8192 MB` (8 GB de los 16 GB del M4).
- **CPU:** `6` núcleos de alto rendimiento.
- **Resolución Dinámica + Portapapeles SPICE:** Activos desde el arranque (`spice-vdagentd` + `spice-vdagent`).
