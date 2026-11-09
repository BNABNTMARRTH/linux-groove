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

const WIDTH = 800;
const HEIGHT = 580;
const AZIMUTH = 42;
const ELEVATION = 30;

// Placa Base
const PLATE = { x: -120, y: -90, w: 240, d: 180, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

// Muñeca y Palma
const WRIST_CENTER = [0, -20];
const WRIST_Z = 24;

const PALM = { x: -34, y: -16, w: 68, d: 72, r: 6 };
const PALM_Z = WRIST_Z + 18;
const PALM_H = 22;

export const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [PALM.x - 16, PALM.y - 16, PALM_Z + PALM_H + 75],
    [PALM.x + PALM.w + 16, PALM.y + PALM.d + 26, PALM_Z + PALM_H + 75]
  ],
  WIDTH,
  HEIGHT,
  { pad: 14, azimuth: AZIMUTH, elevation: ELEVATION }
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function buildBase() {
  const parts = [];
  parts.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);

  for (const [x, y] of byDepth(k.corners(PLATE, 18))) {
    parts.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 2, P, 24), { tone: "lo" }));
    parts.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H + 2, FOOT_H - 2, P, 24), { tone: "mid" }));
  }

  parts.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.4), { tone: "mid" }));
  parts.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));

  const screws = k.corners(PLATE, 10);
  parts.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  parts.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  const strip = { x: -105, y: PLATE.y + PLATE.d - 13, w: 210, d: 6, r: 1 };
  parts.push(S(k.slabOf(strip, 0, 0.6, P, 2), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.5], P);
  parts.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));

  return parts.join("");
}

function buildWrist() {
  const parts = [];
  const [wx, wy] = WRIST_CENTER;

  parts.push(S(k.cylinder(wx, wy, 26, 0, 10, P, 36, 0.8), { tone: "mid" }));
  parts.push(D([at([wx - 16, wy, 10]), at([wx + 16, wy, 10])], { size: 0.55 }));

  parts.push(S(k.slabOf({ x: wx - 22, y: wy - 8, w: 10, d: 16, r: 2 }, 10, WRIST_Z, P, 2), { tone: "hi" }));
  parts.push(S(k.slabOf({ x: wx + 12, y: wy - 8, w: 10, d: 16, r: 2 }, 10, WRIST_Z, P, 2), { tone: "hi" }));

  parts.push(S(k.cylinder(wx, wy, 19, WRIST_Z - 4, 16, P, 32, 0.8), { tone: "lit" }));
  parts.push(L(k.knurl(wx, wy, 19, WRIST_Z + 2, WRIST_Z + 8, 32, P), { tone: "lo" }));

  return parts.join("");
}

function buildPalm() {
  const parts = [];
  parts.push(S(k.slabOf(PALM, WRIST_Z + 12, PALM_H, P, 6, 1.2), { tone: "hi" }));
  parts.push(L(k.sideSeam(PALM, WRIST_Z + 20, P, 6), { tone: "faint" }));

  const sideDots = [
    [PALM.x + 4, PALM.y + 12, WRIST_Z + 22],
    [PALM.x + 4, PALM.y + PALM.d - 12, WRIST_Z + 22],
    [PALM.x + PALM.w - 4, PALM.y + 12, WRIST_Z + 22],
    [PALM.x + PALM.w - 4, PALM.y + PALM.d - 12, WRIST_Z + 22]
  ];
  parts.push(D(sideDots.map((pt) => at(pt)), { size: 0.55 }));

  const holoR = 12;
  const holoC = [PALM.x + PALM.w / 2, PALM.y + PALM.d / 2, WRIST_Z + 12 + PALM_H];
  parts.push(S(k.cylinder(holoC[0], holoC[1], holoR, holoC[2], 3, P, 24), { tone: "lit" }));
  parts.push(L(k.ring(holoC[0], holoC[1], holoR - 2, holoC[2] + 3, P, 20), { tone: "lo" }));
  parts.push(D([at(holoC)], { size: 0.8 }));

  return parts.join("");
}

