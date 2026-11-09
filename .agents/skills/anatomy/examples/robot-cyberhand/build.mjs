import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import { glCamera } from "../../kit/gl.mjs";
import { kitScript, glScript } from "../../scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 800;
const HEIGHT = 580;
const AZIMUTH = 42;
const ELEVATION = 30;

// Placa Base de Ensayos Metrologicos
const PLATE = { x: -120, y: -90, w: 240, d: 180, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

// Pedestal de Prueba Prostetica
const STAND_CENTER = [-5, -18];
const STAND_Z = 28;

// Chasis Carpiano (Palma de la Mano)
const PALM = { x: -38, y: -22, w: 66, d: 58, r: 6 };
const PALM_Z = STAND_Z + 14;
const PALM_H = 20;

export const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [PALM.x - 28, PALM.y - 20, PALM_Z + PALM_H + 85],
    [PALM.x + PALM.w + 28, PALM.y + PALM.d + 62, PALM_Z + PALM_H + 85]
  ],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: AZIMUTH, elevation: ELEVATION }
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// 1. Placa Base con Ranuras T, Regla Milimetrica y Patas de Goma
function buildBasePlate() {
  const parts = [];
  parts.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);

  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    parts.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 2, P, 24), { tone: "lo" }));
    parts.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H + 2, FOOT_H - 2, P, 24), { tone: "mid" }));
  }

  parts.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  parts.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));

  const screws = k.corners(PLATE, 10);
  parts.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  parts.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.55 }));

  for (const y of [-55, -20, 15, 50]) {
    const slot = { x: -105, y, w: 210, d: 5, r: 0.5 };
    parts.push(S(k.slabOf(slot, -0.9, 0.9, P, 2), { tone: "lo", crease: "none" }));
    parts.push(L(k.planOutline(slot, 0, P), { tone: "faint" }));
  }

  const ruler = { x: -105, y: PLATE.y + PLATE.d - 13, w: 210, d: 6, r: 1 };
  parts.push(S(k.slabOf(ruler, 0, 0.8, P, 2), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(ruler.x + 4, ruler.x + ruler.w - 4, 4, 5, ruler.y + 1, 0.8, [2, 3.8], P);
  parts.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));

  const labelPlan = { x: 55, y: -75, w: 50, d: 24, r: 2 };
  parts.push(S(k.slabOf(labelPlan, 0, 0.8, P, 2), { tone: "lo" }));
  parts.push(L(k.planOutline(k.insetPlan(labelPlan, 1.5), 0.8, P), { tone: "faint" }));
  parts.push(L(k.lineOnTop([labelPlan.x + 5, labelPlan.y + 6], [labelPlan.x + 45, labelPlan.y + 6], 0.8, P), { tone: "mid", free: true }));
  parts.push(L(k.lineOnTop([labelPlan.x + 5, labelPlan.y + 12], [labelPlan.x + 38, labelPlan.y + 12], 0.8, P), { tone: "lo", free: true }));
  parts.push(L(k.lineOnTop([labelPlan.x + 5, labelPlan.y + 18], [labelPlan.x + 30, labelPlan.y + 18], 0.8, P), { tone: "lo", free: true }));

  return parts.join("");
}

// 2. Pedestal de Montaje Prostetico y Copa de Muneca
function buildProstheticStand() {
  const parts = [];
  const [sx, sy] = STAND_CENTER;

  parts.push(S(k.cylinder(sx, sy, 32, 0, 8, P, 40, 1.0), { tone: "mid" }));
  const boltR = 26;
  const boltDots = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    boltDots.push(at([sx + Math.cos(angle) * boltR, sy + Math.sin(angle) * boltR, 8]));
  }
  parts.push(D(boltDots, { size: 0.55 }));

  parts.push(S(k.cylinder(sx, sy, 22, 8, STAND_Z - 8, P, 32), { tone: "mid" }));
  parts.push(L(k.knurl(sx, sy, 22, 12, STAND_Z - 4, 32, P), { tone: "lo" }));

  parts.push(S(k.cylinder(sx, sy, 25, STAND_Z - 4, 6, P, 32, 0.8), { tone: "hi" }));
  parts.push(S(k.slabOf({ x: sx + 18, y: sy - 4, w: 12, d: 8, r: 2 }, STAND_Z - 3, 5, P, 2), { tone: "mid" }));
  parts.push(D([at([sx + 24, sy, STAND_Z - 0.5])], { size: 0.6 }));

  parts.push(S(k.cylinder(sx, sy, 20, STAND_Z + 2, 12, P, 28, 0.8), { tone: "hi", lit: true }));
  parts.push(L(k.sideArc(sx, sy, 20, STAND_Z + 8, P, 24), { tone: "lo" }));

  return parts.join("");
}

