/**
 * MANIPULADOR SCARA // LIVE CONTROLLER & CINEMATICA PLANAR 3D
 * Skill: anatomy (Anatomy Isometric Kit - wheresryan22/anatomy)
 * Cero Emojis // 60 FPS // Oruga Flexible 20 Eslabones & Ball-Spline Z
 */

(function () {
  'use strict';

  const DATA = window.__SCARA_DATA__ || {};
  const W = DATA.W || 800;
  const H = DATA.H || 580;
  const P = DATA.P;
  const colXY = DATA.COLUMN_CENTER || [-55, -10];
  const colH = DATA.COLUMN_H || 72;
  const waferXY = DATA.WAFER_CENTER || [32, 12];
  const waferR = DATA.WAFER_R || 46;
  const waferZ = DATA.WAFER_Z || 12;

  const CFG = {
    COLUMN_CENTER: colXY,
    COLUMN_H: colH,
    WAFER_CENTER: waferXY,
    WAFER_R: waferR,
    WAFER_Z: waferZ
  };

  const stage = document.querySelector('.scara-stage');
  const canvas = document.querySelector('.scara-canvas');
  const kinematicsGroup = document.getElementById('scaraKinematicsGroup');
  const readoutEl = document.querySelector('[data-readout]');
  const liveEl = document.querySelector('[data-live-status]');
  const btnLaser = document.querySelector('[data-laser-toggle]');
  const btnScan = document.querySelector('[data-scan-mode]');
  const lampEl = document.querySelector('.scara-lamp');

  if (!stage || !kinematicsGroup || !P) return;

  let isLaserActive = true;
  let isScanMode = true;
  let time = 0;
  let targetAngle1 = 0.42;
  let targetAngle2 = -0.58;
  let currentAngle1 = 0.42;
  let currentAngle2 = -0.58;

  // WebGL UV Laser 405nm Shader
  let gl = null;
  let shaderProgram = null;
  let uTimeLoc = null;
  let uLaserPosLoc = null;
  let uLaserAlphaLoc = null;
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
    uniform vec2 uLaserPos;
    uniform float uLaserAlpha;

    void main() {
      if (uLaserAlpha <= 0.01) discard;

      vec2 d = vUv - uLaserPos;
      float dist = length(d);

      float core = 0.0028 / (dist + 0.0004);
      core = clamp(core, 0.0, 1.0);

      float rings = sin(dist * 180.0 - uTime * 6.0);
      rings = smoothstep(0.65, 0.95, rings) * smoothstep(0.08, 0.008, dist);

      vec3 uvColor = vec3(0.65, 0.15, 1.0);
      vec3 coreColor = vec3(0.95, 0.85, 1.0);

      vec3 col = coreColor * core + uvColor * (rings * 0.75 + core * 0.5);
      float alpha = clamp((core + rings * 0.6) * uLaserAlpha, 0.0, 1.0);

      gl_FragColor = vec4(col * alpha, alpha);
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
    uLaserPosLoc = gl.getUniformLocation(shaderProgram, 'uLaserPos');
    uLaserAlphaLoc = gl.getUniformLocation(shaderProgram, 'uLaserAlpha');

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
      isScanMode = false;
      if (btnScan) btnScan.classList.remove('active');
      const rect = stage.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;
      targetAngle1 = 0.05 + normX * 0.78;
      targetAngle2 = -1.15 + normY * 0.95;
    });
    stage.addEventListener('mouseleave', function () {
      isScanMode = true;
      if (btnScan) btnScan.classList.add('active');
    });
  }

  if (btnLaser) {
    btnLaser.addEventListener('click', function () {
      isLaserActive = !isLaserActive;
      btnLaser.classList.toggle('active', isLaserActive);
      if (lampEl) lampEl.classList.toggle('lit', isLaserActive);
      if (liveEl) {
        liveEl.textContent = isLaserActive ? 'FOTOLITOGRAFIA EN CURSO' : 'HAZ LASER EN REPOSO';
      }
    });
  }

  if (btnScan) {
    btnScan.addEventListener('click', function () {
      isScanMode = !isScanMode;
      btnScan.classList.toggle('active', isScanMode);
    });
  }

  function loop() {
    time += 0.025;

    if (isScanMode) {
      targetAngle1 = 0.42 + 0.28 * Math.sin(time * 0.85);
      targetAngle2 = -0.58 + 0.42 * Math.cos(time * 1.15);
    }

    currentAngle1 += (targetAngle1 - currentAngle1) * 0.1;
    currentAngle2 += (targetAngle2 - currentAngle2) * 0.1;

    const zTip = waferZ + 15.0 + Math.sin(time * 2.8) * 3.5;

    let ptLaser = null;
    if (typeof renderScaraMechanism === 'function') {
      const state = renderScaraMechanism(currentAngle1, currentAngle2, zTip, isLaserActive, P, k, G, CFG);
      kinematicsGroup.innerHTML = state.svg;
      ptLaser = state.ptHit2D;

      if (readoutEl) {
        const tcpX = state.j2[0].toFixed(1);
        const tcpY = state.j2[1].toFixed(1);
        readoutEl.textContent = `OBLEA 300mm · LASER 405nm · Z ${zTip.toFixed(1)}mm · TCP [${tcpX}, ${tcpY}]`;
      }
    }

    if (gl && shaderProgram && ptLaser) {
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(shaderProgram);
      gl.uniform1f(uTimeLoc, time);
      gl.uniform2f(uLaserPosLoc, ptLaser[0] / W, 1.0 - ptLaser[1] / H);
      gl.uniform1f(uLaserAlphaLoc, isLaserActive ? 1.0 : 0.0);

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
