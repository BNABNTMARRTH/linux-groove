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

// Placa Base de Granito para Sala Limpia
const PLATE = { x: -120, y: -90, w: 240, d: 180, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

// Columna Principal SCARA
const COLUMN_CENTER = [-55, -10];
const COLUMN_R = 24;
const COLUMN_H = 72;

// Platina de Oblea de Silicio (300 mm)
const WAFER_CENTER = [32, 12];
const WAFER_R = 46;
const WAFER_Z = 12;

export const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [COLUMN_CENTER[0] - COLUMN_R - 15, COLUMN_CENTER[1] - COLUMN_R - 15, COLUMN_H + 55],
    [WAFER_CENTER[0] + WAFER_R + 20, WAFER_CENTER[1] + WAFER_R + 20, COLUMN_H + 55]
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

// 1. Placa de Granito Negro con Ranuras T y Regla Milimetrica
function buildGranitePlate() {
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

  for (const y of [-62, -26, 48]) {
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

// 2. Platina de Vacio y Oblea de Silicio de 300 mm con Reticula Fotolitografica
function buildWaferStage() {
  const parts = [];
  const [wx, wy] = WAFER_CENTER;

  parts.push(S(k.cylinder(wx, wy, WAFER_R + 5, 0, WAFER_Z, P, 48, 1.2), { tone: "mid" }));
  parts.push(L(k.ring(wx, wy, WAFER_R + 2, WAFER_Z, P, 40), { tone: "lo" }));

  parts.push(S(k.cylinder(wx, wy, WAFER_R, WAFER_Z, 1.4, P, 48, 0.4), { tone: "hi" }));
  parts.push(L(k.ring(wx, wy, WAFER_R * 0.75, WAFER_Z + 1.4, P, 36), { tone: "faint" }));
  parts.push(L(k.ring(wx, wy, WAFER_R * 0.50, WAFER_Z + 1.4, P, 32), { tone: "faint" }));
  parts.push(L(k.ring(wx, wy, WAFER_R * 0.25, WAFER_Z + 1.4, P, 24), { tone: "faint" }));

  const dieDots = [];
  for (let dx = -30; dx <= 30; dx += 12) {
    for (let dy = -30; dy <= 30; dy += 12) {
      if (Math.hypot(dx, dy) < WAFER_R - 8) {
        dieDots.push(at([wx + dx, wy + dy, WAFER_Z + 1.4]));
      }
    }
  }
  parts.push(D(dieDots, { size: 0.4 }));

  return parts.join("");
}

// 3. Columna Z Estatorica con Guias Lineales y Brida de Base
function buildColumnStator() {
  const parts = [];
  const [cx, cy] = COLUMN_CENTER;

  parts.push(S(k.cylinder(cx, cy, COLUMN_R + 7, 0, 10, P, 40, 1.2), { tone: "mid" }));
  const boltR = COLUMN_R + 3.5;
  const boltDots = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    boltDots.push(at([cx + Math.cos(angle) * boltR, cy + Math.sin(angle) * boltR, 10]));
  }
  parts.push(D(boltDots, { size: 0.55 }));

  parts.push(S(k.cylinder(cx, cy, COLUMN_R, 10, COLUMN_H - 10, P, 36, 0.8), { tone: "hi" }));
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const px = cx + Math.cos(angle) * (COLUMN_R - 0.5);
    const py = cy + Math.sin(angle) * (COLUMN_R - 0.5);
    parts.push(L(k.segment([px, py, 14], [px, py, COLUMN_H - 6], P), { tone: "faint" }));
  }

  parts.push(S(k.cylinder(cx, cy, COLUMN_R + 2, COLUMN_H - 4, 6, P, 36, 0.8), { tone: "mid" }));
  parts.push(L(k.knurl(cx, cy, COLUMN_R + 2, COLUMN_H - 3, COLUMN_H + 1, 32, P), { tone: "lo" }));

  return parts.join("");
}

/**
 * Constructor compartido (build.mjs + live.js) del Manipulador SCARA 4-Axis
 * Incluye Brazo J1, Brazo J2 en voladizo, Husillo Ball-Spline Z, Cabezal Laser UV y Cadena Portacables de 24 eslabones
 */
function renderScaraMechanism(angle1, angle2, zTip, laserOn, P, k, G, cfg) {
  const items = [];
  const put = (pos3, svg, bias = 0) => items.push({ depth: k.depthOf(pos3, P) + bias, svg });

  const colXY = cfg.COLUMN_CENTER;
  const colH = cfg.COLUMN_H;
  const waferZ = cfg.WAFER_Z;

  const zArm1 = colH + 8;
  const zArm2 = zArm1 + 14;
  const len1 = 56;
  const len2 = 48;

  const j0 = [colXY[0], colXY[1], zArm1];
  const dir1 = [Math.cos(angle1), Math.sin(angle1), 0];
  const norm1 = [-Math.sin(angle1), Math.cos(angle1), 0];
  const j1 = [j0[0] + dir1[0] * len1, j0[1] + dir1[1] * len1, zArm1];

  const totalAngle = angle1 + angle2;
  const dir2 = [Math.cos(totalAngle), Math.sin(totalAngle), 0];
  const norm2 = [-Math.sin(totalAngle), Math.cos(totalAngle), 0];
  const j2 = [j1[0] + dir2[0] * len2, j1[1] + dir2[1] * len2, zArm2];

  // 1. Brazo Primario J1 (Viga voladiza de estadio extruida verticalmente)
  const F1 = { o: j0, a: [0, 0, 1], u: dir1, v: norm1 };
  const arm1Solid = G.prismOf(F1, G.stadium(16, 13.5, len1, 22), -6, 6, P);
  const arm1Cover = G.prismOf(
    { o: [j0[0] + dir1[0] * 8, j0[1] + dir1[1] * 8, zArm1], a: [0, 0, 1], u: dir1, v: norm1 },
    G.stadium(7.5, 6.5, len1 - 16, 16),
    6,
    7.8,
    P
  );
  const motorJ1Cap =
    k.solidSvg(k.cylinder(j0[0], j0[1], 14, zArm1 + 6, 12, P, 28, 0.8), { tone: "mid" }) +
    k.lineSvg(k.knurl(j0[0], j0[1], 14, zArm1 + 8, zArm1 + 16, 24, P), { tone: "lo" }) +
    k.dotsSvg([k.iso([j0[0], j0[1], zArm1 + 18], P)], { size: 0.65 });

  put(
    G.lerp3(j0, j1, 0.45),
    k.solidSvg(arm1Solid, { tone: "hi" }) +
      k.solidSvg(arm1Cover, { tone: "mid" }) +
      motorJ1Cap
  );

  // 2. Articulacion Intermedia J2 (Codo de acoplamiento entre Brazo 1 y Brazo 2)
  const elbowCollar =
    k.solidSvg(k.cylinder(j1[0], j1[1], 13.5, zArm1 + 5, 6, P, 26, 0.6), { tone: "mid" }) +
    k.lineSvg(k.ring(j1[0], j1[1], 10, zArm1 + 8, P, 20), { tone: "lo" });
  put([j1[0], j1[1], zArm1 + 8], elbowCollar, 0.2);

  // 3. Brazo Secundario J2 (Antebrazo superior en voladizo)
  const F2 = { o: [j1[0], j1[1], zArm2], a: [0, 0, 1], u: dir2, v: norm2 };
  const arm2Solid = G.prismOf(F2, G.stadium(13.5, 11.5, len2, 22), -5.5, 5.5, P);
  const arm2Cap =
    k.solidSvg(k.cylinder(j1[0], j1[1], 10, zArm2 + 5.5, 7, P, 24, 0.6), { tone: "mid" }) +
    k.dotsSvg([k.iso([j1[0], j1[1], zArm2 + 12.5], P)], { size: 0.55 });

  put(
    G.lerp3([j1[0], j1[1], zArm2], j2, 0.45),
    k.solidSvg(arm2Solid, { tone: "hi" }) + arm2Cap,
    0.5
  );

  // 4. Husillo Estriado Ball-Spline Eje Z y Cabezal Optico UV 405nm
  const quillTopZ = zArm2 + 26;
  const quillShaftLen = Math.max(10, quillTopZ - (zTip + 8));

  const quillSvg =
    // Husillo estriado inferior (entre el cabezal y el brazo J2)
    k.solidSvg(k.cylinder(j2[0], j2[1], 3.8, zTip + 8, (zArm2 - 5.5) - (zTip + 8), P, 18), { tone: "mid" }) +
    k.lineSvg(k.segment([j2[0] + 3.6, j2[1], zTip + 9], [j2[0] + 3.6, j2[1], zArm2 - 6], P), { tone: "lo" }) +
    // Lente focal y tobera optica UV 405nm
    k.solidSvg(k.cylinder(j2[0], j2[1], 6.8, zTip, 8, P, 24, 0.6), { tone: "hi", lit: true }) +
    k.lineSvg(k.sideArc(j2[0], j2[1], 6.8, zTip + 4, P, 20), { tone: "lo" }) +
    // Carcasa del servomotor Z-theta sobre la punta del brazo J2
    k.solidSvg(k.cylinder(j2[0], j2[1], 11.5, zArm2 - 5.5, 13, P, 26, 0.8), { tone: "hi" }) +
    k.lineSvg(k.knurl(j2[0], j2[1], 11.5, zArm2 - 3, zArm2 + 5, 22, P), { tone: "lo" }) +
    // Vastago superior del ball-spline sobresaliendo por arriba
    k.solidSvg(k.cylinder(j2[0], j2[1], 3.8, zArm2 + 7.5, quillTopZ - (zArm2 + 7.5), P, 18), { tone: "mid" }) +
    k.solidSvg(k.cylinder(j2[0], j2[1], 5.5, quillTopZ, 4, P, 20, 0.5), { tone: "hi", lit: true }) +
    k.dotsSvg([k.iso([j2[0], j2[1], quillTopZ + 4], P)], { size: 0.55 });

  put([j2[0], j2[1], zArm2], quillSvg, 1.2);

  // 5. Cadena Portacables Articulada Flexible (24 Eslabones Solidos 3D + Cable de Flujo)
  const chainStart = [colXY[0] + 10, colXY[1] - 12, zArm1 + 17];
  const chainEnd = [
    j1[0] + dir2[0] * 14 - norm2[0] * 4,
    j1[1] + dir2[1] * 14 - norm2[1] * 4,
    zArm2 + 7
  ];
  const numLinks = 20;
  const chainPts2D = [];

  for (let i = 0; i < numLinks; i++) {
    const t = i / (numLinks - 1);
    const arc = Math.sin(t * Math.PI);
    const lx = chainStart[0] + t * (chainEnd[0] - chainStart[0]) - norm1[0] * arc * 14;
    const ly = chainStart[1] + t * (chainEnd[1] - chainStart[1]) - norm1[1] * arc * 14;
    const lz = chainStart[2] + t * (chainEnd[2] - chainStart[2]) + arc * 12;

    chainPts2D.push(k.iso([lx, ly, lz + 1.5], P));

    const linkPlan = { x: lx - 2.4, y: ly - 2.4, w: 4.8, d: 4.8, r: 0.8 };
    const linkSvg =
      k.solidSvg(k.slabOf(linkPlan, lz, 2.8, P, 2, 0.4), { tone: i % 2 === 0 ? "mid" : "hi" }) +
      k.dotsSvg([k.iso([lx, ly, lz + 2.8], P)], { size: 0.35 });
    put([lx, ly, lz], linkSvg, 2.0);
  }

  // Cable optico de potencia a lo largo de la cadena portacables
  const cFrom = chainPts2D[0];
  const cTo = chainPts2D[chainPts2D.length - 1];
  const cVia = chainPts2D.slice(1, -1);
  put(
    chainEnd,
    k.wireSvg(cFrom, cTo, { via: cVia, tone: "lit", flow: true }),
    2.8
  );

  // 6. Haz Laser UV de 405nm e Impacto Fotolitografico sobre la Oblea
  const hitPos3 = [j2[0], j2[1], waferZ + 1.4];
  const ptLens2D = k.iso([j2[0], j2[1], zTip], P);
  const ptHit2D = k.iso(hitPos3, P);

  if (laserOn) {
    const laserSvg =
      k.wireSvg(ptLens2D, ptHit2D, { tone: "lit", flow: true }) +
      k.lineSvg(k.ring(j2[0], j2[1], 5.0, waferZ + 1.4, P, 24), { tone: "hi", lit: true }) +
      k.lineSvg(k.ring(j2[0], j2[1], 2.4, waferZ + 1.4, P, 16), { tone: "hi", lit: true }) +
      k.dotsSvg([ptHit2D], { size: 0.85 });
    put(hitPos3, laserSvg, 3.2);
  }

  items.sort((a, b) => a.depth - b.depth);
  return {
    svg: items.map(it => it.svg).join(""),
    ptHit2D,
    j2
  };
}

function build() {
  const plateSvg = buildGranitePlate();
  const waferSvg = buildWaferStage();
  const columnSvg = buildColumnStator();

  const CFG = {
    COLUMN_CENTER,
    COLUMN_H,
    WAFER_CENTER,
    WAFER_R,
    WAFER_Z
  };

  // Pre-renderizado estatico completo en t=0 sobre el centro de la oblea
  const initialScara = renderScaraMechanism(0.42, -0.58, WAFER_Z + 16, true, P, k, G, CFG);

  const backSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg scara-back" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-plate">${plateSvg}</g>
      <g class="layer-wafer">${waferSvg}</g>
      <g class="layer-column">${columnSvg}</g>
    </svg>
  `;

  const frontSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg scara-front" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-kinematics" id="scaraKinematicsGroup">${initialScara.svg}</g>
    </svg>
  `;

  const corners = `
    <div class="iso-plate-corners" aria-hidden="true">
      <span class="iso-plate-corner" data-corner="fig">Fig 3</span>
      <span class="iso-plate-corner" data-corner="title">Manipulador SCARA 4-Axis · Sala Limpia Semiconductor</span>
      <span class="iso-plate-corner" data-corner="hint">Mover cursor para guiar cabezal litografico</span>
      <span class="iso-plate-corner" data-corner="readout" data-readout>OBLEA 300mm · LASER 405nm · Z 16.0mm · TCP [32.0, 12.0]</span>
    </div>
  `;

  const controls = `
    <div class="scara-controls">
      <div class="scara-btn-group">
        <button type="button" class="scara-btn active" data-laser-toggle>
          <span class="scara-lamp lit" aria-hidden="true"></span>
          <span>Haz Laser UV 405nm</span>
        </button>
        <button type="button" class="scara-btn active" data-scan-mode>
          <span>Escaneo Raster Oblea</span>
        </button>
        <span class="scara-readout-live" data-live-status>FOTOLITOGRAFIA EN CURSO</span>
      </div>
      <div>Oruga Flexible 20 Eslabones + Ball-Spline Z + WebGL Ray</div>
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
    Manipulador planar SCARA de cuatro ejes para inspeccion y fotolitografia de semiconductores. Columna central Z acanalada sobre bloque de granito negro rectificado, doble brazo en voladizo con articulacion intermedia de alta precision, husillo estriado ball-spline con cabezal optico UV y cadena portacables articulada flexible que acompana suavemente la traslacion planar.
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
        <a href="robot_scara_circuit.html" class="nav-btn active">[ Rob: SCARA ]</a>
        <a href="robot_hexapod_walker.html" class="nav-btn">[ Rob: Hexapodo ]</a>
        <a href="robot_server_gantry.html" class="nav-btn">[ Rob: Portico ]</a>
        <a href="machine_rocket.html" class="nav-btn">[ Maq: Cohete ]</a>
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
            <span class="iso-key"><span class="iso-swatch" data-mark="lit"><path d="M0 5h16"/></span> Haz Laser UV &amp; Cabezal</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="raised"><path d="M0 5h16"/></span> Brazos J1/J2 &amp; Ball-Spline Z</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="flat"><path d="M0 5h16"/></span> Platina de Vacio &amp; Granito</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="dotted"><path d="M0 5h16"/></span> Cadena Portacables Flexible</span>
          </div>
          <span class="iso-caption">${caption}</span>
        </figcaption>
      </figure>
    </main>
  `;

  const CSS = readFileSync(join(HERE, "scara.css"), "utf8");
  const LIVE = readFileSync(join(HERE, "live.js"), "utf8");
  const LATHE_RAW = readFileSync(join(HERE, "../../kit/lathe.mjs"), "utf8")
    .replace(/^import\s+.*$/gm, "")
    .replace(/^export\s+/gm, "");

  const DATA = {
    W: WIDTH,
    H: HEIGHT,
    P,
    COLUMN_CENTER,
    COLUMN_H,
    WAFER_CENTER,
    WAFER_R,
    WAFER_Z,
    glCamera: glCamera(P)
  };

  const fullScript = `
    window.__SCARA_DATA__ = ${JSON.stringify(DATA)};
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
    ${renderScaraMechanism.toString()}
    ${glScript()}
    ${LIVE}
  `;

  const page = k.pageHtml({
    title: "Linux Groove - Manipulador SCARA 4-Axis // Skill anatomy",
    theme,
    body: `<style>${CSS}</style>${figure}`,
    script: fullScript,
    width: 860
  });

  const outLocal = join(HERE, "robot-scara.html");
  writeFileSync(outLocal, page);

  const outPublic = "/Volumes/HDEXTERNO/linux_groove/pruebas_web/public/robot_scara_circuit.html";
  writeFileSync(outPublic, page);

  console.log(`Compilacion exitosa con skill anatomy: ${outPublic}`);
}

build();
