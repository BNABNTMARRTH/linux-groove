# Pruebas Web: Pixel Streaming con Rust & CSS Scroll-Driven

Este directorio contiene la arquitectura, especificaciones y código de referencia para ejecutar animaciones de shaders de alto rendimiento desarrolladas en **Linux Groove** (Qt 6 / GLSL) y transmitirlas en tiempo real hacia la web utilizando un backend nativo en **Rust**, controlado enteramente por **CSS Scroll-Driven Animations nativas (cero JavaScript)**.

## Documento Principal de Arquitectura

Para consultar la explicación completa, comparativa técnica, diagramas y fragmentos de código listos para producción, consulta:

👉 **[`ARQUITECTURA_RUST_PIXEL_STREAMING_SCROLL_DRIVEN.md`](./ARQUITECTURA_RUST_PIXEL_STREAMING_SCROLL_DRIVEN.md)**

### Puntos Destacados:
- **Backend Rust:** Servidor HTTP asíncrono con `tokio` + `axum` con canales de difusión *zero-copy*.
- **Cero JavaScript:** El cliente web solo utiliza HTML5 nativo y CSS moderno (`animation-timeline: scroll()`).
- **Peso de Descarga en el Cliente:** Menor a **6 KB** de payload inicial.
- **Transmisión a 60 FPS:** Compatible con navegadores móviles y de escritorio.
