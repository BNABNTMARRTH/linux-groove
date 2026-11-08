// ==========================================================================
// LINUX GROOVE - DIORAMA URBANO HIPERREALISTA MULTI-MOTOR (SKILL ANATOMY)
// build_city.mjs: Maqueta 3D con Nubes Volumetricas FBM (tipo Vapor Cohete),
// Ondas Causticas Fisicas (tipo Ripple Tank), Arboles de Particulas 3D
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
const SIDEWALK_INSET = 12;
const innerBlock = k.insetPlan(BASE, SIDEWALK_INSET);
back.push(S(slab(innerBlock, 0, Z_CURB, 1, 0.2), { tone: "hi" }));

const streetWidth = 32;
const roadH = { x: innerBlock.x + 2, y: -streetWidth / 2, w: innerBlock.w - 4, d: streetWidth, r: 0 };
back.push(S(slab(roadH, Z_CURB, 0.1, 1, 0), { tone: "lo" }));

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

// C. ARQUITECTURA EN MINIATURA DE ALTA FIDELIDAD

// 1. TORRE CENTRAL EN MINIATURA
const TOWER = { x: -38, y: -75, w: 52, d: 48, r: 1.5 };
const TOWER_Z1 = 75;
const TOWER_Z2 = 125;
mid.push(S(slab(TOWER, Z_CURB, TOWER_Z1, 2, 0.6), { tone: "mid" }));

// Ventanitas con iluminación interior
for (let wz = Z_CURB + 10; wz < TOWER_Z1 - 8; wz += 12) {
  const win = { x: TOWER.x + 4, y: TOWER.y + TOWER.d - 0.8, w: TOWER.w - 8, d: 0.8, r: 0 };
  mid.push(S(slab(win, wz, 5, 1, 0), { tone: "lit" }));
}

// Remate superior con retranqueo
const towerTop = { x: TOWER.x + 6, y: TOWER.y + 6, w: TOWER.w - 12, d: TOWER.d - 12, r: 1 };
mid.push(S(slab(towerTop, Z_CURB + TOWER_Z1, TOWER_Z2 - TOWER_Z1, 2, 0.5), { tone: "hi" }));

// Helipuerto
const heliC = [towerTop.x + towerTop.w / 2, towerTop.y + towerTop.d / 2, Z_CURB + TOWER_Z2];
mid.push(S(k.cylinder(heliC[0], heliC[1], 11, heliC[2], 0.8, P, 20), { tone: "hi" }));
mid.push(Ln(k.ring(heliC[0], heliC[1], 8, heliC[2] + 0.8, P, 20), { tone: "lit" }));
const hR = 3.5;
const hz = heliC[2] + 0.9;
mid.push(Ln(k.lineOnTop([heliC[0] - hR, heliC[1] - hR], [heliC[0] - hR, heliC[1] + hR], hz, P), { tone: "lit" }));
mid.push(Ln(k.lineOnTop([heliC[0] + hR, heliC[1] - hR], [heliC[0] + hR, heliC[1] + hR], hz, P), { tone: "lit" }));
mid.push(Ln(k.lineOnTop([heliC[0] - hR, heliC[1]], [heliC[0] + hR, heliC[1]], hz, P), { tone: "lit" }));

// Antena con baliza
const antC = [towerTop.x + 6, towerTop.y + 6];
mid.push(S(k.cylinder(antC[0], antC[1], 1.2, heliC[2], 30, P, 10), { tone: "hi", crease: "none" }));
mid.push(Dots([at([antC[0], antC[1], heliC[2] + 30])], { size: 0.5, tone: "red" }));

// 2. CASITAS Y MODULOS RESIDENCIALES DEL OESTE
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

// 3. CENTRO COMERCIAL Y ESTACION ESTE
const station = { x: 70, y: -75, w: 75, d: 42, r: 1.5 };
mid.push(S(slab(station, Z_CURB, 32, 2, 0.4), { tone: "mid" }));
const canopy = { x: station.x - 6, y: station.y + station.d - 2, w: 48, d: 10, r: 0.8 };
mid.push(S(slab(canopy, Z_CURB + 14, 2.5, 1, 0.2), { tone: "lit" }));
mid.push(Ln(k.lineOnTop([station.x + 8, station.y + station.d + 0.5], [station.x + station.w - 8, station.y + station.d + 0.5], Z_CURB + 24, P), { tone: "lit" }));

