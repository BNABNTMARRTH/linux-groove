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

// Placa Base de Sala de Servidores
const PLATE = { x: -120, y: -90, w: 240, d: 180, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

// Dimensiones de la Estructura del Portico
const FRAME_X = [-86, 86];
const FRAME_Y = [-64, 64];
const COLUMN_H = 112;

export const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [FRAME_X[0] - 14, FRAME_Y[0] - 14, COLUMN_H + 34],
    [FRAME_X[1] + 14, FRAME_Y[1] + 14, COLUMN_H + 34]
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

// 1. Placa Base con Ranuras y Regla Milimetrica
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

  // Rejillas de ventilacion del pasillo frio
  for (const y of [-38, -12, 14, 40]) {
    const vent = { x: -24, y, w: 48, d: 6, r: 1 };
    parts.push(S(k.slabOf(vent, -0.8, 0.8, P, 2), { tone: "lo", crease: "none" }));
    parts.push(L(k.planOutline(vent, 0, P), { tone: "faint" }));
  }

  const ruler = { x: -105, y: PLATE.y + PLATE.d - 13, w: 210, d: 6, r: 1 };
  parts.push(S(k.slabOf(ruler, 0, 0.8, P, 2), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(ruler.x + 4, ruler.x + ruler.w - 4, 4, 5, ruler.y + 1, 0.8, [2, 3.8], P);
  parts.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));

  return parts.join("");
}

// 2. 4 Racks de Servidores en el Pasillo Central (con radio r definido y ordenados por profundidad)
function buildServerRacks() {
  const items = [];

  const rackConfigs = [
    { x: -64, y: -42, w: 28, d: 36, r: 2.5, h: 68 },
    { x: -64, y: 6,   w: 28, d: 36, r: 2.5, h: 68 },
    { x: 36,  y: -42, w: 28, d: 36, r: 2.5, h: 68 },
    { x: 36,  y: 6,   w: 28, d: 36, r: 2.5, h: 68 }
  ];

  rackConfigs.forEach((rack) => {
    const parts = [];
    // Cuerpo solido 3D del gabinete de servidores
    parts.push(S(k.slabOf(rack, 0, rack.h, P, 4, 1.0), { tone: "mid" }));
    // Tapa superior ventilada del gabinete
    const topVent = k.insetPlan(rack, 4);
    parts.push(S(k.slabOf(topVent, rack.h, 1.5, P, 2, 0.4), { tone: "hi" }));
    parts.push(L(k.sideSeam(rack, rack.h - 8, P, 3), { tone: "lo" }));

    // Unidades de Servidor (1U Slots) y LEDs en la cara frontal visible (+Y)
    const frontFaceY = rack.y + rack.d;
    const ledDots = [];
    for (let u = 8; u < rack.h - 6; u += 7) {
      const pLeft = [rack.x + 3, frontFaceY, u];
      const pRight = [rack.x + rack.w - 3, frontFaceY, u];
      parts.push(L(k.segment(pLeft, pRight, P), { tone: "lo" }));
      ledDots.push(at([rack.x + 5.5, frontFaceY, u + 2.5]));
      ledDots.push(at([rack.x + 9.0, frontFaceY, u + 2.5]));
    }
    parts.push(D(ledDots, { size: 0.42 }));

    const center3 = [rack.x + rack.w / 2, rack.y + rack.d / 2, rack.h / 2];
    items.push({ depth: k.depthOf(center3, P), svg: parts.join("") });
  });

  items.sort((a, b) => a.depth - b.depth);
  return items.map(it => it.svg).join("");
}

