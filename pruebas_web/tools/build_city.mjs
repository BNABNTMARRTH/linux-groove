// ==========================================================================
// LINUX GROOVE - DIORAMA URBANO EN MINIATURA ISOMETRICO (SKILL ANATOMY)
// build_city.mjs: Maqueta 3D con nubes flotantes, lluvia con ondas de impacto
// individuales por gota y formato apaisado que cabe 100% en el viewport
// ==========================================================================

import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(".agents/skills/anatomy");
const k = await import(join(ROOT, "kit/iso-kit.mjs"));
const G = await import(join(ROOT, "kit/lathe.mjs"));
const { glCamera } = await import(join(ROOT, "kit/gl.mjs"));
const { kitScript, glScript } = await import(join(ROOT, "scripts/inline-kit.mjs"));

// 1. PROPORCIONES HORIZONTALES (WIDESCREEN 16:9 / 16:10)
const W = 1000;
const H = 560;
const AZIMUTH = 35;
const ELEVATION = 40;

// 2. DIMENSIONES DEL DIORAMA EN MINIATURA
const BASE = { x: -185, y: -110, w: 370, d: 220, r: 8 };
const BASE_H = 14;
const FOOT_H = 5;

// Alturas y cotas de la maqueta
const Z_GROUND = 0;
const Z_CURB = 2.5;
const CLOUD_Z = 240;

// Configuración de la proyección isométrica
const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [-120, -60, CLOUD_Z + 45],
    [120, 60, CLOUD_Z + 45],
    [0, 0, 180],
  ],
  W,
  H,
  { pad: 40, azimuth: AZIMUTH, elevation: ELEVATION }
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0.4) => k.slabOf(plan, z, h, P, steps, bevel);
const UP = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);

function sphere(centre, r, style) {
  const profile = [];
  for (let index = 0; index <= 12; index++) {
    const a = -Math.PI / 2 + (index / 12) * Math.PI;
    profile.push([r * Math.sin(a), r * Math.cos(a), 1]);
  }
  return S(G.lathe(profile, UP(centre), P, { steps: 24 }), style);
}

console.log("Proyeccion horizontal generada. Escala:", P.scale.toFixed(3));

// 3. CAPAS DE DIBUJO VECTORIAL
const back = [];
const mid = [];
const front = [];

// A. PEDESTAL FLOTANTE DE LA MAQUETA (Capa Back)
// Patas de montaje inferiores
for (const [fx, fy] of [
  [BASE.x + 16, BASE.y + 16],
  [BASE.x + BASE.w - 16, BASE.y + 16],
  [BASE.x + 16, BASE.y + BASE.d - 16],
  [BASE.x + BASE.w - 16, BASE.y + BASE.d - 16],
]) {
  back.push(S(k.cylinder(fx, fy, 8, -BASE_H - FOOT_H, FOOT_H, P, 16), { tone: "lo" }));
}

// Bloque macizo del pedestal
back.push(S(slab(BASE, -BASE_H, BASE_H, 3, 1.0), { tone: "mid" }));

// Reglas milimetricas e inscripciones en el bisel
const tickX = k.topTicks(BASE.x + 14, BASE.x + BASE.w - 14, 4, 10, BASE.y + 2, 0, [0.8, 1.6], P, "x");
const tickY = k.topTicks(BASE.y + 14, BASE.y + BASE.d - 14, 4, 10, BASE.x + 2, 0, [0.8, 1.6], P, "y");
back.push(Ln(tickX.minor + tickY.minor, { tone: "lo" }));
back.push(Ln(tickX.major + tickY.major, { tone: "mid" }));

