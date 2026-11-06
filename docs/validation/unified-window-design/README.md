# GrooveWindow — registro de validación

Fecha local: 2026-11-05 (America/Mexico_City). Estado: implementación y
comprobaciones de construcción; **aceptación UTM pendiente**.

## Evidencia disponible

- Cinco pruebas Python de configuración pasaron en el constructor Linux ARM64:
  sesiones alternativas, wallpaper, preferencias conservadas, generación
  repetible, estados de botones y rechazo de dependencias ausentes.
  Véase `configuration-tests.log`.
- El empaquetado comprueba Inter mediante `fc-match` dentro del rootfs y exige
  el renderizador de fuentes compiladas. El tema GTK se carga sin errores CSS.
- GTK + XFWM reales bajo Xvfb: 1280×800, 1920×1080 y 2560×1600 con recursos 2×.
  Capturas `xfwm-gtk-1280.png`, `xfwm-gtk-1920.png` y `xfwm-gtk-2x.png`.
  Se observa el hover de maximizar, decoración activa/inactiva, texto con
  acentos y superficies claras/oscuras. Son ventanas de prueba, no ONLYOFFICE.
- Estas capturas usan **composición desactivada**. La captura con composición
  bajo Xvfb produjo imágenes negras intermitentes; no se usa como evidencia
  de corrección del compositor, sombras ni dock. No son capturas UTM.
- La revisión detectó y corrigió la precedencia del CSS de Adwaita en estado
  inactivo y la preferencia de XFWM por SVG sobre PNG: ambos formatos 2× tienen
  dimensiones 64×72 para botones. La fuente de título de la prueba 2× se ajusta
  explícitamente; el instalador no cambia la escala de un usuario.

## Candidatas

rc19 y rc20 fueron construidas y verificadas, pero son intermedias; se conservan
en el almacenamiento externo. rc21 integra la corrección final del SVG HiDPI.
rc21 terminó con éxito: 1,498,349,568 bytes. Archivo:
`/Volumes/Backup/linux_groove_terabit/iso/linux-groove-0.3.0-rc21-aarch64.iso`.
SHA256 verificado:
`3af8c22d567452e98a5e28f2f01379b2293417b4e9842196faa8f2c28d8820d9`.
Véanse `rc21-build.log` y `rc21.sha256`: pruebas de groove-init, catálogos de
sesión, grafos de servicios, auditoría de bibliotecas, acceso Live limitado y
lanzadores pasaron. La comprobación negativa PAM rechaza el acceso sin marca
Live, que es el resultado esperado de esa prueba. Las tres pruebas del contrato
GrooveWindow se ejecutaron también sobre el código final durante el empaquetado.
No se promociona ninguna candidata por estas pruebas solamente.

## Reproducción

En el constructor, después de generar el rootfs:

```sh
python3 -m unittest discover -s scripts/graphics/tests -p 'test_*.py' -v
ROOT=/tmp/groove-wayfire-root-0.3.0-rc21 \
  sh scripts/graphics/tests/render_window_design.sh
ROOT=/tmp/groove-wayfire-root-0.3.0-rc21 QA_RESOLUTION=1920x1080 \
  sh scripts/graphics/tests/render_window_design.sh
ROOT=/tmp/groove-wayfire-root-0.3.0-rc21 QA_RESOLUTION=2560x1600 QA_SCALE=2 \
  sh scripts/graphics/tests/render_window_design.sh
```

El renderizador usa un HOME temporal y display :89 libre; no modifica perfiles
existentes. Usa rutas temporales de fuentes para ejecutar fuera del chroot.
Las imágenes de 1× se tomaron antes del último ajuste de viewport 2×, que no
cambia su geometría ni CSS. La imagen 2× corresponde al ajuste final.

## Matriz pendiente en UTM

| Comprobación | Estado |
|---|---|
| Arranque ISO rc21, sesión XFCE y regreso a LightDM | Pendiente |
| Mousepad, Thunar, terminal y ajustes: operaciones de ventana y diálogos | Pendiente |
| Brave: cabecera propia, foco, maximizar/restaurar, sin doble marco | Pendiente |
| ONLYOFFICE: fallback oscuro efectivo y conservación de documentos claros | Pendiente |
| Dock sobre ONLYOFFICE y fondos claros/oscuros, zoom y etiquetas | Pendiente |
| Composición: sin rectángulos, sombras residuales ni errores de repintado | Pendiente |
| Capturas nativas 1280×800, 1920×1080 y 2×, teclado y títulos largos | Pendiente |
| Acceso a Weston/Wayfire/consola y cierre de sesión | Pendiente |

No se encontró `utmctl` en las ubicaciones locales de aplicaciones inspeccionadas;
no se automatizó ni se intervino una VM existente. La matriz requiere acceso
a la VM de aceptación con la candidata cargada.

En una sesión nueva, recoger como mínimo:

```sh
pgrep -a 'xfwm4|picom'
xfconf-query -c xfwm4 -p /general/theme
xfconf-query -c xfwm4 -p /general/use_compositing
xfconf-query -c xfwm4 -p /general/show_dock_shadow
xfconf-query -c xsettings -p /Net/ThemeName
fc-match Inter
```

Esperado: XFWM como único compositor predeterminado, GrooveWindow, true, false,
GrooveWindow e Inter respectivamente. Un perfil previamente personalizado puede
mostrar otros valores: se conserva expresamente y no se migra en silencio.
ONLYOFFICE usa General/UITheme=theme-dark de QSettings; verificar visualmente
la versión empaquetada, incluido que una selección manual posterior prevalezca.
