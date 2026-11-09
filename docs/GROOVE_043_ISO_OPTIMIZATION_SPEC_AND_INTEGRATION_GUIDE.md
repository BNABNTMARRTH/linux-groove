# Especificacion de Optimizacion Extrema y Guia de Integracion para Linux Groove OS (ISO 0.4.3)

Este documento establece la arquitectura, especificaciones tecnicas y la guia de integracion para consolidar el perfil de rendimiento ultra-rapido en la siguiente generacion de la imagen ISO de **Linux Groove OS**.

---

## 1. Vision y Metricas Clave de Rendimiento (KPIs)

El objetivo de Linux Groove OS es ofrecer un sistema operativo creativo y de produccion musical con latencia de interfaz minima, respuesta elastica instantanea y uso eficiente de los recursos de hardware en arquitecturas ARM64 y x86_64.

| Metrica de Rendimiento | Estado Previo (ISO 0.4.2) | Estado Optimizado (ISO 0.4.3) | Metodo de Medicion |
| :--- | :--- | :--- | :--- |
| **Uso de CPU en reposo** | 35% - 40% (saturado) | **< 1% (99.2% Idle)** | `top -b -n 1` |
| **Carga media del sistema (1m)** | 1.74 | **0.01 - 0.05** | `uptime` |
| **Latencia de D-Bus / Portales** | 4,000 - 5,000 ms (Timeout) | **< 40 ms** | `groove-latency-test` |
| **Apertura de Dolphin (GUI)** | 4.32 s - 5.0 s | **< 0.95 s** | `groove-latency-test --app dolphin` |
| **Apertura de Konsole (GUI)** | 2.74 s | **< 0.72 s** | `groove-latency-test --app konsole` |
| **Arranque grafico** | Doble servidor (X11 greeter + Wayland) | **Directo Wayland nativo** | SDDM Autologin |

---

## 2. Diagnostico Forense de Cuellos de Botella (ISO 0.4.2)

### 2.1 El Bucle Infinito del Agente SPICE (Fuga del 35% de CPU)
- **Problema:** Existian dos instancias simultaneas del agente SPICE:
  - Una instancia gestionada por `systemd --user` (`/usr/lib/systemd/user/spice-vdagent.service` con `-x`).
  - Una segunda instancia lanzada por `/etc/xdg/autostart/spice-vdagent.desktop` (sin `-x`).
- **Consecuencia:** La segunda instancia asumia un entorno GNOME y ejecutaba llamadas repetitivas e infinitas a `org.gnome.Mutter.DisplayConfig` sobre D-Bus. Esto inundaba el registro del sistema con miles de errores por segundo, bloqueaba el socket virtio e incrementaba el consumo de CPU hasta el 38% en reposo, congelando la comunicacion D-Bus de las aplicaciones.
- **Solucion 0.4.3:** Eliminar de raiz `/etc/xdg/autostart/spice-vdagent.desktop` y dejar exclusivamente la unidad nativa de `systemd --user`.

### 2.2 El Falso "Doble Escritorio" en SDDM
- **Problema:** En `/etc/sddm.conf.d/groove.conf`, la variable `Session` contenia la ruta absoluta `/usr/share/wayland-sessions/plasma.desktop` y `DisplayServer=x11-user`.
- **Consecuencia:** SDDM no reconocia la ruta absoluta contra sus identificadores internos. Como consecuencia:
  1. Levantaba primero un servidor X11 completo para mostrar el greeter visual de bienvenida.
  2. Tras montar X11, forzaba el autologin y procedia a levantar Wayland en un segundo terminal.
  3. El usuario percibia que el sistema "cargaba dos escritorios seguidos" y sufria un retardo de arranque de 5 a 10 segundos.
- **Solucion 0.4.3:** Configurar `Session=plasma` (identificador base) y `DisplayServer=wayland`, logrando autologin directo y sin intermediarios.

### 2.3 Falta de Prioridad de Portales (`xdg-desktop-portal`)
- **Problema:** Coexistian `xdg-desktop-portal-kde`, `xdg-desktop-portal-gtk` y `xdg-desktop-portal-wlr` sin archivo de directiva.
- **Consecuencia:** `xdg-desktop-portal` consultaba GTK como fallback antes de KDE, acumulando esperas de 4 a 5 segundos cada vez que una ventana solicitaba acceso a dialogos o servicios del sistema.
- **Solucion 0.4.3:** Instalar `/etc/xdg/xdg-desktop-portal/kde-portals.conf` con `default=kde`.

### 2.4 Cache en Frio de Servicios (`ksycoca6`) y Fuentes (`fontconfig`)
- **Problema:** En el primer arranque, Dolphin y Konsole debian compilar en tiempo real las bases de datos de tipos MIME y el mapa de tipografias monoespaciadas.
- **Solucion 0.4.3:** Ejecutar en el script de arranque de perfil (`groove-profile-init.desktop`) la precompilacion no incremental de `ksycoca6` y el refresco de `fc-cache` en segundo plano.

