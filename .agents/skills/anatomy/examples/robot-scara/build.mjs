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
const AZIMUTH = 40;
const ELEVATION = 28;

// Placa Base de Sala Limpia
const PLATE = { x: -150, y: -110, w: 300, d: 220, r: 8 };
const PLATE_H = 14;
const FOOT_H = 6;

// Pedestal de la Columna SCARA
const SCARA_BASE = [-80, -10];
const BASE_R = 34;
const COLUMN_H = 140;

// Platina de Oblea de Silicio de 300 mm
const WAFER_CENTER = [45, 10];
const WAFER_R = 52;
const WAFER_Z = 12;

export const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [SCARA_BASE[0] - BASE_R, SCARA_BASE[1] - BASE_R, COLUMN_H + 30],
    [WAFER_CENTER[0] + WAFER_R + 20, WAFER_CENTER[1] + WAFER_R + 20, 40]
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

// 1. Base y Mesa de Succion al Vacio
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

  // Regla milimétrica en el borde
  const strip = { x: -130, y: PLATE.y + PLATE.d - 14, w: 260, d: 6, r: 1 };
  parts.push(S(k.slabOf(strip, 0, 0.6, P, 2), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.8], P);
  parts.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));

  return parts.join("");
}

// 2. Platina de Oblea de Silicio (Wafer Stage 300mm)
function buildWaferStage() {
  const parts = [];
  const [wx, wy] = WAFER_CENTER;

  // Platina de vacío de aluminio anodizado
  parts.push(S(k.cylinder(wx, wy, WAFER_R + 8, 0, WAFER_Z, P, 48, 1.0), { tone: "mid" }));
  parts.push(L(k.sideArc(wx, wy, WAFER_R + 8, WAFER_Z - 3, P, 36), { tone: "faint" }));

  // Oblea de silicio pulida (Mirror Polish Silicon)
  parts.push(S(k.cylinder(wx, wy, WAFER_R, WAFER_Z, 1.2, P, 48, 0.4), { tone: "lit" }));

  // Patrón fiducial concéntrico de microcircuitos
  for (let r = 14; r <= WAFER_R - 8; r += 10) {
    parts.push(L(k.ring(wx, wy, r, WAFER_Z + 1.2, P, 36), { tone: "faint" }));
  }

  // Muesca de orientación cristalográfica (Notch)
  const notchP = [wx + WAFER_R - 2, wy, WAFER_Z + 1.2];
  parts.push(D([at(notchP)], { size: 0.6 }));

  return parts.join("");
}

// 3. Columna Principal y Husillo Vertical
function buildColumn() {
  const parts = [];
  const [bx, by] = SCARA_BASE;

  // Brida de fijacion de columna
  parts.push(S(k.cylinder(bx, by, BASE_R, 0, 14, P, 40, 1.0), { tone: "mid" }));
  const bDots = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    bDots.push(at([bx + Math.cos(angle) * (BASE_R - 5), by + Math.sin(angle) * (BASE_R - 5), 14]));
  }
  parts.push(D(bDots, { size: 0.55 }));

  // Columna rigida de fundicion
  parts.push(S(k.cylinder(bx, by, BASE_R - 8, 14, COLUMN_H - 14, P, 36), { tone: "mid" }));
  parts.push(L(k.knurl(bx, by, BASE_R - 8, 24, COLUMN_H - 20, 24, P), { tone: "lo" }));

  // Tapa superior de la columna con rodamiento principal
  parts.push(S(k.cylinder(bx, by, BASE_R - 4, COLUMN_H, 12, P, 36, 0.8), { tone: "hi" }));

  return parts.join("");
}

