/**
 * GRUA PORTICO CARTESIANA X/Y/Z // LIVE CONTROLLER & CINEMATICA 3D
 * Skill: anatomy (Anatomy Isometric Kit - wheresryan22/anatomy)
 * Cero Emojis // 60 FPS // Feston Catenario & Extraccion de Servidores
 */

(function () {
  'use strict';

  const DATA = window.__GANTRY_DATA__ || {};
  const W = DATA.W || 800;
  const H = DATA.H || 580;
  const P = DATA.P;
  const frameX = DATA.FRAME_X || [-86, 86];
  const frameY = DATA.FRAME_Y || [-64, 64];
  const colH = DATA.COLUMN_H || 112;

  const CFG = {
    FRAME_X: frameX,
    FRAME_Y: frameY,
    COLUMN_H: colH
  };

  const stage = document.querySelector('.gantry-stage');
  const canvas = document.querySelector('.gantry-canvas');
  const kinematicsGroup = document.getElementById('gantryKinematicsGroup');
  const readoutEl = document.querySelector('[data-readout]');
  const liveEl = document.querySelector('[data-live-status]');
  const btnPatrol = document.querySelector('[data-patrol-toggle]');
  const btnMist = document.querySelector('[data-mist-toggle]');
  const lampEl = document.querySelector('.gantry-lamp');

  if (!stage || !kinematicsGroup || !P) return;

  let isPatrolling = true;
  let isMistActive = true;
  let time = 0;
  let posX = 12;
  let posY = 8;
  let targetX = 12;
  let targetY = 8;

  // WebGL Cryogenic LN2 Mist Shader
  let gl = null;
  let shaderProgram = null;
  let uTimeLoc = null;
  let uMistAlphaLoc = null;
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
    uniform float uMistAlpha;

    void main() {
      if (uMistAlpha <= 0.01) discard;

      vec2 center = vec2(0.50, 0.35);
      vec2 d = vUv - center;
      float dist = length(d * vec2(1.2, 2.5));

      float groundMask = smoothstep(0.40, 0.02, dist);

      float mist1 = sin(vUv.x * 35.0 - uTime * 1.5 + vUv.y * 15.0);
      float mist2 = cos(vUv.y * 45.0 + uTime * 1.2 - vUv.x * 20.0);
      float clouds = (mist1 * mist2) * 0.5 + 0.5;

      vec3 cryoColor = vec3(0.15, 0.85, 0.95);
      float alpha = groundMask * clouds * 0.26 * uMistAlpha;

      gl_FragColor = vec4(cryoColor * alpha, alpha);
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
    uMistAlphaLoc = gl.getUniformLocation(shaderProgram, 'uMistAlpha');

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
      isPatrolling = false;
      if (btnPatrol) btnPatrol.classList.remove('active');
      if (liveEl) liveEl.textContent = 'CONTROL MANUAL DE CARRO X/Y/Z';
      const rect = stage.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;
      targetX = (normX - 0.5) * 110;
      targetY = (normY - 0.5) * 80;
    });
    stage.addEventListener('mouseleave', function () {
      isPatrolling = true;
      if (btnPatrol) btnPatrol.classList.add('active');
      if (liveEl) liveEl.textContent = 'PATRULLAJE AUTONOMO DE RACKS';
    });
  }

  if (btnPatrol) {
    btnPatrol.addEventListener('click', function () {
      isPatrolling = !isPatrolling;
      btnPatrol.classList.toggle('active', isPatrolling);
      if (liveEl) {
        liveEl.textContent = isPatrolling ? 'PATRULLAJE AUTONOMO DE RACKS' : 'CONTROL MANUAL DE CARRO X/Y/Z';
      }
    });
  }

  if (btnMist) {
    btnMist.addEventListener('click', function () {
      isMistActive = !isMistActive;
      btnMist.classList.toggle('active', isMistActive);
      if (lampEl) lampEl.classList.toggle('lit', isMistActive);
    });
  }

  function loop() {
    time += 0.025;

    if (isPatrolling) {
      targetX = Math.sin(time * 0.75) * 48;
      targetY = Math.cos(time * 1.05) * 34;
    }

    posX += (targetX - posX) * 0.08;
    posY += (targetY - posY) * 0.08;

    const mastBottomZ = 42.0 + Math.sin(time * 1.8) * 16.0;
    const bladeSlide = Math.sin(time * 1.5) * 5.0;

    if (typeof renderGantryMechanism === 'function') {
      const state = renderGantryMechanism(posX, posY, mastBottomZ, bladeSlide, P, k, G, CFG);
      kinematicsGroup.innerHTML = state.svg;
    }

    const mX = (posX * 0.02).toFixed(2);
    const mY = (posY * 0.02).toFixed(2);

    if (readoutEl) {
      readoutEl.textContent = `PATRULLAJE AUTONOMO · CARRO [${mX}m, ${mY}m] · MASTIL Z ${mastBottomZ.toFixed(1)}mm`;
    }

    if (gl && shaderProgram) {
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(shaderProgram);
      gl.uniform1f(uTimeLoc, time);
      gl.uniform1f(uMistAlphaLoc, isMistActive ? 1.0 : 0.0);

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