// 3. Chasis de la Palma (CNC de precision con biseles, ventana de inspeccion y emisor HUD)
function buildPalmChassis() {
  const parts = [];
  const topZ = PALM_Z + PALM_H;

  parts.push(S(k.slabOf(PALM, PALM_Z, PALM_H, P, 6, 1.4), { tone: "hi" }));
  parts.push(L(k.sideSeam(PALM, PALM_Z + 8, P, 6), { tone: "lo" }));

  const sideScrews = [
    [PALM.x + 3, PALM.y + 14, PALM_Z + 10],
    [PALM.x + 3, PALM.y + PALM.d - 14, PALM_Z + 10],
    [PALM.x + PALM.w - 3, PALM.y + 14, PALM_Z + 10],
    [PALM.x + PALM.w - 3, PALM.y + PALM.d - 14, PALM_Z + 10]
  ];
  parts.push(D(sideScrews.map(pt => at(pt)), { size: 0.55 }));

  const windowPlan = k.insetPlan(PALM, 10);
  parts.push(S(k.slabOf(windowPlan, topZ - 2, 2.2, P, 4, 0.6), { tone: "mid" }));
  parts.push(L(k.planOutline(windowPlan, topZ + 0.2, P), { tone: "faint" }));

  const winScrews = k.corners(windowPlan, 4);
  parts.push(D(winScrews.map(([x, y]) => at([x, y, topZ + 0.2])), { size: 0.45 }));

  for (let i = 0; i < 4; i++) {
    const actX = windowPlan.x + 8 + i * 9;
    const actY0 = windowPlan.y + 6;
    const actY1 = windowPlan.y + windowPlan.d - 6;
    parts.push(L(k.segment([actX, actY0, topZ + 0.2], [actX, actY1, topZ + 0.2], P), { tone: i % 2 === 0 ? "mid" : "lo" }));
    parts.push(D([at([actX, actY0, topZ + 0.2]), at([actX, actY1, topZ + 0.2])], { size: 0.4 }));
  }

  // Emisor Central del Proyector Holografico HUD
  const holoR = 11;
  const holoC = [PALM.x + PALM.w / 2, PALM.y + PALM.d / 2, topZ];
  parts.push(S(k.cylinder(holoC[0], holoC[1], holoR, holoC[2], 3.2, P, 32, 0.8), { tone: "hi", lit: true }));
  parts.push(L(k.ring(holoC[0], holoC[1], holoR - 2.5, holoC[2] + 3.2, P, 24), { tone: "lo" }));
  parts.push(L(k.ring(holoC[0], holoC[1], holoR - 5.5, holoC[2] + 3.2, P, 20), { tone: "faint" }));
  parts.push(D([at([holoC[0], holoC[1], holoC[2] + 3.2])], { size: 0.85 }));

  // Conector trasero umbilical de datos y potencia
  const connPlan = { x: PALM.x + 16, y: PALM.y - 8, w: PALM.w - 32, d: 8, r: 2 };
  parts.push(S(k.slabOf(connPlan, PALM_Z + 4, 12, P, 2), { tone: "lo" }));
  parts.push(D([at([connPlan.x + 6, connPlan.y, PALM_Z + 10]), at([connPlan.x + connPlan.w - 6, connPlan.y, PALM_Z + 10])], { size: 0.5 }));

  return parts.join("");
}

// 4. Knuckles (Horquillas de nudillos integradas en el borde distal de la palma)
function buildKnuckleClevises() {
  const parts = [];
  const topZ = PALM_Z + PALM_H;

  const knucklePositions = [
    { name: "index",  x: PALM.x + 7,  y: PALM.y + PALM.d - 2, w: 11 },
    { name: "middle", x: PALM.x + 22, y: PALM.y + PALM.d - 2, w: 11 },
    { name: "ring",   x: PALM.x + 37, y: PALM.y + PALM.d - 2, w: 11 },
    { name: "pinky",  x: PALM.x + 51, y: PALM.y + PALM.d - 2, w: 10 }
  ];

  knucklePositions.forEach(kPos => {
    const { x, y, w } = kPos;
    parts.push(S(k.slabOf({ x: x - 1, y, w: 3, d: 7, r: 1 }, topZ - 10, 12, P, 1), { tone: "hi" }));
    parts.push(S(k.slabOf({ x: x + w - 2, y, w: 3, d: 7, r: 1 }, topZ - 10, 12, P, 1), { tone: "hi" }));
    parts.push(S(k.cylinder(x + w / 2 - 0.5, y + 3.5, 2.8, topZ - 8, 9, P, 16), { tone: "mid" }));
    parts.push(D([at([x - 1, y + 3.5, topZ - 3]), at([x + w + 1, y + 3.5, topZ - 3])], { size: 0.45 }));
  });

  // Nudillo lateral en angulo para el Pulgar
  const thumbMount = { x: PALM.x - 8, y: PALM.y + 10, w: 9, d: 14, r: 2 };
  parts.push(S(k.slabOf(thumbMount, topZ - 11, 14, P, 2), { tone: "hi" }));
  parts.push(S(k.cylinder(thumbMount.x + 4.5, thumbMount.y + 7, 3.4, topZ - 9, 10, P, 16), { tone: "mid" }));
  parts.push(D([at([thumbMount.x + 4.5, thumbMount.y + 7, topZ + 1])], { size: 0.5 }));

  return parts.join("");
}