// 4. Brazos Articulados J1 y J2 del SCARA
function buildScaraArms() {
  const [bx, by] = SCARA_BASE;
  const armZ = COLUMN_H + 4;

  // Brazo J1 (Link 1)
  const arm1 = `
    <g class="scara-joint" data-scara-joint="j1">
      <!-- Cuerpo del brazo 1 de aleacion maquinada -->
      ${S(k.slabOf({ x: bx - 14, y: by - 12, w: 90, d: 24, r: 8 }, armZ, 16, P, 4, 1.0), { tone: "hi" })}
      ${L(k.sideSeam({ x: bx - 14, y: by - 12, w: 90, d: 24, r: 8 }, armZ + 8, P, 4), { tone: "faint" })}
      <!-- Articulacion intermedia J2 (Codo planar) -->
      ${S(k.cylinder(bx + 76, by, 18, armZ + 2, 22, P, 28, 0.8), { tone: "mid" })}
      ${D([at([bx + 76, by, armZ + 24])], { size: 0.65 })}

      <!-- Brazo J2 (Link 2 / Antebrazo) -->
      <g class="scara-joint" data-scara-joint="j2">
        ${S(k.slabOf({ x: bx + 70, y: by - 10, w: 85, d: 20, r: 6 }, armZ + 18, 14, P, 3, 0.8), { tone: "hi" })}
        <!-- Eje Z Prismático y Cabezal Láser UV -->
        ${S(k.cylinder(bx + 155, by, 12, armZ + 6, 45, P, 24, 0.8), { tone: "mid" })}
        <!-- Eje estriado de bolas (Ball-spline) pulido -->
        ${S(k.cylinder(bx + 155, by, 5, armZ - 25, 40, P, 18), { tone: "lit" })}
        <!-- Cabezal optico del laser UV 405nm -->
        ${S(k.cylinder(bx + 155, by, 7.5, armZ - 36, 12, P, 20), { tone: "hi" })}
        <!-- Lente focal de cuarzo -->
        ${S(k.cylinder(bx + 155, by, 3.2, armZ - 39, 3, P, 16), { tone: "lit" })}
      </g>
    </g>
  `;

  return arm1;
}

// 5. Cadena Portacables Flexible de 24 Eslabones (Drag Chain)
function buildDragChain() {
  const [bx, by] = SCARA_BASE;
  const startZ = COLUMN_H + 8;
  const links = [];

  const count = 24;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    // Trayectoria curva paramétrica de la cadena
    const lx = bx - 10 + t * 95 + Math.sin(t * Math.PI) * 16;
    const ly = by + 18 + Math.sin(t * Math.PI * 1.2) * 22;
    const lz = startZ + Math.sin(t * Math.PI) * 14;

    const linkSlab = k.slabOf({ x: lx, y: ly, w: 6.5, d: 8, r: 1.5 }, lz, 5.5, P, 1.5, 0.5);
    links.push(`
      <g class="drag-link" data-link="${i}">
        ${S(linkSlab, { tone: i % 2 === 0 ? "hi" : "mid" })}
        ${D([at([lx + 3.2, ly + 4, lz + 5.5])], { size: 0.35 })}
      </g>
    `);
  }

  // Cable interno que pasa por dentro de la cadena con data-flow
  const cableRoute = [
    [bx, by + 16, startZ],
    [bx + 40, by + 34, startZ + 12],
    [bx + 80, by + 24, startZ + 8],
    [bx + 110, by + 12, startZ + 18]
  ];
  const pList = tubePieces(cableRoute, 2.2, P, {
    rings: { count: 16, tone: "lo" }
  });
  const cableSvgs = pList.map((p) => tubeSvg(p, { tone: "mid" }));

  const d = cableRoute.map((pt, idx) => `${idx ? "L" : "M"}${at(pt).join(" ")}`).join("");
  const flowSvg = `<path class="iso-line" data-tone="lit" data-flow="true" d="${d}" style="stroke-width: 1.2px;"/>`;

  return `<g class="scara-drag-chain">${cableSvgs.join("")}${links.join("")}${flowSvg}</g>`;
}