// 4. ALMACEN SUR
const warehouse = { x: -130, y: 35, w: 55, d: 44, r: 1 };
mid.push(S(slab(warehouse, Z_CURB, 28, 2, 0.4), { tone: "mid" }));
for (const bx of [warehouse.x + 12, warehouse.x + 28, warehouse.x + 42]) {
  mid.push(S(k.cylinder(bx, warehouse.y - 4, 3.0, Z_CURB, 8, P, 12), { tone: "hi" }));
  mid.push(Dots([at([bx, warehouse.y - 4, Z_CURB + 9])], { size: 0.4, tone: "lit" }));
}

// D. ARBOLES VOLUMETRICOS DE PARTICULAS 3D (TIPO MOTOR ANATOMICO)
// Generador determinista de 2,048 particulas con sombreado normal n·L
const TREE_CENTERS = [
  [-160, 0, Z_CURB + 8],
  [-110, 20, Z_CURB + 8],
  [-10, 24, Z_CURB + 8],
  [80, 22, Z_CURB + 8],
  [135, 20, Z_CURB + 8],
  [-50, -22, Z_CURB + 8],
  [15, -22, Z_CURB + 8],
  [110, -22, Z_CURB + 8],
];

const LIGHT_DIR = [0.35, 0.75, 0.90]; // Luz cenital anterolateral
const lightLen = Math.sqrt(LIGHT_DIR[0]**2 + LIGHT_DIR[1]**2 + LIGHT_DIR[2]**2);
const L = LIGHT_DIR.map(v => v / lightLen);

let treeParticlesSvg = '<g class="iso-particle-trees" data-part="trees">';
let seed = 4321;
function lcg() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

for (const [tx, ty, tz] of TREE_CENTERS) {
  // Tronco estructural cilíndrico
  mid.push(S(k.cylinder(tx, ty, 1.2, Z_CURB, 7, P, 8), { tone: "lo", crease: "none" }));

  // Nube de 256 partículas densas por copa de árbol
  for (let i = 0; i < 256; i++) {
    const u = lcg() * Math.PI * 2;
    const v = lcg() * Math.PI;
    const rad = 2.0 + Math.cbrt(lcg()) * 4.8; // Masa esférica con volumen interior y corteza

    const nx = Math.sin(v) * Math.cos(u);
    const ny = Math.cos(v);
    const nz = Math.sin(v) * Math.sin(u);

    const px = tx + nx * rad;
    const py = ty + ny * rad;
    const pz = tz + nz * rad;

    const pt2D = at([px, py, pz]);

    // Producto punto de normal contra luz n·L
    const dot = Math.max(0.0, nx * L[0] + ny * L[1] + nz * L[2]);
    const intensity = 0.25 + 0.75 * dot;

    // Paleta botánica bio-digital: esmeralda profundo a verde menta iluminado
    const r = Math.round(15 + 180 * dot);
    const g = Math.round(75 + 175 * intensity);
    const b = Math.round(45 + 140 * dot);
    const size = (1.2 + 1.4 * dot).toFixed(1);
    const alpha = (0.35 + 0.65 * intensity).toFixed(2);

    treeParticlesSvg += `<circle cx="${pt2D[0].toFixed(1)}" cy="${pt2D[1].toFixed(1)}" r="${(size * 0.5).toFixed(1)}" fill="rgb(${r},${g},${b})" opacity="${alpha}" />`;
  }
}
treeParticlesSvg += '</g>';
mid.push(treeParticlesSvg);

// E. MINI-VEHICULOS CON FAROS DELANTEROS Y TRASEROS
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

