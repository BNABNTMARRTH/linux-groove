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
const AZIMUTH = 42;
const ELEVATION = 30;

// Base del Pasillo de Servidores
const PLATE = { x: -150, y: -110, w: 300, d: 220, r: 8 };
const PLATE_H = 14;
const FOOT_H = 6;

// Altura de los Racks de Servidores y el Portico
const RACK_H = 110;
const GANTRY_H = 145;

export const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [-140, -100, GANTRY_H + 20],
    [140, 100, GANTRY_H + 20]
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

// 1. Placa Base y Pasillo Técnico
function buildBase() {
  const parts = [];
  parts.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);

  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    parts.push(S(k.cylinder(x, y, 9, -PLATE_H - FOOT_H, 2, P, 24), { tone: "lo" }));
    parts.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H + 2, FOOT_H - 2, P, 24), { tone: "mid" }));
  }

  parts.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.4), { tone: "mid" }));
  parts.push(L(k.planOutline(k.insetPlan(PLATE, 6), 0, P), { tone: "lo" }));

  const screws = k.corners(PLATE, 12);
  parts.push(L(screws.map(([x, y]) => k.ring(x, y, 2.5, 0, P, 16)).join(""), { tone: "lo" }));
  parts.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.55 }));

  // Regla graduada frontal
  const strip = { x: -130, y: PLATE.y + PLATE.d - 14, w: 260, d: 6, r: 1 };
  parts.push(S(k.slabOf(strip, 0, 0.6, P, 2), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.8], P);
  parts.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));

  return parts.join("");
}

// 2. Racks de Servidores de 19 Pulgadas a Ambos Lados del Pasillo
function buildServerRacks() {
  const parts = [];

  // Fila de Racks Izquierda
  for (let x = -130; x <= -30; x += 48) {
    const rackBox = { x, y: -90, w: 42, d: 38, r: 2 };
    parts.push(S(k.slabOf(rackBox, 0, RACK_H, P, 2, 0.6), { tone: "hi" }));
    parts.push(L(k.sideSeam(rackBox, 40, P, 2), { tone: "faint" }));
    parts.push(L(k.sideSeam(rackBox, 80, P, 2), { tone: "faint" }));

    // Unidades de servidor 1U/2U con micro-ranuras
    for (let z = 12; z <= RACK_H - 12; z += 12) {
      const uEdgeA = [x + 2, rackBox.y + rackBox.d, z];
      const uEdgeB = [x + rackBox.w - 2, rackBox.y + rackBox.d, z];
      parts.push(L(k.segment(uEdgeA, uEdgeB, P), { tone: "lo" }));
      parts.push(D([at([x + 6, rackBox.y + rackBox.d, z + 6])], { size: 0.4 }));
    }
  }

  // Fila de Racks Derecha
  for (let x = 30; x <= 130; x += 48) {
    const rackBox = { x: x - 42, y: 52, w: 42, d: 38, r: 2 };
    parts.push(S(k.slabOf(rackBox, 0, RACK_H, P, 2, 0.6), { tone: "hi" }));
    parts.push(L(k.sideSeam(rackBox, 40, P, 2), { tone: "faint" }));
    parts.push(L(k.sideSeam(rackBox, 80, P, 2), { tone: "faint" }));

    for (let z = 12; z <= RACK_H - 12; z += 12) {
      const uEdgeA = [rackBox.x + 2, rackBox.y, z];
      const uEdgeB = [rackBox.x + rackBox.w - 2, rackBox.y, z];
      parts.push(L(k.segment(uEdgeA, uEdgeB, P), { tone: "lo" }));
      parts.push(D([at([rackBox.x + 6, rackBox.y, z + 6])], { size: 0.4 }));
    }
  }

  return parts.join("");
}

// 3. Estructura Portante Fija: Rieles Longitudinales X
function buildGantryStructure() {
  const parts = [];

  // Riel longitudinal izquierdo en I
  const railL = { x: -140, y: -48, w: 280, d: 8, r: 1.5 };
  parts.push(S(k.slabOf(railL, GANTRY_H - 10, 10, P, 2, 0.6), { tone: "mid" }));

  // Riel longitudinal derecho en I
  const railR = { x: -140, y: 40, w: 280, d: 8, r: 1.5 };
  parts.push(S(k.slabOf(railR, GANTRY_H - 10, 10, P, 2, 0.6), { tone: "mid" }));

  // Columnas de soporte de las esquinas
  const colPositions = [
    [-136, -46], [136, -46],
    [-136, 42], [136, 42]
  ];
  colPositions.forEach(([cx, cy]) => {
    parts.push(S(k.cylinder(cx, cy, 7, 0, GANTRY_H - 10, P, 20), { tone: "mid" }));
    parts.push(D([at([cx, cy, 14])], { size: 0.55 }));
  });

  return parts.join("");
}

