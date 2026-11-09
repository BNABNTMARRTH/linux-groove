/**
 * ROBOT CYBERHAND // LIVE CONTROLLER & HOLOGRAPHIC HUD SHADER
 * Skill: create-anatomy (Anatomy Isometric Kit)
 * Cero Emojis // 60 FPS // 14 Falanges Articuladas
 */

(function () {
  'use strict';

  const DATA = window.__CYBERHAND_DATA__ || {};
  const W = DATA.W || 920;
  const H = DATA.H || 680;

  const stage = document.querySelector('.cyberhand-stage');
  const canvas = document.querySelector('.cyberhand-canvas');
  const readoutEl = document.querySelector('[data-readout]');
  const liveEl = document.querySelector('[data-live-status]');
  const btnGrip = document.querySelector('[data-hand-grip]');
  const btnHolo = document.querySelector('[data-hand-holo]');
  const lampEl = document.querySelector('.cyberhand-lamp');

  // Elementos de Falanges
  const fingers = {
    thumb: [document.querySelector('[data-ph="thumb-0"]'), document.querySelector('[data-ph="thumb-1"]')],
    index: [document.querySelector('[data-ph="index-0"]'), document.querySelector('[data-ph="index-1"]'), document.querySelector('[data-ph="index-2"]')],
    middle: [document.querySelector('[data-ph="middle-0"]'), document.querySelector('[data-ph="middle-1"]'), document.querySelector('[data-ph="middle-2"]')],
    ring: [document.querySelector('[data-ph="ring-0"]'), document.querySelector('[data-ph="ring-1"]'), document.querySelector('[data-ph="ring-2"]')],
    pinky: [document.querySelector('[data-ph="pinky-0"]'), document.querySelector('[data-ph="pinky-1"]'), document.querySelector('[data-ph="pinky-2"]')]
  };

  let gripTarget = 0.2; // 0.0 abierto, 1.0 cerrado
  let gripCurrent = 0.2;
  let isHoloActive = true;
  let time = 0;

  // WebGL para Proyector Holografico HUD
  let gl = null;
  let shaderProgram = null;

  if (canvas) {
    canvas.width = W;
    canvas.height = H;
    try {
      gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
    } catch (e) {
      console.warn('WebGL no disponible:', e);
    }
  }

  const vsSource = `
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main() {
      vUv = aPosition * 0.5 + 0.5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const fsSource = `
    precision mediump float;
    varying vec2 vUv;
    uniform float uTime;
    uniform float uHoloAlpha;

    void main() {
      if (uHoloAlpha <= 0.01) discard;

      // Centro del proyector en la palma
      vec2 center = vec2(0.52, 0.56);
      vec2 d = vUv - center;
      float dist = length(d);

      // Cono holografico hacia arriba
      float coneAngle = atan(d.x, -d.y);
      float inCone = smoothstep(0.9, 0.2, abs(coneAngle));
      float coneMask = inCone * smoothstep(0.42, 0.04, dist);

      // Anillos de radar
      float rings = sin(dist * 60.0 - uTime * 4.0);
      rings = smoothstep(0.7, 0.95, rings);

      // Scanlines horizontales
      float scanline = sin(vUv.y * 300.0 + uTime * 6.0) * 0.5 + 0.5;

      // Color cian holografico
      vec3 holoColor = vec3(0.0, 0.95, 0.85);
      float alpha = (coneMask * 0.35 + rings * coneMask * 0.5) * scanline * uHoloAlpha;

      gl_FragColor = vec4(holoColor * alpha, alpha);
    }
  `;

  let uTimeLoc = null;
  let uHoloAlphaLoc = null;
  let quadBuffer = null;

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

    uTimeLoc = gl.getUniformLocation(shaderProgram, 'uTime');
    uHoloAlphaLoc = gl.getUniformLocation(shaderProgram, 'uHoloAlpha');

    const quadVerts = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]);

    quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  }
  initShaders();

  // Controles
  if (stage) {
    stage.addEventListener('mousemove', function (e) {
      const rect = stage.getBoundingClientRect();
      const normY = (e.clientY - rect.top) / rect.height;
      gripTarget = Math.max(0, Math.min(1, 1.0 - normY * 1.2));
    });
  }

  if (btnGrip) {
    btnGrip.addEventListener('click', function () {
      gripTarget = gripTarget > 0.5 ? 0.05 : 0.95;
    });
  }

  if (btnHolo) {
    btnHolo.addEventListener('click', function () {
      isHoloActive = !isHoloActive;
      btnHolo.classList.toggle('active', isHoloActive);
      if (lampEl) {
        lampEl.classList.toggle('lit', isHoloActive);
      }
    });
  }

  function loop() {
    time += 0.025;

    // Amortiguacion del agarre
    gripCurrent += (gripTarget - gripCurrent) * 0.1;

    // Actualizar 14 falanges
    const baseAngle = gripCurrent * 55;
    const midAngle = gripCurrent * 70;
    const distAngle = gripCurrent * 50;

    // Pulgar (2 falanges)
    if (fingers.thumb[0]) fingers.thumb[0].setAttribute('transform', `rotate(${(gripCurrent * 35).toFixed(1)} 0 0)`);
    if (fingers.thumb[1]) fingers.thumb[1].setAttribute('transform', `rotate(${(gripCurrent * 45).toFixed(1)} 0 0)`);

    // 4 Dedos (3 falanges cada uno)
    ['index', 'middle', 'ring', 'pinky'].forEach(function (fKey, fIdx) {
      const stagger = 1.0 - fIdx * 0.08;
      const f = fingers[fKey];
      if (f && f[0]) f[0].setAttribute('transform', `rotate(${(baseAngle * stagger).toFixed(1)} 0 0)`);
      if (f && f[1]) f[1].setAttribute('transform', `rotate(${(midAngle * stagger).toFixed(1)} 0 0)`);
      if (f && f[2]) f[2].setAttribute('transform', `rotate(${(distAngle * stagger).toFixed(1)} 0 0)`);
    });

    // Telemetria
    const forceN = (gripCurrent * 42.5).toFixed(1);
    const tendonKevlar = (gripCurrent * 85.0 + 12.0).toFixed(1);

    if (readoutEl) {
      readoutEl.textContent = `14 FALANGES · AGARRE ${(gripCurrent * 100).toFixed(0)}% · FUERZA ${forceN} N · TENDON ${tendonKevlar} N`;
    }
    if (liveEl) {
      liveEl.textContent = gripCurrent > 0.8 ? 'PUÑO CERRADO' : gripCurrent < 0.2 ? 'MANO EXTENDIDA' : 'PREHENSION ACTIVA';
    }

    // Render WebGL
    if (gl && shaderProgram) {
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(shaderProgram);
      gl.uniform1f(uTimeLoc, time);
      gl.uniform1f(uHoloAlphaLoc, isHoloActive ? 1.0 : 0.0);

      const posLoc = gl.getAttribLocation(shaderProgram, 'aPosition');
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();

