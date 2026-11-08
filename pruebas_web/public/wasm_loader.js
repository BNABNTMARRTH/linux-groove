// ==========================================================================
// LINUX GROOVE - MOTOR 3D EN RUST (WASM LOADER)
// wasm_loader.js: Micro-Puente de Alto Rendimiento | Cero Dependencias
// Zero-Copy Direct Memory Access | 60 FPS requestAnimationFrame
// ==========================================================================

export async function createGroove3DEngine(canvasId, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas no encontrado: ${canvasId}`);
        return null;
    }
    const ctx = canvas.getContext('2d', { alpha: true });

    // Carga del modulo Wasm compilado en Rust
    const wasmResponse = await fetch('engine_3d.wasm');
    const wasmBuffer = await wasmResponse.arrayBuffer();
    const wasmModule = await WebAssembly.instantiate(wasmBuffer);
    const wasm = wasmModule.instance.exports;

    const particleCount = options.particleCount || 8192;
    wasm.init_engine(particleCount);

    if (options.anatomyMode) {
        wasm.set_anatomy_mode(1);
        if (options.initialGeometry !== undefined) {
            wasm.set_anatomy_geometry(options.initialGeometry);
        }
    } else if (options.initialGeometry !== undefined) {
        wasm.set_geometry(options.initialGeometry);
    }

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);

    // Estado reactivo controlado por la interfaz
    const state = {
        scrollProg: options.scrollProg || 0,
        morph: options.morph || 0,
        deconstruct: options.deconstruct || 0,
        mouseX: 0,
        mouseY: 0,
        selectedGeom: options.initialGeometry !== undefined ? options.initialGeometry : 2,
    };

    // Sensor de movimiento de mouse
    window.addEventListener('mousemove', (e) => {
        // Coordenadas normalizadas [-1.0, 1.0] centradas en pantalla
        state.mouseX = (e.clientX / width) * 2.0 - 1.0;
        state.mouseY = (e.clientY / height) * 2.0 - 1.0;
    });

    // Sensor de scroll para experiencias scroll-driven
    window.addEventListener('scroll', () => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        if (maxScroll > 0) {
            state.scrollProg = window.scrollY / maxScroll;
            if (options.morphOnScroll) {
                // Modula la transmutacion geométrica de 0 a 3 (Esfera -> Cubo -> Dona -> Esfera)
                state.morph = state.scrollProg * 3.0;
                wasm.set_morph(state.morph);
            }
        }
    });

    let lastTime = performance.now();

    function renderLoop(now) {
        const dt = Math.min((now - lastTime) / 1000.0, 0.05);
        lastTime = now;

        // 1. Invoca el motor matematico en Rust
        wasm.update_scene(
            width,
            height,
            state.scrollProg,
            state.mouseX,
            state.mouseY,
            state.deconstruct,
            dt
        );

        // 2. Acceso directo a la memoria lineal de Wasm (Zero-Copy)
        const memoryBuffer = wasm.memory.buffer;
        const pointsPtr = wasm.get_points_ptr();
        const pointsCount = wasm.get_points_count();
        const linesPtr = wasm.get_lines_ptr();
        const linesCount = wasm.get_lines_count();

        // Limpiar el lienzo con fondo transparente
        ctx.clearRect(0, 0, width, height);

        // 3. Renderizado de Aristas Vectoriales (Wireframes & Frames)
        // Struct ProjectedLine: 7 words (28 bytes)
        // [x1, y1, x2, y2, depth, alpha, r/g/b/is_frame]
        if (linesCount > 0) {
            const lineFloats = new Float32Array(memoryBuffer, linesPtr, linesCount * 7);
            const lineBytes = new Uint8Array(memoryBuffer, linesPtr, linesCount * 28);

            for (let i = 0; i < linesCount; i++) {
                const fBase = i * 7;
                const bBase = i * 28;

                const x1 = lineFloats[fBase];
                const y1 = lineFloats[fBase + 1];
                const x2 = lineFloats[fBase + 2];
                const y2 = lineFloats[fBase + 3];
                const alpha = lineFloats[fBase + 5];

                if (alpha <= 0.01) continue;

                const r = lineBytes[bBase + 24];
                const g = lineBytes[bBase + 25];
                const b = lineBytes[bBase + 26];
                const isFrame = lineBytes[bBase + 27];

                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                ctx.lineWidth = isFrame ? 1.6 : 1.0;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }

        // 4. Renderizado de Nube de Particulas (Point Cloud)
        // Struct ProjectedPoint: 6 words (24 bytes)
        // [x, y, depth, size, alpha, r/g/b/_pad]
        if (pointsCount > 0) {
            const pointFloats = new Float32Array(memoryBuffer, pointsPtr, pointsCount * 6);
            const pointBytes = new Uint8Array(memoryBuffer, pointsPtr, pointsCount * 24);

            for (let i = 0; i < pointsCount; i++) {
                const fBase = i * 6;
                const bBase = i * 24;

                const x = pointFloats[fBase];
                const y = pointFloats[fBase + 1];
                const size = pointFloats[fBase + 3];
                const alpha = pointFloats[fBase + 4];

                if (alpha <= 0.02) continue;

                const r = pointBytes[bBase + 20];
                const g = pointBytes[bBase + 21];
                const b = pointBytes[bBase + 22];

                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
            }
        }

        requestAnimationFrame(renderLoop);
    }

    requestAnimationFrame(renderLoop);

    // Retorna API publica del controlador para interacción desde la UI
    return {
        setGeometry(id) {
            state.selectedGeom = id;
            if (options.anatomyMode) {
                wasm.set_anatomy_geometry(id);
            } else {
                wasm.set_geometry(id);
            }
        },
        setAnatomyGeometry(id) {
            state.selectedGeom = id;
            wasm.set_anatomy_geometry(id);
        },
        setDeconstruct(factor) {
            state.deconstruct = Math.max(0.0, Math.min(1.0, factor));
        },
        setMorph(val) {
            state.morph = val;
            wasm.set_morph(val);
        },
        getState() {
            return state;
        }
    };
}