// 4. METADATOS Y SHADER WEBGL MULTI-MOTOR (FBM CLOUDS + RIPPLE CAUSTICS)
const DATA = {
  W,
  H,
  P,
  camera: glCamera(P),
  base: [BASE.x, BASE.y, BASE.x + BASE.w, BASE.y + BASE.d],
  cloudZ: [CLOUD_Z_MIN, CLOUD_Z_MAX],
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

// Buffers de impactos de lluvia (hasta 12 impactos simultáneos con cálculo de cáusticas)
uniform vec3 uRipplePos[12];  // xy: posicion suelo, z: tiempo de impacto
uniform float uRippleAge[12]; // edad normalizada [0.0, 1.0]

// 1. SHADER DE NUBES VOLUMETRICAS EN FBM 3D (RAYMARCHING TIPO VAPOR COHETE)
vec4 sampleVolumetricClouds(vec2 vb, float time) {
  // Proyectar el rayo de vista en el rango de altitud de nubes Z in [210.0, 310.0]
  vec3 eyeRay = towardViewer();
  vec3 pBase = onFloor(vb, 250.0);

  // Centros de los 2 cúmulos de nubes
  vec2 c1 = vec2(-95.0, -45.0) + vec2(sin(time * 0.15) * 15.0, cos(time * 0.12) * 8.0);
  vec2 c2 = vec2(75.0, -35.0)  + vec2(cos(time * 0.18) * 12.0, sin(time * 0.14) * 6.0);

  float d1 = length(pBase.xy - c1);
  float d2 = length(pBase.xy - c2);

  // Mascara de volumen de nube con caida radial suave
  float envelope = smoothstep(110.0, 15.0, d1) * 0.95 + smoothstep(105.0, 15.0, d2) * 0.85;
  if (envelope < 0.01) return vec4(0.0);

  // Raymarching de 6 pasos a lo largo del volumen
  float accumDensity = 0.0;
  float lightScattering = 0.0;
  vec3 lightDir = normalize(vec3(0.35, 0.75, 0.90));

  for (int i = 0; i < 6; i++) {
    float stepZ = 220.0 + float(i) * 15.0;
    vec3 p = onFloor(vb, stepZ);

    // Ruido fractal turbulento Browniano 3D (FBM3)
    vec3 fbmCoord = vec3(p.xy * 0.018 - vec2(time * 0.04, 0.0), (stepZ - 220.0) * 0.03);
    float noiseVal = fbm3(fbmCoord);

    float dens = smoothstep(0.38, 0.72, noiseVal * envelope);
    accumDensity += dens * 0.22;

    // Dispersión luminosa anterolateral
    float dotL = dot(normalize(vec3(0.0, 0.0, 1.0) + (noiseVal - 0.5) * 0.8), lightDir);
    lightScattering += dens * (0.35 + 0.65 * max(0.0, dotL));
  }

  // Tonalidad de nube: algodon blanco difuso con nucleo sombreado
  vec3 cloudColor = mix(vec3(0.25, 0.28, 0.35), vec3(0.92, 0.95, 1.0), lightScattering / max(accumDensity, 0.001));

  // Destello de relampago interior de nube
  if (uFlash > 0.05) {
    cloudColor = mix(cloudColor, vec3(1.0, 1.0, 1.2), uFlash * 0.7);
  }

  float cloudAlpha = clamp(accumDensity * (0.45 + uRain * 0.55), 0.0, 0.92);
  return vec4(cloudColor, cloudAlpha);
}

// 2. SHADER DE REFRACCION CAUSTICA Y ONDAS DE AGUA (TIPO RIPPLE TANK)
vec3 sampleCausticWaterFloor(vec2 vb, vec3 ground, float time) {
  // Mascara de calzada asfaltada
  bool inBase = ground.x >= uBaseMin.x && ground.x <= uBaseMax.x &&
                ground.y >= uBaseMin.y && ground.y <= uBaseMax.y;
  if (!inBase) return vec3(0.0);

  // Color de base de asfalto y charcos
  float floorNoise = fbm2(ground.xy * 0.04);
  vec3 asphaltCol = mix(vec3(0.05, 0.06, 0.07), vec3(0.12, 0.14, 0.16), floorNoise);

  // Campo de causticas por impacto de gotas (Simulacion de optica y curvatura de onda)
  float causticTotal = 0.0;
  vec2 waveGradient = vec2(0.0);

  for (int i = 0; i < 12; i++) {
    float age = uRippleAge[i];
    if (age <= 0.0 || age >= 1.0) continue;

    vec2 origin = uRipplePos[i].xy;
    float dist = length(ground.xy - origin);
    float waveRadius = age * 28.0;

    // Ecuacion de dispersion de ondas capilares con decaimiento viscoso
    float k = 1.1; // frecuencia espacial
    float delta = dist - waveRadius;
    float envelope = exp(-abs(delta) * 0.35) * exp(-age * 2.8);
    float wave = cos(delta * k) * envelope;

    // Curvatura que enfoca la luz creando la linea caustica brillante
    float caustic = max(0.0, -wave) * envelope * 2.5;
    causticTotal += caustic;

    if (dist > 0.1) {
      waveGradient += (ground.xy - origin) / dist * wave * 0.15;
    }
  }

  // Reflejo especular en los charcos mojados
  float puddleMask = smoothstep(0.42, 0.58, noise2(ground.xy * 0.03 + vec2(1.2, 3.4)));
  vec3 waterReflection = vec3(0.04, 0.10, 0.15);

  // Faros de cochecitos y luces de neón reflejadas en los charcos
  float neonGlow = smoothstep(120.0, 20.0, length(ground.xy - vec2(-30.0, -60.0)));
  waterReflection += vec3(0.0, 0.95, 1.0) * neonGlow * 0.25;

  // Banda caustica concentrada (luz focalizada del Ripple Tank)
  vec3 causticLight = vec3(0.85, 0.95, 1.0) * causticTotal * puddleMask * 0.85;

  vec3 finalFloor = mix(asphaltCol, waterReflection, puddleMask * 0.75) + causticLight;
  return finalFloor;
}

void main() {
  vec2 vb = viewOf(gl_FragCoord.xy);
  vec3 ground = onFloor(vb, 0.0);

  // Capa 1: Suelo y causticas de agua
  vec3 floorColor = sampleCausticWaterFloor(vb, ground, uTime);

  // Capa 2: Nubes volumetricas en FBM 3D
  vec4 clouds = sampleVolumetricClouds(vb, uTime);

  // Composicion de capas con mezcla alfa
  vec3 finalComposite = mix(floorColor, clouds.rgb, clouds.a);

  // Destello ambiental de tormenta
  if (uFlash > 0.05) {
    finalComposite += vec3(0.25, 0.35, 0.55) * uFlash;
  }

  gl_FragColor = vec4(finalComposite, max(0.0, max(clouds.a, float(floorColor.r > 0.01))));
}
`;

// 5. CODIGO CLIENTE JS INTERACTIVO (live.js)
const CLIENT_JS = `
const DATA = __DATA__;
const canvas = document.querySelector(".city-gl");
const readout = document.querySelector("[data-readout]");
const car1 = document.querySelector(".car-1");
const car2 = document.querySelector(".car-2");

let rainLevel = 0.65;
let lampOn = 1.0;
let dayMode = 0.0;
let flashTime = 0.0;
let carT = 0.0;

// POOL DE IMPACTOS DE LLUVIA PARA ONDAS CAUSTICAS (Max 12 simultáneas)
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

// Inicializar WebGL con shader de nubes y cáusticas
const gl = canvas.getContext("webgl", { alpha: true, antialias: false });
let prog = null;
let uTimeLoc, uCanvasLoc, uViewLoc, uOriginLoc, uKLoc, uCamLoc;
let uRainLoc, uDayLoc, uLampLoc, uFlashLoc, uBaseMinLoc, uBaseMaxLoc;
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

  for (let i = 0; i < MAX_RIPPLES; i++) {
    uRipplePosLoc.push(gl.getUniformLocation(prog, \`uRipplePos[\${i}]\`));
    uRippleAgeLoc.push(gl.getUniformLocation(prog, \`uRippleAge[\${i}]\`));
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener("resize", resize);
  resize();
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
      // IMPACTO EXACTO: Excitación del campo de ondas cáusticas
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

  // 5. Renderizado WebGL
  if (gl && prog) {
    gl.useProgram(prog);
    gl.uniform1f(uTimeLoc, timeSec);
    gl.uniform2f(uCanvasLoc, canvas.width, canvas.height);
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

    for (let i = 0; i < MAX_RIPPLES; i++) {
      gl.uniform3f(uRipplePosLoc[i], ripples[i].x, ripples[i].y, 0.0);
      gl.uniform1f(uRippleAgeLoc[i], ripples[i].age);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// Control interactivo de telemetria
function updateTelemetry() {
  const mm = Math.round(rainLevel * 60);
  const status = rainLevel < 0.2 ? "Llovizna suave" : (rainLevel < 0.7 ? "Lluvia sostenida" : "Tormenta electrica");
  const modeStr = dayMode > 0.5 ? "Dia" : "Noche";
  const text = \`Precipitacion: \${mm} mm/h // \${status} // Modo: \${modeStr}\`;
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

DATA.fragmentShader = FRAGMENT_SHADER;

// 6. ENSAMBLAJE DE LA PLACA Y ESCENARIO
const LABEL_TEXT = "Diorama en miniatura hiperrealista: pedestal flotante con calzadas, rascacielos miniatura, casas modulares, arboles de 2048 particulas volumetricas 3D con sombreado por normales, nubes de vapor FBM 3D y lluvia con ondas causticas fisicas.";

const backSvg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body: back, className: "city-back" });
const layerSvg = (name, body) => `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg city-layer ${name}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${body.join("")}</svg>`;

const stageHtml = `
<div class="city-stage" tabindex="0" role="group" aria-label="Maqueta en miniatura hiperrealista">
  <span class="city-said" aria-live="polite"></span>
  ${backSvg}
  <canvas class="city-layer city-gl" aria-hidden="true"></canvas>
  ${layerSvg("city-mid", mid)}
  ${layerSvg("city-front", front)}
</div>
`;

const CAPTION_TEXT = `Diorama urbano hiperrealista en proyeccion isometrica apaisada a 35 grados de acimut y 40 grados de elevacion. Combina nubes de vapor en shader WebGL volumetrico fractal 3D (FBM), arboles formados por nubes de 2,048 particulas volumetricas con iluminacion vectorial normal n·L, y lluvia donde cada gota excita un campo de ondas causticas con refraccion optica en el asfalto.`;

// Barra de navegación superior homologada
const topNavHtml = `
<header class="groove-nav-header">
    <div class="groove-brand">
        <span class="brand-sym">[+]</span>
        <span class="brand-text">LINUX GROOVE</span>
        <span class="brand-badge">DIORAMA HIPERREALISTA // MULTI-MOTOR</span>
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

// Dock Inferior Minimalista (40px)
const bottomDockHtml = `
<div class="city-dock" aria-label="Controles del diorama hiperrealista">
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

// Estilos CSS con correccion de solapamiento de textos y ajuste total al viewport
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

/* CORRECCIÓN DE SOLAPAMIENTO DE TEXTOS EN LAS ESQUINAS */
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
  title: "Mini-City Diorama",
  hint: "Desliza para modular nubes y lluvia",
  readout: "Precipitacion: 39 mm/h // Noche",
  keys: [
    { mark: "lit", label: "Nubes Volumetricas FBM 3D (Raymarching de Vapor)" },
    { mark: "raised", label: "Arboles: Nubes de 2,048 Particulas 3D (n·L)" },
    { mark: "flat", label: "Ondas Causticas Fisicas de Lluvia (Refraccion)" },
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
  title: "Linux Groove - Diorama Urbano Hiperrealista (Skill Anatomy & WebGL)",
  theme: "dark",
  body: pageBody,
  script: kitScript() + glScript() + CLIENT_JS.replace("__DATA__", JSON.stringify(DATA)),
  width: 1000,
});

writeFileSync("pruebas_web/public/city.html", fullHtml, "utf8");
writeFileSync("pruebas_web/public/machine_city.html", fullHtml, "utf8");

console.log("Diorama Urbano Hiperrealista generado con exito!");
console.log("- city.html:", (fullHtml.length / 1024).toFixed(0), "KB");