// Tornillos esquineros
for (const [cx, cy] of [
  [BASE.x + 7, BASE.y + 7],
  [BASE.x + BASE.w - 7, BASE.y + 7],
  [BASE.x + 7, BASE.y + BASE.d - 7],
  [BASE.x + BASE.w - 7, BASE.y + BASE.d - 7],
]) {
  back.push(
    S(k.cylinder(cx, cy, 2.5, -0.2, 0.4, P, 6), { tone: "hi" }) +
    Dots([at([cx, cy, 0.2])], { size: 0.35, tone: "lit" })
  );
}

// B. CALZADAS Y ACERAS DEL DIORAMA
// Aceras elevadas del perimetro
const SIDEWALK_INSET = 12;
const innerBlock = k.insetPlan(BASE, SIDEWALK_INSET);
back.push(S(slab(innerBlock, 0, Z_CURB, 1, 0.2), { tone: "hi" }));

// Trazado de calles interiores (Calzada asfaltada)
const streetWidth = 32;
// Calle horizontal central
const roadH = { x: innerBlock.x + 2, y: -streetWidth / 2, w: innerBlock.w - 4, d: streetWidth, r: 0 };
back.push(S(slab(roadH, Z_CURB, 0.1, 1, 0), { tone: "lo" }));

// Calle vertical secundaria
const roadV = { x: 30, y: innerBlock.y + 2, w: 26, d: innerBlock.d - 4, r: 0 };
back.push(S(slab(roadV, Z_CURB, 0.1, 1, 0), { tone: "lo" }));

// Líneas discontinuas de carril
for (let lx = roadH.x + 10; lx < roadH.x + roadH.w - 10; lx += 20) {
  back.push(Ln(k.lineOnTop([lx, 0], [lx + 10, 0], Z_CURB + 0.15, P), { tone: "hi", dashed: true }));
}

// Pasos de cebra peatonales
for (let zx = roadH.x + 35; zx <= roadH.x + 48; zx += 3.5) {
  back.push(Ln(k.lineOnTop([zx, roadH.y + 4], [zx, roadH.y + roadH.d - 4], Z_CURB + 0.15, P), { tone: "lit" }));
}

// C. ARQUITECTURA EN MINIATURA (EDIFICIOS, CASITAS Y ARBOLES)

// 1. TORRE CENTRAL EN MINIATURA (Central Skyscraper)
const TOWER = { x: -38, y: -75, w: 52, d: 48, r: 1.5 };
const TOWER_Z1 = 75;
const TOWER_Z2 = 125;
// Planta baja y fuste medio
mid.push(S(slab(TOWER, Z_CURB, TOWER_Z1, 2, 0.6), { tone: "mid" }));
// Ranuras de ventanas iluminadas
for (let wz = Z_CURB + 10; wz < TOWER_Z1 - 8; wz += 12) {
  const win = { x: TOWER.x + 4, y: TOWER.y + TOWER.d - 0.8, w: TOWER.w - 8, d: 0.8, r: 0 };
  mid.push(S(slab(win, wz, 5, 1, 0), { tone: "lit" }));
}

// Remate superior con retranqueo
const towerTop = { x: TOWER.x + 6, y: TOWER.y + 6, w: TOWER.w - 12, d: TOWER.d - 12, r: 1 };
mid.push(S(slab(towerTop, Z_CURB + TOWER_Z1, TOWER_Z2 - TOWER_Z1, 2, 0.5), { tone: "hi" }));

// Helipuerto miniatura en azotea con circulo y H
const heliC = [towerTop.x + towerTop.w / 2, towerTop.y + towerTop.d / 2, Z_CURB + TOWER_Z2];
mid.push(S(k.cylinder(heliC[0], heliC[1], 11, heliC[2], 0.8, P, 20), { tone: "hi" }));
mid.push(Ln(k.ring(heliC[0], heliC[1], 8, heliC[2] + 0.8, P, 20), { tone: "lit" }));
// Letra H
const hR = 3.5;
const hz = heliC[2] + 0.9;
mid.push(Ln(k.lineOnTop([heliC[0] - hR, heliC[1] - hR], [heliC[0] - hR, heliC[1] + hR], hz, P), { tone: "lit" }));
mid.push(Ln(k.lineOnTop([heliC[0] + hR, heliC[1] - hR], [heliC[0] + hR, heliC[1] + hR], hz, P), { tone: "lit" }));
mid.push(Ln(k.lineOnTop([heliC[0] - hR, heliC[1]], [heliC[0] + hR, heliC[1]], hz, P), { tone: "lit" }));