// 3. Columnas Estructurales de Acero y Vigas Carrileras Superiores (Runway I-Beams)
function buildGantryStructure() {
  const items = [];

  const colCoords = [
    [FRAME_X[0], FRAME_Y[0]],
    [FRAME_X[0], FRAME_Y[1]],
    [FRAME_X[1], FRAME_Y[0]],
    [FRAME_X[1], FRAME_Y[1]]
  ];

  colCoords.forEach(([cx, cy]) => {
    const footPlan = { x: cx - 7, y: cy - 7, w: 14, d: 14, r: 1.5 };
    const colPlan = { x: cx - 4, y: cy - 4, w: 8, d: 8, r: 1.2 };
    const capPlan = { x: cx - 5.5, y: cy - 5.5, w: 11, d: 11, r: 1.5 };

    const svg =
      S(k.slabOf(footPlan, 0, 4, P, 2), { tone: "mid" }) +
      D(k.corners(footPlan, 3).map(([px, py]) => at([px, py, 4])), { size: 0.45 }) +
      S(k.slabOf(colPlan, 4, COLUMN_H - 4, P, 2), { tone: "hi" }) +
      S(k.slabOf(capPlan, COLUMN_H - 3, 3, P, 2), { tone: "mid" });

    items.push({ depth: k.depthOf([cx, cy, COLUMN_H * 0.5], P), svg });
  });

  // 2 Vigas longitudinales carrileras (X-Rails) en Y min y Y max
  [FRAME_Y[0], FRAME_Y[1]].forEach(yRail => {
    const beamPlan = {
      x: FRAME_X[0] - 6,
      y: yRail - 4.5,
      w: (FRAME_X[1] - FRAME_X[0]) + 12,
      d: 9,
      r: 1.2
    };
    const railPlan = {
      x: FRAME_X[0] - 4,
      y: yRail - 1.5,
      w: (FRAME_X[1] - FRAME_X[0]) + 8,
      d: 3,
      r: 0.6
    };
    const svg =
      S(k.slabOf(beamPlan, COLUMN_H, 7, P, 2, 0.8), { tone: "mid" }) +
      S(k.slabOf(railPlan, COLUMN_H + 7, 2, P, 1, 0.4), { tone: "hi" });
    items.push({ depth: k.depthOf([0, yRail, COLUMN_H + 4], P), svg });
  });

  items.sort((a, b) => a.depth - b.depth);
  return items.map(it => it.svg).join("");
}

/**
 * Constructor compartido (build.mjs + live.js) del Portico Cartesiano X/Y/Z
 * Construye Testeros X con ruedas, Puente Movil X, Carro Transversal Y, Mastil Telescopico Z,
 * Pinza Extractora con Servidor Blade 1U y Feston Catenario de 4 lazos
 */
