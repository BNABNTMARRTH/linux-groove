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

// Dimensiones de Mundo Enfocadas en el Robot (Encuadre Centrado y Grande)
const PLATE = { x: -120, y: -90, w: 240, d: 180, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

// Base del Robot J1
const ROBOT_BASE = [-50, -10];
const BASE_R = 32;
const BASE_H = 20;

// Probeta de Ensayo de Soldadura
const SEAM_BLOCK = { x: 25, y: -30, w: 75, d: 60, r: 4 };
const SEAM_H = 16;

// Proyeccion Isometrica Optimizada para Llenar el 75% del Viewport
export const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [ROBOT_BASE[0] - BASE_R, ROBOT_BASE[1] - BASE_R, 175],
    [ROBOT_BASE[0] + BASE_R, ROBOT_BASE[1] + BASE_R, 175],
    [SEAM_BLOCK.x + SEAM_BLOCK.w, SEAM_BLOCK.y + SEAM_BLOCK.d, SEAM_H + 8]
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

// 1. Base y Mesa de Trabajo con Ranuras T y Regla Milimetrica
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

  // Ranuras T
  for (const y of [-45, -10, 25, 55]) {
    const slot = { x: -105, y, w: 210, d: 4.5, r: 0.5 };
    parts.push(S(k.slabOf(slot, -0.8, 0.8, P, 2), { tone: "lo", crease: "none" }));
    parts.push(L(k.planOutline(slot, 0, P), { tone: "faint" }));
  }

  // Regla frontal
  const ruler = { x: -105, y: PLATE.y + PLATE.d - 13, w: 210, d: 6, r: 1 };
  parts.push(S(k.slabOf(ruler, 0, 0.8, P, 2), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(ruler.x + 4, ruler.x + ruler.w - 4, 4, 5, ruler.y + 1, 0.8, [2, 3.8], P);
  parts.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));

  return parts.join("");
}

// 2. Probeta de Ensayo Metalica con Costura de Soldadura Biselada
function buildWorkpiece() {
  const parts = [];
  parts.push(S(k.slabOf(SEAM_BLOCK, 0, SEAM_H, P, 4, 1.4), { tone: "hi" }));
  parts.push(L(k.sideSeam(SEAM_BLOCK, 6, P, 4), { tone: "faint" }));

  const seamY = SEAM_BLOCK.y + SEAM_BLOCK.d / 2;
  const seamP0 = [SEAM_BLOCK.x + 4, seamY, SEAM_H];
  const seamP1 = [SEAM_BLOCK.x + SEAM_BLOCK.w - 4, seamY, SEAM_H];
  parts.push(L(k.segment(seamP0, seamP1, P), { tone: "lit" }));

  const cordLines = [];
  for (let x = SEAM_BLOCK.x + 8; x <= SEAM_BLOCK.x + SEAM_BLOCK.w - 8; x += 3.2) {
    const arcLeft = [x, seamY - 2.5, SEAM_H + 0.5];
    const arcMid = [x + 1.4, seamY, SEAM_H + 1.2];
    const arcRight = [x, seamY + 2.5, SEAM_H + 0.5];
    cordLines.push(`M${at(arcLeft).join(" ")} Q${at(arcMid).join(" ")} ${at(arcRight).join(" ")}`);
  }
  parts.push(L(cordLines.join(" "), { tone: "mid" }));

  const groundPost = [SEAM_BLOCK.x + 8, SEAM_BLOCK.y + 8, SEAM_H];
  parts.push(S(k.cylinder(groundPost[0], groundPost[1], 3.8, SEAM_H, 6, P, 24), { tone: "mid" }));
  parts.push(L(k.knurl(groundPost[0], groundPost[1], 3.8, SEAM_H + 2, SEAM_H + 5, 24, P), { tone: "lo" }));
  parts.push(D([at([groundPost[0], groundPost[1], SEAM_H + 6])], { size: 0.6 }));

  return parts.join("");
}

// 3. Pedestal Cilíndrico y Reductor J1
function buildPedestal() {
  const parts = [];
  const [bx, by] = ROBOT_BASE;

  parts.push(S(k.cylinder(bx, by, BASE_R, 0, 7, P, 44, 1.0), { tone: "mid" }));
  const boltR = BASE_R - 5;
  const boltDots = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    boltDots.push(at([bx + Math.cos(angle) * boltR, by + Math.sin(angle) * boltR, 7]));
  }
  parts.push(D(boltDots, { size: 0.55 }));

  parts.push(S(k.cylinder(bx, by, BASE_R - 6, 7, BASE_H - 7, P, 36), { tone: "mid" }));
  parts.push(L(k.knurl(bx, by, BASE_R - 6, 10, BASE_H - 3, 32, P), { tone: "lo" }));

  parts.push(S(k.cylinder(bx, by, BASE_R - 4, BASE_H, 6, P, 36), { tone: "hi" }));
  parts.push(L(k.sideArc(bx, by, BASE_R - 4, BASE_H + 3, P, 28), { tone: "lo" }));

  return parts.join("");
}

