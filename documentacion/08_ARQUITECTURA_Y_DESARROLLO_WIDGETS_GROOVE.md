# Arquitectura y Desarrollo de Widgets Exclusivos (Plasmoids) en Linux Groove

> **Versión:** Linux Groove 0.4.1 (Plasma 6 Wayland)  
> **Ubicación del Sistema:** `/usr/share/plasma/plasmoids/` y `~/.local/share/plasma/plasmoids/`  
> **Widget Oficial Exclusivo:** `org.groove.soundwave`

---

## 1. ¿Cómo se componen los Widgets (Plasmoids) en KDE Plasma 6?

En KDE Plasma 6, los widgets son miniaplicaciones declarativas basadas en **Qt 6, QML y Kirigami**, organizadas bajo la estructura de paquetes de Plasma (`Plasma/Applet`).

```
org.groove.<nombre_del_widget>/
├── metadata.json                 # Metadatos del plugin (ID, nombre, icono, autor, versión API)
└── contents/
    ├── config/
    │   ├── main.xml              # Esquema de configuración (KConfigXT): define variables persistentes
    │   └── config.qml            # Modelo de pestañas del diálogo de preferencias
    └── ui/
        ├── main.qml              # Interfaz gráfica principal del widget
        └── configGeneral.qml     # Diálogo visual de ajustes (sliders, toggles, selectores)
```

### Funciones de cada componente

1. **`metadata.json`**: Informa a Plasma sobre el widget, su categoría en el explorador de elementos gráficos (`Multimedia`, `System Information`, etc.), su identificador único inverso (`org.groove.soundwave`), su versión de API mínima (`6.0`) y su icono SVG.
2. **`main.xml`**: Define las propiedades que el usuario puede configurar. Plasma guarda y carga estas variables automáticamente en `~/.config/plasma-org.kde.plasma.desktop-appletsrc`.
3. **`config.qml`**: Registra las pestañas del menú de configuración (por ejemplo "Personalización y Cristal").
4. **`configGeneral.qml`**: La interfaz gráfica que aparece al dar clic derecho en el widget y pulsar **"Configurar..."**. Enlaza los controles visuales (Sliders, CheckBoxes) con las claves de `main.xml` usando el prefijo `cfg_`.
5. **`main.qml`**: El lienzo visual donde se dibuja el widget (`PlasmoidItem`), usando elementos de QtQuick, animaciones, efectos gráficos (`QtQuick.Effects.MultiEffect`) y conexión con sensores del sistema.

---

## 2. El Problema del Fondo Gris y el Control de Transparencia

### ¿Por qué los widgets del escritorio mostraban un recuadro gris sólido?
En el tema Breeze claro o en la configuración por defecto de Plasma:
- Los widgets usan `Plasmoid.backgroundHints = PlasmaCore.Types.DefaultBackground` (valor `1` o `StandardBackground`).
- Plasma dibuja la placa SVG de `/usr/share/plasma/desktoptheme/default/widgets/background.svgz`, la cual en temas claros contiene un relleno gris sólido (`#eff0f1` o `#e0e0e0`) que tapa el fondo de pantalla.

### Modos nativos de fondo en Plasma 6 (`PlasmaCore.Types.BackgroundHints`):
- **`NoBackground` (0)**: Completamente transparente. El widget flota directamente sobre el wallpaper.
- **`StandardBackground` (1)**: Marco sólido predeterminado del tema de Plasma.
- **`TranslucentBackground` (2)**: Fondo translúcido con desenfoque / blur (efecto cristal esmerilado).
- **`ShadowBackground` (4)**: Transparente con sombra suave proyectada sobre el texto y las figuras para garantizar legibilidad.
- **`ConfigurableBackground` (8)**: Permite al usuario alternar el fondo.

### Cómo personalizar la transparencia:
1. **En widgets del sistema (CPU, Reloj, etc.)**:
   - Al entrar en el modo de edición (o clic derecho en el escritorio -> *Entrar en modo de edición*), al pasar el cursor sobre el widget aparece una barra con el icono de fondo (**Mostrar / Ocultar fondo**). Al desactivarlo, el fondo gris desaparece al instante y queda flotando con sombra.
   - En la configuración (`plasma-org.kde.plasma.desktop-appletsrc`), se almacena como `UserBackgroundHints=ShadowBackground` o `NoBackground`.
2. **En widgets exclusivos de Groove**:
   - En el propio `main.qml` se establece `Plasmoid.backgroundHints: PlasmaCore.Types.NoBackground`, permitiendo que el widget dibuje su propio fondo de cristal (`Rectangle` con `Qt.rgba(...)`, bordes brillantes y desenfoque dinámico) gobernado directamente por un **Slider de Opacidad (0% a 100%)** en `configGeneral.qml`.

---

## 3. Widget Exclusivo Creado: `org.groove.soundwave`

Se desarrolló e instaló el primer widget exclusivo para la distribución: **Groove Soundwave & Audio Monitor**.

### Características:
- **Identidad Visual Groove**: Barras de ondas sonoras de 7 columnas con gradiente neón ámbar/naranja (`#ffb703` a `#fb8500`) y resplandor neón (Glow).
- **Animación Reactiva**: Simulación de pulso dinámico que reacciona con cadencia musical.
- **Métricas de Audio / DSP**: Indicador en vivo de frecuencia de muestreo y latencia (`● 48 kHz • 64 spl • 1.3 ms`).
- **Control Total de Fondo y Opacidad**:
  - Selector de estilo: *Cristal Esmerilado (Glassmorphism)*, *Totalmente Transparente (Flotante)* o *Sólido Ahumado*.
  - Slider de opacidad: de 0% a 100% con ajuste milimétrico.
  - Toggles para resplandor neón (Glow) y título.

---

## 4. Guía para Crear Nuevos Widgets Exclusivos de Groove

Para crear un nuevo widget (por ejemplo `org.groove.daw-status` o `org.groove.vu-meter`):

1. **Crear el directorio del paquete:**
   ```bash
   mkdir -p /usr/share/plasma/plasmoids/org.groove.<nombre>/contents/{config,ui}
   ```
2. **Definir `metadata.json`:**
   ```json
   {
       "KPackageStructure": "Plasma/Applet",
       "KPlugin": {
           "Category": "Multimedia",
           "Description": "Descripción de la miniaplicación.",
           "Id": "org.groove.<nombre>",
           "Name": "Nombre Visible"
       },
       "X-Plasma-API-Minimum-Version": "6.0"
   }
   ```
3. **Definir variables en `contents/config/main.xml`:**
   ```xml
   <entry name="customOpacity" type="Double"><default>0.4</default></entry>
   ```
4. **Construir la vista en `contents/ui/main.qml`:**
   ```qml
   import QtQuick
   import org.kde.plasma.plasmoid
   import org.kde.plasma.core as PlasmaCore

   PlasmoidItem {
       id: root
       Plasmoid.backgroundHints: PlasmaCore.Types.NoBackground
       fullRepresentation: Rectangle {
           color: Qt.rgba(0.05, 0.05, 0.08, Plasmoid.configuration.customOpacity)
           radius: 12
       }
   }
   ```
5. **Recargar la caché de Plasma:**
   ```bash
   kbuildsycoca6
   systemctl --user restart plasma-plasmashell
   ```

