import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../kit/tube.mjs";
import { glCamera } from "../../kit/gl.mjs";
import { glScript } from "../../scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 920;
const HEIGHT = 680;
const AZIMUTH = 45;
const ELEVATION = 32;

// Placa Base
const PLATE = { x: -140, y: -110, w: 280, d: 220, r: 8 };
const PLATE_H = 12;
const FOOT_H = 6;

// Chasis Central Hexagonal del Robot
const HEX_BODY = { x: -36, y: -28, w: 72, d: 56, r: 6 };
const BODY_Z = 52;
const BODY_H = 18;

export const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [-110, -90, 80],
    [110, 90, 80]
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: AZIMUTH, elevation: ELEVATION }
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// 1. Placa Base y Pistas de Prueba
function buildBase() {
  const parts = [];
  parts.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);

  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    parts.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 2, P, 24), { tone: "lo" }));
    parts.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H + 2, FOOT_H - 2, P, 24), { tone: "mid" }));
  }

  parts.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.4), { tone: "mid" }));
  parts.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));

  const screws = k.corners(PLATE, 10);
  parts.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  parts.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  const strip = { x: -120, y: PLATE.y + PLATE.d - 14, w: 240, d: 6, r: 1 };
  parts.push(S(k.slabOf(strip, 0, 0.6, P, 2), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.5], P);
  parts.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));

  return parts.join("");
}

// 2. Chasis Central Hexagonal y Disipador Termico
function buildChassis() {
  const parts = [];

  // Plato inferior del chasis
  parts.push(S(k.slabOf(HEX_BODY, BODY_Z, BODY_H, P, 6, 1.2), { tone: "hi" }));
  parts.push(L(k.sideSeam(HEX_BODY, BODY_Z + 8, P, 6), { tone: "faint" }));

  // Tornilleria perimetral de la tapa
  const screws = [
    [HEX_BODY.x + 6, HEX_BODY.y + 6, BODY_Z + BODY_H],
    [HEX_BODY.x + HEX_BODY.w - 6, HEX_BODY.y + 6, BODY_Z + BODY_H],
    [HEX_BODY.x + 6, HEX_BODY.y + HEX_BODY.d - 6, BODY_Z + BODY_H],
    [HEX_BODY.x + HEX_BODY.w - 6, HEX_BODY.y + HEX_BODY.d - 6, BODY_Z + BODY_H]
  ];
  parts.push(D(screws.map((pt) => at(pt)), { size: 0.55 }));

  // Disipador térmico ranurado central con aletas de refrigeracion
  const sink = { x: -16, y: -12, w: 32, d: 24, r: 2 };
  parts.push(S(k.slabOf(sink, BODY_Z + BODY_H, 8, P, 2, 0.5), { tone: "lit" }));
  for (let x = sink.x + 3; x <= sink.x + sink.w - 3; x += 3.5) {
    const finA = [x, sink.y, BODY_Z + BODY_H + 8];
    const finB = [x, sink.y + sink.d, BODY_Z + BODY_H + 8];
    parts.push(L(k.segment(finA, finB, P), { tone: "lo" }));
  }

  return parts.join("");
}