// Antena con baliza
const antC = [towerTop.x + 6, towerTop.y + 6];
mid.push(S(k.cylinder(antC[0], antC[1], 1.2, heliC[2], 30, P, 10), { tone: "hi", crease: "none" }));
mid.push(Dots([at([antC[0], antC[1], heliC[2] + 30])], { size: 0.5, tone: "red" }));

// 2. CASITAS Y MODULOS RESIDENCIALES DEL OESTE (Townhouses)
const house1 = { x: -145, y: -75, w: 38, d: 34, r: 1 };
mid.push(S(slab(house1, Z_CURB, 38, 2, 0.4), { tone: "hi" }));
// Tejadillo inclinado o terraza
const house1Roof = { x: house1.x + 3, y: house1.y + 3, w: house1.w - 6, d: house1.d - 6, r: 0.5 };
mid.push(S(slab(house1Roof, Z_CURB + 38, 5, 1, 0.2), { tone: "mid" }));
// Ventanitas
for (const wy of [house1.y + 8, house1.y + 20]) {
  const win = { x: house1.x + house1.w - 0.8, y: wy, w: 0.8, d: 6, r: 0 };
  mid.push(S(slab(win, Z_CURB + 12, 10, 1, 0), { tone: "lit" }));
}

const house2 = { x: -95, y: -80, w: 42, d: 38, r: 1 };
mid.push(S(slab(house2, Z_CURB, 54, 2, 0.5), { tone: "mid" }));
// Claraboyas y chimeneas miniatura
mid.push(S(k.cylinder(house2.x + 12, house2.y + 12, 3.2, Z_CURB + 54, 7, P, 12), { tone: "hi" }));
mid.push(S(k.cylinder(house2.x + 28, house2.y + 22, 2.5, Z_CURB + 54, 5, P, 12), { tone: "hi" }));

// 3. CENTRO COMERCIAL Y ESTACION ESTE
const station = { x: 70, y: -75, w: 75, d: 42, r: 1.5 };
mid.push(S(slab(station, Z_CURB, 32, 2, 0.4), { tone: "mid" }));
// Marquesina volada de vidrio
const canopy = { x: station.x - 6, y: station.y + station.d - 2, w: 48, d: 10, r: 0.8 };
mid.push(S(slab(canopy, Z_CURB + 14, 2.5, 1, 0.2), { tone: "lit" }));
// Luces de rotulo comercial
mid.push(Ln(k.lineOnTop([station.x + 8, station.y + station.d + 0.5], [station.x + station.w - 8, station.y + station.d + 0.5], Z_CURB + 24, P), { tone: "lit" }));

// 4. ALMACEN Y SUBESTACION SUR
const warehouse = { x: -130, y: 35, w: 55, d: 44, r: 1 };
mid.push(S(slab(warehouse, Z_CURB, 28, 2, 0.4), { tone: "mid" }));
// Transformadores exteriores con bobinas
for (const bx of [warehouse.x + 12, warehouse.x + 28, warehouse.x + 42]) {
  mid.push(S(k.cylinder(bx, warehouse.y - 4, 3.0, Z_CURB, 8, P, 12), { tone: "hi" }));
  mid.push(Dots([at([bx, warehouse.y - 4, Z_CURB + 9])], { size: 0.4, tone: "lit" }));
}

