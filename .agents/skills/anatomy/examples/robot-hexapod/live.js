/**
 * ROBOT HEXAPODO 18-DOF // LIVE CONTROLLER & MARCHA DE TRIPODE 3D
 * Skill: anatomy (Anatomy Isometric Kit - wheresryan22/anatomy)
 * Cero Emojis // 60 FPS // Marcha Continua Cohesiva sin Partes Flotantes
 */

(function () {
  'use strict';

  const DATA = window.__HEXAPOD_DATA__ || {};
  const W = DATA.W || 800;
  const H = DATA.H || 580;
  const P = DATA.P;
  const chassisZ = DATA.CHASSIS_Z || 34;
  const chassisH = DATA.CHASSIS_H || 16;

  const CFG = {
    CHASSIS_Z: chassisZ,
    CHASSIS_H: chassisH
  };

  const stage = document.querySelector('.hexapod-stage');
  const canvas = document.querySelector('.hexapod-canvas');
  const kinematicsGroup = document.getElementById('hexapodKinematicsGroup');
  const readoutEl = document.querySelector('[data-readout]');
  const liveEl = document.querySelector('[data-live-status]');
  const btnWalk = document.querySelector('[data-walk-toggle]');
  const btnShimmer = document.querySelector('[data-shimmer-toggle]');
  const lampEl = document.querySelector('.hexapod-lamp');

  if (!stage || !kinematicsGroup || !P) return;

  let isWalking = true;
  let isShimmerActive = true;
  let time = 0;

  // WebGL Heat Shimmer Shader
  let gl = null;
  let shaderProgram = null;
  let uTimeLoc = null;
  let uShimmerAlphaLoc = null;
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
    uniform float uShimmerAlpha;

    void main() {
      if (uShimmerAlpha <= 0.01) discard;

      vec2 center = vec2(0.50, 0.52);
      vec2 d = vUv - center;
      float dist = length(d * vec2(1.0, 1.8));

      float plume = smoothstep(0.24, 0.02, dist);

      float heat1 = sin(vUv.y * 90.0 - uTime * 7.0 + vUv.x * 20.0);
      float heat2 = cos(vUv.x * 70.0 + uTime * 5.0 - vUv.y * 30.0);
      float shimmer = (heat1 * heat2) * 0.5 + 0.5;

      vec3 thermalColor = vec3(1.0, 0.65, 0.15);
      float alpha = plume * shimmer * 0.32 * uShimmerAlpha;

      gl_FragColor = vec4(thermalColor * alpha, alpha);
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
    uShimmerAlphaLoc = gl.getUniformLocation(shaderProgram, 'uShimmerAlpha');

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

  // Controles
  if (btnWalk) {
    btnWalk.addEventListener('click', function () {
      isWalking = !isWalking;
      btnWalk.classList.toggle('active', isWalking);
      if (liveEl) {
        liveEl.textContent = isWalking ? 'MARCHA CONTINUA TRIPODE' : 'HEXAPODO EN ESPERA (STANDBY)';
      }
    });
  }

  if (btnShimmer) {
    btnShimmer.addEventListener('click', function () {
      isShimmerActive = !isShimmerActive;
      btnShimmer.classList.toggle('active', isShimmerActive);
      if (lampEl) lampEl.classList.toggle('lit', isShimmerActive);
    });
  }

  function loop() {
    time += 0.025;

    if (typeof renderHexapodMechanism === 'function') {
      const state = renderHexapodMechanism(time, isWalking, P, k, G, CFG);
      kinematicsGroup.innerHTML = state.svg;
    }

    const currentA = isWalking ? (4.6 + Math.sin(time * 6.0) * 0.5).toFixed(1) : '1.2';
    const tempC = isWalking ? (54.5 + Math.sin(time * 0.4) * 1.8).toFixed(1) : '38.0';

    if (readoutEl) {
      readoutEl.textContent = `18 SERVOS · TRIPOD GAIT · CORRIENTE ${currentA} A · TEMP DISIPADOR ${tempC} °C`;
    }

    if (gl && shaderProgram) {
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(shaderProgram);
      gl.uniform1f(uTimeLoc, time);
      gl.uniform1f(uShimmerAlphaLoc, isShimmerActive ? 1.0 : 0.0);

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