// 4. Puente Móvil X, Carro Y y Mástil Z
function buildMovingGantry() {
  // Puente transversal X (Viga que se desplaza sobre los rieles L y R)
  const bridge = `
    <g class="gantry-bridge" data-gantry="bridge">
      <!-- Viga transversal de doble riel -->
      ${S(k.slabOf({ x: -14, y: -50, w: 28, d: 100, r: 3 }, GANTRY_H - 2, 12, P, 3, 0.8), { tone: "hi" })}
      ${L(k.sideSeam({ x: -14, y: -50, w: 28, d: 100, r: 3 }, GANTRY_H + 4, P, 3), { tone: "faint" })}
      <!-- Carro transversal Y que corre a lo largo del puente -->
      <g class="gantry-carriage" data-gantry="carriage">
        ${S(k.slabOf({ x: -12, y: -16, w: 24, d: 32, r: 2.5 }, GANTRY_H + 8, 14, P, 2, 0.6), { tone: "lit" })}
        ${D([at([0, 0, GANTRY_H + 22])], { size: 0.65 })}

        <!-- Mástil telescópico vertical Z -->
        ${S(k.cylinder(0, 0, 6, GANTRY_H - 45, 55, P, 20), { tone: "mid" })}
        ${S(k.cylinder(0, 0, 3.8, GANTRY_H - 68, 25, P, 16), { tone: "lit" })}

        <!-- Pinza robótica de extracción de servidores -->
        ${S(k.slabOf({ x: -8, y: -8, w: 16, d: 16, r: 2 }, GANTRY_H - 74, 6, P, 2), { tone: "hi" })}
        <!-- Dedos de fijación electromagnética -->
        ${L(k.segment([-6, -6, GANTRY_H - 74], [-6, -6, GANTRY_H - 84], P), { tone: "lit" })}
        ${L(k.segment([6, 6, GANTRY_H - 74], [6, 6, GANTRY_H - 84], P), { tone: "lit" })}
      </g>
    </g>
  `;

  return bridge;
}

// 5. Festón Catenario de Fibra Óptica Suspendido con kit/tube.mjs
function buildFestoonCatenary() {
  const loops = [];
  const loopCount = 4;

  for (let i = 0; i < loopCount; i++) {
    const x0 = -110 + i * 55;
    const x1 = x0 + 45;
    const y0 = -44;
    const y1 = -44;
    const zTop = GANTRY_H + 2;
    const zSag = GANTRY_H - 18;

    const catRoute = [
      [x0, y0, zTop],
      [x0 + 12, y0, zSag + 4],
      [(x0 + x1) / 2, y0, zSag],
      [x1 - 12, y1, zSag + 4],
      [x1, y1, zTop]
    ];

    const pList = tubePieces(catRoute, 2.2, P, {
      rings: { count: 12, tone: "lo" }
    });
    const loopSvgs = pList.map((p) => tubeSvg(p, { tone: "mid" }));

    // Pulso luminoso de datos en la fibra con data-flow
    const d = catRoute.map((pt, idx) => `${idx ? "L" : "M"}${at(pt).join(" ")}`).join("");
    const flowSvg = `<path class="iso-line" data-tone="lit" data-flow="true" d="${d}" style="stroke-width: 1.2px;"/>`;

    loops.push(`
      <g class="festoon-loop" data-loop="${i}">
        ${loopSvgs.join("")}
        ${flowSvg}
        <!-- Carrito de rodadura en el riel -->
        ${S(k.slabOf({ x: x0 - 3, y: y0 - 3, w: 6, d: 6, r: 1 }, zTop, 4, P, 1), { tone: "hi" })}
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
    title: "Linux Groove - Portico Cartesiano Servidores // Skill create-anatomy",
    theme,
    body: `<style>${CSS}</style>${figure}`,
    script: fullScript,
    width: 980
  });

  const outLocal = join(HERE, "robot-gantry.html");
  writeFileSync(outLocal, page);

  const outPublic = "/Volumes/HDEXTERNO/linux_groove/pruebas_web/public/robot_server_gantry.html";
  writeFileSync(outPublic, page);

  console.log(`Compilacion exitosa con skill create-anatomy:`);
  console.log(`- Local:  ${outLocal} (${(page.length / 1024).toFixed(1)} KB)`);
  console.log(`- Public: ${outPublic}`);
}

build();