function build() {
  const baseSvg = buildBase();
  const waferSvg = buildWaferStage();
  const columnSvg = buildColumn();
  const armSvg = buildScaraArms();
  const dragSvg = buildDragChain();

  const backSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg scara-back" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-base">${baseSvg}</g>
      <g class="layer-wafer">${waferSvg}</g>
      <g class="layer-column">${columnSvg}</g>
    </svg>
  `;

  const frontSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg scara-front" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-arm">${armSvg}</g>
      <g class="layer-drag">${dragSvg}</g>
    </svg>
  `;

  const corners = `
    <div class="iso-plate-corners" aria-hidden="true">
      <span class="iso-plate-corner" data-corner="fig">Fig 3</span>
      <span class="iso-plate-corner" data-corner="title">Robot SCARA 4-Axis · Sala Limpia Semiconductor</span>
      <span class="iso-plate-corner" data-corner="hint">Mover cursor para guiar cabezal litografico</span>
      <span class="iso-plate-corner" data-corner="readout" data-readout>OBLEA 300mm · LASER 405nm · Z 12.4mm</span>
    </div>
  `;

  const controls = `
    <div class="scara-controls">
      <div class="scara-btn-group">
        <button type="button" class="scara-btn active" data-scara-laser>
          <span class="scara-lamp lit" aria-hidden="true"></span>
          <span>Haz Laser UV 405nm</span>
        </button>
        <span class="scara-readout-live" data-live-status>FOTOLITOGRAFIA UV EN CURSO</span>
      </div>
      <div>Oruga Flexible 24 Eslabones + Ball-Spline Z + WebGL Ray</div>
    </div>
  `;

  const stage = `
    <div class="scara-stage">
      ${backSvg}
      <canvas class="scara-canvas" width="${WIDTH}" height="${HEIGHT}"></canvas>
      ${frontSvg}
    </div>
    ${controls}
  `;

  const caption = `
    Manipulador planar SCARA de 4 ejes para salas limpias de clase ISO 1. Equipado con columna de fundición de alta rigidez, brazos articulados J1 y J2 de aleación ligera y eje prismático Z de bolas estriadas (ball-spline). La alimentación eléctrica y de fibra óptica discurre por una cadena portacables flexible de 24 eslabones articulados. Cabezal de fotolitografía con haz láser UV de 405 nm enfocado sobre una oblea de silicio monocristalino de 300 mm.
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
        <a href="robot_scara_circuit.html" class="nav-btn active">[ Rob: SCARA ]</a>
        <a href="robot_hexapod_walker.html" class="nav-btn">[ Rob: Hexapodo ]</a>
        <a href="robot_server_gantry.html" class="nav-btn">[ Rob: Portico ]</a>
        <a href="machine_rocket.html" class="nav-btn">[ Maq: Cohete ]</a>
        <a href="anatomy_scroll.html" class="nav-btn">[ Bio: Scroll ]</a>
        <a href="rays_streaming.html" class="nav-btn">[ Rayos ]</a>
      </nav>
    </header>

    <main class="iso-page">
      <figure class="iso-figure scara-figure">
        <div class="iso-plate">
          ${corners}
          ${stage}
        </div>
        <figcaption class="iso-legend">
          <div class="iso-keys">
            <span class="iso-key"><span class="iso-swatch" data-mark="lit"><path d="M0 5h16"/></span> Oblea de Silicio 300mm &amp; Laser UV</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="raised"><path d="M0 5h16"/></span> Eslabones SCARA &amp; Ball-Spline Z</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="flat"><path d="M0 5h16"/></span> Platina de Vacio &amp; Base</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="dotted"><path d="M0 5h16"/></span> Cadena Portacables (Drag Chain)</span>
          </div>
          <span class="iso-caption">${caption}</span>
        </figcaption>
      </figure>
    </main>
  `;

  const CSS = readFileSync(join(HERE, "scara.css"), "utf8");
  const LIVE = readFileSync(join(HERE, "live.js"), "utf8");

  const DATA = {
    W: WIDTH,
    H: HEIGHT,
    camera: glCamera(P)
  };

  const fullScript = `
    window.__SCARA_DATA__ = ${JSON.stringify(DATA)};
    ${glScript()}
    ${LIVE}
  `;

  const page = k.pageHtml({
    title: "Linux Groove - Robot SCARA Fotolitografia // Skill create-anatomy",
    theme,
    body: `<style>${CSS}</style>${figure}`,
    script: fullScript,
    width: 980
  });

  const outLocal = join(HERE, "robot-scara.html");
  writeFileSync(outLocal, page);

  const outPublic = "/Volumes/HDEXTERNO/linux_groove/pruebas_web/public/robot_scara_circuit.html";
  writeFileSync(outPublic, page);

  console.log(`Compilacion exitosa con skill create-anatomy:`);
  console.log(`- Local:  ${outLocal} (${(page.length / 1024).toFixed(1)} KB)`);
  console.log(`- Public: ${outPublic}`);
}

build();
