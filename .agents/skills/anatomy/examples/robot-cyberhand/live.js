/**
 * ROBOT CYBERHAND // LIVE CONTROLLER & CINEMATICA 3D EXACTA
 * Skill: anatomy (Anatomy Isometric Kit - wheresryan22/anatomy)
 * Cero Emojis // 60 FPS // 14 Falanges Articuladas Cohesivas
 */

(function () {
  'use strict';

  const DATA = window.__CYBERHAND_DATA__ || {};
  const W = DATA.W || 800;
  const H = DATA.H || 580;
  const P = DATA.P;
  const knuckles = DATA.knuckles || [];

  const stage = document.querySelector('.cyberhand-stage');
  const canvas = document.querySelector('.cyberhand-canvas');
  const kinematicsGroup = document.getElementById('handKinematicsGroup');
  const readoutEl = document.querySelector('[data-readout]');
  const liveEl = document.querySelector('[data-live-status]');
  const btnGrip = document.querySelector('[data-hand-grip]');
  const btnHolo = document.querySelector('[data-hand-holo]');
  const lampEl = document.querySelector('.cyberhand-lamp');

  if (!stage || !kinematicsGroup || !P) return;

  let gripTarget = 0.25;
  let gripCurrent = 0.25;
  let isAutoCycle = true;
  let isHoloActive = true;
  let time = 0;

  // WebGL Holographic HUD
  let gl = null;
  let shaderProgram = null;
  let uTimeLoc = null;
  let uHoloAlphaLoc = null;
  let quadBuffer = null;

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

      vec2 center = vec2(0.50, 0.56);
      vec2 d = vUv - center;
      float dist = length(d);

      float coneAngle = atan(d.x, -d.y);
      float inCone = smoothstep(0.85, 0.15, abs(coneAngle));
      float coneMask = inCone * smoothstep(0.42, 0.03, dist);

      float rings = sin(dist * 75.0 - uTime * 4.5);
      rings = smoothstep(0.72, 0.96, rings);

      float radAngle = atan(d.y, d.x);
      float rays = abs(sin(radAngle * 12.0 + uTime * 0.8));
      rays = smoothstep(0.92, 0.99, rays);

      float scanline = sin(vUv.y * 320.0 + uTime * 6.0) * 0.5 + 0.5;

      vec3 cyanHolo = vec3(0.05, 0.95, 0.88);
      float intensity = (coneMask * 0.30 + rings * coneMask * 0.52 + rays * coneMask * 0.38) * scanline * uHoloAlpha;

      gl_FragColor = vec4(cyanHolo * intensity, intensity);
    }
  `;

  function initGL() {
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
  initGL();

  // Controles de Interaccion
  if (stage) {
    stage.addEventListener('mousemove', function (e) {
      isAutoCycle = false;
      const rect = stage.getBoundingClientRect();
      const normY = (e.clientY - rect.top) / rect.height;
      gripTarget = Math.max(0.02, Math.min(0.96, (normY - 0.1) * 1.25));
    });
    stage.addEventListener('mouseleave', function () {
      isAutoCycle = true;
    });
  }

  if (btnGrip) {
    btnGrip.addEventListener('click', function () {
      isAutoCycle = false;
      gripTarget = gripTarget > 0.5 ? 0.08 : 0.90;
    });
  }

  if (btnHolo) {
    btnHolo.addEventListener('click', function () {
      isHoloActive = !isHoloActive;
      btnHolo.classList.toggle('active', isHoloActive);
      if (lampEl) lampEl.classList.toggle('lit', isHoloActive);
    });
  }

  function loop() {
    time += 0.025;

    if (isAutoCycle) {
      gripTarget = 0.42 + 0.35 * Math.sin(time * 1.25);
    }

    gripCurrent += (gripTarget - gripCurrent) * 0.12;

    if (typeof renderCyberhandMechanism === 'function') {
      const state = renderCyberhandMechanism(gripCurrent, P, k, G, knuckles);
      kinematicsGroup.innerHTML = state.svg;
    }

    const forceN = (gripCurrent * 42.0 + 3.2).toFixed(1);
    const tendonN = (gripCurrent * 88.0 + 8.5).toFixed(1);
    const pctGrip = Math.round(gripCurrent * 100);

    if (readoutEl) {
      readoutEl.textContent = `14 FALANGES · AGARRE ${pctGrip}% · FUERZA ${forceN} N · TENDON ${tendonN} N`;
    }
    if (liveEl) {
      liveEl.textContent = pctGrip > 75 ? 'PUNO CERRADO' : pctGrip < 20 ? 'MANO EXTENDIDA' : 'PREHENSION ACTIVA';
    }

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
