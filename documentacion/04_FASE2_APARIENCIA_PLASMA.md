# 04 — Fase 2: Personalización Visual y Apariencia en KDE Plasma 6

*(Documento preparado para ejecutarse inmediatamente después de completar la Fase 1 de Optimización en Rust).*

## 1. Capas de Diseño que Personalizaremos en Plasma 6
1. **Disposición de Paneles y Dock (`plasma-org.kde.plasma.desktop-appletsrc`):**
   - Definición de barras flotantes, transparencias, menú de aplicaciones y dock inferior o superior.
2. **Esquema de Colores e Identidad Visual (`Groove.colors` & `kdeglobals`):**
   - Paleta oficial **Blue Note** (`#0B0E17` Midnight Club, `#141926` Vinyl Groove, `#D4AF37` Warm Brass, `#E05A47` Bebop Coral).
3. **Decoraciones de Ventana y Efectos KWin (`kwinrc`):**
   - Botones de ventana estilo macOS a la izquierda (`ButtonsOnLeft=XIA`), bordes finos, desenfoque de cristal (*Blur*) y efectos 3D con respuesta instantánea.
4. **Splash Screen, SDDM Greeter y Fondos 4K:**
   - Continuidad visual desde el cargador GRUB → SDDM → Escritorio Plasma 6.