/**
 * Constructor compartido (build.mjs + live.js) de las 14 Falanges Articuladas 3D y Tendones de Kevlar
 */
function renderCyberhandMechanism(grip, P, k, G, knuckles) {
  const items = [];
  const DEG2RAD = Math.PI / 180;

  for (let fIdx = 0; fIdx < knuckles.length; fIdx++) {
    const kData = knuckles[fIdx];
    const { base, lengths, widths, yaw, isThumb } = kData;
    const yawRad = yaw * DEG2RAD;

    // Vectores locales del dedo
    let uForward, uRight;
    if (isThumb) {
      uForward = [-Math.cos(yawRad), Math.sin(yawRad), 0];
      uRight = [Math.sin(yawRad), Math.cos(yawRad), 0];
    } else {
      uForward = [Math.sin(yawRad), Math.cos(yawRad), 0];
      uRight = [Math.cos(yawRad), -Math.sin(yawRad), 0];
    }

    // Angulos de flexion (se curvan hacia arriba/adentro de la palma mostrada en vista dorsal/palmar)
    let flexAngles;
    if (isThumb) {
      const th1 = (12 + grip * 38) * DEG2RAD;
      const th2 = th1 + (15 + grip * 48) * DEG2RAD;
      flexAngles = [th1, th2];
    } else {
      const f1 = (10 + grip * 42) * DEG2RAD;
      const f2 = f1 + (14 + grip * 58) * DEG2RAD;
      const f3 = f2 + (10 + grip * 45) * DEG2RAD;
      flexAngles = [f1, f2, f3];
    }

    const joints = [base];
    let currentPos = base;

    for (let i = 0; i < lengths.length; i++) {
      const len = lengths[i];
      const theta = flexAngles[i];
      // Elevacion progresiva en Z positivo para flexionar las falanges sobre la palma/proyector HUD
      const dir = G.unit3([
        uForward[0] * Math.cos(theta),
        uForward[1] * Math.cos(theta),
        Math.sin(theta)
      ]);
      const nextPos = G.add3(currentPos, G.mul3(dir, len));
      const uUp = G.unit3(G.cross3(uRight, dir));

      const w = widths[i];
      const r0 = w * 0.42;
      const r1 = w * 0.34;

      // Eslabon solido 3D de la falange (G.stadium extruido a lo largo del eje de bisagra uRight)
      const Fphalanx = { o: currentPos, a: uRight, u: dir, v: uUp };
      const phalanxSolid = G.prismOf(Fphalanx, G.stadium(r0, r1, len, 14), -w * 0.5, w * 0.5, P);
      const isDistal = i === lengths.length - 1;
      const midPt = G.lerp3(currentPos, nextPos, 0.5);

      items.push({
        depth: k.depthOf(midPt, P),
        svg: k.solidSvg(phalanxSolid, {
          tone: isDistal ? "hi" : (i === 1 ? "mid" : "hi"),
          lit: isDistal
        })
      });

      // Pasador cilindrico de bisagra en la articulacion
      const Fpin = { o: currentPos, a: uRight, u: dir, v: uUp };
      const pinSolid = G.prismOf(Fpin, k.circleRing(0, 0, r0 * 0.62, 14), -w * 0.58, w * 0.58, P);
      const pinCapLeft = k.iso(G.add3(currentPos, G.mul3(uRight, -w * 0.58)), P);
      const pinCapRight = k.iso(G.add3(currentPos, G.mul3(uRight, w * 0.58)), P);

      items.push({
        depth: k.depthOf(currentPos, P) + 0.4,
        svg:
          k.solidSvg(pinSolid, { tone: "mid" }) +
          k.dotsSvg([pinCapLeft, pinCapRight], { size: 0.48 })
      });

      currentPos = nextPos;
      joints.push(currentPos);
    }

    // Ruta del Tendon de Kevlar sobre el dorso del dedo
    const tendonPts2D = [
      k.iso([base[0], base[1] - 8, base[2] + 4], P)
    ];
    for (let i = 0; i < joints.length; i++) {
      const jp = joints[i];
      tendonPts2D.push(k.iso([jp[0], jp[1], jp[2] + 3.2], P));
    }
    const tFrom = tendonPts2D[0];
    const tTo = tendonPts2D[tendonPts2D.length - 1];
    const tVia = tendonPts2D.slice(1, -1);
    items.push({
      depth: k.depthOf(joints[1], P) + 2.5,
      svg: k.wireSvg(tFrom, tTo, { via: tVia, tone: "lit", flow: true })
    });
  }

  items.sort((a, b) => a.depth - b.depth);
  return {
    svg: items.map(it => it.svg).join("")
  };
}