// 3. 6 Patas Articuladas (18 Servomotores)
function buildLegs() {
  const parts = [];
  const topZ = BODY_Z + 4;

  // 6 Puntos de anclaje de patas en los costados del chasis
  const legBases = [
    { idx: 0, x: HEX_BODY.x - 2, y: HEX_BODY.y + 8,  dirX: -1, dirY: -0.6 },
    { idx: 1, x: HEX_BODY.x - 4, y: HEX_BODY.y + 28, dirX: -1, dirY: 0 },
    { idx: 2, x: HEX_BODY.x - 2, y: HEX_BODY.y + 48, dirX: -1, dirY: 0.6 },
    { idx: 3, x: HEX_BODY.x + HEX_BODY.w + 2, y: HEX_BODY.y + 8,  dirX: 1, dirY: -0.6 },
    { idx: 4, x: HEX_BODY.x + HEX_BODY.w + 4, y: HEX_BODY.y + 28, dirX: 1, dirY: 0 },
    { idx: 5, x: HEX_BODY.x + HEX_BODY.w + 2, y: HEX_BODY.y + 48, dirX: 1, dirY: 0.6 }
  ];

  legBases.forEach((lb) => {
    const { idx, x, y, dirX, dirY } = lb;

    // Servo 1: Coxa (Giro horizontal)
    const coxaEndX = x + dirX * 16;
    const coxaEndY = y + dirY * 16;

    // Servo 2: Fémur (Elevación)
    const femurEndX = coxaEndX + dirX * 24;
    const femurEndY = coxaEndY + dirY * 20;
    const femurZ = topZ + 18;

    // Servo 3: Tibia (Apoyo hacia el suelo)
    const tibiaFootX = femurEndX + dirX * 22;
    const tibiaFootY = femurEndY + dirY * 18;
    const footZ = 0;

    const legSvg = `
      <g class="hexapod-leg" data-leg="${idx}">
        <!-- Articulacion Coxa -->
        ${S(k.cylinder(x, y, 6.5, topZ - 4, 10, P, 16), { tone: "mid" })}
        ${S(k.slabOf({ x: Math.min(x, coxaEndX) - 3, y: Math.min(y, coxaEndY) - 3, w: 14, d: 14, r: 2 }, topZ - 2, 8, P, 2), { tone: "hi" })}

        <!-- Articulacion Fémur -->
        ${S(k.cylinder(coxaEndX, coxaEndY, 5.5, topZ, 12, P, 16), { tone: "mid" })}
        ${S(k.slabOf({ x: Math.min(coxaEndX, femurEndX) - 2.5, y: Math.min(coxaEndY, femurEndY) - 2.5, w: 18, d: 16, r: 2 }, topZ + 4, 10, P, 2), { tone: "hi" })}

        <!-- Articulacion Tibia y Pie Antideslizante -->
        ${S(k.cylinder(femurEndX, femurEndY, 4.5, femurZ - 8, 10, P, 16), { tone: "mid" })}
        ${L(k.segment([femurEndX, femurEndY, femurZ], [tibiaFootX, tibiaFootY, footZ + 4], P), { tone: "lit" })}
        <!-- Pie esférico de goma -->
        ${S(k.cylinder(tibiaFootX, tibiaFootY, 4, footZ, 4, P, 16), { tone: "lo" })}
        ${D([at([tibiaFootX, tibiaFootY, footZ + 4])], { size: 0.5 })}
      </g>
    `;

    parts.push(legSvg);
  });

  return parts.join("");
}

// 4. Arnés Perimetral de Silicona con kit/tube.mjs
function buildPowerHarness() {
  const routes = [
    [[HEX_BODY.x - 2, HEX_BODY.y + 8, BODY_Z + 6], [HEX_BODY.x - 14, HEX_BODY.y + 8, BODY_Z + 12]],
    [[HEX_BODY.x - 4, HEX_BODY.y + 28, BODY_Z + 6], [HEX_BODY.x - 16, HEX_BODY.y + 28, BODY_Z + 12]],
    [[HEX_BODY.x - 2, HEX_BODY.y + 48, BODY_Z + 6], [HEX_BODY.x - 14, HEX_BODY.y + 48, BODY_Z + 12]],
    [[HEX_BODY.x + HEX_BODY.w + 2, HEX_BODY.y + 8, BODY_Z + 6], [HEX_BODY.x + HEX_BODY.w + 14, HEX_BODY.y + 8, BODY_Z + 12]],
    [[HEX_BODY.x + HEX_BODY.w + 4, HEX_BODY.y + 28, BODY_Z + 6], [HEX_BODY.x + HEX_BODY.w + 16, HEX_BODY.y + 28, BODY_Z + 12]],
    [[HEX_BODY.x + HEX_BODY.w + 2, HEX_BODY.y + 48, BODY_Z + 6], [HEX_BODY.x + HEX_BODY.w + 14, HEX_BODY.y + 48, BODY_Z + 12]]
  ];

  const pieces = [];
  routes.forEach((rt) => {
    pieces.push(...tubePieces(rt, 2.0, P, { rings: { count: 8, tone: "lo" } }));
  });

  const svgs = pieces.map((p) => tubeSvg(p, { tone: "mid" }));

  // Bus de alimentacion central perimetral con data-flow
  const busPoints = [
    [HEX_BODY.x - 8, HEX_BODY.y + 8, BODY_Z + 10],
    [HEX_BODY.x - 10, HEX_BODY.y + 28, BODY_Z + 10],
    [HEX_BODY.x - 8, HEX_BODY.y + 48, BODY_Z + 10],
    [HEX_BODY.x + HEX_BODY.w + 8, HEX_BODY.y + 48, BODY_Z + 10],
    [HEX_BODY.x + HEX_BODY.w + 10, HEX_BODY.y + 28, BODY_Z + 10],
    [HEX_BODY.x + HEX_BODY.w + 8, HEX_BODY.y + 8, BODY_Z + 10]
  ];
  const d = busPoints.map((pt, i) => `${i ? "L" : "M"}${at(pt).join(" ")}`).join("");
  const flowSvg = `<path class="iso-line" data-tone="lit" data-flow="true" d="${d}" style="stroke-width: 1.2px;"/>`;

  return `<g class="hexapod-harness">${svgs.join("")}${flowSvg}</g>`;
}