// 5. ARBOLES CUBICOS EN MINIATURA (Tree Planters)
for (const [tx, ty] of [
  [-160, 0],
  [-110, 20],
  [-10, 24],
  [80, 22],
  [135, 20],
  [-50, -22],
  [15, -22],
  [110, -22],
]) {
  // Tronco
  mid.push(S(k.cylinder(tx, ty, 1.2, Z_CURB, 6, P, 8), { tone: "lo", crease: "none" }));
  // Copa de follaje esférica estilizada
  mid.push(sphere([tx, ty, Z_CURB + 10], 4.2, { tone: "hi" }));
}

// 6. MINI-COCHECITOS CON FAROS ILUMINADOS (Vehículos Autónomos)
// 4 cochecitos circulando en bucle alrededor de la calzada
mid.push(`
<g data-part="mini-cars">
  <!-- Coche 1: En calzada horizontal norte -->
  <g class="mini-car car-1">
    ${S(slab({ x: -10, y: -6, w: 14, d: 8, r: 1.5 }, Z_CURB + 0.2, 5, 2, 0.3), { tone: "hi" })}
    ${Dots([at([-10, -4, Z_CURB + 2.5]), at([-10, 0, Z_CURB + 2.5])], { size: 0.45, tone: "lit" })}
    ${Dots([at([4, -4, Z_CURB + 2.5]), at([4, 0, Z_CURB + 2.5])], { size: 0.4, tone: "red" })}
  </g>
  <!-- Coche 2: En calzada este -->
  <g class="mini-car car-2">
    ${S(slab({ x: 38, y: 15, w: 8, d: 13, r: 1.5 }, Z_CURB + 0.2, 5, 2, 0.3), { tone: "lit" })}
    ${Dots([at([40, 28, Z_CURB + 2.5]), at([44, 28, Z_CURB + 2.5])], { size: 0.45, tone: "lit" })}
  </g>
</g>
`);

// D. NUBES ISOMETRICAS FLOTANTES EN ALTURA ("colocas nubes arriba")
// 2 Racimos de nubes hinchadas volumétricas suspendidas sobre la maqueta
const cloudCluster1 = [
  [-120, -45, CLOUD_Z + 10, 22],
  [-100, -55, CLOUD_Z + 18, 28],
  [-75,  -48, CLOUD_Z + 12, 24],
  [-130, -60, CLOUD_Z + 5,  18],
  [-90,  -35, CLOUD_Z + 15, 20],
];

const cloudCluster2 = [
  [65,   -35, CLOUD_Z + 12, 24],
  [90,   -45, CLOUD_Z + 20, 30],
  [120,  -38, CLOUD_Z + 14, 25],
  [140,  -50, CLOUD_Z + 6,  18],
  [80,   -20, CLOUD_Z + 10, 21],
];

let cloudsSvg = '<g class="iso-clouds" data-part="clouds">';
for (const [cx, cy, cz, cr] of [...cloudCluster1, ...cloudCluster2]) {
  cloudsSvg += sphere([cx, cy, cz], cr, { tone: "hi", lit: true });
}
cloudsSvg += '</g>';
front.push(cloudsSvg);

// 4. METADATOS Y GEOMETRIA PARA EL CLIENTE
const DATA = {
  W,
  H,
  P,
  camera: glCamera(P),
  base: [BASE.x, BASE.y, BASE.x + BASE.w, BASE.y + BASE.d],
  cloudZ: CLOUD_Z,
  buildings: [
    { x0: TOWER.x, y0: TOWER.y, x1: TOWER.x + TOWER.w, y1: TOWER.y + TOWER.d, z: Z_CURB + TOWER_Z2 },
    { x0: house1.x, y0: house1.y, x1: house1.x + house1.w, y1: house1.y + house1.d, z: Z_CURB + 38 },
    { x0: house2.x, y0: house2.y, x1: house2.x + house2.w, y1: house2.y + house2.d, z: Z_CURB + 54 },
    { x0: station.x, y0: station.y, x1: station.x + station.w, y1: station.y + station.d, z: Z_CURB + 32 },
    { x0: warehouse.x, y0: warehouse.y, x1: warehouse.x + warehouse.w, y1: warehouse.y + warehouse.d, z: Z_CURB + 28 },
  ],
};

