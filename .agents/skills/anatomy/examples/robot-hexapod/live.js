/**
 * ROBOT HEXAPOD // LIVE CONTROLLER & CONVECTIVE HEAT SHIMMER SHADER
 * Skill: create-anatomy (Anatomy Isometric Kit)
 * Cero Emojis // 60 FPS // Marcha Tripode Dinámica
 */

(function () {
  'use strict';

  const DATA = window.__HEXAPOD_DATA__ || {};
  const W = DATA.W || 920;
  const H = DATA.H || 680;

  const stage = document.querySelector('.hexapod-stage');
  const canvas = document.querySelector('.hexapod-canvas');
  const readoutEl = document.querySelector('[data-readout]');
  const liveEl = document.querySelector('[data-live-status]');
  const btnWalk = document.querySelector('[data-hexapod-walk]');
  const btnHeat = document.querySelector('[data-hexapod-heat]');
  const lampEl = document.querySelector('.hexapod-lamp');

  const legs = [];
  for (let i = 0; i < 6; i++) {
    legs.push(document.querySelector(`[data-leg="${i}"]`));
  }

  let isWalking = true;
  let isHeatActive = true;
  let time = 0;
  let gaitSpeed = 1.0;

  // WebGL para Distorsion Termica por Conveccion (Heat Shimmer)
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
    uniform float uIntensity;

    void main() {
      if (uIntensity <= 0.01) discard;

      // Columna de aire caliente ascendente sobre el disipador central
      vec2 center = vec2(0.50, 0.48);
      vec2 d = vUv - center;

      float colMask = smoothstep(0.25, 0.02, abs(d.x)) * smoothstep(0.35, 0.0, -d.y) * smoothstep(-0.1, 0.1, d.y + 0.1);

      // Turbulencia ondulatoria de conveccion
      float wave = sin(d.y * 45.0 - uTime * 7.0) * cos(d.x * 35.0 + uTime * 4.0);
      float shimmer = wave * colMask * uIntensity;

      // Tinte ambar infrarrojo muy tenue
      vec3 heatColor = vec3(1.0, 0.72, 0.2);
      float alpha = clamp(abs(shimmer) * 0.35, 0.0, 0.45);

      gl_FragColor = vec4(heatColor * alpha, alpha);
    }
  `;

  let uTimeLoc = null;
  let uIntensityLoc = null;
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
    uIntensityLoc = gl.getUniformLocation(shaderProgram, 'uIntensity');

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

  if (btnWalk) {
    btnWalk.addEventListener('click', function () {
      isWalking = !isWalking;
      btnWalk.classList.toggle('active', isWalking);
    });
  }

  if (btnHeat) {
    btnHeat.addEventListener('click', function () {
      isHeatActive = !isHeatActive;
      btnHeat.classList.toggle('active', isHeatActive);
      if (lampEl) {
        lampEl.classList.toggle('lit', isHeatActive);
      }
    });
  }

  function loop() {
    time += 0.035 * (isWalking ? gaitSpeed : 0.0);

    // Marcha de trípode: Grupo A (patas 0, 2, 4) y Grupo B (patas 1, 3, 5)
    legs.forEach(function (legEl, index) {
      if (!legEl) return;
      const isGroupA = (index % 2 === 0);
      const phase = isGroupA ? time : time + Math.PI;

      const lift = Math.max(0, Math.sin(phase)) * 8.0;
      const swing = Math.cos(phase) * 12.0;

      legEl.setAttribute('transform', `translate(0, ${(-lift).toFixed(1)}) rotate(${swing.toFixed(1)} 0 0)`);
    });

    // Telemetria
    const currentDraw = isWalking ? (4.2 + Math.sin(time * 3) * 0.8).toFixed(1) : '0.8';
    const cpuTemp = (54.5 + Math.sin(time) * 2.2).toFixed(1);

    if (readoutEl) {
      readoutEl.textContent = `18 SERVOS · TRIPOD GAIT · CORRIENTE ${currentDraw} A · TEMP DISIPADOR ${cpuTemp} °C`;
    }
    if (liveEl) {
      liveEl.textContent = isWalking ? 'MARCHA CONTINUA TRIPODE' : 'EN ESPERA (STANDBY)';
    }

    // WebGL
    if (gl && shaderProgram) {
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(shaderProgram);
      gl.uniform1f(uTimeLoc, time);
      gl.uniform1f(uIntensityLoc, isHeatActive ? 1.0 : 0.0);

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