function build() {
  const baseSvg = buildBase();
  const chassisSvg = buildChassis();
  const legsSvg = buildLegs();
  const harnessSvg = buildPowerHarness();

  const backSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg hexapod-back" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-base">${baseSvg}</g>
    </svg>
  `;

  const frontSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg hexapod-front" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-chassis">${chassisSvg}</g>
      <g class="layer-legs">${legsSvg}</g>
      <g class="layer-harness">${harnessSvg}</g>
    </svg>
  `;

  const corners = `
    <div class="iso-plate-corners" aria-hidden="true">
      <span class="iso-plate-corner" data-corner="fig">Fig 4</span>
      <span class="iso-plate-corner" data-corner="title">Robot Hexapodo 18-DOF · Marcha de Tripode</span>
      <span class="iso-plate-corner" data-corner="hint">Pulsar para alternar marcha continua</span>
      <span class="iso-plate-corner" data-corner="readout" data-readout>18 SERVOS · TRIPOD GAIT · 4.2 A · 54.5 °C</span>
    </div>
  `;

  const controls = `
    <div class="hexapod-controls">
      <div class="hexapod-btn-group">
        <button type="button" class="hexapod-btn active" data-hexapod-walk>
          <span>Pausar / Reanudar Marcha</span>
        </button>
        <button type="button" class="hexapod-btn active" data-hexapod-heat>
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
    Plataforma hexápoda biomimética de 18 grados de libertad con chasis de aleación ligera y disipador térmico superior de microprocesador. Cada extremidad dispone de 3 servomotores sincronizados en marcha de trípode continua (3 apoyos fijos formando un triángulo estático mientras las 3 restantes avanzan en fase de vuelo). Arnés perimetral de cableado de silicona con bus continuo de potencia y shader WebGL de refracción térmica por convección.
  `;

  const figure = `
    <header class="top-nav">
      <div class="brand-container">
        <span class="brand-bullet">[+]</span>
        <span class="brand-title">LINUX GROOVE</span>
        <span class="brand-tag">SKILL CREATE-ANATOMY // ROBOTICA 3D</span>
      </div>
      <nav class="nav-links">
        <a href="index.html" class="nav-btn">[ Catalogo ]</a>
        <a href="robot_arm_welder.html" class="nav-btn">[ Rob: Soldador ]</a>
        <a href="robot_cyberhand.html" class="nav-btn">[ Rob: Mano ]</a>
        <a href="robot_scara_circuit.html" class="nav-btn">[ Rob: SCARA ]</a>
        <a href="robot_hexapod_walker.html" class="nav-btn active">[ Rob: Hexapodo ]</a>
        <a href="robot_server_gantry.html" class="nav-btn">[ Rob: Portico ]</a>
        <a href="machine_rocket.html" class="nav-btn">[ Maq: Cohete ]</a>
        <a href="anatomy_scroll.html" class="nav-btn">[ Bio: Scroll ]</a>
        <a href="rays_streaming.html" class="nav-btn">[ Rayos ]</a>
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
            <span class="iso-key"><span class="iso-swatch" data-mark="lit"><path d="M0 5h16"/></span> Tibias &amp; Disipador Termico</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="raised"><path d="M0 5h16"/></span> Chasis Hexagonal &amp; Servos Coxa</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="flat"><path d="M0 5h16"/></span> Base &amp; Pies de Goma</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="dotted"><path d="M0 5h16"/></span> Arnes Flexible de Silicona</span>
          </div>
          <span class="iso-caption">${caption}</span>
        </figcaption>
      </figure>
    </main>
  `;

  const CSS = readFileSync(join(HERE, "hexapod.css"), "utf8");
  const LIVE = readFileSync(join(HERE, "live.js"), "utf8");

  const DATA = {
    W: WIDTH,
    H: HEIGHT,
    camera: glCamera(P)
  };

  const fullScript = `
    window.__HEXAPOD_DATA__ = ${JSON.stringify(DATA)};
    ${glScript()}
    ${LIVE}
  `;

  const page = k.pageHtml({
    title: "Linux Groove - Robot Hexapodo Andador // Skill create-anatomy",
    theme,
    body: `<style>${CSS}</style>${figure}`,
    script: fullScript,
    width: 980
  });

  const outLocal = join(HERE, "robot-hexapod.html");
  writeFileSync(outLocal, page);

  const outPublic = "/Volumes/HDEXTERNO/linux_groove/pruebas_web/public/robot_hexapod_walker.html";
  writeFileSync(outPublic, page);

  console.log(`Compilacion exitosa con skill create-anatomy:`);
  console.log(`- Local:  ${outLocal} (${(page.length / 1024).toFixed(1)} KB)`);
  console.log(`- Public: ${outPublic}`);
}

build();