// 5. CLIENT SCRIPT: SIMULADOR DE GOTAS INDIVIDUALES Y ONDAS DE IMPACTO
const CLIENT_JS = `
const DATA = __DATA__;
const canvas = document.querySelector(".city-gl");
const readout = document.querySelector("[data-readout]");
const cloudsGroup = document.querySelector('[data-part="clouds"]');
const car1 = document.querySelector(".car-1");
const car2 = document.querySelector(".car-2");

let rainLevel = 0.65;
let lampOn = 1.0;
let dayMode = 0.0; // 0.0: Noche cyberpunk neon, 1.0: Dia diáfano de maqueta
let flashTime = 0.0;
let carT = 0.0;
let cloudDrift = 0.0;

// SISTEMA DE GOTAS Y ONDAS DE IMPACTO
// Cada gota cae desde las nubes; al impactar el suelo o tejado, genera en ese punto exacto una onda
const MAX_DROPS = 48;
const MAX_RIPPLES = 48;
const drops = [];
const ripples = [];

for (let i = 0; i < MAX_DROPS; i++) {
  drops.push({
    x: DATA.base[0] + Math.random() * (DATA.base[2] - DATA.base[0]),
    y: DATA.base[1] + Math.random() * (DATA.base[3] - DATA.base[1]),
    z: DATA.cloudZ + Math.random() * 40,
    speed: 480 + Math.random() * 180,
    active: true
  });
}

function spawnRipple(x, y, z) {
  for (let i = 0; i < MAX_RIPPLES; i++) {
    const r = ripples[i];
    if (!r || r.age >= r.maxAge) {
      ripples[i] = { x, y, z, age: 0, maxAge: 0.65 + Math.random() * 0.25, maxRadius: 12 + Math.random() * 8 };
      break;
    }
  }
}

// Inicializar Canvas 2D de alta resolución para gotas y ondas proyectadas
const ctx = canvas.getContext("2d");

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.scale(dpr * (rect.width / DATA.W), dpr * (rect.height / DATA.H));
}
window.addEventListener("resize", resize);
resize();

// Proyección matemática 3D -> 2D con la matriz P
function project(x, y, z) {
  return iso([x, y, z], DATA.P);
}

let last = performance.now();

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  // 1. Animación suave de nubes flotantes
  cloudDrift = Math.sin(now * 0.0008) * 12;
  if (cloudsGroup) {
    cloudsGroup.setAttribute("transform", \`translate(\${cloudDrift.toFixed(1)} 0)\`);
  }

  // 2. Animación de cochecitos circulando en bucle
  carT = (carT + dt * 0.22) % 1.0;
  if (car1) {
    const cx = DATA.base[0] + 40 + (DATA.base[2] - DATA.base[0] - 80) * ((carT * 2) % 1.0);
    car1.setAttribute("transform", translateAlong(DATA.P, [cx, 0, 0]));
  }

  // 3. Destello de relámpago
  if (flashTime > 0) {
    flashTime -= dt * 3.5;
  } else if (rainLevel > 0.75 && Math.random() < 0.004) {
    flashTime = 1.0;
  }

  // 4. Renderizado de lluvia y ondas en el lienzo
  ctx.clearRect(0, 0, DATA.W, DATA.H);

  // A. Actualizar y dibujar ondas concéntricas de impacto
  for (let i = 0; i < ripples.length; i++) {
    const r = ripples[i];
    if (!r || r.age >= r.maxAge) continue;
    r.age += dt;
    const progress = r.age / r.maxAge;
    const currentRadius = r.maxRadius * Math.sqrt(progress);
    const alpha = (1.0 - progress) * (rainLevel * 0.95);

    if (alpha <= 0.01) continue;

    const center2D = project(r.x, r.y, r.z);
    ctx.save();
    ctx.strokeStyle = dayMode > 0.5 ? \`rgba(40, 120, 200, \${alpha})\` : \`rgba(0, 240, 255, \${alpha})\`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    // Elipse isométrica orientada según los ejes
    ctx.ellipse(center2D[0], center2D[1], currentRadius, currentRadius * 0.58, -0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // B. Actualizar y dibujar gotas descendentes desde las nubes
  const activeCount = Math.round(MAX_DROPS * rainLevel);
  for (let i = 0; i < activeCount; i++) {
    const d = drops[i];
    d.z -= d.speed * dt;
    d.x += dt * 18; // Viento sutil

    // Detección de impacto: altura del tejado o suelo
    let hitZ = 0;
    for (let b = 0; b < DATA.buildings.length; b++) {
      const bg = DATA.buildings[b];
      if (d.x >= bg.x0 && d.x <= bg.x1 && d.y >= bg.y0 && d.y <= bg.y1) {
        hitZ = bg.z;
        break;
      }
    }

    if (d.z <= hitZ) {
      // IMPACTO EXACTO: Detona onda concéntrica en ese punto
      spawnRipple(d.x, d.y, hitZ);

      // Reiniciar gota debajo de las nubes
      d.z = DATA.cloudZ + Math.random() * 25;
      d.x = DATA.base[0] + 15 + Math.random() * (DATA.base[2] - DATA.base[0] - 30);
      d.y = DATA.base[1] + 15 + Math.random() * (DATA.base[3] - DATA.base[1] - 30);
    }

    // Dibujar trazo lineal de la gota con paralaje isométrico
    const p1 = project(d.x, d.y, d.z);
    const p2 = project(d.x - 1.2, d.y, d.z + 9.0);

    ctx.save();
    ctx.strokeStyle = dayMode > 0.5 ? "rgba(100, 160, 220, 0.45)" : "rgba(180, 240, 255, 0.65)";
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
    ctx.restore();
  }

  // C. Destello ambiental de tormenta
  if (flashTime > 0.05) {
    ctx.fillStyle = \`rgba(220, 240, 255, \${flashTime * 0.22})\`;
    ctx.fillRect(0, 0, DATA.W, DATA.H);
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// Control interactivo de telemetria
function updateTelemetry() {
  const mm = Math.round(rainLevel * 60);
  const status = rainLevel < 0.2 ? "Llovizna suave" : (rainLevel < 0.7 ? "Lluvia sostenida" : "Tormenta electrica");
  const modeStr = dayMode > 0.5 ? "Dia Diáfano" : "Noche Cyberpunk";
  const lampStr = lampOn > 0.5 ? "Farola: On" : "Farola: Off";
  const text = \`Precipitacion: \${mm} mm/h // \${status} // \${modeStr} // \${lampStr}\`;
  if (readout) readout.textContent = text;
}

window.setRain = function(val) {
  rainLevel = Math.max(0.0, Math.min(1.0, val));
  updateTelemetry();
};

window.toggleDayNight = function() {
  dayMode = dayMode > 0.5 ? 0.0 : 1.0;
  document.body.setAttribute("data-theme", dayMode > 0.5 ? "light" : "dark");
  updateTelemetry();
};

window.toggleLamp = function() {
  lampOn = lampOn > 0.5 ? 0.0 : 1.0;
  updateTelemetry();
};

window.triggerStorm = function() {
  flashTime = 1.0;
  rainLevel = 1.0;
  updateTelemetry();
};

updateTelemetry();
`;

