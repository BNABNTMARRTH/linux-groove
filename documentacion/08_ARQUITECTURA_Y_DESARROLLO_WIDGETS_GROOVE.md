# Arquitectura y Desarrollo de Widgets Exclusivos (Plasmoids) en Linux Groove

> **Versión:** Linux Groove 0.4.1 (Plasma 6 Wayland)  
> **Ubicación del Sistema:** `/usr/share/plasma/plasmoids/` y `~/.local/share/plasma/plasmoids/`  
> **Widget Oficial Exclusivo:** `org.groove.soundwave`  
> **Módulo Universal de Transparencia:** `ConfigurationAppearanceGroove.qml` integrado en `AppletConfiguration.qml`

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

## 2. Integración Nativa Universal de Transparencia para TODOS los Widgets

A petición del usuario, hemos integrado un **módulo universal nativo** en la ventana de configuración del sistema (`AppletConfiguration.qml`) de modo que **CUALQUIER widget del escritorio (Reloj, CPU, Red, Discos, Calendario, etc.)** adquiere la pestaña nativa **"Transparencia y Cristal"**.

### Archivos Modificados e Integrados:
1. **`/usr/share/plasma/shells/org.kde.plasma.desktop/contents/configuration/AppletConfiguration.qml`**:
   - Se inyectó `ConfigurationAppearanceGroove.qml` en el `globalAppletConfigModel`.
   - Aparece automáticamente en la barra lateral izquierda de preferencias de cualquier widget.
2. **`/usr/share/plasma/shells/org.kde.plasma.desktop/contents/configuration/ConfigurationAppearanceGroove.qml`**:
   - Selector dinámico de Modo de Fondo: *Transparente Flotante (Recomendado)*, *Cristal Translúcido (Glassmorphism)*, *Fondo Estándar del Tema*, o *100% Invisible*.
   - **Slider de Opacidad del Fondo** (0% a 100%) con actualización inmediata en vivo (`onMoved`).
   - **Slider de Opacidad General del Widget** (10% a 100%) con actualización inmediata en vivo (`onMoved`).
3. **`/usr/lib/qt6/qml/org/kde/plasma/private/containmentlayoutmanager/BasicAppletContainer.qml`**:
   - Enlace reactivo que aplica la opacidad general y del marco SVG en tiempo real:
     ```qml
     opacity: (applet && applet.configuration && applet.configuration.widgetOpacity !== undefined)
         ? applet.configuration.widgetOpacity : 1.0
     ```

---

## 3. ¿En qué están construidos los Widgets y cómo se conecta Rust?

### Capa Visual: QML + QtQuick + Kirigami
- Es la tecnología gráfica oficial de KDE Plasma 6 acelerada por hardware GPU sobre Wayland.
- Maneja animaciones a 60/120 fps, renderizado de efectos visuales (sombras, desenfoques, gradientes).

### Capa de Rendimiento y Lógica: Rust
En Linux Groove, los widgets se benefician de la suite en Rust mediante dos mecanismos:
1. **Daemons de Telemetría y Audio en Rust (Arquitectura IPC / D-Bus):**
   - Binarios nativos en Rust (`groove-boostd`, `groove-session-ready`, y módulos DSP) que monitorean la latencia de PipeWire, buffers de ALSA o frecuencia de CPU en microsegundos sin recargar el hilo visual de Qt.
   - Comunican las métricas a través de D-Bus o sockets Unix hacia los componentes QML.
2. **Bindings Nativos `cxx-qt` (Rust $\leftrightarrow$ C++/Qt6):**
   - Compilación de crates de Rust en bibliotecas dinámicas `.so` que se exponen como módulos nativos `import org.groove.core 1.0` en QML.

---

## 4. Widget Oficial Exclusivo: `org.groove.soundwave`

- **Visualizador:** 7 barras de ondas sonoras en gradiente neón ámbar/naranja con pulso rítmico.
- **Telemetría:** `48 kHz • 64 spl • 1.3 ms` en tiempo real.
- **Live Preview:** Control de transparencia reactivo instantáneo desde sus propias preferencias y compatible con el módulo universal.
