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

// Placa Base de Banco de Ensayos para Robot Andador
const PLATE = { x: -120, y: -90, w: 240, d: 180, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

// Chasis Hexagonal Central
const CHASSIS_Z = 34;
const CHASSIS_H = 16;

export const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [-95, -80, CHASSIS_Z + CHASSIS_H + 45],
    [95, 80, CHASSIS_Z + CHASSIS_H + 45]
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

// 1. Placa Base de Suelo de Pruebas con Ranuras y Regla Milimetrica
function buildBasePlate() {
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

  for (const y of [-55, -18, 18, 55]) {
    const slot = { x: -105, y, w: 210, d: 4.5, r: 0.5 };
    parts.push(S(k.slabOf(slot, -0.8, 0.8, P, 2), { tone: "lo", crease: "none" }));
    parts.push(L(k.planOutline(slot, 0, P), { tone: "faint" }));
  }

  const ruler = { x: -105, y: PLATE.y + PLATE.d - 13, w: 210, d: 6, r: 1 };
  parts.push(S(k.slabOf(ruler, 0, 0.8, P, 2), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(ruler.x + 4, ruler.x + ruler.w - 4, 4, 5, ruler.y + 1, 0.8, [2, 3.8], P);
  parts.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));

  return parts.join("");
}

/**
 * Constructor compartido (build.mjs + live.js) del Robot Hexapodo 18-DOF
 * Construye el Chasis Monocasco Doble Cubierta con Disipador Termico y las 6 Patas Articuladas (Coxa, Femur, Tibia, Pie)
 */
function renderHexapodMechanism(time, isWalking, P, k, G, cfg) {
  const items = [];
  const put = (pos3, svg, bias = 0) => items.push({ depth: k.depthOf(pos3, P) + bias, svg });

  const DEG2RAD = Math.PI / 180;
  const chassisZ = cfg.CHASSIS_Z;
  const chassisH = cfg.CHASSIS_H;

  const bodyBob = isWalking ? Math.sin(time * 6.4) * 1.4 : 0;
  const bodyZ = chassisZ + bodyBob;
  const topZ = bodyZ + chassisH;

  // 1. Chasis Central Doble Cubierta con Columnas Separadoras y Disipador Termico
  const chassisPlan = { x: -32, y: -32, w: 64, d: 64, r: 12 };
  const botDeck = k.solidSvg(k.slabOf(chassisPlan, bodyZ, 4, P, 10, 0.8), { tone: "mid" });

  let standoffsSvg = "";
  const standoffCoords = [
    [-22, -24], [22, -24],
    [-26, 0],   [26, 0],
    [-22, 24],  [22, 24]
  ];
  for (let i = 0; i < standoffCoords.length; i++) {
    const [sx, sy] = standoffCoords[i];
    standoffsSvg += k.solidSvg(k.cylinder(sx, sy, 3.2, bodyZ + 4, chassisH - 8, P, 16), { tone: "lo" });
  }

  const topDeck =
    k.solidSvg(k.slabOf(chassisPlan, topZ - 4.5, 4.5, P, 10, 1.2), { tone: "hi" }) +
    k.lineSvg(k.planOutline(k.insetPlan(chassisPlan, 4), topZ, P), { tone: "lo" });

  // Disipador termico central con aletas iluminadas
  const sinkPlan = { x: -17, y: -15, w: 34, d: 30, r: 3 };
  let heatsinkSvg = k.solidSvg(k.slabOf(sinkPlan, topZ, 5, P, 3, 0.8), { tone: "mid" });
  for (let i = 0; i < 5; i++) {
    const finPlan = { x: -14, y: -12 + i * 5.5, w: 28, d: 2.2, r: 0.5 };
    heatsinkSvg += k.solidSvg(k.slabOf(finPlan, topZ + 5, 3.2, P, 1, 0.4), { tone: "hi", lit: true });
  }

  // Torreta frontal LiDAR y telemetria
  const lidarSvg =
    k.solidSvg(k.cylinder(0, 22, 7.5, topZ, 5.5, P, 24, 0.7), { tone: "hi", lit: true }) +
    k.lineSvg(k.ring(0, 22, 4.5, topZ + 5.5, P, 18), { tone: "lo" }) +
    k.dotsSvg([k.iso([0, 22, topZ + 5.5], P)], { size: 0.65 });

  put([0, 0, bodyZ + chassisH * 0.5], botDeck + standoffsSvg + topDeck + heatsinkSvg + lidarSvg);

  // 2. 6 Patas Articuladas de 3 Grados de Libertad (Coxa, Femur, Tibia) en Marcha de Tripode
  const legConfigs = [
    { id: "L1", x: -24, y: 24,  baseAngle: 140, group: "A" },
    { id: "L2", x: -30, y: 0,   baseAngle: 180, group: "B" },
    { id: "L3", x: -24, y: -24, baseAngle: 220, group: "A" },
    { id: "R1", x: 24,  y: 24,  baseAngle: 40,  group: "B" },
    { id: "R2", x: 30,  y: 0,   baseAngle: 0,   group: "A" },
    { id: "R3", x: 24,  y: -24, baseAngle: -40, group: "B" }
  ];

  const lenCoxa = 15;
  const lenFemur = 28;

  for (let i = 0; i < legConfigs.length; i++) {
    const leg = legConfigs[i];
    const isGroupA = leg.group === "A";
    const gaitPhase = isWalking ? (isGroupA ? time * 3.2 : time * 3.2 + Math.PI) : (isGroupA ? 0.35 : -0.35);
    const sinP = Math.sin(gaitPhase);
    const cosP = Math.cos(gaitPhase);

    const isLifting = isWalking && sinP > 0;
    const liftZ = isLifting ? sinP * 12 : 0;
    const swingDeg = cosP * 11;

    const yawRad = (leg.baseAngle + swingDeg) * DEG2RAD;
    const uForward = [Math.cos(yawRad), Math.sin(yawRad), 0];
    const uSide = [-Math.sin(yawRad), Math.cos(yawRad), 0];

    // Articulacion 1: Cadera / Coxa (p0 -> p1)
    const p0 = [leg.x, leg.y, bodyZ + chassisH * 0.5];
    const p1 = G.add3(p0, G.mul3(uForward, lenCoxa));

    // Articulacion 2: Femur elevado (p1 -> p2)
    const femurPitch = (26 + (isLifting ? 14 : 0)) * DEG2RAD;
    const dirFemur = G.unit3([
      uForward[0] * Math.cos(femurPitch),
      uForward[1] * Math.cos(femurPitch),
      Math.sin(femurPitch)
    ]);
    const uUpFemur = G.unit3(G.cross3(uSide, dirFemur));
    const p2 = G.add3(p1, G.mul3(dirFemur, lenFemur));

    // Articulacion 3: Tibia descendiendo al suelo (p2 -> p3)
    const p3 = [
      p2[0] + uForward[0] * 15,
      p2[1] + uForward[1] * 15,
      liftZ + 3.5
    ];
    const vecTibia = G.sub3(p3, p2);
    const lenTibia = G.len3(vecTibia);
    const dirTibia = G.unit3(vecTibia);
    const uUpTibia = G.unit3(G.cross3(uSide, dirTibia));

    // A. Torreta de Servo de Cadera y Eslabon Coxa
    const Fcoxa = { o: p0, a: uSide, u: uForward, v: [0, 0, 1] };
    const coxaSolid = G.prismOf(Fcoxa, G.stadium(5.5, 4.8, lenCoxa, 14), -4.2, 4.2, P);
    const hipServo =
      k.solidSvg(k.cylinder(p0[0], p0[1], 6.4, bodyZ - 1, chassisH + 2, P, 20, 0.6), { tone: "mid" }) +
      k.dotsSvg([k.iso([p0[0], p0[1], bodyZ + chassisH + 1], P)], { size: 0.5 });

    put(G.lerp3(p0, p1, 0.5), hipServo + k.solidSvg(coxaSolid, { tone: "hi" }));

    // B. Servo de Femur y Viga de Femur Acanalada
    const Ffemur = { o: p1, a: uSide, u: dirFemur, v: uUpFemur };
    const femurJoint = G.prismOf(Ffemur, k.circleRing(0, 0, 5.4, 16), -5.0, 5.0, P);
    const femurSolid = G.prismOf(Ffemur, G.stadium(6.2, 4.8, lenFemur, 16), -3.8, 3.8, P);

    put(
      G.lerp3(p1, p2, 0.5),
      k.solidSvg(femurJoint, { tone: "mid" }) +
        k.solidSvg(femurSolid, { tone: "hi" })
    );

    // C. Articulacion de Rodilla, Puntal de Tibia y Pie de Elastomero
    const Ftibia = { o: p2, a: uSide, u: dirTibia, v: uUpTibia };
    const kneeJoint = G.prismOf(Ftibia, k.circleRing(0, 0, 4.8, 16), -4.6, 4.6, P);
    const tibiaSolid = G.prismOf(Ftibia, G.stadium(4.6, 2.8, lenTibia, 16), -3.2, 3.2, P);

    const footSvg =
      k.solidSvg(k.cylinder(p3[0], p3[1], 5.0, liftZ, 3.5, P, 20, 0.6), { tone: "hi", lit: true }) +
      k.lineSvg(k.ring(p3[0], p3[1], 7.0, 0.2, P, 20), { tone: isLifting ? "faint" : "mid" });

    put(
      G.lerp3(p2, p3, 0.5),
      k.solidSvg(kneeJoint, { tone: "mid" }) +
        k.solidSvg(tibiaSolid, { tone: "mid" }) +
        footSvg
    );

    // D. Bus Electrico de Alimentacion de Servos hacia la Rodilla
    const wStart = k.iso([leg.x * 0.72, leg.y * 0.72, topZ], P);
    const wMid = k.iso([p1[0], p1[1], p1[2] + 5.5], P);
    const wEnd = k.iso([p2[0], p2[1], p2[2] + 4.5], P);
    put(p2, k.wireSvg(wStart, wEnd, { via: [wMid], tone: "lit", flow: true }), 2.2);
  }

  items.sort((a, b) => a.depth - b.depth);
  return {
    svg: items.map(it => it.svg).join("")
  };
}

function build() {
  const plateSvg = buildBasePlate();

  const CFG = {
    CHASSIS_Z,
    CHASSIS_H
  };

  // Pre-renderizado estatico completo en t=0 (18 servos y chasis listos desde el primer instante)
  const initialHexapod = renderHexapodMechanism(0.0, true, P, k, G, CFG);

  const backSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg hexapod-back" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-plate">${plateSvg}</g>
    </svg>
  `;

  const frontSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg hexapod-front" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-kinematics" id="hexapodKinematicsGroup">${initialHexapod.svg}</g>
    </svg>
  `;

  const corners = `
    <div class="iso-plate-corners" aria-hidden="true">
      <span class="iso-plate-corner" data-corner="fig">Fig 4</span>
      <span class="iso-plate-corner" data-corner="title">Robot Hexapodo 18-DOF · Marcha de Tripode Continua</span>
      <span class="iso-plate-corner" data-corner="hint">Pulsar para alternar marcha continua o pausa</span>
      <span class="iso-plate-corner" data-corner="readout" data-readout>18 SERVOS · TRIPOD GAIT · CORRIENTE 4.8 A · TEMP DISIPADOR 55.2 °C</span>
    </div>
  `;

  const controls = `
    <div class="hexapod-controls">
      <div class="hexapod-btn-group">
        <button type="button" class="hexapod-btn active" data-walk-toggle>
          <span>Pausar / Reanudar Marcha</span>
        </button>
        <button type="button" class="hexapod-btn active" data-shimmer-toggle>
          <span class="hexapod-lamp lit" aria-hidden="true"></span>
          <span>Refraccion Termica (Heat Shimmer)</span>
        </button>
        <span class="hexapod-readout-live" data-live-status>MARCHA CONTINUA TRIPODE</span>
      </div>
      <div>Marcha Tripode 18 Servos + Disipador Termico + WebGL Shimmer</div>
    </div>
  `;

  const stage = `
    <div class="hexapod-stage">
      ${backSvg}
      <canvas class="hexapod-canvas" width="${WIDTH}" height="${HEIGHT}"></canvas>
      ${frontSvg}
    </div>
    ${controls}
  `;

  const caption = `
    Robot hexapodo biomimetico todoterreno de 18 grados de libertad (tres articulaciones independientes por pata: coxa, femur y tibia). Chasis central monocasco hexagonal de fibra de carbono y aleacion ligera con disipador termico con aletas, banco de conexion de servos, pies de elastomero de alta traccion y marcha de tripode continua estabilizada.
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
        <a href="robot_cyberhand.html" class="nav-btn">[ Rob: Mano ]</a>
        <a href="robot_scara_circuit.html" class="nav-btn">[ Rob: SCARA ]</a>
        <a href="robot_hexapod_walker.html" class="nav-btn active">[ Rob: Hexapodo ]</a>
        <a href="robot_server_gantry.html" class="nav-btn">[ Rob: Portico ]</a>
        <a href="machine_rocket.html" class="nav-btn">[ Maq: Cohete ]</a>
      </nav>
    </header>

    <main class="iso-page">
      <figure class="iso-figure hexapod-figure">
        <div class="iso-plate">
          ${corners}
          ${stage}
        </div>
        <figcaption class="iso-legend">
          <div class="iso-keys">
            <span class="iso-key"><span class="iso-swatch" data-mark="lit"><path d="M0 5h16"/></span> Chasis Hexagonal &amp; Disipador</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="raised"><path d="M0 5h16"/></span> Femur &amp; Tibia (18 Servos)</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="flat"><path d="M0 5h16"/></span> Pies de Elastomero &amp; Mesa</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="dotted"><path d="M0 5h16"/></span> Buses Electricos &amp; Shimmer</span>
          </div>
          <span class="iso-caption">${caption}</span>
        </figcaption>
      </figure>
    </main>
  `;

  const CSS = readFileSync(join(HERE, "hexapod.css"), "utf8");
  const LIVE = readFileSync(join(HERE, "live.js"), "utf8");
  const LATHE_RAW = readFileSync(join(HERE, "../../kit/lathe.mjs"), "utf8")
    .replace(/^import\s+.*$/gm, "")
    .replace(/^export\s+/gm, "");

  const DATA = {
    W: WIDTH,
    H: HEIGHT,
    P,
    CHASSIS_Z,
    CHASSIS_H,
    glCamera: glCamera(P)
  };

  const fullScript = `
    window.__HEXAPOD_DATA__ = ${JSON.stringify(DATA)};
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
    ${renderHexapodMechanism.toString()}
    ${glScript()}
    ${LIVE}
  `;

  const page = k.pageHtml({
    title: "Linux Groove - Robot Hexapodo 18-DOF // Skill anatomy",
    theme,
    body: `<style>${CSS}</style>${figure}`,
    script: fullScript,
    width: 860
  });

  const outLocal = join(HERE, "robot-hexapod.html");
  writeFileSync(outLocal, page);

  const outPublic = "/Volumes/HDEXTERNO/linux_groove/pruebas_web/public/robot_hexapod_walker.html";
  writeFileSync(outPublic, page);

  console.log(`Compilacion exitosa con skill anatomy: ${outPublic}`);
}

build();