// 6. ENSAMBLAJE DE LA PLACA Y ESCENARIO
const LABEL_TEXT = "Diorama en miniatura de una ciudad cyberpunk: pedestal flotante con calzadas, rascacielos miniatura, casas modulares, arboles en jardineras y dos grupos de nubes volumetricas en altura que generan lluvia con ondas de impacto concentricas individuales.";

const backSvg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body: back, className: "city-back" });
const layerSvg = (name, body) => `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg city-layer ${name}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${body.join("")}</svg>`;

const stageHtml = `
<div class="city-stage" tabindex="0" role="group" aria-label="Maqueta en miniatura con nubes y lluvia">
  <span class="city-said" aria-live="polite"></span>
  ${backSvg}
  <canvas class="city-layer city-gl" aria-hidden="true"></canvas>
  ${layerSvg("city-mid", mid)}
  ${layerSvg("city-front", front)}
</div>
`;

const CAPTION_TEXT = `Diorama urbano en miniatura construido con proyeccion isometrica apaisada a 35 grados de acimut y 40 grados de elevacion. Rascacielos miniatura a cota Z = 160 mm con helipuerto y baliza luminosa, casas modulares con claraboyas y arboles en jardineras viales. Dos racimos de nubes volumetricas flotan en el cielo a 240 mm sobre la maqueta. Cada gota individual desciende con trayectoria calculada y genera una onda concentrica al colisionar con el suelo o tejados.`;

