// ==========================================================================
// LINUX GROOVE - DIORAMA URBANO VIVO MULTI-MOTOR (SKILL ANATOMY + WEBGL)
// build_city.mjs: Maqueta 3D con Arboles de Particulas Animados por Viento,
// Nubes Volumetricas FBM Procedurales, Ave Voladora de Particulas 3D
// y tarjeta horizontal apaisada 100% en el campo de vision sin scroll
// ==========================================================================

import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(".agents/skills/anatomy");
const k = await import(join(ROOT, "kit/iso-kit.mjs"));
const G = await import(join(ROOT, "kit/lathe.mjs"));
const { glCamera, GLSL_ISO } = await import(join(ROOT, "kit/gl.mjs"));
const { kitScript, glScript } = await import(join(ROOT, "scripts/inline-kit.mjs"));

// 1. PROPORCIONES HORIZONTALES (WIDESCREEN 16:9 / 16:10)
const W = 1000;
const H = 560;
const AZIMUTH = 35;
const ELEVATION = 40;

// 2. DIMENSIONES DEL DIORAMA
const BASE = { x: -185, y: -110, w: 370, d: 220, r: 8 };
const BASE_H = 14;
const FOOT_H = 5;

const Z_GROUND = 0;
const Z_CURB = 2.5;
const CLOUD_Z_MIN = 210;
const CLOUD_Z_MAX = 310;

// Configuración de la proyección isométrica
const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [-130, -70, CLOUD_Z_MAX + 10],
    [130, 70, CLOUD_Z_MAX + 10],
    [0, 0, 160],
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

console.log("Proyeccion horizontal generada. Escala:", P.scale.toFixed(3));

// 3. CAPAS DE DIBUJO VECTORIAL
const back = [];
const mid = [];
const front = [];

// A. PEDESTAL FLOTANTE DE LA MAQUETA (Capa Back)
for (const [fx, fy] of [
  [BASE.x + 16, BASE.y + 16],
  [BASE.x + BASE.w - 16, BASE.y + 16],
  [BASE.x + 16, BASE.y + BASE.d - 16],
  [BASE.x + BASE.w - 16, BASE.y + BASE.d - 16],
]) {
  back.push(S(k.cylinder(fx, fy, 8, -BASE_H - FOOT_H, FOOT_H, P, 16), { tone: "lo" }));
}

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
const SIDEWALK_INSET = 12;
const innerBlock = k.insetPlan(BASE, SIDEWALK_INSET);
back.push(S(slab(innerBlock, 0, Z_CURB, 1, 0.2), { tone: "hi" }));

const streetWidth = 32;
const roadH = { x: innerBlock.x + 2, y: -streetWidth / 2, w: innerBlock.w - 4, d: streetWidth, r: 0 };
back.push(S(slab(roadH, Z_CURB, 0.1, 1, 0), { tone: "lo" }));

const roadV = { x: 30, y: innerBlock.y + 2, w: 26, d: innerBlock.d - 4, r: 0 };
back.push(S(slab(roadV, Z_CURB, 0.1, 1, 0), { tone: "lo" }));

for (let lx = roadH.x + 10; lx < roadH.x + roadH.w - 10; lx += 20) {
  back.push(Ln(k.lineOnTop([lx, 0], [lx + 10, 0], Z_CURB + 0.15, P), { tone: "hi", dashed: true }));
}

for (let zx = roadH.x + 35; zx <= roadH.x + 48; zx += 3.5) {
  back.push(Ln(k.lineOnTop([zx, roadH.y + 4], [zx, roadH.y + roadH.d - 4], Z_CURB + 0.15, P), { tone: "lit" }));
}

// C. ARQUITECTURA EN MINIATURA
// 1. Torre Central
const TOWER = { x: -38, y: -75, w: 52, d: 48, r: 1.5 };
const TOWER_Z1 = 75;
const TOWER_Z2 = 125;
mid.push(S(slab(TOWER, Z_CURB, TOWER_Z1, 2, 0.6), { tone: "mid" }));

for (let wz = Z_CURB + 10; wz < TOWER_Z1 - 8; wz += 12) {
  const win = { x: TOWER.x + 4, y: TOWER.y + TOWER.d - 0.8, w: TOWER.w - 8, d: 0.8, r: 0 };
  mid.push(S(slab(win, wz, 5, 1, 0), { tone: "lit" }));
}

const towerTop = { x: TOWER.x + 6, y: TOWER.y + 6, w: TOWER.w - 12, d: TOWER.d - 12, r: 1 };
mid.push(S(slab(towerTop, Z_CURB + TOWER_Z1, TOWER_Z2 - TOWER_Z1, 2, 0.5), { tone: "hi" }));

const heliC = [towerTop.x + towerTop.w / 2, towerTop.y + towerTop.d / 2, Z_CURB + TOWER_Z2];
mid.push(S(k.cylinder(heliC[0], heliC[1], 11, heliC[2], 0.8, P, 20), { tone: "hi" }));
mid.push(Ln(k.ring(heliC[0], heliC[1], 8, heliC[2] + 0.8, P, 20), { tone: "lit" }));
const hR = 3.5;
const hz = heliC[2] + 0.9;
mid.push(Ln(k.lineOnTop([heliC[0] - hR, heliC[1] - hR], [heliC[0] - hR, heliC[1] + hR], hz, P), { tone: "lit" }));
mid.push(Ln(k.lineOnTop([heliC[0] + hR, heliC[1] - hR], [heliC[0] + hR, heliC[1] + hR], hz, P), { tone: "lit" }));
mid.push(Ln(k.lineOnTop([heliC[0] - hR, heliC[1]], [heliC[0] + hR, heliC[1]], hz, P), { tone: "lit" }));