function renderGantryMechanism(posX, posY, mastBottomZ, bladeSlide, P, k, G, cfg) {
  const items = [];
  const put = (pos3, svg, bias = 0) => items.push({ depth: k.depthOf(pos3, P) + bias, svg });

  const frameX = cfg.FRAME_X;
  const frameY = cfg.FRAME_Y;
  const colH = cfg.COLUMN_H;
  const bridgeZ = colH + 9;
  const yMin = frameY[0];
  const yMax = frameY[1];

  // 1. Testeros Motorizados con Ruedas en ambos extremos del Puente X
  [yMin, yMax].forEach(yPos => {
    const truckPlan = { x: posX - 15, y: yPos - 5.5, w: 30, d: 11, r: 1.8 };
    const wLeft = k.iso([posX - 10, yPos, bridgeZ + 2], P);
    const wRight = k.iso([posX + 10, yPos, bridgeZ + 2], P);
    const truckSvg =
      k.solidSvg(k.slabOf(truckPlan, bridgeZ - 1, 6.5, P, 2, 0.8), { tone: "mid" }) +
      k.dotsSvg([wLeft, wRight], { size: 0.65 });
    put([posX, yPos, bridgeZ + 2], truckSvg);
  });

  // 2. Viga Cajon del Puente Transversal Eje X
  const bridgePlan = {
    x: posX - 7.5,
    y: yMin - 4,
    w: 15,
    d: (yMax - yMin) + 8,
    r: 1.8
  };
  const bridgeSvg =
    k.solidSvg(k.slabOf(bridgePlan, bridgeZ + 5.5, 8.5, P, 3, 1.0), { tone: "hi" }) +
    k.lineSvg(k.segment([posX - 4, yMin, bridgeZ + 14], [posX - 4, yMax, bridgeZ + 14], P), { tone: "lo" }) +
    k.lineSvg(k.segment([posX + 4, yMin, bridgeZ + 14], [posX + 4, yMax, bridgeZ + 14], P), { tone: "lo" });
  put([posX, 0, bridgeZ + 9], bridgeSvg, 0.2);

  // 3. Carro Transversal Eje Y con Servomotor de Elevacion
  const trolleyZ = bridgeZ + 14;
  const trolleyPlan = { x: posX - 11, y: posY - 11, w: 22, d: 22, r: 2.5 };
  const trolleySvg =
    k.solidSvg(k.slabOf(trolleyPlan, trolleyZ, 7.5, P, 3, 0.9), { tone: "hi" }) +
    k.solidSvg(k.cylinder(posX, posY, 6.8, trolleyZ + 7.5, 6.5, P, 24, 0.7), { tone: "hi", lit: true }) +
    k.lineSvg(k.knurl(posX, posY, 6.8, trolleyZ + 9, trolleyZ + 13, 20, P), { tone: "lo" }) +
    k.dotsSvg([k.iso([posX, posY, trolleyZ + 14], P)], { size: 0.6 });
  put([posX, posY, trolleyZ + 5], trolleySvg, 1.2);

  // 4. Mastil Telescopico Eje Z, Pinza Extractora y Servidor Blade 1U
  const outerMastTop = bridgeZ + 5.5;
  const outerMastBot = outerMastTop - 32;
  const outerMastPlan = { x: posX - 4.5, y: posY - 4.5, w: 9, d: 9, r: 1.2 };
  const innerMastPlan = { x: posX - 2.8, y: posY - 2.8, w: 5.6, d: 5.6, r: 0.8 };
  const gripperPlan = { x: posX - 9.5, y: posY - 8.5, w: 19, d: 17, r: 2.0 };
  const bladePlan = { x: posX - 12 + bladeSlide, y: posY - 6.5, w: 24, d: 13, r: 1.2 };

  const innerLen = Math.max(8, outerMastBot - (mastBottomZ + 7));
  const mastAndGripperSvg =
    // Tubo guia exterior
    k.solidSvg(k.slabOf(outerMastPlan, outerMastBot, 32, P, 2, 0.6), { tone: "mid" }) +
    // Columna telescopica interior Z
    k.solidSvg(k.slabOf(innerMastPlan, mastBottomZ + 7, innerLen, P, 2, 0.5), { tone: "hi" }) +
    // Pinza robotica extractora iluminada
    k.solidSvg(k.slabOf(gripperPlan, mastBottomZ, 7, P, 2, 0.8), { tone: "hi", lit: true }) +
    // Servidor Blade 1U extraido
    k.solidSvg(k.slabOf(bladePlan, mastBottomZ - 3.8, 3.8, P, 1, 0.5), { tone: "mid" }) +
    k.dotsSvg([
      k.iso([bladePlan.x + 3, bladePlan.y + bladePlan.d, mastBottomZ - 1.8], P),
      k.iso([bladePlan.x + 6, bladePlan.y + bladePlan.d, mastBottomZ - 1.8], P)
    ], { size: 0.45 });

  put([posX, posY, (outerMastTop + mastBottomZ) * 0.5], mastAndGripperSvg, 0.8);

  // 5. Feston Catenario de Fibra Optica y Potencia (4 Lazos con Carritos Portacables)
  const festoonStartX = frameX[0] + 4;
  const festoonEndX = posX - 6;
  const festoonY = yMax + 4.5;
  const festoonZ = colH + 8;
  const numLoops = 4;

  const wirePts2D = [k.iso([festoonStartX, festoonY, festoonZ], P)];

  for (let i = 0; i < numLoops; i++) {
    const t0 = i / numLoops;
    const t1 = (i + 1) / numLoops;
    const x0 = festoonStartX + t0 * (festoonEndX - festoonStartX);
    const x1 = festoonStartX + t1 * (festoonEndX - festoonStartX);
    const xMid = (x0 + x1) * 0.5;
    const span = Math.max(8, Math.abs(x1 - x0));
    const sag = Math.max(7, 14 - span * 0.12);

    const pQ1 = k.iso([x0 + (xMid - x0) * 0.5, festoonY, festoonZ - sag * 0.65], P);
    const pMid = k.iso([xMid, festoonY, festoonZ - sag], P);
    const pQ2 = k.iso([xMid + (x1 - xMid) * 0.5, festoonY, festoonZ - sag * 0.65], P);
    const pEnd = k.iso([x1, festoonY, festoonZ], P);

    wirePts2D.push(pQ1, pMid, pQ2, pEnd);

    // Carrito portacables solido en cada nodo del feston
    const rollerPlan = { x: x1 - 2.2, y: festoonY - 2.2, w: 4.4, d: 4.4, r: 0.8 };
    put(
      [x1, festoonY, festoonZ],
      k.solidSvg(k.slabOf(rollerPlan, festoonZ - 1, 3.2, P, 1, 0.4), { tone: "hi" }) +
        k.dotsSvg([k.iso([x1, festoonY, festoonZ + 2.2], P)], { size: 0.4 }),
      2.2
    );
  }

  const wFrom = wirePts2D[0];
  const wTo = wirePts2D[wirePts2D.length - 1];
  const wVia = wirePts2D.slice(1, -1);
  put(
    [posX * 0.5, festoonY, festoonZ],
    k.wireSvg(wFrom, wTo, { via: wVia, tone: "lit", flow: true }),
    2.6
  );

  items.sort((a, b) => a.depth - b.depth);
  return {
    svg: items.map(it => it.svg).join("")
  };
}

