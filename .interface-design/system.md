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
