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

// Base
const PLATE = { x: -120, y: -90, w: 240, d: 180, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

// Racks y Portico
const RACK_H = 100;
const GANTRY_H = 135;

export const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [-115, -85, GANTRY_H + 18],
    [115, 85, GANTRY_H + 18]
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

function buildServerRacks() {
  const parts = [];

  for (let x = -105; x <= -25; x += 40) {
    const rackBox = { x, y: -75, w: 35, d: 32, r: 2 };
    parts.push(S(k.slabOf(rackBox, 0, RACK_H, P, 2, 0.6), { tone: "hi" }));
    parts.push(L(k.sideSeam(rackBox, 35, P, 2), { tone: "faint" }));
    parts.push(L(k.sideSeam(rackBox, 70, P, 2), { tone: "faint" }));

    for (let z = 10; z <= RACK_H - 10; z += 10) {
      const uEdgeA = [x + 2, rackBox.y + rackBox.d, z];
      const uEdgeB = [x + rackBox.w - 2, rackBox.y + rackBox.d, z];
      parts.push(L(k.segment(uEdgeA, uEdgeB, P), { tone: "lo" }));
      parts.push(D([at([x + 5, rackBox.y + rackBox.d, z + 5])], { size: 0.4 }));
    }
  }

  for (let x = 25; x <= 105; x += 40) {
    const rackBox = { x: x - 35, y: 43, w: 35, d: 32, r: 2 };
    parts.push(S(k.slabOf(rackBox, 0, RACK_H, P, 2, 0.6), { tone: "hi" }));
    parts.push(L(k.sideSeam(rackBox, 35, P, 2), { tone: "faint" }));
    parts.push(L(k.sideSeam(rackBox, 70, P, 2), { tone: "faint" }));

    for (let z = 10; z <= RACK_H - 10; z += 10) {
      const uEdgeA = [rackBox.x + 2, rackBox.y, z];
      const uEdgeB = [rackBox.x + rackBox.w - 2, rackBox.y, z];
      parts.push(L(k.segment(uEdgeA, uEdgeB, P), { tone: "lo" }));
      parts.push(D([at([rackBox.x + 5, rackBox.y, z + 5])], { size: 0.4 }));
    }
  }

  return parts.join("");
}

function buildGantryStructure() {
  const parts = [];

  const railL = { x: -115, y: -40, w: 230, d: 7, r: 1.5 };
  parts.push(S(k.slabOf(railL, GANTRY_H - 10, 10, P, 2, 0.6), { tone: "mid" }));

  const railR = { x: -115, y: 33, w: 230, d: 7, r: 1.5 };
  parts.push(S(k.slabOf(railR, GANTRY_H - 10, 10, P, 2, 0.6), { tone: "mid" }));

  const colPositions = [
    [-112, -38], [112, -38],
    [-112, 35], [112, 35]
  ];
  colPositions.forEach(([cx, cy]) => {
    parts.push(S(k.cylinder(cx, cy, 6, 0, GANTRY_H - 10, P, 20), { tone: "mid" }));
    parts.push(D([at([cx, cy, 12])], { size: 0.55 }));
  });

  return parts.join("");
}

function buildMovingGantry() {
  const bridge = `
    <g class="gantry-bridge" data-gantry="bridge">
      ${S(k.slabOf({ x: -12, y: -42, w: 24, d: 84, r: 3 }, GANTRY_H - 2, 11, P, 3, 0.8), { tone: "hi" })}
      ${L(k.sideSeam({ x: -12, y: -42, w: 24, d: 84, r: 3 }, GANTRY_H + 3, P, 3), { tone: "faint" })}
      <g class="gantry-carriage" data-gantry="carriage">
        ${S(k.slabOf({ x: -10, y: -14, w: 20, d: 28, r: 2.5 }, GANTRY_H + 7, 12, P, 2, 0.6), { tone: "lit" })}
        ${D([at([0, 0, GANTRY_H + 19])], { size: 0.65 })}

        ${S(k.cylinder(0, 0, 5.5, GANTRY_H - 40, 50, P, 20), { tone: "mid" })}
        ${S(k.cylinder(0, 0, 3.5, GANTRY_H - 62, 24, P, 16), { tone: "lit" })}

        ${S(k.slabOf({ x: -7, y: -7, w: 14, d: 14, r: 2 }, GANTRY_H - 68, 6, P, 2), { tone: "hi" })}
        ${L(k.segment([-5, -5, GANTRY_H - 68], [-5, -5, GANTRY_H - 77], P), { tone: "lit" })}
        ${L(k.segment([5, 5, GANTRY_H - 68], [5, 5, GANTRY_H - 77], P), { tone: "lit" })}
      </g>
    </g>
  `;

  return bridge;
}

function buildFestoonCatenary() {
  const loops = [];
  const loopCount = 4;

  for (let i = 0; i < loopCount; i++) {
    const x0 = -90 + i * 46;
    const x1 = x0 + 38;
    const y0 = -36;
    const y1 = -36;
    const zTop = GANTRY_H + 2;
    const zSag = GANTRY_H - 16;

    const catRoute = [
      [x0, y0, zTop],
      [x0 + 10, y0, zSag + 3],
      [(x0 + x1) / 2, y0, zSag],
      [x1 - 10, y1, zSag + 3],
      [x1, y1, zTop]
    ];

    const pList = tubePieces(catRoute, 2.0, P, {
      rings: { count: 12, tone: "lo" }
    });
    const loopSvgs = pList.map((p) => tubeSvg(p, { tone: "mid" }));

    const d = catRoute.map((pt, idx) => `${idx ? "L" : "M"}${at(pt).join(" ")}`).join("");
    const flowSvg = `<path class="iso-line" data-tone="lit" data-flow="true" d="${d}" style="stroke-width: 1.2px;"/>`;

    loops.push(`
      <g class="festoon-loop" data-loop="${i}">
        ${loopSvgs.join("")}
        ${flowSvg}
        ${S(k.slabOf({ x: x0 - 2.5, y: y0 - 2.5, w: 5, d: 5, r: 1 }, zTop, 3.5, P, 1), { tone: "hi" })}
      </g>
    `);
  }

  return `<g class="gantry-festoon">${loops.join("")}</g>`;
}

function build() {
  const baseSvg = buildBase();
  const racksSvg = buildServerRacks();
  const structSvg = buildGantryStructure();
  const movingSvg = buildMovingGantry();
  const festoonSvg = buildFestoonCatenary();

  const backSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg gantry-back" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-base">${baseSvg}</g>
      <g class="layer-racks">${racksSvg}</g>
      <g class="layer-struct">${structSvg}</g>
    </svg>
  `;

  const frontSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg gantry-front" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-moving">${movingSvg}</g>
      <g class="layer-festoon">${festoonSvg}</g>
    </svg>
  `;

  const corners = `
    <div class="iso-plate-corners" aria-hidden="true">
      <span class="iso-plate-corner" data-corner="fig">Fig 5</span>
      <span class="iso-plate-corner" data-corner="title">Grua Portico Cartesiana X/Y/Z · Data Center</span>
      <span class="iso-plate-corner" data-corner="hint">Mover cursor para dirigir puente y carro</span>
      <span class="iso-plate-corner" data-corner="readout" data-readout>CARTESIANO X/Y/Z · PASILLO SERVIDORES · FESTON FIBRA</span>
    </div>
  `;

  const controls = `
    <div class="gantry-controls">
      <div class="gantry-btn-group">
        <button type="button" class="gantry-btn active" data-gantry-patrol>
          <span>Pausar / Reanudar Patrullaje</span>
        </button>
        <button type="button" class="gantry-btn active" data-gantry-cryo>
          <span class="gantry-lamp lit" aria-hidden="true"></span>
          <span>Niebla Criogenica LN2</span>
        </button>
        <span class="gantry-readout-live" data-live-status>PATRULLAJE AUTONOMO DE RACKS</span>
      </div>
      <div>Interpolacion X/Y/Z + Feston Catenario + WebGL Mist</div>
    </div>
  `;

  const stage = `
    <div class="gantry-stage">
      ${backSvg}
      <canvas class="gantry-canvas" width="${WIDTH}" height="${HEIGHT}"></canvas>
      ${frontSvg}
    </div>
    ${controls}
  `;

  const caption = `
    Sistema cartesiano de manipulación robotizada X/Y/Z suspendido sobre un pasillo frío de servidores de 19 pulgadas en un centro de datos. Puente móvil X con vigas aligeradas, carro transversal Y de bolas recirculantes y mástil telescópico vertical Z con pinza electromagnética para reemplazo en caliente de unidades. El suministro de energía y fibra óptica se gestiona mediante un festón catenario suspendido con lazos elásticos y shader WebGL de niebla criogénica de nitrógeno líquido.
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
        <a href="robot_hexapod_walker.html" class="nav-btn">[ Rob: Hexapodo ]</a>
        <a href="robot_server_gantry.html" class="nav-btn active">[ Rob: Portico ]</a>
        <a href="machine_rocket.html" class="nav-btn">[ Maq: Cohete ]</a>
        <a href="anatomy_scroll.html" class="nav-btn">[ Bio: Scroll ]</a>
        <a href="rays_streaming.html" class="nav-btn">[ Rayos ]</a>
      </nav>
    </header>

    <main class="iso-page">
      <figure class="iso-figure gantry-figure">
        <div class="iso-plate">
          ${corners}
          ${stage}
        </div>
        <figcaption class="iso-legend">
          <div class="iso-keys">
            <span class="iso-key"><span class="iso-swatch" data-mark="lit"><path d="M0 5h16"/></span> Carro Y &amp; Mástil Z</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="raised"><path d="M0 5h16"/></span> Puente Transversal X &amp; Racks</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="flat"><path d="M0 5h16"/></span> Rieles Longitudinales &amp; Base</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="dotted"><path d="M0 5h16"/></span> Feston Catenario de Fibra</span>
          </div>
          <span class="iso-caption">${caption}</span>
        </figcaption>
      </figure>
    </main>
  `;

  const CSS = readFileSync(join(HERE, "gantry.css"), "utf8");
  const LIVE = readFileSync(join(HERE, "live.js"), "utf8");

  const DATA = {
    W: WIDTH,
    H: HEIGHT,
    camera: glCamera(P)
  };

  const fullScript = `
    window.__GANTRY_DATA__ = ${JSON.stringify(DATA)};
    ${glScript()}
    ${LIVE}
  `;

  const page = k.pageHtml({
    title: "Linux Groove - Portico Cartesiano Servidores // Skill anatomy",
    theme,
    body: `<style>${CSS}</style>${figure}`,
    script: fullScript,
    width: 860
  });

  const outLocal = join(HERE, "robot-gantry.html");
  writeFileSync(outLocal, page);

  const outPublic = "/Volumes/HDEXTERNO/linux_groove/pruebas_web/public/robot_server_gantry.html";
  writeFileSync(outPublic, page);

  console.log(`Compilacion exitosa con skill anatomy: ${outPublic}`);
}

build();
