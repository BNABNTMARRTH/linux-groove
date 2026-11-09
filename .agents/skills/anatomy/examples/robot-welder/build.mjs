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

// Placa Base de Banco de Soldadura
const PLATE = { x: -120, y: -90, w: 240, d: 180, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

// Pedestal de Montaje del Robot J1
const ROBOT_BASE = [-48, -12];
const BASE_R = 34;
const BASE_H = 22;

// Probeta Metalica de Soldadura
const SEAM_BLOCK = { x: 24, y: -32, w: 78, d: 64, r: 4 };
const SEAM_H = 16;

export const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [ROBOT_BASE[0] - BASE_R - 14, ROBOT_BASE[1] - BASE_R - 14, 178],
    [ROBOT_BASE[0] + BASE_R + 14, ROBOT_BASE[1] + BASE_R + 14, 178],
    [SEAM_BLOCK.x + SEAM_BLOCK.w + 10, SEAM_BLOCK.y + SEAM_BLOCK.d + 10, SEAM_H + 12]
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

// 1. Mesa de Trabajo Pesada con Ranuras en T, Bridas y Regla Milimetrica
function buildTable() {
  const parts = [];
  parts.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);

  for (const [x, y] of byDepth(k.corners(PLATE, 18))) {
    parts.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 2, P, 24), { tone: "lo" }));
    parts.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H + 2, FOOT_H - 2, P, 24), { tone: "mid" }));
  }

  parts.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  parts.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));

  const screws = k.corners(PLATE, 10);
  parts.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  parts.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.55 }));

  // Ranuras T mecanizadas
  for (const y of [-52, -18, 18, 52]) {
    const slot = { x: -105, y, w: 210, d: 4.5, r: 0.5 };
    parts.push(S(k.slabOf(slot, -0.9, 0.9, P, 2), { tone: "lo", crease: "none" }));
    parts.push(L(k.planOutline(slot, 0, P), { tone: "faint" }));
  }

  // Regla graduada frontal
  const ruler = { x: -105, y: PLATE.y + PLATE.d - 13, w: 210, d: 6, r: 1 };
  parts.push(S(k.slabOf(ruler, 0, 0.8, P, 2), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(ruler.x + 4, ruler.x + ruler.w - 4, 4, 5, ruler.y + 1, 0.8, [2, 3.8], P);
  parts.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));

  // Placa de especificaciones
  const label = { x: -105, y: -78, w: 56, d: 16, r: 1.5 };
  parts.push(S(k.slabOf(label, 0, 0.8, P, 2), { tone: "lo" }));
  parts.push(L(k.planOutline(k.insetPlan(label, 1.4), 0.8, P), { tone: "faint" }));
  parts.push(L(k.lineOnTop([label.x + 4, label.y + 5], [label.x + 48, label.y + 5], 0.8, P), { tone: "mid", free: true }));
  parts.push(L(k.lineOnTop([label.x + 4, label.y + 10], [label.x + 36, label.y + 10], 0.8, P), { tone: "lo", free: true }));

  return parts.join("");
}