### 2.5 Temporizador Residual de Feedback de Inicio
- **Problema:** La falta de `/etc/xdg/klaunchrc` mantenia el valor predeterminado de 5 segundos para el cursor ocupado y animacion del dock.
- **Solucion 0.4.3:** Definir `Timeout=1` y `BusyCursor=false`.

---

## 3. Matriz de Archivos y Especificacion de Configuracion

Los siguientes archivos deben estar presentes en el arbol del rootfs antes de empaquetar `rootfs.squashfs`:

### 3.1 `/etc/sddm.conf.d/groove.conf` (Permisos: 0644)
```ini
[Theme]
Current=breeze
CursorTheme=breeze_cursors

[Users]
DefaultPath=/usr/local/bin:/usr/bin:/bin
MinimumUid=1000
MaximumUid=60000
RememberLastUser=true
RememberLastSession=true

[General]
DisplayServer=wayland
GreeterEnvironment=QML_DISABLE_DISK_CACHE=1,QT_WAYLAND_SHELL_INTEGRATION=layer-shell

[Autologin]
User=groove
Session=plasma
Relogin=false
```

### 3.2 `/etc/xdg/xdg-desktop-portal/kde-portals.conf` (Permisos: 0644)
```ini
[preferred]
default=kde
org.freedesktop.impl.portal.Settings=kde;gtk;
org.freedesktop.impl.portal.Secret=kwallet;
org.freedesktop.impl.portal.Notification=plasmanotify;
```

### 3.3 `/etc/xdg/klaunchrc` (Permisos: 0644)
```ini
[BusyCursorSettings]
Blinking=false
Bouncing=false
Timeout=1

[FeedbackStyle]
BusyCursor=false
TaskbarButton=true
```

### 3.4 `/etc/xdg/UserFeedbackrc` (Permisos: 0644)
```ini
[UserFeedback]
FeedbackLevel=0
```

### 3.5 `/etc/xdg/autostart/groove-profile-init.desktop` (Permisos: 0644)
```ini
[Desktop Entry]
Name=Groove Profile Initializer
Comment=Aplica el perfil de optimizacion y efectos 3D de Linux Groove
Exec=sh -c "/usr/bin/groove-profile expressive; /usr/bin/kbuildsycoca6 --noincremental >/dev/null 2>&1 & su - groove -c 'fc-cache -r' >/dev/null 2>&1 &"
Terminal=false
Type=Application
NoDisplay=true
X-KDE-autostart-phase=1
```

### 3.6 Eliminacion Mandatoria de Autostarts Conflictivos
En el script de construccion (`package_native_042_iso.sh` o sucesor), se debe ejecutar:
```bash
rm -f "${ROOTFS}/etc/xdg/autostart/spice-vdagent.desktop"
```

### 3.7 `/usr/bin/groove-latency-test` (Permisos: 0755)
Herramienta de diagnostico en Python 3 para que tanto desarrolladores como usuarios puedan auditar cronometricamente la velocidad del sistema ejecutando:
```bash
groove-latency-test --app dolphin
groove-latency-test --app konsole
```

---

## 4. Optimizacion del Motor Rust (`crates/groove-boostd`)

El daemon de precarga en RAM de Linux Groove OS debe incluir en su lista de bibliotecas criticas (`is_critical_library`) los siguientes componentes:

```rust
let critical_prefixes = [
    "libQt6Core",
    "libQt6Gui",
    "libQt6Quick",
    "libQt6Qml",
    "libQt6Widgets",
    "libQt6WaylandClient",
    "libKF6",
    "libkwin",
    "libwayland",
    "libEGL",
    "libGL",
    "libdolphin",
    "libkonsole",
];
```

Esto garantiza que tanto el gestor de archivos como el emulador de terminal se encuentren ya mapeados en la memoria RAM fisica antes de que el usuario haga clic.

---

## 5. Procedimiento de Verificacion para la Siguiente ISO

Antes de publicar cualquier nueva version de la ISO, se deben ejecutar los siguientes pasos de validacion en la maquina virtual:

1. **Prueba de Carga en Reposo:**
   - Ejecutar `uptime` y verificar que la carga a 1 minuto sea inferior a `0.10`.
   - Ejecutar `top -b -n 1` y verificar que el porcentaje `%Cpu(s) id` sea superior al `97%`.
2. **Prueba de Procesos Unicos:**
   - Ejecutar `ps -eo pid,args | grep -i spice` y verificar que **solo exista una instancia** de `spice-vdagent` (`-x`).
3. **Prueba de Benchmarking de Apertura:**
   - Ejecutar `groove-latency-test --app dolphin` y comprobar que la Fase B de apertura de interfaz sea menor a 1.2 segundos.
   - Ejecutar `groove-latency-test --app konsole` y comprobar que sea menor a 0.8 segundos.