const antC = [towerTop.x + 6, towerTop.y + 6];
mid.push(S(k.cylinder(antC[0], antC[1], 1.2, heliC[2], 30, P, 10), { tone: "hi", crease: "none" }));
mid.push(Dots([at([antC[0], antC[1], heliC[2] + 30])], { size: 0.5, tone: "red" }));

// 2. Casitas y modulos oeste
const house1 = { x: -145, y: -75, w: 38, d: 34, r: 1 };
mid.push(S(slab(house1, Z_CURB, 38, 2, 0.4), { tone: "hi" }));
const house1Roof = { x: house1.x + 3, y: house1.y + 3, w: house1.w - 6, d: house1.d - 6, r: 0.5 };
mid.push(S(slab(house1Roof, Z_CURB + 38, 5, 1, 0.2), { tone: "mid" }));
for (const wy of [house1.y + 8, house1.y + 20]) {
  const win = { x: house1.x + house1.w - 0.8, y: wy, w: 0.8, d: 6, r: 0 };
  mid.push(S(slab(win, Z_CURB + 12, 10, 1, 0), { tone: "lit" }));
}

const house2 = { x: -95, y: -80, w: 42, d: 38, r: 1 };
mid.push(S(slab(house2, Z_CURB, 54, 2, 0.5), { tone: "mid" }));
mid.push(S(k.cylinder(house2.x + 12, house2.y + 12, 3.2, Z_CURB + 54, 7, P, 12), { tone: "hi" }));
mid.push(S(k.cylinder(house2.x + 28, house2.y + 22, 2.5, Z_CURB + 54, 5, P, 12), { tone: "hi" }));

// 3. Estacion y centro este
const station = { x: 70, y: -75, w: 75, d: 42, r: 1.5 };
mid.push(S(slab(station, Z_CURB, 32, 2, 0.4), { tone: "mid" }));
const canopy = { x: station.x - 6, y: station.y + station.d - 2, w: 48, d: 10, r: 0.8 };
mid.push(S(slab(canopy, Z_CURB + 14, 2.5, 1, 0.2), { tone: "lit" }));
mid.push(Ln(k.lineOnTop([station.x + 8, station.y + station.d + 0.5], [station.x + station.w - 8, station.y + station.d + 0.5], Z_CURB + 24, P), { tone: "lit" }));

// 4. Almacen sur
const warehouse = { x: -130, y: 35, w: 55, d: 44, r: 1 };
mid.push(S(slab(warehouse, Z_CURB, 28, 2, 0.4), { tone: "mid" }));
for (const bx of [warehouse.x + 12, warehouse.x + 28, warehouse.x + 42]) {
  mid.push(S(k.cylinder(bx, warehouse.y - 4, 3.0, Z_CURB, 8, P, 12), { tone: "hi" }));
  mid.push(Dots([at([bx, warehouse.y - 4, Z_CURB + 9])], { size: 0.4, tone: "lit" }));
}

// D. MINI-VEHICULOS CON FAROS DELANTEROS Y TRASEROS
mid.push(`
<g data-part="mini-cars">
  <g class="mini-car car-1">
    ${S(slab({ x: -10, y: -6, w: 14, d: 8, r: 1.5 }, Z_CURB + 0.2, 5, 2, 0.3), { tone: "hi" })}
    ${Dots([at([-10, -4, Z_CURB + 2.5]), at([-10, 0, Z_CURB + 2.5])], { size: 0.45, tone: "lit" })}
    ${Dots([at([4, -4, Z_CURB + 2.5]), at([4, 0, Z_CURB + 2.5])], { size: 0.4, tone: "red" })}
  </g>
  <g class="mini-car car-2">
    ${S(slab({ x: 38, y: 15, w: 8, d: 13, r: 1.5 }, Z_CURB + 0.2, 5, 2, 0.3), { tone: "lit" })}
    ${Dots([at([40, 28, Z_CURB + 2.5]), at([44, 28, Z_CURB + 2.5])], { size: 0.45, tone: "lit" })}
  </g>
</g>
`);

// 4. GENERACION PROCEDURAL DE 4 ESPECIES BOTANICAS EN PARTICULAS 3D
// Troncos fijos en SVG + 2,048 particulas animables en tiempo real mediante el simulador del cliente
const TREE_SPECS = [
  { x: -160, y: 0,   species: 0, height: 16 }, // 0: Ciprés Columnar
  { x: -110, y: 20,  species: 1, height: 12 }, // 1: Roble Copa Ancha
  { x: -10,  y: 24,  species: 2, height: 14 }, // 2: Sauce Lloron Bio-Digital
  { x: 80,   y: 22,  species: 3, height: 15 }, // 3: Conifera Escalonada
  { x: 135,  y: 20,  species: 0, height: 18 }, // 0: Cipres
  { x: -50,  y: -22, species: 1, height: 13 }, // 1: Roble
  { x: 15,   y: -22, species: 3, height: 14 }, // 3: Conifera
  { x: 110,  y: -22, species: 2, height: 12 }, // 2: Sauce Lloron
];