// 2. Probeta de Soldadura con Bisel en V, Bridas de Fijacion y Cordon de Soldadura
function buildWorkpiece() {
  const parts = [];
  const halfD = (SEAM_BLOCK.d - 2) / 2;
  const plateBack = { x: SEAM_BLOCK.x, y: SEAM_BLOCK.y, w: SEAM_BLOCK.w, d: halfD, r: 3 };
  const plateFront = { x: SEAM_BLOCK.x, y: SEAM_BLOCK.y + halfD + 2, w: SEAM_BLOCK.w, d: halfD, r: 3 };

  // Dos placas de acero biseladas en V sobre calzos
  parts.push(S(k.slabOf(plateBack, 0, SEAM_H, P, 4, 1.2), { tone: "hi" }));
  parts.push(L(k.sideSeam(plateBack, 6, P, 4), { tone: "faint" }));
  parts.push(S(k.slabOf(plateFront, 0, SEAM_H, P, 4, 1.2), { tone: "hi" }));
  parts.push(L(k.sideSeam(plateFront, 6, P, 4), { tone: "faint" }));

  // Bridas mecanicas escalonadas (step clamps) con pernos en las ranuras T
  const clamp1 = { x: SEAM_BLOCK.x + 8, y: SEAM_BLOCK.y - 8, w: 12, d: 16, r: 1.5 };
  const clamp2 = { x: SEAM_BLOCK.x + SEAM_BLOCK.w - 20, y: SEAM_BLOCK.y + SEAM_BLOCK.d - 8, w: 12, d: 16, r: 1.5 };
  for (const clp of [clamp1, clamp2]) {
    parts.push(S(k.slabOf(clp, SEAM_H - 2, 4.5, P, 2, 0.5), { tone: "mid" }));
    const cx = clp.x + clp.w / 2;
    const cy = clp.y + clp.d / 2;
    parts.push(S(k.cylinder(cx, cy, 2.8, SEAM_H + 2.5, 3.5, P, 18), { tone: "hi" }));
    parts.push(D([at([cx, cy, SEAM_H + 6])], { size: 0.55 }));
  }

  // Costura de soldadura iluminada en el canal central
  const seamY = SEAM_BLOCK.y + SEAM_BLOCK.d / 2;
  const seamP0 = [SEAM_BLOCK.x + 4, seamY, SEAM_H - 0.5];
  const seamP1 = [SEAM_BLOCK.x + SEAM_BLOCK.w - 4, seamY, SEAM_H - 0.5];
  parts.push(L(k.segment(seamP0, seamP1, P), { tone: "lit" }));

  // Escamas del cordon TIG
  const cordLines = [];
  for (let x = SEAM_BLOCK.x + 7; x <= SEAM_BLOCK.x + SEAM_BLOCK.w - 7; x += 2.8) {
    const arcLeft = [x, seamY - 2.6, SEAM_H + 0.2];
    const arcMid = [x + 1.5, seamY, SEAM_H + 1.0];
    const arcRight = [x, seamY + 2.6, SEAM_H + 0.2];
    cordLines.push(`M${at(arcLeft).join(" ")} Q${at(arcMid).join(" ")} ${at(arcRight).join(" ")}`);
  }
  parts.push(L(cordLines.join(" "), { tone: "mid" }));

  // Borne de masa moleteado y cable de tierra hacia el pedestal
  const gx = SEAM_BLOCK.x + 10;
  const gy = SEAM_BLOCK.y + SEAM_BLOCK.d - 8;
  parts.push(S(k.cylinder(gx, gy, 4.2, SEAM_H, 7, P, 24, 0.6), { tone: "mid" }));
  parts.push(L(k.knurl(gx, gy, 4.2, SEAM_H + 1.5, SEAM_H + 5.5, 24, P), { tone: "lo" }));
  parts.push(D([at([gx, gy, SEAM_H + 7])], { size: 0.6 }));

  const gRoute = [
    [gx, gy, SEAM_H + 3],
    [gx, gy + 18, 1.2],
    [-12, gy + 18, 1.2],
    [ROBOT_BASE[0] + 24, ROBOT_BASE[1] + 18, 4]
  ].map(at);
  parts.push(k.wireSvg(gRoute[0], gRoute[gRoute.length - 1], { via: gRoute.slice(1, -1), tone: "mid", flow: true, size: 1.3 }));

  return parts.join("");
}

// 3. Pedestal Estatorico y Rodamiento de Rodillos Cruzados J1
function buildStatorPedestal() {
  const parts = [];
  const [bx, by] = ROBOT_BASE;

  parts.push(S(k.cylinder(bx, by, BASE_R, 0, 8, P, 44, 1.2), { tone: "mid" }));
  const boltR = BASE_R - 5;
  const boltDots = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const px = bx + Math.cos(angle) * boltR;
    const py = by + Math.sin(angle) * boltR;
    parts.push(L(k.ring(px, py, 1.8, 8, P, 12), { tone: "lo" }));
    boltDots.push(at([px, py, 8]));
  }
  parts.push(D(boltDots, { size: 0.5 }));

  parts.push(S(k.cylinder(bx, by, BASE_R - 6, 8, BASE_H - 8, P, 36), { tone: "mid" }));
  parts.push(L(k.knurl(bx, by, BASE_R - 6, 10.5, BASE_H - 2.5, 36, P), { tone: "lo" }));

  parts.push(S(k.cylinder(bx, by, BASE_R - 4, BASE_H, 6, P, 36, 0.8), { tone: "hi" }));
  parts.push(L(k.sideArc(bx, by, BASE_R - 4, BASE_H + 3, P, 28), { tone: "lo" }));

  return parts.join("");
}

