# Custom Icons Pipeline (`scripts/graphics/custom-icons/`)

Cualquier icono `.svg` o `.png` que coloques en esta carpeta tendrá **prioridad máxima** sobre el pack `WhiteSur` y se integrará automáticamente al construir la ISO:

| Nombre de archivo | Dónde se aplica |
|---|---|
| `groove-logo.svg` | Icono principal de la barra superior (`Linux Groove` menu) |
| `terminal.svg` | Icono de Terminal en el Dock y Escritorio |
| `files.svg` | Icono del Gestor de Archivos (Thunar) en el Dock y Escritorio |
| `editor.svg` | Icono del Editor de Código (Mousepad) en el Dock |
| `browser.svg` | Icono de Firefox en el Dock y Escritorio |
| `system.svg` | Icono del Centro de Control Groove en el Dock y Escritorio |
| `settings.svg` | Icono de Ajustes del Sistema en el Dock |
| `installer.svg` | Icono del Instalador de Linux Groove OS en el Dock y Escritorio |

Si un icono no está en `custom-icons/`, el sistema usará automáticamente el icono oficial de **WhiteSur macOS Icon Theme** (o el de `scripts/graphics/blue-note/icons/`).