// Barra de navegación superior unificada
const topNavHtml = `
<header class="groove-nav-header">
    <div class="groove-brand">
        <span class="brand-sym">[+]</span>
        <span class="brand-text">LINUX GROOVE</span>
        <span class="brand-badge">MAQUETA EN MINIATURA // DIORAMA</span>
    </div>
    <nav class="groove-nav">
        <a href="index.html" class="nav-item">[ Rayos ]</a>
        <a href="labyrinth.html" class="nav-item">[ Laberinto ]</a>
        <a href="city.html" class="nav-item active">[ Ciudad ]</a>
        <a href="objects_mouse.html" class="nav-item">[ 3D: Primitivas ]</a>
        <a href="anatomy_inspect.html" class="nav-item">[ 3D: Bio ]</a>
        <a href="machine_rocket.html" class="nav-item">[ Maq: Cohete ]</a>
        <a href="machine_dial.html" class="nav-item">[ Maq: Comparador ]</a>
        <a href="machine_ripple.html" class="nav-item">[ Maq: Ondas ]</a>
    </nav>
</header>
`;

// Dock Inferior Minimalista (42px)
const bottomDockHtml = `
<div class="city-dock" aria-label="Controles del diorama en miniatura">
  <div class="dock-control">
    <span class="dock-label">// LLUVIA:</span>
    <input type="range" class="dock-slider" min="0" max="100" value="65" oninput="window.setRain(this.value / 100.0)">
  </div>
  <div class="dock-separator"></div>
  <button class="dock-btn" onclick="window.toggleDayNight()">[ Dia / Noche ]</button>
  <button class="dock-btn" onclick="window.toggleLamp()">[ Farola Cenital ]</button>
  <button class="dock-btn pulse" onclick="window.triggerStorm()">[ Pulso Tormenta ]</button>
</div>
`;

