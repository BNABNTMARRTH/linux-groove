# 013 — Ventanas coherentes GrooveWindow

Fecha: 2026-11-05. Estado: implementación; aceptación UTM pendiente.

## Objetivo y precedencia

XFCE/X11 adopta una estructura visual inspirada en las capturas de Brave del
usuario: símbolos a la izquierda, hover circular y separación tonal entre
cabecera y herramientas. La identidad Groove se conserva en el acento latón.
Esta spec sustituye para XFCE las decisiones de decoración de las specs
010–012, el plan híbrido y las secciones anteriores del PRD: no semáforos,
no decoración universal garantizada y no Picom como compositor de la entrega.
Wayfire, Weston y la hoja de ruta Smithay conservan sus funciones y alcance;
la adaptación visual de Wayfire es posterior.

## Contrato visual

Fuente de valores: `scripts/graphics/window-design/tokens.json`.

| Propiedad | Valor base, escala 1× |
|---|---|
| Cabecera / herramientas / contenido | #202124 / #353535 / #15181e |
| Texto / secundario | #e8e6e0 / #9aa0a6 |
| Borde / foco | #45464a, 1 px / #d4af37 |
| Barra / botón / círculo hover | 36 / 32 / 28 px |
| Esquinas superiores | 8 px; rectas al maximizar cuando lo gestiona el toolkit |
| Hover / pulsado | #3c4043 / #505459 |
| Fuente / título | Inter 10.5 / Inter Medium 10.5; alternativa DejaVu Sans |

XFWM compone botones de 32×36 px con el símbolo centrado en una zona de 32 px.
Los estados active, inactive, prelight y pressed son explícitos; maximize-toggled
representa restaurar. Se incluyen menu, shade y stick para disposiciones
personalizadas. No se fuerza button_layout desde themerc: el valor de sesión
es CHM| y el usuario puede modificarlo. Los recursos PNG se generan desde SVG;
GrooveWindow-2x duplica los recursos XFWM para selección explícita en HiDPI.
No se impone DPI ni se cambia automáticamente la escala del usuario.

GTK3 hereda los controles funcionales de Adwaita dark y aplica las superficies
compartidas, foco visible y botones circulares. La altura efectiva de una CSD
puede crecer si una aplicación añade herramientas. Documentos, hojas y lienzos
no tienen obligación de ser oscuros. No se promete igualdad píxel a píxel con
Brave ni redondeado arbitrario del contenido de terceros.

## Integración e interfaces

`configure_window_design.py` genera temas independientes de WhiteSur, defaults
XFCE y Fontconfig. La instalación exige rsvg-convert y el archivo Inter-Regular;
el empaquetado verifica que fc-match resuelva Inter. El instalador no escribe
preferencias dentro de HOME. El recurso JSON es interno, no una API pública.

`groove-xfce` antepone `/etc/xdg/groove-xfce` a XDG_CONFIG_DIRS. Allí viven GTK,
xfconf y el fallback QSettings de ONLYOFFICE. No se fuerza GTK_THEME desde los
lanzadores; los perfiles guardados tienen precedencia. Los contratos de
`groove-launch`, servicios y parámetros de aplicaciones no cambian.

| Aplicaciones | Integración y límite |
|---|---|
| Mousepad, Thunar, terminal, ajustes | Tema XFWM para SSD y GTK3 para controles/CSD; verificar cada diálogo |
| Brave | Mantiene cabecera propia y comportamiento nativo; no se añade marco duplicado |
| ONLYOFFICE | `onlyoffice/DesktopEditors.conf`, General/UITheme=theme-dark como fallback QSettings; preferencias guardadas prevalecen; cabecera propia |
| Aplicaciones externas | Heredan temas soportados; diferencias documentadas, sin forks |

El ajuste ONLYOFFICE corresponde a GET_REGISTRY_USER y REGISTRY_THEME_KEY en
[defines.h](https://github.com/ONLYOFFICE/desktop-apps/blob/master/win-linux/src/defines.h)
y [cthemes.cpp](https://github.com/ONLYOFFICE/desktop-apps/blob/master/win-linux/src/cthemes.cpp).
No equivale a sincronización dinámica del tema del sistema ni cambia el modo de documentos.
La compatibilidad visual de la versión empaquetada se valida aparte.

XFWM es el único compositor predeterminado: use_compositing=true,
show_dock_shadow=false, sombras de marco discretas y opacidad 100%.
Se retiran configuración/lanzador Picom de la distribución, sin borrar archivos
personales. No se mata un compositor elegido expresamente por un usuario.
El dock limpia también su superficie superior y aplica CSS transparente limitado
a su propio widget; etiquetas, magnificación y reserva de espacio se conservan.

Fontconfig y XSettings usan antialias, hintslight, rgba=none y lcdnone.
Los nuevos defaults sustituyen la mezcla RGB/grises y el DPI fijo. No se cambia
la elección explícita de fuentes/escala de un perfil existente. La construcción
se hace sobre staging nuevo; no es un migrador de instalaciones existentes.

## Aceptación y entrega

1. Generación repetible en root temporal, recursos válidos, fuentes verificadas,
   XML y CSS sin errores, preferencias existentes intactas y una sola ruta de
   composición predeterminada. WhiteSur no recibe parches de decoración.
2. En Mousepad, Thunar, terminal, ajustes, Brave y ONLYOFFICE: abrir, enfocar,
   arrastrar, redimensionar, minimizar/restaurar, maximizar/restaurar y cerrar.
   Incluir títulos largos, diálogos, teclado y estados inactivos.
3. Dock sobre contenido blanco y oscuro: hover, magnificación, etiquetas y
   maximizado; sin rectángulos, sombras residuales ni cabeceras duplicadas.
4. Capturas nativas 1280×800, 1920×1080 y 2×, diferenciando la nitidez del
   invitado del escalado de UTM. Verificar fuentes y controles sin recortes.
5. ISO nueva, checksum y conservación de candidatas previas. Arranque UTM,
   sesión, salida a LightDM y recuperación antes de promoción.

Resultados y limitaciones en `docs/validation/unified-window-design/README.md`.
Las pruebas estáticas o Xvfb no acreditan aceptación UTM ni rendimiento GPU.