// 4. Constructor Geometrico 3D Compartido (Node + Browser) con Solidos Reales de Anatomy
function renderWelderMechanism(seamProgress, P, k, G) {
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, style);
  const at = (p) => k.iso(p, P);

  const bx = -48, by = -12;
  const seamY = -32 + 64 / 2;
  const seamX = 24 + 8 + seamProgress * (78 - 16);
  const tipPos = [seamX, seamY, 16 + 1.5];

  // Articulaciones 3D del Brazo 6-DOF
  const j1Pos = [bx, by, 54];
  const wristPos = [tipPos[0] - 8, tipPos[1] - 4, tipPos[2] + 34];

  const dx = wristPos[0] - j1Pos[0];
  const dy = wristPos[1] - j1Pos[1];
  const yaw = Math.atan2(dy, dx);
  const uForward = [Math.cos(yaw), Math.sin(yaw), 0];
  const uRight = [-Math.sin(yaw), Math.cos(yaw), 0];

  // Posicion del Codo J3 elevada mediante cinematica inversa en el plano del brazo
  const L1 = 68;
  const L2 = 64;
  const reachVec = G.sub3(wristPos, j1Pos);
  const reachHoriz = Math.hypot(reachVec[0], reachVec[1]);
  const reachZ = reachVec[2];
  const dTotal = Math.min(L1 + L2 - 4, Math.hypot(reachHoriz, reachZ));
  const basePitch = Math.atan2(reachZ, reachHoriz);
  const cosAlpha = Math.max(-0.95, Math.min(0.95, (L1 * L1 + dTotal * dTotal - L2 * L2) / (2 * L1 * dTotal)));
  const shoulderPitch = basePitch + Math.acos(cosAlpha);

  const j2Elbow = [
    j1Pos[0] + uForward[0] * Math.cos(shoulderPitch) * L1,
    j1Pos[1] + uForward[1] * Math.cos(shoulderPitch) * L1,
    j1Pos[2] + Math.sin(shoulderPitch) * L1
  ];

  const items = [];
  const put = (pos3, svg) => items.push({ depth: k.depthOf(pos3, P), svg });

  // A. Torrete Giratorio J1 y Contrapeso Trasero
  const turretSvg =
    S(k.cylinder(bx, by, 23, 28, 22, P, 36, 1.0), { tone: "hi" }) +
    L(k.sideArc(bx, by, 23, 38, P, 28), { tone: "lo" }) +
    S(k.cylinder(bx - uForward[0] * 16, by - uForward[1] * 16, 12, 32, 16, P, 28, 0.8), { tone: "mid" }) +
    L(k.knurl(bx - uForward[0] * 16, by - uForward[1] * 16, 12, 34, 46, 24, P), { tone: "lo" });
  put([bx, by, 39], turretSvg);

  // Horquilla del Hombro J2 y Reductor Armonico
  const uLink1 = G.unit3(G.sub3(j2Elbow, j1Pos));
  const vLink1 = G.cross3(uRight, uLink1);
  const F1 = G.frameOf(j1Pos, uRight, uLink1, vLink1);
  const len1 = G.len3(G.sub3(j2Elbow, j1Pos));

  const shoulderPinRing = k.circleRing(0, 0, 11, 24);
  const shoulderCapRing = k.circleRing(0, 0, 7.5, 20);
  const shoulderSvg =
    S(G.prismOf(F1, shoulderPinRing, -12, 12, P), { tone: "mid" }) +
    S(G.prismOf(F1, shoulderCapRing, 12, 14.5, P), { tone: "hi" }) +
    D(G.dotsOf(F1, 14.5, 5.2, 6, P, { all: true }), { size: 0.45 });
  put(j1Pos, shoulderSvg);

  // B. Brazo Principal de Doble Viga (Upper Arm J2 -> J3)
  const arm1Profile = G.stadium(9.5, 7.5, len1, 20);
  const arm1Back = S(G.prismOf(F1, arm1Profile, -9.5, -3.5, P), { tone: "mid" });
  const arm1Front = S(G.prismOf(F1, arm1Profile, 3.5, 9.5, P), { tone: "hi" });
  const arm1Mid = G.lerp3(j1Pos, j2Elbow, 0.5);
  put(G.add3(arm1Mid, G.mul3(uRight, -6.5)), arm1Back);
  put(G.add3(arm1Mid, G.mul3(uRight, 6.5)), arm1Front);

  // Cilindro Hidraulico de Contrapeso Lateral
  const cylBase = G.add3(j1Pos, G.add3(G.mul3(uForward, 12), [0, 0, -12]));
  const cylTarget = G.lerp3(j1Pos, j2Elbow, 0.58);
  const uCyl = G.unit3(G.sub3(cylTarget, cylBase));
  const vCyl = G.cross3(uRight, uCyl);
  const FCyl = G.frameOf(cylBase, uRight, uCyl, vCyl);
  const cylLen = G.len3(G.sub3(cylTarget, cylBase));
  const cylBarrel = S(G.prismOf(FCyl, G.stadium(4.2, 4.2, cylLen * 0.62, 14), 10, 14, P), { tone: "mid" });
  const cylRod = S(G.prismOf(FCyl, G.stadium(2.2, 2.2, cylLen, 12), 11, 13, P), { tone: "hi", lit: true });
  put(G.add3(G.lerp3(cylBase, cylTarget, 0.4), G.mul3(uRight, 12)), cylBarrel + cylRod);

  // C. Articulacion del Codo J3 y Servo Trasero
  const uLink2 = G.unit3(G.sub3(wristPos, j2Elbow));
  const vLink2 = G.cross3(uRight, uLink2);
  const F2 = G.frameOf(j2Elbow, uRight, uLink2, vLink2);
  const len2 = G.len3(G.sub3(wristPos, j2Elbow));

  const elbowHousing =
    S(G.prismOf(F2, k.circleRing(0, 0, 9.5, 22), -10, 10, P), { tone: "hi" }) +
    S(G.prismOf(F2, k.circleRing(0, 0, 6.5, 18), 10, 12.2, P), { tone: "mid" }) +
    D(G.dotsOf(F2, 12.2, 4.5, 6, P, { all: true }), { size: 0.45 }) +
    S(G.prismOf(F2, G.stadium(6.5, 5.5, -16, 16), -5.5, 5.5, P), { tone: "mid" });
  put(j2Elbow, elbowHousing);

  // D. Antebrazo J3 -> J4 (Forearm)
  const arm2Profile = G.stadium(8.0, 6.0, len2, 20);
  const arm2Svg = S(G.prismOf(F2, arm2Profile, -5.5, 5.5, P), { tone: "hi" });
  put(G.lerp3(j2Elbow, wristPos, 0.5), arm2Svg);

  // E. Muneca Triaxial J4-J5-J6 y Antorcha Orbital TIG
  const wx = wristPos[0], wy = wristPos[1], wz = wristPos[2];
  const tx = tipPos[0], ty = tipPos[1], tz = tipPos[2];
  const wristBridge = {
    x: Math.min(wx, tx) - 5,
    y: Math.min(wy, ty) - 5,
    w: Math.abs(tx - wx) + 10,
    d: Math.abs(ty - wy) + 10,
    r: 3
  };
  const torchSvg =
    // Carcasa de la muneca J4/J5
    S(k.cylinder(wx, wy, 7.5, wz - 6, 12, P, 24, 0.8), { tone: "hi" }) +
    L(k.knurl(wx, wy, 7.5, wz - 4, wz + 4, 20, P), { tone: "lo" }) +
    // Brida portaherramienta hacia la antorcha
    S(k.slabOf(wristBridge, wz - 8, 5, P, 4, 0.6), { tone: "mid" }) +
    // Cuerpo superior de la antorcha TIG y cabezal moleteado
    S(k.cylinder(tx, ty, 5.6, tz + 14, 16, P, 24, 0.7), { tone: "mid" }) +
    L(k.knurl(tx, ty, 5.6, tz + 17, tz + 27, 22, P), { tone: "lo" }) +
    D([at([tx, ty, tz + 30])], { size: 0.6 }) +
    // Tobera ceramica TIG acampanada
    S(k.cylinder(tx, ty, 4.4, tz + 5, 9, P, 22, 0.5), { tone: "hi", lit: true }) +
    L(k.sideArc(tx, ty, 4.4, tz + 8, P, 18), { tone: "lo" }) +
    // Electrodo de tungsteno incandescente
    S(k.cylinder(tx, ty, 1.3, tz, 5, P, 14), { tone: "hi", lit: true });
  put([tx, ty, tz + 12], torchSvg);

  // Ordenar todos los solidos de atras hacia adelante (Orden del Pintor)
  items.sort((a, b) => a.depth - b.depth);

  // F. Manguera Umbilical Multicapa con Abrazaderas y Flujo Electrico
  const clamp1Pos = G.add3(G.lerp3(j1Pos, j2Elbow, 0.48), [0, 0, 9.5]);
  const clamp2Pos = G.add3(G.lerp3(j2Elbow, wristPos, 0.52), [0, 0, 8.0]);
  const umbPoints3 = [
    [bx - uForward[0] * 22, by - uForward[1] * 22, 42],
    [bx - uForward[0] * 14, by - uForward[1] * 14, 66],
    clamp1Pos,
    G.add3(j2Elbow, [0, 0, 13]),
    clamp2Pos,
    [tx, ty, tz + 30]
  ];
  const umb2D = umbPoints3.map(at);

  const clampsSvg = [clamp1Pos, clamp2Pos]
    .map(([cx, cy, cz]) => S(k.cylinder(cx, cy, 3.4, cz - 2, 4, P, 16, 0.4), { tone: "mid" }) + D([at([cx, cy, cz + 2])], { size: 0.45 }))
    .join("");

  const umbilicalSvg =
    clampsSvg +
    k.wireSvg(umb2D[0], umb2D[umb2D.length - 1], { via: umb2D.slice(1, -1), tone: "mid", size: 1.6 }) +
    k.wireSvg(umb2D[0], umb2D[umb2D.length - 1], { via: umb2D.slice(1, -1), tone: "lit", flow: true, size: 1.2 });

  return {
    svg: items.map((it) => it.svg).join("") + umbilicalSvg,
    tip2D: at(tipPos),
    tip3D: tipPos
  };
}