// 4. Cinemática del Brazo y Eslabones 3D
function buildRobotArm() {
  const [bx, by] = ROBOT_BASE;
  const j1Z = BASE_H + 6;

  const turret = `
    <g class="robot-joint" data-joint="j1">
      ${S(k.cylinder(bx, by, BASE_R - 8, j1Z, 26, P, 32), { tone: "hi" })}
      ${L(k.ring(bx, by, BASE_R - 8, j1Z + 12, P, 24), { tone: "lo" })}
      ${S(k.cylinder(bx, by + 18, 9, j1Z + 16, 8, P, 20), { tone: "mid" })}
      ${D([at([bx, by + 26, j1Z + 20])], { size: 0.65 })}
      ${S(k.cylinder(bx - 18, by, 8, j1Z + 10, 18, P, 20), { tone: "lo" })}
      ${L(k.knurl(bx - 18, by, 8, j1Z + 14, j1Z + 24, 20, P), { tone: "lo" })}
      ${S(k.cylinder(bx - 18, by - 10, 4, j1Z + 14, 6, P, 16), { tone: "mid" })}
    </g>
  `;

  const link2 = `
    <g class="robot-joint" data-joint="j2">
      ${S(k.slabOf({ x: bx - 8, y: by - 7, w: 75, d: 14, r: 4 }, j1Z + 14, 18, P, 4, 1.0), { tone: "hi" })}
      ${L(k.sideSeam({ x: bx - 8, y: by - 7, w: 75, d: 14, r: 4 }, j1Z + 22, P, 4), { tone: "lo" })}
      ${S(k.cylinder(bx + 14, by - 12, 5, j1Z + 6, 40, P, 20), { tone: "mid" })}
      ${S(k.cylinder(bx + 14, by - 12, 2.8, j1Z + 46, 22, P, 16), { tone: "lit" })}
    </g>
  `;

  const link3 = `
    <g class="robot-joint" data-joint="j3">
      ${S(k.cylinder(bx + 65, by, 14, j1Z + 20, 12, P, 28, 0.8), { tone: "hi" })}
      ${D([at([bx + 65, by, j1Z + 32])], { size: 0.6 })}
      ${S(k.cylinder(bx + 65, by, 9, j1Z + 32, 65, P, 24), { tone: "mid" })}
      ${L(k.sideArc(bx + 65, by, 9, j1Z + 55, P, 20), { tone: "faint" })}
      ${L(k.sideArc(bx + 65, by, 9, j1Z + 75, P, 20), { tone: "faint" })}
    </g>
  `;

  const wristTorch = `
    <g class="robot-joint" data-joint="wrist">
      ${S(k.cylinder(bx + 65, by, 10, j1Z + 97, 14, P, 24, 0.8), { tone: "hi" })}
      ${S(k.cylinder(bx + 65, by, 8, j1Z + 111, 4, P, 20), { tone: "mid" })}
      ${D([at([bx + 62, by, j1Z + 115]), at([bx + 68, by, j1Z + 115])], { size: 0.45 })}

      <g data-joint="torch">
        ${S(k.cylinder(bx + 65, by, 5, j1Z + 115, 12, P, 16), { tone: "lo" })}
        ${S(k.cylinder(bx + 65, by, 7, j1Z + 127, 16, P, 20), { tone: "mid" })}
        ${L(k.knurl(bx + 65, by, 7, j1Z + 129, j1Z + 141, 20, P), { tone: "lo" })}
        ${S(k.cylinder(bx + 65, by, 5.5, j1Z + 143, 12, P, 20), { tone: "hi" })}
        ${S(k.cylinder(bx + 65, by, 1.2, j1Z + 155, 6, P, 12), { tone: "lit" })}
      </g>
    </g>
  `;

  return [turret, link2, link3, wristTorch].join("");
}