for (const t of TREE_SPECS) {
  mid.push(S(k.cylinder(t.x, t.y, 1.2, Z_CURB, t.height * 0.45, P, 8), { tone: "lo", crease: "none" }));
}

// 5. DATOS Y METADATOS PARA EL CLIENTE
const DATA = {
  W,
  H,
  P,
  camera: glCamera(P),
  base: [BASE.x, BASE.y, BASE.x + BASE.w, BASE.y + BASE.d],
  cloudZ: [CLOUD_Z_MIN, CLOUD_Z_MAX],
  treeSpecs: TREE_SPECS,
  buildings: [
    { x0: TOWER.x, y0: TOWER.y, x1: TOWER.x + TOWER.w, y1: TOWER.y + TOWER.d, z: Z_CURB + TOWER_Z2 },
    { x0: house1.x, y0: house1.y, x1: house1.x + house1.w, y1: house1.y + house1.d, z: Z_CURB + 38 },
    { x0: house2.x, y0: house2.y, x1: house2.x + house2.w, y1: house2.y + house2.d, z: Z_CURB + 54 },
    { x0: station.x, y0: station.y, x1: station.x + station.w, y1: station.y + station.d, z: Z_CURB + 32 },
    { x0: warehouse.x, y0: warehouse.y, x1: warehouse.x + warehouse.w, y1: warehouse.y + warehouse.d, z: Z_CURB + 28 },
  ],
};

// SHADER GLSL INTEGRADO: RAYMARCHING DE VAPOR FBM 3D + REFRACCION CAUSTICA DE AGUA
const FRAGMENT_SHADER = `
${GLSL_ISO}

uniform float uRain;
uniform float uDay;
uniform float uLamp;
uniform float uFlash;
uniform vec2 uBaseMin;
uniform vec2 uBaseMax;
uniform vec3 uCloudMorph;

// Buffers de impactos de lluvia (hasta 12 impactos simultáneos con cálculo de cáusticas)
uniform vec3 uRipplePos[12];
uniform float uRippleAge[12];

// 1. SHADER DE NUBES VOLUMETRICAS EN FBM 3D (RAYMARCHING TIPO VAPOR COHETE CON MORPHING)
vec4 sampleVolumetricClouds(vec2 vb, float time) {
  vec3 eyeRay = towardViewer();
  vec3 pBase = onFloor(vb, 250.0);

  // Centros de los 2 cúmulos con deriva y morphing aleatorio continuo
  vec2 c1 = vec2(-95.0, -45.0) + uCloudMorph.xy + vec2(sin(time * 0.12) * 16.0, cos(time * 0.10) * 10.0);
  vec2 c2 = vec2(75.0, -35.0)  - uCloudMorph.xy + vec2(cos(time * 0.14) * 14.0, sin(time * 0.11) * 8.0);

  float d1 = length(pBase.xy - c1);
  float d2 = length(pBase.xy - c2);

  float envelope = smoothstep(115.0, 15.0, d1) * 0.95 + smoothstep(110.0, 15.0, d2) * 0.85;
  if (envelope < 0.01) return vec4(0.0);

  float accumDensity = 0.0;
  float lightScattering = 0.0;
  vec3 lightDir = normalize(vec3(0.35, 0.75, 0.90));

  for (int i = 0; i < 6; i++) {
    float stepZ = 220.0 + float(i) * 15.0;
    vec3 p = onFloor(vb, stepZ);

    vec3 fbmCoord = vec3(p.xy * 0.018 - vec2(time * 0.035, 0.0) + uCloudMorph.xz, (stepZ - 220.0) * 0.03 + uCloudMorph.y);
    float noiseVal = fbm3(fbmCoord);

    float dens = smoothstep(0.38, 0.72, noiseVal * envelope);
    accumDensity += dens * 0.22;

    float dotL = dot(normalize(vec3(0.0, 0.0, 1.0) + (noiseVal - 0.5) * 0.8), lightDir);
    lightScattering += dens * (0.35 + 0.65 * max(0.0, dotL));
  }

  vec3 cloudColor = mix(vec3(0.25, 0.28, 0.35), vec3(0.92, 0.95, 1.0), lightScattering / max(accumDensity, 0.001));

  if (uFlash > 0.05) {
    cloudColor = mix(cloudColor, vec3(1.0, 1.0, 1.2), uFlash * 0.7);
  }

  float cloudAlpha = clamp(accumDensity * (0.45 + uRain * 0.55), 0.0, 0.92);
  return vec4(cloudColor, cloudAlpha);
}

// 2. SHADER DE REFRACCION CAUSTICA Y ONDAS DE AGUA (TIPO RIPPLE TANK)
vec3 sampleCausticWaterFloor(vec2 vb, vec3 ground, float time) {
  bool inBase = ground.x >= uBaseMin.x && ground.x <= uBaseMax.x &&
                ground.y >= uBaseMin.y && ground.y <= uBaseMax.y;
  if (!inBase) return vec3(0.0);

  float floorNoise = fbm2(ground.xy * 0.04);
  vec3 asphaltCol = mix(vec3(0.05, 0.06, 0.07), vec3(0.12, 0.14, 0.16), floorNoise);

  float causticTotal = 0.0;
  for (int i = 0; i < 12; i++) {
    float age = uRippleAge[i];
    if (age <= 0.0 || age >= 1.0) continue;

    vec2 origin = uRipplePos[i].xy;
    float dist = length(ground.xy - origin);
    float waveRadius = age * 28.0;

    float k = 1.1;
    float delta = dist - waveRadius;
    float envelope = exp(-abs(delta) * 0.35) * exp(-age * 2.8);
    float wave = cos(delta * k) * envelope;

    float caustic = max(0.0, -wave) * envelope * 2.5;
    causticTotal += caustic;
  }

  float puddleMask = smoothstep(0.42, 0.58, noise2(ground.xy * 0.03 + vec2(1.2, 3.4)));
  vec3 waterReflection = vec3(0.04, 0.10, 0.15);

  float neonGlow = smoothstep(120.0, 20.0, length(ground.xy - vec2(-30.0, -60.0)));
  waterReflection += vec3(0.0, 0.95, 1.0) * neonGlow * 0.25;

  vec3 causticLight = vec3(0.85, 0.95, 1.0) * causticTotal * puddleMask * 0.85;
  vec3 finalFloor = mix(asphaltCol, waterReflection, puddleMask * 0.75) + causticLight;
  return finalFloor;
}

void main() {
  vec2 vb = viewOf(gl_FragCoord.xy);
  vec3 ground = onFloor(vb, 0.0);

  vec3 floorColor = sampleCausticWaterFloor(vb, ground, uTime);
  vec4 clouds = sampleVolumetricClouds(vb, uTime);

  vec3 finalComposite = mix(floorColor, clouds.rgb, clouds.a);

  if (uFlash > 0.05) {
    finalComposite += vec3(0.25, 0.35, 0.55) * uFlash;
  }

  gl_FragColor = vec4(finalComposite, max(0.0, max(clouds.a, float(floorColor.r > 0.01))));
}
`;

