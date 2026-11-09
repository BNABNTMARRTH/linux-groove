# Referencia: Cache de Colorimetria Zero GC en Canvas 2D

Basado en las directrices de minimizacion de Garbage Collection en JavaScript al renderizar desde Wasm.

---

## 1. El Coste Oculto de `ctx.fillStyle` con Strings

En JavaScript, cada vez que se ejecuta:
```javascript
ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
```
Ocurren tres operaciones costosas:
1. **Asignacion de String en V8:** Se crea un nuevo objeto en el heap de JavaScript para alojar el texto.
2. **Parser CSS en el motor del navegador:** El motor C++ de Canvas analiza la sintaxis `rgba(..., ..., ..., ...)`, valida los rangos y convierte los numeros a valores de coma flotante.
3. **Cambio de estado del Contexto:** Si el color asignado es identico al anterior, el motor re-ejecuta innecesariamente la transicion de estado.

---

## 2. Solucion con Clave Entera de 32 Bits y Cache Permanente

Podemos empaquetar los 4 canales de color en un solo entero de 32 bits y mantener una tabla hash `Map` que persista durante toda la vida de la aplicacion:

```javascript
const colorCache = new Map();
let lastColorKey = -1;

function drawParticle(ctx, x, y, size, r, g, b, alpha) {
    // 1. Cuantizar alpha a 20 escalones (0.05 de granularidad)
    const aIdx = (alpha * 20) | 0;

    // 2. Empaquetar en un entero de 32 bits
    const colorKey = (aIdx << 24) | (r << 16) | (g << 8) | b;

    // 3. Mutar ctx.fillStyle unicamente si el color cambio
    if (colorKey !== lastColorKey) {
        let cssStr = colorCache.get(colorKey);
        if (!cssStr) {
            cssStr = `rgba(${r},${g},${b},${(aIdx * 0.05).toFixed(2)})`;
            colorCache.set(colorKey, cssStr);
        }
        ctx.fillStyle = cssStr;
        lastColorKey = colorKey;
    }

    ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
}
```

### Ventajas:
- Despues de los primeros 10 cuadros, `colorCache` contiene todos los colores posibles del gradiente (~200 cadenas).
- **Cero cadenas nuevas asignadas por fotograma**.
- Reduccion del 90%+ en llamadas a la maquina de estados de Canvas 2D.
