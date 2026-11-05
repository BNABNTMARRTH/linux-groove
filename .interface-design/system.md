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