// 6. CODIGO CLIENTE JS INTERACTIVO (live.js)
const CLIENT_JS = `
const DATA = __DATA__;
const canvasGl = document.querySelector(".city-gl");
const canvasParticles = document.querySelector(".city-particles");
const readout = document.querySelector("[data-readout]");
const car1 = document.querySelector(".car-1");
const car2 = document.querySelector(".car-2");

let rainLevel = 0.65;
let lampOn = 1.0;
let dayMode = 0.0;
let flashTime = 0.0;
let carT = 0.0;
let cloudMorphOffset = [0, 0, 0];

// 1. POOL DE ARBOLES CON 2,048 PARTICULAS ANIMADAS POR VIENTO
const TOTAL_TREES = DATA.treeSpecs.length;
const PTS_PER_TREE = 256;
const treeParticles = [];

// Generador de partículas según especie
function buildTreeSpecies(treeIndex, spec) {
  const pts = [];
  const zBase = 2.5 + spec.height * 0.35;
  let seed = 1234 + treeIndex * 777;
  function rnd() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }

  for (let i = 0; i < PTS_PER_TREE; i++) {
    const u = rnd() * Math.PI * 2;
    const v = rnd() * Math.PI;
    let rx, ry, rz;

    if (spec.species === 0) {
      // 0. Ciprés Columnar (Cilindro elipsoidal esbelto)
      const rad = (0.3 + 0.7 * Math.sqrt(rnd())) * 3.5;
      const h = rnd() * spec.height;
      rx = rad * Math.cos(u) * (1.0 - (h / spec.height) * 0.4);
      ry = rad * Math.sin(u) * (1.0 - (h / spec.height) * 0.4);
      rz = zBase + h;
    } else if (spec.species === 1) {
      // 1. Roble de Copa Ancha (Hemisferio extendido)
      const rad = (0.2 + 0.8 * Math.cbrt(rnd())) * 7.5;
      rx = rad * Math.sin(v) * Math.cos(u);
      ry = rad * Math.sin(v) * Math.sin(u) * 0.9;
      rz = zBase + Math.abs(Math.cos(v)) * 6.5;
    } else if (spec.species === 2) {
      // 2. Sauce Llorón Bio-Digital (Ramas colgantes hacia el suelo)
      const t = rnd();
      const armR = t * 7.2;
      const droop = Math.pow(t, 1.8) * 9.5;
      rx = armR * Math.cos(u);
      ry = armR * Math.sin(u);
      rz = zBase + 8.5 - droop + (rnd() - 0.5) * 2.0;
    } else {
      // 3. Conífera Escalonada (3 conos superpuestos)
      const tier = Math.floor(rnd() * 3);
      const tierH = spec.height / 3;
      const localH = rnd() * tierH;
      const tierR = (3 - tier) * 2.2 * (1.0 - localH / tierH);
      rx = tierR * Math.cos(u);
      ry = tierR * Math.sin(u);
      rz = zBase + tier * tierH + localH;
    }

    pts.push({
      ox: spec.x + rx,
      oy: spec.y + ry,
      oz: rz,
      phase: rnd() * Math.PI * 2,
      heightRatio: (rz - zBase) / spec.height,
      species: spec.species
    });
  }
  return pts;
}

for (let t = 0; t < TOTAL_TREES; t++) {
  treeParticles.push(...buildTreeSpecies(t, DATA.treeSpecs[t]));
}

// 2. AVE VOLADORA FORMADA POR PARTICULAS 3D (CINEMATICA AERODINAMICA)
const BIRD_PTS = 48;
const birdState = {
  active: false,
  t: 0,
  duration: 7.5,
  p0: [-240, -40, 240],
  p1: [-60,  -80, 180],
  p2: [40,   20,  210],
  p3: [240,  60,  260],
  wingFreq: 26.0,
  trail: []
};

function triggerBirdFlight() {
  birdState.active = true;
  birdState.t = 0;
  // Trayectoria cúbica Bézier 3D aleatorizada en altura
  const zCurve = 190 + Math.random() * 40;
  birdState.p0 = [-240, -50 + Math.random() * 40, 230 + Math.random() * 30];
  birdState.p1 = [-60 + Math.random() * 30, -70 + Math.random() * 30, zCurve];
  birdState.p2 = [30 + Math.random() * 30, 10 + Math.random() * 30, zCurve + 15];
  birdState.p3 = [240, 40 + Math.random() * 40, 240 + Math.random() * 30];
  birdState.trail = [];
}

// Despegue automático inicial y recurrente
setTimeout(triggerBirdFlight, 2500);
setInterval(() => {
  if (!birdState.active && Math.random() < 0.45) triggerBirdFlight();
}, 16000);

// 3. POOL DE IMPACTOS DE LLUVIA PARA ONDAS CAUSTICAS (Max 12 simultáneas)
const MAX_RIPPLES = 12;
const ripples = [];
for (let i = 0; i < MAX_RIPPLES; i++) {
  ripples.push({ x: 0, y: 0, age: -1.0 });
}

// Pool de 48 gotas cayendo
const MAX_DROPS = 48;
const drops = [];
for (let i = 0; i < MAX_DROPS; i++) {
  drops.push({
    x: DATA.base[0] + 10 + Math.random() * (DATA.base[2] - DATA.base[0] - 20),
    y: DATA.base[1] + 10 + Math.random() * (DATA.base[3] - DATA.base[1] - 20),
    z: 220 + Math.random() * 50,
    speed: 520 + Math.random() * 160
  });
}

function spawnImpactRipple(x, y) {
  let oldestIdx = 0;
  let oldestAge = -1;
  for (let i = 0; i < MAX_RIPPLES; i++) {
    if (ripples[i].age < 0 || ripples[i].age >= 1.0) {
      oldestIdx = i;
      break;
    }
    if (ripples[i].age > oldestAge) {
      oldestAge = ripples[i].age;
      oldestIdx = i;
    }
  }
  ripples[oldestIdx] = { x, y, age: 0.001 };
}

// 4. CANVAS 2D DE ALTO RENDIMIENTO PARA PARTICULAS Y AVE
const ctx2d = canvasParticles.getContext("2d");

// 5. INICIALIZAR WEBGL CON SHADER DE NUBES FBM Y CAUSTICAS
const gl = canvasGl.getContext("webgl", { alpha: true, antialias: false });
let prog = null;
let uTimeLoc, uCanvasLoc, uViewLoc, uOriginLoc, uKLoc, uCamLoc;
let uRainLoc, uDayLoc, uLampLoc, uFlashLoc, uBaseMinLoc, uBaseMaxLoc, uCloudMorphLoc;
let uRipplePosLoc = [], uRippleAgeLoc = [];

if (gl) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}");
  gl.compileShader(vs);

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, DATA.fragmentShader);
  gl.compileShader(fs);

  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.error("FS Error:", gl.getShaderInfoLog(fs));
  }

  prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

  const pLoc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(pLoc);
  gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

  uTimeLoc = gl.getUniformLocation(prog, "uTime");
  uCanvasLoc = gl.getUniformLocation(prog, "uCanvas");
  uViewLoc = gl.getUniformLocation(prog, "uView");
  uOriginLoc = gl.getUniformLocation(prog, "uOrigin");
  uKLoc = gl.getUniformLocation(prog, "uK");
  uCamLoc = gl.getUniformLocation(prog, "uCam");
  uRainLoc = gl.getUniformLocation(prog, "uRain");
  uDayLoc = gl.getUniformLocation(prog, "uDay");
  uLampLoc = gl.getUniformLocation(prog, "uLamp");
  uFlashLoc = gl.getUniformLocation(prog, "uFlash");
  uBaseMinLoc = gl.getUniformLocation(prog, "uBaseMin");
  uBaseMaxLoc = gl.getUniformLocation(prog, "uBaseMax");
  uCloudMorphLoc = gl.getUniformLocation(prog, "uCloudMorph");

  for (let i = 0; i < MAX_RIPPLES; i++) {
    uRipplePosLoc.push(gl.getUniformLocation(prog, \`uRipplePos[\${i}]\`));
    uRippleAgeLoc.push(gl.getUniformLocation(prog, \`uRippleAge[\${i}]\`));
  }
}

function resize() {
  const rect = canvasGl.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  canvasGl.width = Math.round(rect.width * dpr);
  canvasGl.height = Math.round(rect.height * dpr);
  if (gl) gl.viewport(0, 0, canvasGl.width, canvasGl.height);

  canvasParticles.width = Math.round(rect.width * dpr);
  canvasParticles.height = Math.round(rect.height * dpr);
  ctx2d.setTransform(1, 0, 0, 1, 0, 0);
  ctx2d.scale(dpr * (rect.width / DATA.W), dpr * (rect.height / DATA.H));
}
window.addEventListener("resize", resize);
resize();

function project(x, y, z) {
  return iso([x, y, z], DATA.P);
}

let last = performance.now();

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  const timeSec = now * 0.001;

  // 1. Simulación de gotas descendentes y detección de impacto
  const activeCount = Math.round(MAX_DROPS * rainLevel);
  for (let i = 0; i < activeCount; i++) {
    const d = drops[i];
    d.z -= d.speed * dt;
    d.x += dt * 14;

    let hitZ = 0;
    for (let b = 0; b < DATA.buildings.length; b++) {
      const bg = DATA.buildings[b];
      if (d.x >= bg.x0 && d.x <= bg.x1 && d.y >= bg.y0 && d.y <= bg.y1) {
        hitZ = bg.z;
        break;
      }
    }

    if (d.z <= hitZ) {
      spawnImpactRipple(d.x, d.y);
      d.z = 220 + Math.random() * 40;
      d.x = DATA.base[0] + 15 + Math.random() * (DATA.base[2] - DATA.base[0] - 30);
      d.y = DATA.base[1] + 15 + Math.random() * (DATA.base[3] - DATA.base[1] - 30);
    }
  }

  // 2. Envejecimiento de ondas cáusticas
  for (let i = 0; i < MAX_RIPPLES; i++) {
    if (ripples[i].age >= 0.0 && ripples[i].age < 1.0) {
      ripples[i].age += dt * 1.35;
    }
  }

  // 3. Mini-vehiculos en bucle
  carT = (carT + dt * 0.22) % 1.0;
  if (car1) {
    const cx = DATA.base[0] + 40 + (DATA.base[2] - DATA.base[0] - 80) * ((carT * 2) % 1.0);
    car1.setAttribute("transform", translateAlong(DATA.P, [cx, 0, 0]));
  }

  // 4. Relampago de tormenta
  if (flashTime > 0) {
    flashTime -= dt * 3.5;
  } else if (rainLevel > 0.75 && Math.random() < 0.004) {
    flashTime = 1.0;
  }

  // 5. Renderizado WebGL (Nubes FBM + Cáusticas)
  if (gl && prog) {
    gl.useProgram(prog);
    gl.uniform1f(uTimeLoc, timeSec);
    gl.uniform2f(uCanvasLoc, canvasGl.width, canvasGl.height);
    gl.uniform2f(uViewLoc, DATA.W, DATA.H);
    gl.uniform2f(uOriginLoc, DATA.camera.origin[0], DATA.camera.origin[1]);
    gl.uniform1f(uKLoc, DATA.camera.k);
    gl.uniform4f(uCamLoc, DATA.camera.cam[0], DATA.camera.cam[1], DATA.camera.cam[2], DATA.camera.cam[3]);
    gl.uniform1f(uRainLoc, rainLevel);
    gl.uniform1f(uDayLoc, dayMode);
    gl.uniform1f(uLampLoc, lampOn);
    gl.uniform1f(uFlashLoc, Math.max(0.0, flashTime));
    gl.uniform2f(uBaseMinLoc, DATA.base[0], DATA.base[1]);
    gl.uniform2f(uBaseMaxLoc, DATA.base[2], DATA.base[3]);
    gl.uniform3f(uCloudMorphLoc, cloudMorphOffset[0], cloudMorphOffset[1], cloudMorphOffset[2]);

    for (let i = 0; i < MAX_RIPPLES; i++) {
      gl.uniform3f(uRipplePosLoc[i], ripples[i].x, ripples[i].y, 0.0);
      gl.uniform1f(uRippleAgeLoc[i], ripples[i].age);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  // 6. RENDERIZADO CANVAS 2D: ARBOLES ANIMADOS POR VIENTO + AVE DE PARTICULAS
  ctx2d.clearRect(0, 0, DATA.W, DATA.H);

  // A. Árboles de partículas con vaivén físico de hojas
  const windBase = Math.sin(timeSec * 1.8) * 1.8 + Math.cos(timeSec * 3.2) * 0.6;
  const L = [0.35, 0.75, 0.90]; // Luz cenital anterolateral
  const lightLen = Math.sqrt(L[0]**2 + L[1]**2 + L[2]**2);
  const Lnorm = L.map(v => v / lightLen);

  for (let i = 0; i < treeParticles.length; i++) {
    const p = treeParticles[i];
    // Vaivén proporcional a la altura de la rama
    const sway = windBase * Math.pow(p.heightRatio, 1.3);
    const flutter = Math.sin(timeSec * 8.5 + p.phase) * 0.45;

    const curX = p.ox + sway + flutter;
    const curY = p.oy + sway * 0.35;
    const curZ = p.oz;

    const p2D = project(curX, curY, curZ);

    // Sombreado por normal n·L
    const dot = Math.max(0.0, (flutter * 0.5 + 0.5) * Lnorm[0] + 0.6 * Lnorm[1] + 0.8 * Lnorm[2]);
    const intensity = 0.35 + 0.65 * dot;

    // Matiz según especie
    let r, g, b;
    if (p.species === 0) { // Ciprés verde azulado
      r = Math.round(15 + 140 * dot);
      g = Math.round(85 + 160 * intensity);
      b = Math.round(75 + 140 * dot);
    } else if (p.species === 1) { // Roble verde esmeralda
      r = Math.round(25 + 175 * dot);
      g = Math.round(95 + 155 * intensity);
      b = Math.round(35 + 110 * dot);
    } else if (p.species === 2) { // Sauce bio-digital con reflejo cian
      r = Math.round(10 + 120 * dot);
      g = Math.round(110 + 145 * intensity);
      b = Math.round(90 + 165 * dot);
    } else { // Conífera verde bosque
      r = Math.round(20 + 130 * dot);
      g = Math.round(70 + 140 * intensity);
      b = Math.round(30 + 90 * dot);
    }

    ctx2d.fillStyle = \`rgba(\${r},\${g},\${b},\${(0.45 + 0.55 * intensity).toFixed(2)})\`;
    ctx2d.fillRect(p2D[0] - 0.7, p2D[1] - 0.7, 1.4, 1.4);
  }

  // B. Ave de partículas articuladas 3D volando por el cielo
  if (birdState.active) {
    birdState.t += dt / birdState.duration;
    const bt = birdState.t;

    if (bt >= 1.0) {
      birdState.active = false;
    } else {
      // Interpolación curva cúbica Bézier 3D
      const u = 1.0 - bt;
      const bx = u*u*u*birdState.p0[0] + 3*u*u*bt*birdState.p1[0] + 3*u*bt*bt*birdState.p2[0] + bt*bt*bt*birdState.p3[0];
      const by = u*u*u*birdState.p0[1] + 3*u*u*bt*birdState.p1[1] + 3*u*bt*bt*birdState.p2[1] + bt*bt*bt*birdState.p3[1];
      const bz = u*u*u*birdState.p0[2] + 3*u*u*bt*birdState.p1[2] + 3*u*bt*bt*birdState.p2[2] + bt*bt*bt*birdState.p3[2];

      // Batido de alas armónico (4.5 Hz)
      const wingFlap = Math.sin(timeSec * birdState.wingFreq);

      // Dibujar partículas articuladas del ave
      // 1. Cabeza y Pico
      const pHead = project(bx + 4.0, by, bz);
      ctx2d.fillStyle = "#ffffff";
      ctx2d.fillRect(pHead[0] - 1.2, pHead[1] - 1.2, 2.4, 2.4);

      // 2. Columna y Torso
      for (let s = 0; s < 6; s++) {
        const seg = project(bx - s * 1.5, by, bz);
        ctx2d.fillStyle = s % 2 === 0 ? "rgba(0, 240, 255, 0.95)" : "rgba(220, 250, 255, 0.95)";
        ctx2d.fillRect(seg[0] - 1.0, seg[1] - 1.0, 2.0, 2.0);
      }

      // 3. Alas izquierda y derecha con flexión de plumas
      for (let w = 1; w <= 8; w++) {
        const span = w * 2.2;
        const wingDeflect = wingFlap * span * 0.38;
        const wingSweep = -w * 0.8;

        // Ala izquierda
        const pLeft = project(bx + wingSweep, by - span, bz + wingDeflect);
        // Ala derecha
        const pRight = project(bx + wingSweep, by + span, bz + wingDeflect);

        const alpha = (1.0 - (w / 8.0) * 0.3).toFixed(2);
        ctx2d.fillStyle = \`rgba(0, 240, 255, \${alpha})\`;
        ctx2d.fillRect(pLeft[0] - 0.9, pLeft[1] - 0.9, 1.8, 1.8);
        ctx2d.fillRect(pRight[0] - 0.9, pRight[1] - 0.9, 1.8, 1.8);
      }

      // Estela de partículas de vuelo
      birdState.trail.push({ x: bx, y: by, z: bz, age: 0 });
      if (birdState.trail.length > 20) birdState.trail.shift();
    }
  }

  // C. Renderizado de estela luminosa del ave
  for (let i = 0; i < birdState.trail.length; i++) {
    const tr = birdState.trail[i];
    tr.age += dt;
    const trAlpha = Math.max(0.0, 1.0 - tr.age / 0.55) * 0.45;
    if (trAlpha <= 0.01) continue;

    const tr2D = project(tr.x, tr.y, tr.z);
    ctx2d.fillStyle = \`rgba(0, 240, 255, \${trAlpha.toFixed(2)})\`;
    ctx2d.fillRect(tr2D[0] - 0.6, tr2D[1] - 0.6, 1.2, 1.2);
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// Control interactivo de telemetria
function updateTelemetry() {
  const mm = Math.round(rainLevel * 60);
  const status = rainLevel < 0.2 ? "Llovizna" : (rainLevel < 0.7 ? "Lluvia" : "Tormenta");
  const modeStr = dayMode > 0.5 ? "Dia" : "Noche";
  const birdStr = birdState.active ? "Ave: En vuelo rasante" : "Ave: Reposo";
  const text = \`\${mm} mm/h // \${status} // \${modeStr} // \${birdStr}\`;
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

// BOTON [ Variar Entorno ]: Regenera especies botánicas y morphing de nubes
window.varyEnvironment = function() {
  cloudMorphOffset[0] += 25.0 + Math.random() * 30.0;
  cloudMorphOffset[1] += 18.0 + Math.random() * 25.0;
  cloudMorphOffset[2] += 0.2 + Math.random() * 0.4;

  // Re-mutar especies de árboles
  for (let t = 0; t < TOTAL_TREES; t++) {
    DATA.treeSpecs[t].species = (DATA.treeSpecs[t].species + 1 + Math.floor(Math.random() * 3)) % 4;
    DATA.treeSpecs[t].height = 11 + Math.random() * 8;
  }
  treeParticles.length = 0;
  for (let t = 0; t < TOTAL_TREES; t++) {
    treeParticles.push(...buildTreeSpecies(t, DATA.treeSpecs[t]));
  }
  triggerBirdFlight();
  updateTelemetry();
};

// BOTON [ Vuelo de Ave ]: Gatilla vuelo acrobático inmediato del ave de partículas
window.triggerBird = function() {
  triggerBirdFlight();
  updateTelemetry();
};

updateTelemetry();
`;

