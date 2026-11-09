/**
 * ROBOT SOLDADOR 6-DOF // LIVE CONTROLLER & CINEMATICA 3D CONTINUA
 * Skill: anatomy (wheresryan22/anatomy - Solidos Isometricos de 4 Tonos)
 * Cero Emojis // 60 FPS // Pre-renderizado Estatico + WebGL Plasma Arc
 */

(function () {
  'use strict';

  const DATA = window.__WELDER_DATA__ || {};
  const W = DATA.W || 800;
  const H = DATA.H || 580;
  const P = DATA.P;
  const seamBlock = DATA.SEAM_BLOCK || { x: 24, y: -32, w: 78, d: 64 };

  const stage = document.querySelector('.welder-stage');
  const canvas = document.querySelector('.welder-canvas');
  const kinematicsGroup = document.getElementById('welderKinematicsGroup');
  const readoutEl = document.querySelector('[data-readout]');
  const liveEl = document.querySelector('[data-live-status]');
  const btnArc = document.querySelector('[data-arc-toggle]');
  const btnAuto = document.querySelector('[data-auto-seam]');
  const lampEl = document.querySelector('.welder-lamp');

  if (!stage || !kinematicsGroup || !P) return;

  let isArcActive = true;
  let isAutoMode = true;
  let time = 0;
  let seamProgress = 0.45;
  let targetProgress = 0.45;
  let lastRenderedProgress = -1;
  let currentTip2D = DATA.initialTip2D || [W * 0.55, H * 0.58];

  // WebGL Plasma Arc & Sparks Shader
  let gl = null;
  let shaderProgram = null;
  let uTimeLoc = null;
  let uTipPosLoc = null;
  let uArcAlphaLoc = null;
  let quadBuffer = null;

  if (canvas) {
    canvas.width = W;
    canvas.height = H;
    try {
      gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
    } catch (e) {
      gl = null;
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
    uniform vec2 uTipPos;
    uniform float uArcAlpha;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      if (uArcAlpha <= 0.01) discard;

      vec2 d = (vUv - uTipPos) * vec2(1.38, 1.0);
      float dist = length(d);

      // Nucleo electrico TIG ultrabrillante con envolvente suave
      float flicker = 0.88 + 0.12 * sin(uTime * 42.0);
      float core = smoothstep(0.022, 0.0, dist) * flicker;
      float halo = smoothstep(0.11, 0.0, dist) * 0.65 * flicker;

      // Chispas balisticas radiales con caida parabolica
      float sparks = 0.0;
      for (int i = 0; i < 10; i++) {
        float fi = float(i);
        float seed = floor(uTime * 8.0 + fi * 0.37);
        float phase = fract(uTime * 8.0 + fi * 0.37);
        float angle = (hash(vec2(fi, seed)) - 0.5) * 3.14159;
        float speed = 0.025 + hash(vec2(fi + 5.0, seed)) * 0.055;
        vec2 sparkOffset = vec2(cos(angle) * speed * phase, sin(angle) * speed * phase - 0.035 * phase * phase);
        float sparkDist = length((vUv - (uTipPos + sparkOffset)) * vec2(1.38, 1.0));
        sparks += smoothstep(0.0055, 0.0, sparkDist) * (1.0 - phase);
      }
      sparks = clamp(sparks, 0.0, 1.0);

      vec3 coreColor = vec3(0.95, 0.98, 1.0);
      vec3 plasmaColor = vec3(0.18, 0.68, 1.0);
      vec3 sparkColor = vec3(1.0, 0.76, 0.28);

      vec3 col = coreColor * core + plasmaColor * halo + sparkColor * sparks;
      float alpha = clamp((core + halo * 0.75 + sparks * 0.9) * uArcAlpha, 0.0, 1.0);

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
    uTipPosLoc = gl.getUniformLocation(shaderProgram, 'uTipPos');
    uArcAlphaLoc = gl.getUniformLocation(shaderProgram, 'uArcAlpha');

    const quadVerts = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  }
  initGL();

  stage.addEventListener('pointermove', function (e) {
    const rect = stage.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    isAutoMode = false;
    if (btnAuto) btnAuto.classList.remove('active');
    targetProgress = Math.max(0.04, Math.min(0.96, (normX - 0.22) / 0.58));
  });

  if (btnArc) {
    btnArc.addEventListener('click', function () {
      isArcActive = !isArcActive;
      btnArc.classList.toggle('active', isArcActive);
      if (lampEl) lampEl.classList.toggle('lit', isArcActive);
      if (liveEl) {
        liveEl.textContent = isArcActive ? 'ARCO TIG EN OPERACION' : 'ARCO APAGADO // MODO ESPERA';
      }
    });
  }

  if (btnAuto) {
    btnAuto.addEventListener('click', function () {
      isAutoMode = !isAutoMode;
      btnAuto.classList.toggle('active', isAutoMode);
    });
  }

  function loop() {
    time += 0.02;

    if (isAutoMode) {
      targetProgress = 0.5 + 0.43 * Math.sin(time * 0.85);
    }
    seamProgress += (targetProgress - seamProgress) * 0.12;

    if (Math.abs(seamProgress - lastRenderedProgress) > 0.0008) {
      try {
        const res = renderWelderMechanism(seamProgress, P, k, G);
        kinematicsGroup.innerHTML = res.svg;
        currentTip2D = res.tip2D;
        lastRenderedProgress = seamProgress;
      } catch (err) {
        console.error('Error en renderWelderMechanism:', err);
      }
    }

    const currentA = isArcActive ? (184.0 + Math.sin(time * 9.0) * 3.2).toFixed(1) : '0.0';
    const voltV = isArcActive ? (23.4 + Math.cos(time * 7.0) * 0.3).toFixed(1) : '0.0';
    const tcpX = (seamBlock.x + 8 + seamProgress * (seamBlock.w - 16)).toFixed(1);

    if (readoutEl) {
      readoutEl.textContent = `${currentA} A · ${voltV} V · AR 12.0 L/min · TCP [${tcpX}, 0.0, 17.5]`;
    }

    if (gl && shaderProgram && currentTip2D) {
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(shaderProgram);
      gl.uniform1f(uTimeLoc, time);
      gl.uniform2f(uTipPosLoc, currentTip2D[0] / W, 1.0 - currentTip2D[1] / H);
      gl.uniform1f(uArcAlphaLoc, isArcActive ? 1.0 : 0.0);

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