function build() {
  const plateSvg = buildBasePlate();
  const racksSvg = buildServerRacks();
  const structureSvg = buildGantryStructure();

  const CFG = {
    FRAME_X,
    FRAME_Y,
    COLUMN_H
  };

  // Pre-renderizado estatico completo en t=0 (Puente X, Carro Y, Mastil Z, Pinza y Feston visibles al instante)
  const initialGantry = renderGantryMechanism(12, 8, 44, 3.0, P, k, G, CFG);

  const backSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg gantry-back" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-plate">${plateSvg}</g>
      <g class="layer-racks">${racksSvg}</g>
      <g class="layer-structure">${structureSvg}</g>
    </svg>
  `;

  const frontSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" class="iso-svg gantry-front" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <g class="layer-kinematics" id="gantryKinematicsGroup">${initialGantry.svg}</g>
    </svg>
  `;

  const corners = `
    <div class="iso-plate-corners" aria-hidden="true">
      <span class="iso-plate-corner" data-corner="fig">Fig 5</span>
      <span class="iso-plate-corner" data-corner="title">Grua Portico Cartesiana X/Y/Z · Data Center Automation</span>
      <span class="iso-plate-corner" data-corner="hint">Mover cursor para dirigir puente y carro cartesiano</span>
      <span class="iso-plate-corner" data-corner="readout" data-readout>PATRULLAJE AUTONOMO · CARRO [0.24m, 0.16m] · MASTIL Z 44.0mm</span>
    </div>
  `;

  const controls = `
    <div class="gantry-controls">
      <div class="gantry-btn-group">
        <button type="button" class="gantry-btn active" data-patrol-toggle>
          <span>Pausar / Reanudar Patrullaje</span>
        </button>
        <button type="button" class="gantry-btn active" data-mist-toggle>
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
    Robot portico cartesiano industrial suspendido sobre pasillo frio de centro de datos. Bastidor estructural de vigas laminadas sobre cuatro columnas, puente transversal X motorizado con testeros de rodillos, carro Y de traslacion lateral, mastil vertical Z con pinza extractora de servidores blade y feston catenario de cable plano que acompana el recorrido.
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
            <span class="iso-key"><span class="iso-swatch" data-mark="lit"><path d="M0 5h16"/></span> Carro Y &amp; Pinza de Servidores</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="raised"><path d="M0 5h16"/></span> Puente X &amp; Testeros con Ruedas</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="flat"><path d="M0 5h16"/></span> Racks de Servidores &amp; Suelo</span>
            <span class="iso-key"><span class="iso-swatch" data-mark="dotted"><path d="M0 5h16"/></span> Feston Catenario &amp; Niebla LN2</span>
          </div>
          <span class="iso-caption">${caption}</span>
        </figcaption>
      </figure>
    </main>
  `;

  const CSS = readFileSync(join(HERE, "gantry.css"), "utf8");
  const LIVE = readFileSync(join(HERE, "live.js"), "utf8");
  const LATHE_RAW = readFileSync(join(HERE, "../../kit/lathe.mjs"), "utf8")
    .replace(/^import\s+.*$/gm, "")
    .replace(/^export\s+/gm, "");

  const DATA = {
    W: WIDTH,
    H: HEIGHT,
    P,
    FRAME_X,
    FRAME_Y,
    COLUMN_H,
    glCamera: glCamera(P)
  };

  const fullScript = `
    window.__GANTRY_DATA__ = ${JSON.stringify(DATA)};
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
    ${renderGantryMechanism.toString()}
    ${glScript()}
    ${LIVE}
  `;

  const page = k.pageHtml({
    title: "Linux Groove - Grua Portico Cartesiana X/Y/Z // Skill anatomy",
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