// 5. Manguera Umbilical Multicapa con kit/tube.mjs
function buildUmbilicalHarness() {
  const [bx, by] = ROBOT_BASE;
  const j1Z = BASE_H + 6;

  const route = [
    [bx - 24, by - 18, 4],
    [bx - 30, by - 12, 18],
    [bx - 28, by + 6, j1Z + 8],
    [bx - 10, by + 16, j1Z + 26],
    [bx + 24, by + 15, j1Z + 45],
    [bx + 52, by + 12, j1Z + 85],
    [bx + 60, by + 6, j1Z + 120]
  ];

  const pieces = tubePieces(route, 3.8, P, {
    rings: { count: 32, tone: "lo" },
    breaks: [0.35, 0.70]
  });

  const svgs = pieces.map((p) => tubeSvg(p, { tone: "mid" }));
  const centerLine = route.map((pt, i) => `${i ? "L" : "M"}${at(pt).join(" ")}`).join("");
  const flowLine = `<path class="iso-line" data-tone="lit" data-flow="true" d="${centerLine}" style="stroke-width: 1.4px;"/>`;

  return `<g class="umbilical-harness" data-cable="umbilical">${svgs.join("")}${flowLine}</g>`;
}

function build() {
  const tableSvg = buildTable();
  const workpieceSvg = buildWorkpiece();
  const pedestalSvg = buildPedestal();
  const armSvg = buildRobotArm();
  const umbilicalSvg = buildUmbilicalHarness();

  const backSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg welder-back" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-table">${tableSvg}</g>
      <g class="layer-workpiece">${workpieceSvg}</g>
      <g class="layer-pedestal">${pedestalSvg}</g>
    </svg>
  `;

  const frontSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg welder-front" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-arm">${armSvg}</g>
      <g class="layer-umbilical">${umbilicalSvg}</g>
    </svg>
  `;

  const corners = `
    <div class="iso-plate-corners" aria-hidden="true">
      <span class="iso-plate-corner" data-corner="fig">Fig 1</span>
      <span class="iso-plate-corner" data-corner="title">Robot Soldador 6-DOF · Celda Orbital</span>
      <span class="iso-plate-corner" data-corner="hint">Mover cursor sobre la probeta</span>
      <span class="iso-plate-corner" data-corner="readout" data-readout>185 A · 23.8 V · AR 12.0 L/min</span>
    </div>
  `;

  const controls = `
    <div class="welder-controls">
      <div class="welder-btn-group">
        <button type="button" class="welder-btn active" data-welder-fire>
          <span class="welder-lamp lit" aria-hidden="true"></span>
          <span>Arco TIG [ Soldar ]</span>
        </button>
        <span class="welder-readout-live" data-live-status>ARCO TIG EN OPERACION</span>
      </div>
      <div>IK Analítica + Shader WebGL Plasma</div>
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
    Celda de soldadura orbital robotizada de 6 grados de libertad. Base de acero rectificado con ranuras en T y regla milimétrica de referencia. El robot cuenta con reductores cicloidales J1 a J6, contrapeso de gas en el brazo y manguera umbilical con pulso continuo de corriente eléctrica. El electrodo de tungsteno al 2% torio genera un arco de plasma concentrado bajo protección de gas argón con chispas balísticas calculadas en WebGL nativo.
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
        <a href="anatomy_scroll.html" class="nav-btn">[ Bio: Scroll ]</a>
        <a href="rays_streaming.html" class="nav-btn">[ Rayos ]</a>
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
            <span class="iso-key"><span class="iso-swatch" data-mark="lit"><path d="M0 5h16"/></span> Arco Plasma &amp; Electrodo</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="raised"><path d="M0 5h16"/></span> Carcasa de Reductores &amp; Vástago</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="flat"><path d="M0 5h16"/></span> Plato de Mesa Rectificada</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="dotted"><path d="M0 5h16"/></span> Manguera Umbilical &amp; Potencia</span>
          </div>
          <span class="iso-caption">${caption}</span>
        </figcaption>
      </figure>
    </main>
  `;

  const CSS = readFileSync(join(HERE, "welder.css"), "utf8");
  const LIVE = readFileSync(join(HERE, "live.js"), "utf8");

  const DATA = {
    W: WIDTH,
    H: HEIGHT,
    camera: glCamera(P),
    robotBase: ROBOT_BASE,
    seamBlock: SEAM_BLOCK
  };

  const fullScript = `
    window.__WELDER_DATA__ = ${JSON.stringify(DATA)};
    ${glScript()}
    ${LIVE}
  `;

  const page = k.pageHtml({
    title: "Linux Groove - Brazo Robotico Soldador Orbital // Skill anatomy",
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
