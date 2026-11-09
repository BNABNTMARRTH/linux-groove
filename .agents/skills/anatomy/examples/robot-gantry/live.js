/**
 * ROBOT GANTRY // LIVE CONTROLLER & CRYO MIST DIELECTRIC SHADER
 * Skill: create-anatomy (Anatomy Isometric Kit)
 * Cero Emojis // 60 FPS // Feston Catenario & Racks de Servidores
 */

(function () {
  'use strict';

  const DATA = window.__GANTRY_DATA__ || {};
  const W = DATA.W || 920;
  const H = DATA.H || 680;

  const stage = document.querySelector('.gantry-stage');
  const canvas = document.querySelector('.gantry-canvas');
  const readoutEl = document.querySelector('[data-readout]');
  const liveEl = document.querySelector('[data-live-status]');
  const btnPatrol = document.querySelector('[data-gantry-patrol]');
  const btnCryo = document.querySelector('[data-gantry-cryo]');
  const lampEl = document.querySelector('.gantry-lamp');

  const gantryBridge = document.querySelector('[data-gantry="bridge"]');
  const gantryCarriage = document.querySelector('[data-gantry="carriage"]');
  const festoonCables = document.querySelectorAll('.festoon-loop');

  let isPatrolling = true;
  let isCryoActive = true;
  let isManual = false;
  let time = 0;

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  // WebGL para Niebla Criogenica y Chispas Dielectricas
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

      // Niebla baja entre el pasillo de servidores
      vec2 center = vec2(0.50, 0.38);
      vec2 d = vUv - center;

      float aisleMask = smoothstep(0.35, 0.05, abs(d.x)) * smoothstep(0.28, -0.05, d.y);

      // Turbulencia de niebla fria criogenica
      float mist1 = sin(vUv.x * 25.0 + uTime * 2.5) * cos(vUv.y * 30.0 - uTime * 1.8);
      float mist2 = sin(vUv.x * 40.0 - uTime * 3.2) * sin(vUv.y * 45.0 + uTime * 2.2);
      float mist = (mist1 * 0.5 + mist2 * 0.5 + 0.5) * aisleMask * uIntensity;

      // Color cian palido de niebla de nitrogeno liquido
      vec3 mistColor = vec3(0.5, 0.85, 1.0);
      float alpha = clamp(mist * 0.38, 0.0, 0.45);

      gl_FragColor = vec4(mistColor * alpha, alpha);
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

  if (stage) {
    stage.addEventListener('mousemove', function (e) {
      const rect = stage.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;

      targetX = (normX - 0.5) * 80;
      targetY = (normY - 0.5) * 60;
      isManual = true;
    });

    stage.addEventListener('mouseleave', function () {
      isManual = false;
    });
  }

  if (btnPatrol) {
    btnPatrol.addEventListener('click', function () {
      isPatrolling = !isPatrolling;
      btnPatrol.classList.toggle('active', isPatrolling);
    });
  }

  if (btnCryo) {
    btnCryo.addEventListener('click', function () {
      isCryoActive = !isCryoActive;
      btnCryo.classList.toggle('active', isCryoActive);
      if (lampEl) {
        lampEl.classList.toggle('lit', isCryoActive);
      }
    });
  }

  function loop() {
    time += 0.025;

    if (!isManual && isPatrolling) {
      targetX = Math.sin(time * 0.7) * 45;
      targetY = Math.cos(time * 0.9) * 30;
    }

    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;

    if (gantryBridge) {
      gantryBridge.setAttribute('transform', `translate(${currentX.toFixed(1)}, 0)`);
    }
    if (gantryCarriage) {
      gantryCarriage.setAttribute('transform', `translate(0, ${currentY.toFixed(1)})`);
    }

    // Deformacion dinamica de los lazos del feston catenario segun la posicion
    festoonCables.forEach(function (cable, index) {
      const pct = (index + 1) / (festoonCables.length + 1);
      const stretch = (currentX * 0.4) * pct;
      cable.setAttribute('transform', `scale(${(1.0 + stretch * 0.01).toFixed(2)}, 1)`);
    });

    // Telemetria
    const posX = (2.4 + currentX * 0.05).toFixed(2);
    const posY = (1.8 + currentY * 0.04).toFixed(2);
    const posZ = (0.75 + Math.sin(time * 2) * 0.1).toFixed(2);

    if (readoutEl) {
      readoutEl.textContent = `CARTESIANO X/Y/Z · PASILLO SERVIDORES · FESTON FIBRA · X:${posX}m Y:${posY}m Z:${posZ}m`;
    }
    if (liveEl) {
      liveEl.textContent = isPatrolling ? 'PATRULLAJE AUTONOMO DE RACKS' : 'CONTROL MANUAL EN ESPERA';
    }

    // WebGL
    if (gl && shaderProgram) {
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(shaderProgram);
      gl.uniform1f(uTimeLoc, time);
      gl.uniform1f(uIntensityLoc, isCryoActive ? 1.0 : 0.0);

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

