/**
 * ROBOT WELDER // LIVE CONTROLLER & WEBGL PLASMA SHADER
 * Skill: create-anatomy (Anatomy Isometric Kit)
 * Cero Emojis // 60 FPS // Cinemática Analítica Suave
 */

(function () {
  'use strict';

  const DATA = window.__WELDER_DATA__ || {};
  const W = DATA.W || 920;
  const H = DATA.H || 680;

  // Elementos DOM
  const stage = document.querySelector('.welder-stage');
  const canvas = document.querySelector('.welder-canvas');
  const readoutEl = document.querySelector('[data-readout]');
  const liveEl = document.querySelector('[data-live-status]');
  const btnFire = document.querySelector('[data-welder-fire]');
  const lampEl = document.querySelector('.welder-lamp');
  const armJoints = {
    j1: document.querySelector('[data-joint="j1"]'),
    j2: document.querySelector('[data-joint="j2"]'),
    j3: document.querySelector('[data-joint="j3"]'),
    wrist: document.querySelector('[data-joint="wrist"]'),
    torch: document.querySelector('[data-joint="torch"]'),
    cable: document.querySelector('[data-cable="umbilical"]')
  };

  // Estado del Robot y Proceso
  let isWelding = true;
  let isManual = false;
  let time = 0;
  let targetX = 50;
  let targetY = 0;
  let currentX = 50;
  let currentY = 0;

  // Telemetria
  let currentAmps = 185;
  let currentVolts = 23.8;
  let argonFlow = 12.0;

  // Inicializacion WebGL para Arco Plasma y Chispas
  let gl = null;
  let shaderProgram = null;
  let sparks = [];
  const MAX_SPARKS = 48;

  if (canvas) {
    canvas.width = W;
    canvas.height = H;
    try {
      gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
    } catch (e) {
      console.warn('WebGL no disponible:', e);
    }
  }

  // Shaders GLSL para Arco de Plasma y Chispas Balisticas
  const vsSource = `
    attribute vec2 aPosition;
    attribute vec4 aColor;
    attribute float aSize;
    varying vec4 vColor;
    void main() {
      vColor = aColor;
      gl_Position = vec4(aPosition, 0.0, 1.0);
      gl_PointSize = aSize;
    }
  `;

  const fsSource = `
    precision mediump float;
    varying vec4 vColor;
    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      float alpha = smoothstep(0.5, 0.05, dist) * vColor.a;
      gl_FragColor = vec4(vColor.rgb * alpha, alpha);
    }
  `;

  function initShaders() {
    if (!gl) return;
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vs);
    gl.attachShader(shaderProgram, fs);
    gl.linkProgram(shaderProgram);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  }
  initShaders();

  // Particulas de Chispas Balisticas
  function spawnSpark(x, y) {
    if (sparks.length >= MAX_SPARKS) return;
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.0 + Math.random() * 5.5;
    sparks.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (1.5 + Math.random() * 2.0),
      life: 1.0,
      decay: 0.02 + Math.random() * 0.04,
      size: 2.5 + Math.random() * 4.0,
      r: 1.0,
      g: 0.65 + Math.random() * 0.35,
      b: 0.15 + Math.random() * 0.4
    });
  }

  // Interaccion de Puntero
  if (stage) {
    stage.addEventListener('mousemove', function (e) {
      const rect = stage.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;

      // Rango de la junta de soldadura en espacio de la probeta
      targetX = 20 + normX * 60;
      targetY = -25 + normY * 50;
      isManual = true;
    });

    stage.addEventListener('mouseleave', function () {
      isManual = false;
    });
  }

  // Boton de Encendido/Apagado del Arco
  if (btnFire) {
    btnFire.addEventListener('click', function () {
      isWelding = !isWelding;
      if (lampEl) {
        if (isWelding) {
          lampEl.classList.add('lit');
          btnFire.classList.add('active');
        } else {
          lampEl.classList.remove('lit');
          btnFire.classList.remove('active');
        }
      }
    });
    if (isWelding && lampEl) {
      lampEl.classList.add('lit');
      btnFire.classList.add('active');
    }
  }

  // Posicion de la punta del electrodo proyectada en pantalla
  function getTorchScreenPos() {
    // Calculo aproximado segun proyeccion isometrica
    const isoX = 460 + (currentX - currentY) * 1.5;
    const isoY = 340 + (currentX + currentY) * 0.85;
    return [isoX, isoY];
  }

  // Bucle de Animacion a 60 FPS
  function loop() {
    time += 0.025;

    // Si no esta en manual, recorre la costura automaticamente
    if (!isManual) {
      targetX = 35 + Math.sin(time * 0.8) * 28;
      targetY = Math.cos(time * 1.2) * 16;
    }

    // Amortiguacion suave
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;

    // Cinemática Inversa Simplificada para los Eslabones
    const shoulderAngle = -15 + (currentX - 50) * 0.25;
    const elbowAngle = 20 - (currentY) * 0.35;
    const wristAngle = -shoulderAngle - elbowAngle + (currentX * 0.1);

    if (armJoints.j2) {
      armJoints.j2.setAttribute('transform', `rotate(${shoulderAngle.toFixed(2)} -60 210)`);
    }
    if (armJoints.j3) {
      armJoints.j3.setAttribute('transform', `rotate(${elbowAngle.toFixed(2)} 20 120)`);
    }
    if (armJoints.wrist) {
      armJoints.wrist.setAttribute('transform', `rotate(${wristAngle.toFixed(2)} 110 80)`);
    }

    // Fluctacion de Telemetria
    if (isWelding) {
      currentAmps = 180 + Math.sin(time * 15) * 8 + (Math.random() * 4 - 2);
      currentVolts = 23.5 + (Math.random() * 0.8 - 0.4);
      argonFlow = 12.0 + (Math.random() * 0.2 - 0.1);
    } else {
      currentAmps = 0;
      currentVolts = 0;
      argonFlow = 0;
    }

    // Actualizar Readouts
    if (readoutEl) {
      if (isWelding) {
        readoutEl.textContent = `${currentAmps.toFixed(0)} A · ${currentVolts.toFixed(1)} V · AR ${argonFlow.toFixed(1)} L/min · TCP [${currentX.toFixed(1)}, ${currentY.toFixed(1)}, 14.2]`;
      } else {
        readoutEl.textContent = `STANDBY · 0 A · ARCO APAGADO · TCP [${currentX.toFixed(1)}, ${currentY.toFixed(1)}, 14.2]`;
      }
    }
    if (liveEl) {
      liveEl.textContent = isWelding ? 'ARCO TIG EN OPERACION' : 'DETENIDO';
    }

    // Render WebGL
    if (gl && shaderProgram) {
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (isWelding) {
        const [torchX, torchY] = getTorchScreenPos();

        // 1. Emision de Chispas
        if (Math.random() < 0.65) {
          spawnSpark(torchX, torchY);
        }

        // Renderizado de Arco Plasma
        gl.useProgram(shaderProgram);
        const posLoc = gl.getAttribLocation(shaderProgram, 'aPosition');
        const colLoc = gl.getAttribLocation(shaderProgram, 'aColor');
        const sizeLoc = gl.getAttribLocation(shaderProgram, 'aSize');

        const vertData = [];

        // Punto de Arco Principal (Cian Plasma)
        const clipX = (torchX / W) * 2.0 - 1.0;
        const clipY = 1.0 - (torchY / H) * 2.0;

        // Capa Exterior Violeta
        vertData.push(clipX, clipY, 0.45, 0.2, 1.0, 0.6, 26.0 + Math.random() * 8.0);
        // Capa Intermedia Cian
        vertData.push(clipX, clipY, 0.0, 0.95, 1.0, 0.85, 15.0 + Math.random() * 4.0);
        // Nucleo Blanco Incandescente
        vertData.push(clipX, clipY, 1.0, 1.0, 1.0, 1.0, 6.0 + Math.random() * 3.0);

        // Chispas
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];
          s.x += s.vx;
          s.y += s.vy;
          s.vy += 0.22; // Gravedad
          s.life -= s.decay;

          // Rebote suave en el suelo
          if (s.y > torchY + 40) {
            s.y = torchY + 40;
            s.vy = -s.vy * 0.4;
          }

          if (s.life <= 0) {
            sparks.splice(i, 1);
            continue;
          }

          const scX = (s.x / W) * 2.0 - 1.0;
          const scY = 1.0 - (s.y / H) * 2.0;
          vertData.push(scX, scY, s.r, s.g, s.b, s.life, s.size * s.life);
        }

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertData), gl.STATIC_DRAW);

        const stride = 7 * Float32Array.BYTES_PER_ELEMENT;
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);

        gl.enableVertexAttribArray(colLoc);
        gl.vertexAttribPointer(colLoc, 4, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

        gl.enableVertexAttribArray(sizeLoc);
        gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);

        gl.drawArrays(gl.POINTS, 0, vertData.length / 7);
        gl.deleteBuffer(buffer);
      }
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();