DATA.fragmentShader = FRAGMENT_SHADER;

// 7. ENSAMBLAJE DE LA PLACA Y ESCENARIO
const LABEL_TEXT = "Diorama en miniatura vivo y dinamico: arboles de 2048 particulas con vaiven de viento en tiempo real, nubes de vapor FBM 3D con morphing procedural, ave voladora de particulas articuladas 3D y ondas causticas de impacto de lluvia.";

const backSvg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body: back, className: "city-back" });
const layerSvg = (name, body) => `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg city-layer ${name}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${body.join("")}</svg>`;

const stageHtml = `
<div class="city-stage" tabindex="0" role="group" aria-label="Maqueta en miniatura viva">
  <span class="city-said" aria-live="polite"></span>
  ${backSvg}
  <canvas class="city-layer city-gl" aria-hidden="true"></canvas>
  <canvas class="city-layer city-particles" aria-hidden="true"></canvas>
  ${layerSvg("city-mid", mid)}
  ${layerSvg("city-front", front)}
</div>
`;

const CAPTION_TEXT = `Diorama urbano vivo en proyeccion isometrica apaisada a 35 grados de acimut y 40 grados de elevacion. Arboles de 4 especies botanicas distintas formados por 2,048 particulas animadas con viento fisico en tiempo real. Nubes de vapor en shader FBM 3D con morphing procedural aleatorio. Un ave bio-digital de particulas articuladas 3D cruza el cielo batiendo sus alas a 4.5 Hz. Ondas causticas fisicas de refraccion optica en cada impacto de gota.`;

