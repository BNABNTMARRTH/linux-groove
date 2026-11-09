/**
 * ROBOT SCARA // LIVE CONTROLLER & UV LASER SHADER
 * Skill: create-anatomy (Anatomy Isometric Kit)
 * Cero Emojis // 60 FPS // Oruga Portacables & Laser UV 405nm
 */

(function () {
  'use strict';

  const DATA = window.__SCARA_DATA__ || {};
  const W = DATA.W || 920;
  const H = DATA.H || 680;

  const stage = document.querySelector('.scara-stage');
  const canvas = document.querySelector('.scara-canvas');
  const readoutEl = document.querySelector('[data-readout]');
  const liveEl = document.querySelector('[data-live-status]');
  const btnLaser = document.querySelector('[data-scara-laser]');
  const lampEl = document.querySelector('.scara-lamp');

  const armJ1 = document.querySelector('[data-scara-joint="j1"]');
  const armJ2 = document.querySelector('[data-scara-joint="j2"]');
  const dragLinks = document.querySelectorAll('.drag-link');

  let isLaserActive = true;
  let isManual = false;
  let time = 0;
  let targetAngle1 = 0;
  let targetAngle2 = 0;
  let currentAngle1 = 0;
  let currentAngle2 = 0;

  // WebGL para Haz Laser UV 405nm
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
    void main() {
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const fsSource = `
    precision mediump float;
    uniform vec2 uLaserOrigin;
    uniform vec2 uLaserTarget;
    uniform float uTime;
    uniform float uIntensity;

    void main() {
      if (uIntensity <= 0.01) discard;

      vec2 p = gl_FragCoord.xy;
      vec2 a = uLaserOrigin;
      vec2 b = uLaserTarget;

      vec2 ab = b - a;
      float len = length(ab);
      vec2 dir = ab / len;

      vec2 ap = p - a;
      float proj = clamp(dot(ap, dir), 0.0, len);
      vec2 closest = a + dir * proj;
      float d = length(p - closest);

      // Haz central ultra-concentrado con halo UV de 405nm (Violeta/Azul intenso)
      float core = exp(-d * 0.45);
      float glow = exp(-d * 0.08) * 0.6;
      float beam = (core + glow) * uIntensity;

      // Mancha focal en la oblea (punto de impacto)
      float impactDist = length(p - b);
      float spot = exp(-impactDist * 0.15) * 1.5 * uIntensity;

      vec3 laserColor = vec3(0.72, 0.22, 1.0); // 405nm violeta profundo
      vec3 coreColor = vec3(0.9, 0.8, 1.0);

      vec3 finalColor = mix(laserColor, coreColor, core);
      float alpha = clamp(beam + spot, 0.0, 1.0);

      gl_FragColor = vec4(finalColor * alpha, alpha);
    }
  `;

  let uOriginLoc = null;
  let uTargetLoc = null;
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

    uOriginLoc = gl.getUniformLocation(shaderProgram, 'uLaserOrigin');
    uTargetLoc = gl.getUniformLocation(shaderProgram, 'uLaserTarget');
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

  // Control de Raton
  if (stage) {
    stage.addEventListener('mousemove', function (e) {
      const rect = stage.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;

      targetAngle1 = (normX - 0.5) * 60;
      targetAngle2 = (normY - 0.5) * 90;
      isManual = true;
    });

    stage.addEventListener('mouseleave', function () {
      isManual = false;
    });
  }

  if (btnLaser) {
    btnLaser.addEventListener('click', function () {
      isLaserActive = !isLaserActive;
      btnLaser.classList.toggle('active', isLaserActive);
      if (lampEl) {
        lampEl.classList.toggle('lit', isLaserActive);
      }
    });
  }

  function loop() {
    time += 0.025;

    if (!isManual) {
      targetAngle1 = Math.sin(time * 0.9) * 28;
      targetAngle2 = Math.cos(time * 1.3) * 42;
    }

    currentAngle1 += (targetAngle1 - currentAngle1) * 0.08;
    currentAngle2 += (targetAngle2 - currentAngle2) * 0.08;

    // Articulacion J1
    if (armJ1) {
      armJ1.setAttribute('transform', `rotate(${currentAngle1.toFixed(2)} -60 180)`);
    }
    // Articulacion J2
    if (armJ2) {
      armJ2.setAttribute('transform', `rotate(${currentAngle2.toFixed(2)} 40 180)`);
    }

    // Plegado parametrico de los 24 eslabones de la oruga portacables
    dragLinks.forEach(function (link, index) {
      const pct = index / (dragLinks.length - 1);
      const linkAngle = (currentAngle1 * 0.5 + currentAngle2 * 0.5) * pct;
      link.setAttribute('transform', `rotate(${linkAngle.toFixed(2)} 0 0)`);
    });

    // Telemetria
    const posX = (50 + Math.sin(time * 0.9) * 25).toFixed(1);
    const posY = (120 + Math.cos(time * 1.3) * 20).toFixed(1);

    if (readoutEl) {
      readoutEl.textContent = `SCARA 4-AXIS · OBLEA 300mm · LASER 405nm · Z 12.4mm · [X: ${posX}, Y: ${posY}]`;
    }
    if (liveEl) {
      liveEl.textContent = isLaserActive ? 'FOTOLITOGRAFIA UV EN CURSO' : 'LASER EN ESPERA';
    }

    // WebGL
    if (gl && shaderProgram) {
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (isLaserActive) {
        gl.useProgram(shaderProgram);

        // Posiciones en pantalla
        const originScreen = [580 + currentAngle2 * 0.8, H - 360];
        const targetScreen = [580 + currentAngle2 * 0.8, H - 460];

        gl.uniform2f(uOriginLoc, originScreen[0], originScreen[1]);
        gl.uniform2f(uTargetLoc, targetScreen[0], targetScreen[1]);
        gl.uniform1f(uTimeLoc, time);
        gl.uniform1f(uIntensityLoc, 1.0);

        const posLoc = gl.getAttribLocation(shaderProgram, 'aPosition');
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