function buildFingers() {
  const parts = [];
  const topZ = WRIST_Z + 12 + PALM_H;

  const knuckles = [
    { name: "index",  x: PALM.x + 12, y: PALM.y + PALM.d + 2, len: 18, w: 9 },
    { name: "middle", x: PALM.x + 28, y: PALM.y + PALM.d + 3, len: 21, w: 9 },
    { name: "ring",   x: PALM.x + 44, y: PALM.y + PALM.d + 2, len: 19, w: 8.5 },
    { name: "pinky",  x: PALM.x + 58, y: PALM.y + PALM.d - 1, len: 15, w: 7.5 }
  ];

  knuckles.forEach((kData) => {
    const { name, x, y, len, w } = kData;
    const p1 = `
      <g class="ph-group" data-ph="${name}-0">
        ${S(k.slabOf({ x: x - w / 2, y, w, d: len, r: 2 }, topZ - 4, 10, P, 2, 0.8), { tone: "hi" })}
        ${L(k.ring(x, y + 2, w / 2 - 1, topZ + 4, P, 12), { tone: "lo" })}
        <g class="ph-group" data-ph="${name}-1">
          ${S(k.slabOf({ x: x - (w - 1) / 2, y: y + len + 2, w: w - 1, d: len * 0.8, r: 2 }, topZ - 2, 9, P, 2, 0.8), { tone: "mid" })}
          <g class="ph-group" data-ph="${name}-2">
            ${S(k.slabOf({ x: x - (w - 2) / 2, y: y + len * 1.8 + 4, w: w - 2, d: len * 0.65, r: 2.5 }, topZ, 8, P, 2, 0.8), { tone: "lit" })}
            ${D([at([x, y + len * 2.2 + 4, topZ + 6])], { size: 0.45 })}
          </g>
        </g>
      </g>
    `;
    parts.push(p1);
  });

  const thumbX = PALM.x - 8;
  const thumbY = PALM.y + 16;
  const thumb = `
    <g class="ph-group" data-ph="thumb-0">
      ${S(k.cylinder(thumbX + 4, thumbY, 7, topZ - 6, 12, P, 16), { tone: "mid" })}
      ${S(k.slabOf({ x: thumbX - 14, y: thumbY - 5, w: 16, d: 11, r: 2.5 }, topZ - 4, 10, P, 2), { tone: "hi" })}
      <g class="ph-group" data-ph="thumb-1">
        ${S(k.slabOf({ x: thumbX - 26, y: thumbY - 4, w: 14, d: 9, r: 2.5 }, topZ - 2, 9, P, 2), { tone: "lit" })}
        ${D([at([thumbX - 22, thumbY, topZ + 5])], { size: 0.5 })}
      </g>
    </g>
  `;
  parts.push(thumb);

  return parts.join("");
}

function buildDorsalBuses() {
  const routes = [
    [[-12, -36, 6], [-10, -14, WRIST_Z + 8], [PALM.x + 14, PALM.y + 18, WRIST_Z + 36]],
    [[0, -36, 6], [0, -14, WRIST_Z + 8], [PALM.x + 30, PALM.y + 24, WRIST_Z + 36]],
    [[12, -36, 6], [10, -14, WRIST_Z + 8], [PALM.x + 46, PALM.y + 18, WRIST_Z + 36]]
  ];

  const pieces = [];
  routes.forEach((route) => {
    pieces.push(...tubePieces(route, 2.4, P, { rings: { count: 18, tone: "lo" } }));
  });

  const svgs = pieces.map((p) => tubeSvg(p, { tone: "mid" }));
  const tendonPaths = routes.map((rt) => {
    const d = rt.map((pt, i) => `${i ? "L" : "M"}${at(pt).join(" ")}`).join("");
    return `<path class="iso-line" data-tone="lit" data-flow="true" d="${d}" style="stroke-width: 1.2px;"/>`;
  });

  return `<g class="dorsal-buses">${svgs.join("")}${tendonPaths.join("")}</g>`;
}

function build() {
  const baseSvg = buildBase();
  const wristSvg = buildWrist();
  const palmSvg = buildPalm();
  const fingersSvg = buildFingers();
  const busesSvg = buildDorsalBuses();

  const backSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg cyberhand-back" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-base">${baseSvg}</g>
      <g class="layer-wrist">${wristSvg}</g>
    </svg>
  `;

  const frontSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg cyberhand-front" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-palm">${palmSvg}</g>
      <g class="layer-fingers">${fingersSvg}</g>
      <g class="layer-buses">${busesSvg}</g>
    </svg>
  `;

  const corners = `
    <div class="iso-plate-corners" aria-hidden="true">
      <span class="iso-plate-corner" data-corner="fig">Fig 2</span>
      <span class="iso-plate-corner" data-corner="title">Mano Bionica CyberHand · 14 Falanges</span>
      <span class="iso-plate-corner" data-corner="hint">Mover cursor verticalmente</span>
      <span class="iso-plate-corner" data-corner="readout" data-readout>14 FALANGES · AGARRE 20% · FUERZA 8.5 N</span>
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
    Protesis mioelectrica avanzada con 5 dedos biomecanicos y 14 falanges independientes articuladas (pulgar oponible con 2 falanges libres y cuatro dedos de 3 falanges con bisagras cilíndricas). Chasis de palma de aleacion ligera con tornilleria perimetral y proyector holografico HUD centrado en la cara palmar. Buses opticos dorsales y tendones de Kevlar trazados con el modulo de tuberia parametrica auditada.
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
        <a href="anatomy_scroll.html" class="nav-btn">[ Bio: Scroll ]</a>
        <a href="rays_streaming.html" class="nav-btn">[ Rayos ]</a>
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
            <span class="iso-key"><span class="iso-swatch" data-mark="flat"><path d="M0 5h16"/></span> Soporte de Muñeca</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="dotted"><path d="M0 5h16"/></span> Tendones Kevlar &amp; Buses Opticos</span>
          </div>
          <span class="iso-caption">${caption}</span>
        </figcaption>
      </figure>
    </main>
  `;

  const CSS = readFileSync(join(HERE, "cyberhand.css"), "utf8");
  const LIVE = readFileSync(join(HERE, "live.js"), "utf8");

  const DATA = {
    W: WIDTH,
    H: HEIGHT,
    camera: glCamera(P)
  };

  const fullScript = `
    window.__CYBERHAND_DATA__ = ${JSON.stringify(DATA)};
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