// Barra de navegación superior unificada
const topNavHtml = `
<header class="groove-nav-header">
    <div class="groove-brand">
        <span class="brand-sym">[+]</span>
        <span class="brand-text">LINUX GROOVE</span>
        <span class="brand-badge">DIORAMA URBANO VIVO // PARTICULAS 3D</span>
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

// Dock Inferior Minimalista (38px)
const bottomDockHtml = `
<div class="city-dock" aria-label="Controles del diorama vivo">
  <div class="dock-control">
    <span class="dock-label">// LLUVIA:</span>
    <input type="range" class="dock-slider" min="0" max="100" value="65" oninput="window.setRain(this.value / 100.0)">
  </div>
  <div class="dock-separator"></div>
  <button class="dock-btn" onclick="window.toggleDayNight()">[ Dia / Noche ]</button>
  <button class="dock-btn" onclick="window.varyEnvironment()">[ Variar Entorno ]</button>
  <button class="dock-btn" onclick="window.triggerBird()">[ Vuelo de Ave ]</button>
  <button class="dock-btn pulse" onclick="window.triggerStorm()">[ Pulso Tormenta ]</button>
</div>
`;

// Estilos CSS con correccion total de solapamientos y ajuste al viewport
const EXTRA_CSS = `
html, body {
  overflow: hidden;
  height: 100vh;
}
.iso-page {
  width: min(1040px, 95vw);
  margin: 48px auto 4px !important;
  height: calc(100vh - 56px);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.iso-figure {
  margin: 0 !important;
}
.iso-plate {
  padding: 10px 16px 12px !important;
}

/* CORRECCIÓN VISUAL: CERO SOLAPAMIENTOS EN ESQUINAS DE LA PLACA */
.iso-plate-corners {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  width: 100%;
}
.iso-plate-corner[data-corner="fig"] {
  font-weight: 700;
  color: #00f0ff;
}
.iso-plate-corner[data-corner="hint"] {
  max-width: 46%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #8c8c90;
}
.iso-plate-corner[data-corner="readout"] {
  max-width: 48%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: right;
  color: #00f0ff;
}

.city-stage {
  position: relative;
  width: 100%;
  aspect-ratio: ${W} / ${H};
  max-height: calc(100vh - 190px);
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
.city-particles {
  z-index: 10;
}

.groove-nav-header {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 44px;
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
  bottom: 0.6rem;
  left: 50%;
  transform: translateX(-50%);
  height: 38px;
  background: rgba(14, 18, 24, 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 240, 255, 0.25);
  border-radius: 19px;
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
  height: 16px;
  background: rgba(255, 255, 255, 0.12);
}
.dock-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #b0b0b8;
  font-family: inherit;
  font-size: 0.68rem;
  padding: 2px 7px;
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
  title: "Mini-City Diorama Vivo",
  hint: "Desliza para modular lluvia // Pulsa [Ave] para vuelo",
  readout: "Precipitacion: 39 mm/h // Noche",
  keys: [
    { mark: "lit", label: "Nubes Volumetricas FBM 3D con Morphing" },
    { mark: "raised", label: "Arboles: 2,048 Particulas con Vaiven de Viento" },
    { mark: "flat", label: "Ave de Particulas 3D y Ondas Causticas de Lluvia" },
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
  title: "Linux Groove - Diorama Urbano Vivo (Skill Anatomy & Particulas)",
  theme: "dark",
  body: pageBody,
  script: kitScript() + glScript() + CLIENT_JS.replace("__DATA__", JSON.stringify(DATA)),
  width: 1000,
});

writeFileSync("pruebas_web/public/city.html", fullHtml, "utf8");
writeFileSync("pruebas_web/public/machine_city.html", fullHtml, "utf8");

console.log("Diorama Urbano Vivo generado con exito!");
console.log("- city.html:", (fullHtml.length / 1024).toFixed(0), "KB");