function build() {
  const tableSvg = buildTable();
  const workpieceSvg = buildWorkpiece();
  const statorSvg = buildStatorPedestal();
  const initialMech = renderWelderMechanism(0.45, P, k, G);

  const backSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg welder-back" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-table">${tableSvg}</g>
      <g class="layer-workpiece">${workpieceSvg}</g>
      <g class="layer-stator">${statorSvg}</g>
    </svg>
  `;

  // Pre-renderizado completo en el HTML estatico (visible al 100% desde t=0)
  const frontSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg welder-front" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-kinematics" id="welderKinematicsGroup">${initialMech.svg}</g>
    </svg>
  `;

  const corners = `
    <div class="iso-plate-corners" aria-hidden="true">
      <span class="iso-plate-corner" data-corner="fig">Fig 1</span>
      <span class="iso-plate-corner" data-corner="title">Robot Soldador Orbital 6-DOF · Celda de Precision</span>
      <span class="iso-plate-corner" data-corner="hint">Mover cursor sobre la probeta para guiar soldadura</span>
      <span class="iso-plate-corner" data-corner="readout" data-readout>186.0 A · 23.4 V · AR 12.0 L/min · TCP [52.1, 0.0, 17.5]</span>
    </div>
  `;

  const controls = `
    <div class="welder-controls">
      <div class="welder-btn-group">
        <button type="button" class="welder-btn active" data-arc-toggle>
          <span class="welder-lamp lit" aria-hidden="true"></span>
          <span>Arco TIG [ Soldar ]</span>
        </button>
        <button type="button" class="welder-btn active" data-auto-seam>
          <span>Recorrido Automatico</span>
        </button>
        <span class="welder-readout-live" data-live-status>ARCO TIG EN OPERACION</span>
      </div>
      <div>IK Analitica + Shader WebGL Plasma + Flujo Umbilical</div>
    </div>
  `;

  const stage = `
    <div class="welder-stage">
      ${backSvg}
      <canvas class="welder-canvas" width="${WIDTH}" height="${HEIGHT}"></canvas>
      ${frontSvg}
    </div>
    ${controls}
  `;

  const caption = `
    Manipulador robotico industrial de 6 grados de libertad para soldadura orbital TIG. Torrete giratorio J1 sobre corona de rodillos cruzados, brazo principal de doble viga con cilindro hidraulico de contrapeso, reductores armonicos empernados, antorcha con tobera ceramica acampanada, manguera umbilical continua con abrazaderas mecanicas y shader WebGL de plasma arc con chispas balisticas.
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
        <a href="robot_arm_welder.html" class="nav-btn active">[ Rob: Soldador ]</a>
        <a href="robot_cyberhand.html" class="nav-btn">[ Rob: Mano ]</a>
        <a href="robot_scara_circuit.html" class="nav-btn">[ Rob: SCARA ]</a>
        <a href="robot_hexapod_walker.html" class="nav-btn">[ Rob: Hexapodo ]</a>
        <a href="robot_server_gantry.html" class="nav-btn">[ Rob: Portico ]</a>
        <a href="machine_rocket.html" class="nav-btn">[ Maq: Cohete ]</a>
      </nav>
    </header>

    <main class="iso-page">
      <figure class="iso-figure welder-figure">
        <div class="iso-plate">
          ${corners}
          ${stage}
        </div>
        <figcaption class="iso-legend">
          <div class="iso-keys">
            <span class="iso-key"><span class="iso-swatch" data-mark="lit"><path d="M0 5h16"/></span> Arco Plasma TIG &amp; Tobera</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="raised"><path d="M0 5h16"/></span> Eslabones CNC &amp; Torrete J1</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="flat"><path d="M0 5h16"/></span> Mesa de Trabajo &amp; Probeta</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="dotted"><path d="M0 5h16"/></span> Manguera Umbilical &amp; Pulsos</span>
          </div>
          <span class="iso-caption">${caption}</span>
        </figcaption>
      </figure>
    </main>
  `;

  const CSS = readFileSync(join(HERE, "welder.css"), "utf8");
  const LIVE = readFileSync(join(HERE, "live.js"), "utf8");
  const latheRaw = readFileSync(join(HERE, "../../kit/lathe.mjs"), "utf8")
    .replace(/^import .*$/gm, "")
    .replace(/^export /gm, "");

  const gScript = `
    const k = { iso, depthOf, towardViewer, pathOf, roundedPlan, extrude, slabOf, circleRing, cylinder, insetPlan, onTop, planOutline, lineOnTop, segment, rise, ring, pointsAt, dotGrid, corners, boxCorners, knurl, sideArc, sideSeam, sideRing, coil, topTicks, sideTicks, radialTicks, haloOf, axisVector, translateAlong, solidSvg, lineSvg, dotsSvg, wireSvg, faceTextSvg, groupSvg };
    const G = (() => {
      ${latheRaw}
      return { dot3, add3, sub3, mul3, len3, unit3, cross3, lerp3, frameAlong, frameOf, prismOf, stadium, sphereOf, disc, ringBand, arcOf, circleOf, ribsOf, dotsOf };
    })();
    const renderWelderMechanism = ${renderWelderMechanism.toString()};
  `;

  const DATA = {
    W: WIDTH,
    H: HEIGHT,
    P,
    ROBOT_BASE,
    BASE_H,
    SEAM_BLOCK,
    SEAM_H,
    initialTip2D: initialMech.tip2D
  };

  const fullScript = `
    window.__WELDER_DATA__ = ${JSON.stringify(DATA)};
    ${kitScript()}
    ${gScript}
    ${glScript()}
    ${LIVE}
  `;

  const page = k.pageHtml({
    title: "Linux Groove - Robot Soldador Orbital 6-DOF // Skill anatomy",
    theme,
    body: `<style>${CSS}</style>${figure}`,
    script: fullScript,
    width: 860
  });

  const outLocal = join(HERE, "robot-welder.html");
  writeFileSync(outLocal, page);

  const outPublic = "/Volumes/HDEXTERNO/linux_groove/pruebas_web/public/robot_arm_welder.html";
  writeFileSync(outPublic, page);

  console.log(`Compilacion exitosa con skill anatomy: ${outPublic}`);
}

build();
