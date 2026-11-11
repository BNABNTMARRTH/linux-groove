# Groove Blue Note — escritorio y acceso

Usuario: artista/desarrollador que elige una sesión y abre aplicaciones reales.
Dominio: estudio, vinilo, partitura, latón, takes y mezcla. La firma visual es
el motivo de vinilo y el pequeño acento de latón junto a la identidad Groove.

Conservar la jerarquía nativa GTK/LightDM para el acceso: selector de usuario,
selector de sesión y acción de entrada, foco por teclado visible. Sin widgets
de telemetría ficticia, tarjetas de dashboard ni animaciones decorativas.

Paleta: Midnight Club #0B0E17 (fondo), Vinyl Groove #141926 (superficies),
Warm Brass #D4AF37 (foco/acción), Cream Sleeve #F4EFE6 (texto), Cool Mute
#3C4A63 y Slate #94A3B8 (texto secundario). Coral se reserva para errores.

Tipo: DejaVu Sans, 11 pt en escritorio y 12 pt en acceso. Mantener dimensiones
nativas de GTK para controles, accesibilidad y navegación por teclado. Usar
una sola estrategia de profundidad: superficies oscuras y foco de 1 px;
sin sombras grandes ni gradientes. Verificar las dimensiones finales en UTM.

Implementación: tema GTK GrooveBlueNote basado en los recursos Adwaita dark,
fondo SVG propio y configuración XFCE. Smithay reutilizará estos tokens cuando
su backend esté implementado; la demo actual no acredita ese escritorio.

## Blue Note Glass / Wayfire — decisión 2026-11-05

El piano/equalizador ámbar-cian sustituye al vinilo como fondo predeterminado.
Firma: latón en identidad/foco, cian para espacios y estado activo, superficies
de estudio carbón. Barra 34 px, dock flotante 72 px con iconos de 48 px; radios
12 px en ventanas y 20 px en dock. Sombras negras suaves y blur Kawase real
solo en la nueva sesión acelerada. Texto claro y foco visible preservados.
Efectos 3D expresivos bajo control del usuario; transiciones habituales 240–280 ms.
Perfil reducido sin blur ni transformaciones 3D. No adoptar fuentes, iconos o
logos de Apple; GTK CSD y SSD requieren validación independiente.

## Refinamiento aprobado — 2026-11-05

Dirección oscura sobria: contenido #15181e, superficies #20242b, texto #e8e6e0,
acento #d4af37. El piano aporta el color. Sustituye las dimensiones y controles
anteriores: dock 64 px, iconos 40 px/80 px, separación 8 px; sin marco brillante.
Barra 34 px sin CPU/RAM permanentes; métricas en tooltip, reloj sin segundos.
Terminal GTK opaca, mono 11 pt, prompt de una línea y carpeta personal.
Controles monocromáticos a la derecha; radios 12 px. Blur solo en superficies
translúcidas, no sobre el texto de la terminal. Animaciones 160–180 ms;
perfil reducido conservado. Weston usa los mismos cuatro lanzadores básicos.

## Evolución Definitiva — 2026-11-06: Arquitectura Groove Studio + KDE Plasma 6 (Wayland)

Se adopta como entorno de escritorio principal una arquitectura moderna y desacoplada sobre **Arch Linux ARM (`aarch64`)**: **KDE Plasma 6 con motor Wayland nativo**.

### 1. Motivación y Causa Raíz Erradicada
- **Aislamiento de Procesos Wayland**: A diferencia de los entornos X11 clásicos donde un cuelgue de cliente o bloqueo de puntero (como en aplicaciones pesadas de IA/Electron como OpenCode) congela el bucle sincrónico del servidor gráfico, KWin Wayland ejecuta cada cliente en su propio búfer de memoria aislado. Si una aplicación falla, el cursor, el dock y el compositor se mantienen fluidos a 60 fps.
- **Entorno de Escritorio Maduro y Completo**: Resuelve de raíz las limitaciones de compositores mínimos (Wayfire/Weston), ofreciendo menú contextual completo en el escritorio con clic derecho (Crear carpeta, abrir terminal, configurar pantalla), centro de ajustes del sistema integrado (`systemsettings`), control de resoluciones dinámicas Mac Retina en UTM, y bandeja con calendario funcional.

### 2. Firma Visual: macOS Glass + Groove Studio
- **Botones de Ventana (Estilo Semáforo macOS)**: Controles en la esquina superior izquierda (`ButtonsOnLeft=XIA`: Cerrar, Minimizar, Maximizar) con bordes suavizados y espaciado ergonómico.
- **Paleta y Superficies**: Tema oscuro `BreezeDark` con efecto Glass translúcido y desenfoque (blur KWin nativo por hardware) en paneles y decoraciones.
- **Tipografía**: `Inter` 10 pt para interfaz general y `Inter Medium` para barras de título, con renderizado LCD subpixel nítido sin pixelado.
- **Fondo de Estudio**: El piano 4K iluminado (*Groove Piano Neon Studio*) configurado como fondo predeterminado del escritorio y del greeter.
- **Gestión de Archivos**: `Dolphin` con pestañas, previsualizaciones y menú contextual de acciones rápidas.

### 3. Failsafes y Atajos Universales
- **Forzar Salida Instantánea**: Atajo nativo de terminación con cursor selector (`Cmd + Option + Esc` en teclado Mac, `Ctrl + Alt + Esc` en PC) que envía `SIGKILL` directo al proceso colgado sin tocar la terminal.
- **Cierre Rápido**: Atajo `Cmd + Q` / `Alt + F4` integrado en KWin para cierre inmediato de ventanas activas.
- **Convivencia**: XFCE 4.20 se conserva como sesión secundaria optimizada con watchdog `ping_timeout=3000` y tema `WhiteSur-Dark`.