function build() {
  const baseSvg = buildBasePlate();
  const standSvg = buildProstheticStand();
  const palmSvg = buildPalmChassis();
  const knucklesSvg = buildKnuckleClevises();

  const topZ = PALM_Z + PALM_H;
  const KNUCKLES = [
    { name: "index",  base: [PALM.x + 12.5, PALM.y + PALM.d + 1.5, topZ - 3.5], lengths: [20, 15, 11], widths: [8.8, 7.6, 6.4], yaw: -6 },
    { name: "middle", base: [PALM.x + 27.5, PALM.y + PALM.d + 1.5, topZ - 3.5], lengths: [22, 17, 12], widths: [9.0, 7.8, 6.6], yaw: 0 },
    { name: "ring",   base: [PALM.x + 42.5, PALM.y + PALM.d + 1.5, topZ - 3.5], lengths: [20, 15, 11], widths: [8.6, 7.4, 6.2], yaw: 5 },
    { name: "pinky",  base: [PALM.x + 56.0, PALM.y + PALM.d + 1.0, topZ - 4.0], lengths: [16, 12, 9],  widths: [7.6, 6.6, 5.6], yaw: 11 },
    { name: "thumb",  base: [PALM.x - 3.5,  PALM.y + 17.0,         topZ - 4.0], lengths: [18, 14],     widths: [9.4, 8.0],      yaw: 48, isThumb: true }
  ];

  // Pre-renderizado estatico completo en t=0 (grip = 0.25)
  const initialHand = renderCyberhandMechanism(0.25, P, k, G, KNUCKLES);

  const backSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg cyberhand-back" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-base">${baseSvg}</g>
      <g class="layer-stand">${standSvg}</g>
      <g class="layer-palm">${palmSvg}</g>
      <g class="layer-knuckles">${knucklesSvg}</g>
    </svg>
  `;

  const frontSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg cyberhand-front" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-kinematics" id="handKinematicsGroup">${initialHand.svg}</g>
    </svg>
  `;

  const corners = `
    <div class="iso-plate-corners" aria-hidden="true">
      <span class="iso-plate-corner" data-corner="fig">Fig 2</span>
      <span class="iso-plate-corner" data-corner="title">Mano Bionica CyberHand · 14 Falanges Articuladas</span>
      <span class="iso-plate-corner" data-corner="hint">Mover cursor verticalmente para flexionar mano</span>
      <span class="iso-plate-corner" data-corner="readout" data-readout>14 FALANGES · AGARRE 25% · FUERZA 13.7 N</span>
    </div>
  `;

  const controls = `
    <div class="cyberhand-controls">
      <div class="cyberhand-btn-group">
        <button type="button" class="cyberhand-btn" data-hand-grip>
          <span>Gesto de Prehension</span>
        </button>
        <button type="button" class="cyberhand-btn active" data-hand-holo>
          <span class="cyberhand-lamp lit" aria-hidden="true"></span>
          <span>Proyector Holografico HUD</span>
        </button>
        <span class="cyberhand-readout-live" data-live-status>PREHENSION ACTIVA</span>
      </div>
      <div>14 Falanges + Tendones Kevlar + WebGL HUD</div>
    </div>
  `;

  const stage = `
    <div class="cyberhand-stage">
      ${backSvg}
      <canvas class="cyberhand-canvas" width="${WIDTH}" height="${HEIGHT}"></canvas>
      ${frontSvg}
    </div>
    ${controls}
  `;

  const caption = `
    Protesis mioelectrica avanzada con 5 dedos biomecanicos y 14 falanges independientes articuladas (pulgar oponible con 2 falanges libres y cuatro dedos de 3 falanges con bisagras cilindricas). Chasis de palma de aleacion ligera con tornilleria perimetral y proyector holografico HUD centrado en la cara palmar. Buses opticos dorsales y tendones de Kevlar con cinematica 3D continua de precision.
  `;

  const figure = `
    <script>if (window.self !== window.top) document.documentElement.classList.add('in-iframe');</script>
    <header class="top-nav">
      <div class="brand-container">
        <span class="brand-bullet">[+]</span>
        <span class="brand-title">LINUX GROOVE</span>
        <span class="brand-tag">SKILL ANATOMY // ROBOTICA 3D</span>
      </div>
      <nav class="nav-links">
        <a href="index.html" class="nav-btn">[ Catalogo ]</a>
        <a href="robot_arm_welder.html" class="nav-btn">[ Rob: Soldador ]</a>
        <a href="robot_cyberhand.html" class="nav-btn active">[ Rob: Mano ]</a>
        <a href="robot_scara_circuit.html" class="nav-btn">[ Rob: SCARA ]</a>
        <a href="robot_hexapod_walker.html" class="nav-btn">[ Rob: Hexapodo ]</a>
        <a href="robot_server_gantry.html" class="nav-btn">[ Rob: Portico ]</a>
        <a href="machine_rocket.html" class="nav-btn">[ Maq: Cohete ]</a>
      </nav>
    </header>

    <main class="iso-page">
      <figure class="iso-figure cyberhand-figure">
        <div class="iso-plate">
          ${corners}
          ${stage}
        </div>
        <figcaption class="iso-legend">
          <div class="iso-keys">
            <span class="iso-key"><span class="iso-swatch" data-mark="lit"><path d="M0 5h16"/></span> Falanges Distales &amp; HUD</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="raised"><path d="M0 5h16"/></span> Chasis Palma &amp; Falanges Medias</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="flat"><path d="M0 5h16"/></span> Soporte de Muneca</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="dotted"><path d="M0 5h16"/></span> Tendones Kevlar &amp; Buses Opticos</span>
          </div>
          <span class="iso-caption">${caption}</span>
        </figcaption>
      </figure>
    </main>
  `;

  const CSS = readFileSync(join(HERE, "cyberhand.css"), "utf8");
  const LIVE = readFileSync(join(HERE, "live.js"), "utf8");
  const LATHE_RAW = readFileSync(join(HERE, "../../kit/lathe.mjs"), "utf8")
    .replace(/^import\s+.*$/gm, "")
    .replace(/^export\s+/gm, "");

  const DATA = {
    W: WIDTH,
    H: HEIGHT,
    P,
    topZ,
    PALM,
    glCamera: glCamera(P),
    knuckles: KNUCKLES
  };

  const fullScript = `
    window.__CYBERHAND_DATA__ = ${JSON.stringify(DATA)};
    ${kitScript()}
    const k = {
      iso, depthOf, towardViewer, pathOf, roundedPlan, extrude, slabOf,
      circleRing, cylinder, insetPlan, onTop, planOutline, lineOnTop,
      segment, rise, ring, pointsAt, dotGrid, corners, boxCorners,
      knurl, sideArc, sideSeam, sideRing, coil, topTicks, sideTicks,
      radialTicks, haloOf, axisVector, translateAlong,
      solidSvg, lineSvg, dotsSvg, wireSvg, faceTextSvg, groupSvg
    };
    const G = (() => {
      ${LATHE_RAW}
      return {
        dot3, add3, sub3, mul3, len3, unit3, cross3, lerp3,
        frameAlong, frameOf, prismOf, stadium, sphereOf,
        disc, ringBand, arcOf, circleOf, ribsOf, dotsOf
      };
    })();
    ${renderCyberhandMechanism.toString()}
    ${glScript()}
    ${LIVE}
  `;

  const page = k.pageHtml({
    title: "Linux Groove - Mano Bionica CyberHand // Skill anatomy",
    theme,
    body: `<style>${CSS}</style>${figure}`,
    script: fullScript,
    width: 860
  });

  const outLocal = join(HERE, "robot-cyberhand.html");
  writeFileSync(outLocal, page);

  const outPublic = "/Volumes/HDEXTERNO/linux_groove/pruebas_web/public/robot_cyberhand.html";
  writeFileSync(outPublic, page);

  console.log(`Compilacion exitosa con skill anatomy: ${outPublic}`);
}

build();