// Estilos CSS que fuerzan el ajuste 100% al viewport sin scroll
const EXTRA_CSS = `
html, body {
  overflow: hidden;
  height: 100vh;
}
.iso-page {
  width: min(1020px, 95vw);
  margin: 50px auto 4px !important;
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.iso-figure {
  margin: 0 !important;
}
.iso-plate {
  padding: 12px 16px 14px !important;
}
.city-stage {
  position: relative;
  width: 100%;
  aspect-ratio: ${W} / ${H};
  max-height: calc(100vh - 195px);
  user-select: none;
}
.city-stage svg, .city-stage canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.city-gl {
  mix-blend-mode: screen;
}

.groove-nav-header {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 46px;
    z-index: 99999;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 1.5rem;
    background: rgba(11, 11, 11, 0.94);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.09);
    box-sizing: border-box;
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}
.groove-brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.78rem;
}
.groove-brand .brand-sym { color: #00f0ff; font-weight: 700; }
.groove-brand .brand-text { color: #ffffff; font-weight: 700; letter-spacing: 0.08em; }
.groove-brand .brand-badge {
    font-size: 0.58rem;
    padding: 2px 5px;
    background: rgba(0, 240, 255, 0.12);
    border: 1px solid rgba(0, 240, 255, 0.35);
    border-radius: 4px;
    color: #00f0ff;
}
.groove-nav {
    display: flex;
    gap: 0.25rem;
    align-items: center;
    flex-wrap: wrap;
}
.groove-nav .nav-item {
    text-decoration: none;
    font-size: 0.68rem;
    color: #8c8c90;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid transparent;
    transition: all 0.15s ease;
}
.groove-nav .nav-item:hover {
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.04);
}
.groove-nav .nav-item.active {
    color: #00f0ff;
    border-color: rgba(0, 240, 255, 0.5);
    background: rgba(0, 240, 255, 0.12);
    box-shadow: 0 0 8px rgba(0, 240, 255, 0.2);
}

.city-dock {
  position: fixed;
  bottom: 0.8rem;
  left: 50%;
  transform: translateX(-50%);
  height: 40px;
  background: rgba(14, 18, 24, 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 240, 255, 0.25);
  border-radius: 20px;
  display: flex;
  align-items: center;
  padding: 0 1.0rem;
  gap: 0.8rem;
  z-index: 1000;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.65);
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}
.dock-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.dock-label {
  font-size: 0.68rem;
  color: #8c8c90;
  white-space: nowrap;
}
.dock-slider {
  -webkit-appearance: none;
  width: 90px;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.dock-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #00f0ff;
  box-shadow: 0 0 8px #00f0ff;
  cursor: pointer;
}
.dock-separator {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.12);
}
.dock-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #b0b0b8;
  font-family: inherit;
  font-size: 0.68rem;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.dock-btn:hover {
  border-color: #00f0ff;
  color: #00f0ff;
  background: rgba(0, 240, 255, 0.08);
}
.dock-btn.pulse:hover {
  border-color: #ff3366;
  color: #ff3366;
  background: rgba(255, 51, 102, 0.1);
  box-shadow: 0 0 10px rgba(255, 51, 102, 0.3);
}
`;

const plateHtml = k.plateHtml({
  fig: "Fig 4",
  title: "Mini-City Diorama",
  hint: "Observa cada gota caer y generar su onda en el suelo // Arrastra el slider para modular la lluvia",
  readout: "Precipitacion: 39 mm/h // Lluvia sostenida // Noche Cyberpunk // Farola: On",
  keys: [
    { mark: "lit", label: "Nubes Volumetricas Flotantes (Z: 240 mm)" },
    { mark: "raised", label: "Torre Central y Bloques Residenciales" },
    { mark: "flat", label: "Ondas Concentricas de Lluvia por Gota Individual" },
  ],
  caption: CAPTION_TEXT,
  body: stageHtml,
});

const pageBody = `
${topNavHtml}
<style>${EXTRA_CSS}</style>
${plateHtml}
${bottomDockHtml}
`;

const fullHtml = k.pageHtml({
  title: "Linux Groove - Diorama Urbano en Miniatura (Skill Anatomy & Lluvia)",
  theme: "dark",
  body: pageBody,
  script: kitScript() + glScript() + CLIENT_JS.replace("__DATA__", JSON.stringify(DATA)),
  width: 1000,
});

// Guardar como city.html y machine_city.html
writeFileSync("pruebas_web/public/city.html", fullHtml, "utf8");
writeFileSync("pruebas_web/public/machine_city.html", fullHtml, "utf8");

console.log("Miniatura de Ciudad generada con exito!");
console.log("- city.html:", (fullHtml.length / 1024).toFixed(0), "KB");
