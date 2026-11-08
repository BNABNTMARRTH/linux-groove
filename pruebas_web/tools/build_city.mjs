// ==========================================================================
// LINUX GROOVE - CIUDAD ISOMETRICA 3D (SKILL ANATOMY + SHADER WEBGL)
// build_city.mjs: Generador Tecnico de Arquitectura Isometria Vectorial
// Sombreado de 4 tonos, viaducto de transito, farola cenital y lluvia WebGL
// ==========================================================================

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(".agents/skills/anatomy");
const k = await import(join(ROOT, "kit/iso-kit.mjs"));
const G = await import(join(ROOT, "kit/lathe.mjs"));
const { glCamera, GLSL_ISO } = await import(join(ROOT, "kit/gl.mjs"));
const { kitScript, glScript } = await import(join(ROOT, "scripts/inline-kit.mjs"));

const W = 760;
const H = 760;
const AZIMUTH = 35;
const ELEVATION = 44;

// 1. DIMENSIONES DE LA PLACA BASE Y ELEMENTOS
const BASE_H = 16;
const FOOT_H = 6;
const BASE = { x: -180, y: -150, w: 360, d: 300, r: 10 };
const STREET_Y = 30;
const STREET_W = 75;

// Farola Cenital Cenit (Spotlight Mast)
const LAMP = [0, -10, 540];
const POST = [165, BASE.y + 16];
const POST_R = 4.5;
const ARM_Z = LAMP[2] + 25;
const POST_TOP = ARM_Z + 18;

// Rascacielos Alfa (Torre de Telecomunicaciones)
const TOWER_A_PODIUM = { x: -110, y: -120, w: 85, d: 85, r: 2 };
const TOWER_A_MID = { x: -100, y: -110, w: 65, d: 65, r: 1.5 };
const TOWER_A_TOP = { x: -88, y: -98, w: 42, d: 42, r: 1 };
const TOWER_A_Z0 = 0;
const TOWER_A_Z1 = 70;
const TOWER_A_Z2 = 190;
const TOWER_A_Z3 = 290;
const ANTENNA_TOP = 360;

// Spire Cuantico (Centro de Datos)
const TOWER_B = { x: 35, y: -125, w: 60, d: 68, r: 1.2 };
const TOWER_B_Z = 220;

// Subestacion Industrial
const SUBSTATION = { x: -150, y: 35, w: 75, d: 60, r: 1 };
const SUB_Z = 65;

// Viaducto de Monorrail Elevado
const VIADUCT_Z = 85;
const VIADUCT_Y = 100;
const VIADUCT_BEAM = { x: BASE.x - 10, y: VIADUCT_Y - 5, w: BASE.w + 20, d: 10, r: 1 };

// Caja de Control Analogo (Instrument Box)
const BOX = { x: BASE.x + 8, y: 45, w: 42, d: 75, r: 3.5 };
const BOX_Z = 2;
const BOX_TOP = BOX_Z + 22;

// 2. CONFIGURACION DE PROYECCION ISOMETRICA
const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [0, 0, ARM_Z + 15],
    [POST[0] - 6, POST[1] - 6, POST_TOP + 4],
    [POST[0] + 6, POST[1] + 6, POST_TOP + 4],
    [-70, -75, ANTENNA_TOP + 10],
    ...k.boxCorners(VIADUCT_BEAM, VIADUCT_Z - 10, VIADUCT_Z + 12),
  ],
  W,
  H,
  { pad: 55, azimuth: AZIMUTH, elevation: ELEVATION }
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0.5) => k.slabOf(plan, z, h, P, steps, bevel);
const UP = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);

console.log("Proyeccion calculada con exito. Escala:", P.scale.toFixed(3));

// 3. CAPAS DE DIBUJO (PAINTER'S ORDER)
const back = [];
const mid = [];
const front = [];

// A. PLACA BASE INFERIOR (Capa Back)
// Patas y zócalo de la base
for (const [fx, fy] of [
  [BASE.x + 18, BASE.y + 18],
  [BASE.x + BASE.w - 18, BASE.y + 18],
  [BASE.x + 18, BASE.y + BASE.d - 18],
  [BASE.x + BASE.w - 18, BASE.y + BASE.d - 18],
]) {
  back.push(S(k.cylinder(fx, fy, 10, -BASE_H - FOOT_H, FOOT_H, P, 18), { tone: "lo" }));
}

// Bloque macizo de la placa base
back.push(S(slab(BASE, -BASE_H, BASE_H, 4, 1.2), { tone: "mid" }));

// Reglas milimetricas e inscripciones en los bordes de la placa base
const tickLineX = k.topTicks(BASE.x + 16, BASE.x + BASE.w - 16, 4, 10, BASE.y + 2.5, 0, [1.0, 2.0], P, "x");
const tickLineY = k.topTicks(BASE.y + 16, BASE.y + BASE.d - 16, 4, 10, BASE.x + 2.5, 0, [1.0, 2.0], P, "y");
back.push(Ln(tickLineX.minor + tickLineY.minor, { tone: "lo" }));
back.push(Ln(tickLineX.major + tickLineY.major, { tone: "mid" }));

// Tornillos de anclaje en las esquinas
for (const [cx, cy] of [
  [BASE.x + 8, BASE.y + 8],
  [BASE.x + BASE.w - 8, BASE.y + 8],
  [BASE.x + 8, BASE.y + BASE.d - 8],
  [BASE.x + BASE.w - 8, BASE.y + BASE.d - 8],
]) {
  back.push(
    S(k.cylinder(cx, cy, 3.2, -0.4, 0.4, P, 6), { tone: "hi" }) +
    Dots([at([cx, cy, 0.2])], { size: 0.45, tone: "hi" })
  );
}

// B. SUELO DE LA CIUDAD (Pistas, Avenidas y Asfalto)
// Cuadricula del pavimento de la ciudad
const gridStepsX = 6;
const gridStepsY = 5;
for (let i = 1; i < gridStepsX; i++) {
  const gx = BASE.x + (BASE.w / gridStepsX) * i;
  back.push(Ln(k.lineOnTop([gx, BASE.y + 10], [gx, BASE.y + BASE.d - 10], 0.1, P), { tone: "faint" }));
}
for (let j = 1; j < gridStepsY; j++) {
  const gy = BASE.y + (BASE.d / gridStepsY) * j;
  back.push(Ln(k.lineOnTop([BASE.x + 10, gy], [BASE.x + BASE.w - 10, gy], 0.1, P), { tone: "faint" }));
}

// Líneas de demarcación vial en la avenida principal
const laneStep = 24;
for (let lx = BASE.x + 20; lx < BASE.x + BASE.w - 20; lx += laneStep) {
  back.push(Ln(k.lineOnTop([lx, STREET_Y], [lx + 12, STREET_Y], 0.2, P), { tone: "hi", dashed: true }));
}

// C. CAPA MID: ARQUITECTURA DE RASCACIELOS Y ESTRUCTURAS

// 1. TORRE ALFA (Megatorre de Telecomunicaciones con Helipuerto)
// Nivel 1: Podio comercial
mid.push(S(slab(TOWER_A_PODIUM, TOWER_A_Z0, TOWER_A_Z1, 3, 0.8), { tone: "mid" }));
// Ventilación de planta baja y pórtico
const portalPlan = { x: TOWER_A_PODIUM.x + 20, y: TOWER_A_PODIUM.y + TOWER_A_PODIUM.d - 2, w: 45, d: 2, r: 0 };
mid.push(S(slab(portalPlan, 0, 18, 1, 0), { tone: "lo" }));
mid.push(Ln(k.lineOnTop([portalPlan.x, portalPlan.y + 1], [portalPlan.x + portalPlan.w, portalPlan.y + 1], 18, P), { tone: "lit" }));

// Nivel 2: Fuste principal con celosías verticales
mid.push(S(slab(TOWER_A_MID, TOWER_A_Z1, TOWER_A_Z2 - TOWER_A_Z1, 3, 0.6), { tone: "hi" }));
// Ranuras de ventanas en la fachada frontal
for (let wz = TOWER_A_Z1 + 15; wz < TOWER_A_Z2 - 10; wz += 22) {
  const windowStrip = { x: TOWER_A_MID.x + 6, y: TOWER_A_MID.y + TOWER_A_MID.d - 1, w: TOWER_A_MID.w - 12, d: 1, r: 0 };
  mid.push(S(slab(windowStrip, wz, 7, 1, 0), { tone: "lo" }));
  mid.push(Ln(k.lineOnTop([windowStrip.x, windowStrip.y + 0.5], [windowStrip.x + windowStrip.w, windowStrip.y + 0.5], wz + 7, P), { tone: "lit" }));
}

// Nivel 3: Ático y plataforma de helipuerto
mid.push(S(slab(TOWER_A_TOP, TOWER_A_Z2, TOWER_A_Z3 - TOWER_A_Z2, 3, 0.5), { tone: "mid" }));

// Helipuerto en la azotea (Círculo y letra H)
const heliCenter = [TOWER_A_TOP.x + TOWER_A_TOP.w / 2, TOWER_A_TOP.y + TOWER_A_TOP.d / 2, TOWER_A_Z3];
mid.push(S(k.cylinder(heliCenter[0], heliCenter[1], 16, TOWER_A_Z3, 1.2, P, 24), { tone: "hi" }));
mid.push(Ln(k.ring(heliCenter[0], heliCenter[1], 12, TOWER_A_Z3 + 1.2, P, 24), { tone: "lit" }));
// Letra H del helipuerto
const hHalf = 5;
const hZ = TOWER_A_Z3 + 1.4;
mid.push(Ln(k.lineOnTop([heliCenter[0] - hHalf, heliCenter[1] - hHalf], [heliCenter[0] - hHalf, heliCenter[1] + hHalf], hZ, P), { tone: "lit" }));
mid.push(Ln(k.lineOnTop([heliCenter[0] + hHalf, heliCenter[1] - hHalf], [heliCenter[0] + hHalf, heliCenter[1] + hHalf], hZ, P), { tone: "lit" }));
mid.push(Ln(k.lineOnTop([heliCenter[0] - hHalf, heliCenter[1]], [heliCenter[0] + hHalf, heliCenter[1]], hZ, P), { tone: "lit" }));

// Mástil de Antena de Telecomunicaciones
const mastCenter = [heliCenter[0] + 10, heliCenter[1] - 10];
mid.push(S(k.cylinder(mastCenter[0], mastCenter[1], 2.2, TOWER_A_Z3, ANTENNA_TOP - TOWER_A_Z3, P, 16), { tone: "hi", crease: "none" }));
mid.push(S(k.cylinder(mastCenter[0], mastCenter[1], 4.2, ANTENNA_TOP - 15, 3.0, P, 16), { tone: "mid" }));
mid.push(Dots([at([mastCenter[0], mastCenter[1], ANTENNA_TOP])], { size: 0.65, tone: "lit" }));

// 2. SPIRE CUANTICO (Data Center con Disipadores Verticales)
mid.push(S(slab(TOWER_B, 0, TOWER_B_Z, 3, 0.8), { tone: "mid" }));
// Aletas de refrigeración vertical en la cara visible
for (let fx = TOWER_B.x + 8; fx < TOWER_B.x + TOWER_B.w - 6; fx += 10) {
  const fin = { x: fx, y: TOWER_B.y + TOWER_B.d - 1.5, w: 2.2, d: 2.5, r: 0.2 };
  mid.push(S(slab(fin, 20, TOWER_B_Z - 40, 2, 0.2), { tone: "hi" }));
}
// Antena Parabólica de Azotea
const dishFrame = G.frameAlong([TOWER_B.x + 22, TOWER_B.y + 22, TOWER_B_Z + 12], [0.4, 0.3, 0.85]);
mid.push(S(G.lathe([[0, 0], [1.5, 3], [3, 8], [4, 12], [4.5, 12.5], [3.8, 12]], dishFrame, P, { steps: 24 }), { tone: "hi" }));
mid.push(S(k.cylinder(TOWER_B.x + 22, TOWER_B.y + 22, 1.8, TOWER_B_Z, 12, P, 12), { tone: "mid" }));

// 3. SUBESTACION ELECTRICA Y MODULOS INDUSTRIALES
mid.push(S(slab(SUBSTATION, 0, SUB_Z, 2, 0.6), { tone: "mid" }));
// Aisladores de alta tensión (Bobinas cerámicas)
for (let ix = SUBSTATION.x + 14; ix < SUBSTATION.x + SUBSTATION.w - 10; ix += 20) {
  const by = SUBSTATION.y + SUBSTATION.d / 2;
  mid.push(S(k.cylinder(ix, by, 4.5, SUB_Z, 16, P, 16, 0.4), { tone: "hi" }));
  mid.push(S(k.cylinder(ix, by, 2.0, SUB_Z + 16, 6, P, 12), { tone: "lit" }));
  mid.push(Dots([at([ix, by, SUB_Z + 22])], { size: 0.45, tone: "lit" }));
}

// 4. VIADUCTO ELEVADO DEL MONORRAIL
// Pilares de sustentación estructural
for (const px of [BASE.x + 40, 0, BASE.x + BASE.w - 40]) {
  const pylonPlan = { x: px - 6, y: VIADUCT_Y - 4, w: 12, d: 8, r: 0.8 };
  mid.push(S(slab(pylonPlan, 0, VIADUCT_Z, 2, 0.4), { tone: "mid" }));
  mid.push(S(slab({ x: px - 8, y: VIADUCT_Y - 6, w: 16, d: 12, r: 0.8 }, VIADUCT_Z - 6, 6, 2), { tone: "hi" }));
}
// Viga cajón longitudinal del viaducto
mid.push(S(slab(VIADUCT_BEAM, VIADUCT_Z, 8, 2, 0.4), { tone: "hi" }));
// Vías guía tubulares
mid.push(Ln(k.lineOnTop([VIADUCT_BEAM.x, VIADUCT_Y - 2], [VIADUCT_BEAM.x + VIADUCT_BEAM.w, VIADUCT_Y - 2], VIADUCT_Z + 8, P), { tone: "lit" }));
mid.push(Ln(k.lineOnTop([VIADUCT_BEAM.x, VIADUCT_Y + 2], [VIADUCT_BEAM.x + VIADUCT_BEAM.w, VIADUCT_Y + 2], VIADUCT_Z + 8, P), { tone: "lit" }));

// Cápsula Aerodinámica de Tránsito (Animada con JS en el cliente)
const POD_W = 34;
const POD_D = 7;
const POD_H = 6;
const podPlan = { x: -POD_W / 2, y: VIADUCT_Y - POD_D / 2, w: POD_W, d: POD_D, r: 2 };
mid.push(
  `<g data-part="monorail-pod">` +
  S(slab(podPlan, VIADUCT_Z + 8, POD_H, 2, 0.6), { tone: "lit" }) +
  Ln(k.lineOnTop([podPlan.x + 2, VIADUCT_Y], [podPlan.x + POD_W - 2, VIADUCT_Y], VIADUCT_Z + 8 + POD_H, P), { tone: "hi" }) +
  Dots([at([podPlan.x + POD_W - 2, VIADUCT_Y, VIADUCT_Z + 8 + POD_H / 2])], { size: 0.5, tone: "lit" }) +
  `</g>`
);

// D. FAROLA CENITAL MASTIL (Idéntica a la del Ripple Tank)
// Poste vertical cilíndrico
front.push(S(k.cylinder(POST[0], POST[1], POST_R + 1.8, 0, 16, P, 18, 0.4), { tone: "mid" }));
front.push(S(k.cylinder(POST[0], POST[1], POST_R, 16, POST_TOP - 16, P, 18), { tone: "mid", crease: "none" }));
front.push(S(k.cylinder(POST[0], POST[1], POST_R + 0.8, ARM_Z - 6, 12, P, 18, 0.3), { tone: "hi" }));

// Brazo horizontal articulado que se proyecta sobre la ciudad
const armStart = at([POST[0], POST[1], ARM_Z]);
const armEnd = at([LAMP[0], LAMP[1], ARM_Z]);
const strutStart = at([POST[0] - 25, POST[1], ARM_Z]);
const strutEnd = at([POST[0], POST[1], ARM_Z + 14]);

front.push(Ln(k.pathOf([armStart, armEnd]), { tone: "hi", className: "arm-tube" }));
front.push(Ln(k.pathOf([strutStart, strutEnd]), { tone: "mid" }));

// Cabezal de la lámpara cenital
const lampHeadCenter = [LAMP[0], LAMP[1], LAMP[2]];
front.push(S(k.cylinder(lampHeadCenter[0], lampHeadCenter[1], 10, LAMP[2], 14, P, 24, 0.4), { tone: "hi" }));
front.push(S(k.cylinder(lampHeadCenter[0], lampHeadCenter[1], 12, LAMP[2] - 3, 3, P, 24), { tone: "lit" }));
front.push(Dots([at(lampHeadCenter)], { size: 0.8, tone: "lit" }));

// E. CONSOLA DE CONTROL INSTRUMENTAL (En la placa base)
front.push(S(slab(BOX, BOX_Z, BOX_TOP - BOX_Z, 3, 0.8), { tone: "mid" }));
// Interruptores analógicos y diales de la consola
const knobPos = [BOX.x + 21, BOX.y + 48, BOX_TOP];
const switchPos = [BOX.x + 32, BOX.y + 20, BOX_TOP];
const ledPos = [BOX.x + 10, BOX.y + 20, BOX_TOP];

front.push(S(k.cylinder(knobPos[0], knobPos[1], 7.5, BOX_TOP, 5.0, P, 18, 0.4), { tone: "hi" }));
front.push(Ln(k.knurl(knobPos[0], knobPos[1], 7.5, BOX_TOP + 0.8, BOX_TOP + 4.2, 18, P), { tone: "lo" }));
front.push(S(k.cylinder(switchPos[0], switchPos[1], 2.2, BOX_TOP, 6.0, P, 12), { tone: "lit" }));
front.push(Dots([at(ledPos)], { size: 0.55, tone: "lit" }));

// 4. CONFIGURACION DE DATOS Y METADATOS PARA EL CLIENTE
const DATA = {
  W,
  H,
  P,
  camera: glCamera(P),
  base: [BASE.x, BASE.y, BASE.x + BASE.w, BASE.y + BASE.d],
  lamp: LAMP,
  lampActive: true,
  rainDensity: 0.65,
  neonMode: 1.0,
  monorailZ: VIADUCT_Z + 8,
  monorailX0: VIADUCT_BEAM.x + 20,
  monorailX1: VIADUCT_BEAM.x + VIADUCT_BEAM.w - 20,
  monorailY: VIADUCT_Y,
};

// 5. FRAGMENT SHADER GLSL ISOMETRICO (Lluvia, Charcos y Reflejos en Asfalto)
const FRAGMENT_SHADER = `
${GLSL_ISO}

uniform float uRain;
uniform float uLamp;
uniform float uNeon;
uniform vec2 uBaseMin;
uniform vec2 uBaseMax;
uniform vec3 uLampPos;
uniform float uFlash;

// Generador de lluvia 3D con paralaje isométrico
float getRain(vec2 uv, float t) {
  vec2 st = uv * vec2(1.8, 0.4);
  st.y -= t * 8.5;
  st.x += st.y * 0.12; // Inclinacion de viento
  float f = fract(st.x * 35.0);
  float id = floor(st.x * 35.0);
  float drop = hash12(vec2(id, floor(st.y * 12.0)));
  float streak = smoothstep(0.92, 0.99, drop) * smoothstep(0.0, 0.2, f) * smoothstep(1.0, 0.8, f);
  return streak * uRain;
}

// Ondas concentricas de charcos de agua en el suelo
float getPuddleRipples(vec2 p, float t) {
  float ripple = 0.0;
  for (int i = 0; i < 4; i++) {
    vec2 c = vec2(
      mix(uBaseMin.x + 30.0, uBaseMax.x - 30.0, hash12(vec2(float(i) * 13.1, 7.3))),
      mix(uBaseMin.y + 30.0, uBaseMax.y - 30.0, hash12(vec2(float(i) * 29.7, 19.1)))
    );
    float t_drop = fract(t * 0.85 + float(i) * 0.25);
    float d = length(p - c);
    float radius = t_drop * 38.0;
    float wave = sin((d - radius) * 0.8) * exp(-abs(d - radius) * 0.25) * exp(-t_drop * 2.5);
    ripple += wave * step(d, radius + 4.0);
  }
  return ripple * uRain;
}

void main() {
  vec2 vb = viewOf(gl_FragCoord.xy);
  vec3 ground = onFloor(vb, 0.0);

  // Mascara de la placa base en coordenadas isométrica de mundo
  bool inBase = ground.x >= uBaseMin.x && ground.x <= uBaseMax.x &&
                ground.y >= uBaseMin.y && ground.y <= uBaseMax.y;

  if (!inBase) {
    discard;
  }

  // Textura base de asfalto y hormigon
  float noiseFloor = fbm2(ground.xy * 0.04);
  vec3 asphaltColor = vec3(0.05, 0.05, 0.06) + noiseFloor * 0.02;

  // Mascara de charcos de agua reflectante
  float puddleMask = smoothstep(0.48, 0.58, noise2(ground.xy * 0.025 + vec2(1.5, 4.2)));

  // Ondas de causticas de lluvia en los charcos
  float waves = getPuddleRipples(ground.xy, uTime);

  // Cono de iluminacion cenital desde la farola
  float lampDist = length(ground.xy - uLampPos.xy);
  float spotLight = smoothstep(130.0, 15.0, lampDist) * uLamp;
  vec3 spotColor = vec3(1.0, 0.95, 0.82) * spotLight * 0.45;

  // Reflejo de luces neon de la ciudad en los charcos mojados
  vec3 neonReflection = vec3(0.0);
  if (uNeon > 0.5) {
    // Neon cian para Torre Alfa y ambar para Centro de Datos
    float cyanGlow = smoothstep(140.0, 20.0, length(ground.xy - vec2(-70.0, -75.0)));
    float amberGlow = smoothstep(120.0, 15.0, length(ground.xy - vec2(60.0, -80.0)));
    neonReflection = vec3(0.0, 0.95, 1.0) * cyanGlow * 0.35 +
                     vec3(1.0, 0.65, 0.05) * amberGlow * 0.30;
  }

  // Composicion del suelo humedo
  vec3 waterColor = mix(asphaltColor, vec3(0.08, 0.12, 0.15) + neonReflection + spotColor, puddleMask * 0.85);
  waterColor += waves * 0.08 * puddleMask;

  // Rayos de lluvia verticales cayendo en la escena
  float rain = getRain(vb, uTime);
  vec3 finalColor = waterColor + vec3(0.65, 0.85, 1.0) * rain * 0.45;

  // Destello de relampago de tormenta
  if (uFlash > 0.05) {
    finalColor += vec3(0.35, 0.45, 0.6) * uFlash;
  }

  gl_FragColor = vec4(finalColor, 0.92);
}
`;

// 6. CODIGO JS DE CONTROL INTERACTIVO DEL CLIENTE (live.js)
const CLIENT_JS = `
const DATA = __DATA__;
const canvas = document.querySelector(".city-gl");
const readout = document.querySelector("[data-readout]");
const pod = document.querySelector('[data-part="monorail-pod"]');
const said = document.querySelector(".city-said");

let rainLevel = DATA.rainDensity;
let lampOn = DATA.lampActive ? 1.0 : 0.0;
let neonMode = DATA.neonMode;
let flashTime = 0.0;
let podPos = 0.0;
let lastTime = 0;

// Inicializacion del Shader WebGL Isométrico
const gl = canvas.getContext("webgl", { alpha: true, antialias: false });
if (!gl) {
  console.warn("WebGL no disponible");
} else {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}");
  gl.compileShader(vs);

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, DATA.fragmentShader);
  gl.compileShader(fs);

  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.error("FS Error:", gl.getShaderInfoLog(fs));
  }

  const prog = gl.createProgram();
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

  const uTimeLoc = gl.getUniformLocation(prog, "uTime");
  const uCanvasLoc = gl.getUniformLocation(prog, "uCanvas");
  const uViewLoc = gl.getUniformLocation(prog, "uView");
  const uOriginLoc = gl.getUniformLocation(prog, "uOrigin");
  const uKLoc = gl.getUniformLocation(prog, "uK");
  const uCamLoc = gl.getUniformLocation(prog, "uCam");
  const uRainLoc = gl.getUniformLocation(prog, "uRain");
  const uLampLoc = gl.getUniformLocation(prog, "uLamp");
  const uNeonLoc = gl.getUniformLocation(prog, "uNeon");
  const uFlashLoc = gl.getUniformLocation(prog, "uFlash");
  const uBaseMinLoc = gl.getUniformLocation(prog, "uBaseMin");
  const uBaseMaxLoc = gl.getUniformLocation(prog, "uBaseMax");
  const uLampPosLoc = gl.getUniformLocation(prog, "uLampPos");

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener("resize", resize);
  resize();

  function render(now) {
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0.016;
    lastTime = now;
    const timeSec = now * 0.001;

    // Actualizacion de capsula de monorrail
    podPos = (podPos + dt * 0.22) % 1.0;
    if (pod) {
      const curX = DATA.monorailX0 + (DATA.monorailX1 - DATA.monorailX0) * podPos;
      pod.setAttribute("transform", translateAlong(DATA.P, [curX, 0, 0]));
    }

    // Gestion de relampago aleatorio
    if (flashTime > 0) {
      flashTime -= dt * 3.5;
    } else if (rainLevel > 0.7 && Math.random() < 0.003) {
      flashTime = 1.0;
    }

    gl.useProgram(prog);
    gl.uniform1f(uTimeLoc, timeSec);
    gl.uniform2f(uCanvasLoc, canvas.width, canvas.height);
    gl.uniform2f(uViewLoc, DATA.W, DATA.H);
    gl.uniform2f(uOriginLoc, DATA.camera.origin[0], DATA.camera.origin[1]);
    gl.uniform1f(uKLoc, DATA.camera.k);
    gl.uniform4f(uCamLoc, DATA.camera.cam[0], DATA.camera.cam[1], DATA.camera.cam[2], DATA.camera.cam[3]);
    gl.uniform1f(uRainLoc, rainLevel);
    gl.uniform1f(uLampLoc, lampOn);
    gl.uniform1f(uNeonLoc, neonMode);
    gl.uniform1f(uFlashLoc, Math.max(0.0, flashTime));
    gl.uniform2f(uBaseMinLoc, DATA.base[0], DATA.base[1]);
    gl.uniform2f(uBaseMaxLoc, DATA.base[2], DATA.base[3]);
    gl.uniform3f(uLampPosLoc, DATA.lamp[0], DATA.lamp[1], DATA.lamp[2]);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

// Interaccion mediante Slider de Lluvia y Switches en la Placa
const stage = document.querySelector(".city-stage");
function updateTelemetry() {
  const mm = Math.round(rainLevel * 75);
  const status = rainLevel < 0.25 ? "Llovizna leve" : (rainLevel < 0.7 ? "Lluvia sostenida" : "Tormenta electrica");
  const lampStr = lampOn > 0.5 ? "Farola: Activa" : "Farola: Off";
  const neonStr = neonMode > 0.5 ? "Red: Neon" : "Red: Lab";
  const text = \`\${mm} mm/h // \${status} // \${lampStr} // \${neonStr}\`;
  if (readout) readout.textContent = text;
}

window.setRain = function(val) {
  rainLevel = Math.max(0.0, Math.min(1.0, val));
  updateTelemetry();
};

window.toggleLamp = function() {
  lampOn = lampOn > 0.5 ? 0.0 : 1.0;
  updateTelemetry();
};

window.toggleNeon = function() {
  neonMode = neonMode > 0.5 ? 0.0 : 1.0;
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

// 7. ENSAMBLAJE DE LAS CAPAS SVG Y HTML
const LABEL_TEXT = "Sector 07 Megacity: una maqueta tecnica isometrica de una ciudad cyberpunk construida con estandares de dibujo de ingenieria, rascacielos con cotas, viaducto de monorrail elevado, farola cenital articulada y shader WebGL de asfalto mojado con causticas de lluvia.";

const backSvg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body: back, className: "city-back" });
const layerSvg = (name, body) => `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg city-layer ${name}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${body.join("")}</svg>`;

const stageHtml = `
<div class="city-stage" tabindex="0" role="group" aria-label="Maqueta isometrica de Sector 07 Megacity">
  <span class="city-said" aria-live="polite"></span>
  ${backSvg}
  <canvas class="city-layer city-gl" aria-hidden="true"></canvas>
  ${layerSvg("city-mid", mid)}
  ${layerSvg("city-front", front)}
</div>
`;

const CAPTION_TEXT = `Sector 07 Megacity modelada mediante proyeccion isometrica tecnica a 35 grados de acimut y 44 grados de elevacion. Rascacielos de alta densidad arquitectonica con nucleo estructural, helipuerto y mastil de telecomunicaciones a 360 mm sobre cota cero. Un viaducto de transito suspendido transporta capsulas de levitacion magnetica sobre la avenida central. Un mastil de iluminacion cenital proyecta un cono de luz sobre el cruce vial, mientras que un shader WebGL en perspectiva isometrica calcula en tiempo real la lluvia, los charcos en el asfalto reflectante y las ondas de choque causticas causadas por las gotas.`;

// Barra de navegacion superior homologada
const topNavHtml = `
<header class="groove-nav-header">
    <div class="groove-brand">
        <span class="brand-sym">[+]</span>
        <span class="brand-text">LINUX GROOVE</span>
        <span class="brand-badge">MAQ: CIUDAD ISOMETRICA</span>
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

// Dock Inferior Minimalista (46px) para no obstruir el modelo 3D
const bottomDockHtml = `
<div class="city-dock" aria-label="Controles del entorno urbano">
  <div class="dock-control">
    <span class="dock-label">// LLUVIA:</span>
    <input type="range" class="dock-slider" min="0" max="100" value="65" oninput="window.setRain(this.value / 100.0)">
  </div>
  <div class="dock-separator"></div>
  <button class="dock-btn" onclick="window.toggleLamp()">[ Farola Cenital ]</button>
  <button class="dock-btn" onclick="window.toggleNeon()">[ Modo Neon ]</button>
  <button class="dock-btn pulse" onclick="window.triggerStorm()">[ Pulso Tormenta ]</button>
</div>
`;

// Estilos CSS adicionales
const EXTRA_CSS = `
.groove-nav-header {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 50px;
    z-index: 99999;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 1.5rem;
    background: rgba(11, 11, 11, 0.92);
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
    font-size: 0.80rem;
}
.groove-brand .brand-sym { color: #00f0ff; font-weight: 700; }
.groove-brand .brand-text { color: #ffffff; font-weight: 700; letter-spacing: 0.08em; }
.groove-brand .brand-badge {
    font-size: 0.60rem;
    padding: 2px 6px;
    background: rgba(0, 240, 255, 0.12);
    border: 1px solid rgba(0, 240, 255, 0.35);
    border-radius: 4px;
    color: #00f0ff;
    letter-spacing: 0.05em;
}
.groove-nav {
    display: flex;
    gap: 0.30rem;
    align-items: center;
    flex-wrap: wrap;
}
.groove-nav .nav-item {
    text-decoration: none;
    font-size: 0.70rem;
    color: #8c8c90;
    padding: 3px 7px;
    border-radius: 4px;
    border: 1px solid transparent;
    transition: all 0.18s ease;
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

.city-stage {
  position: relative;
  width: 100%;
  aspect-ratio: ${W} / ${H};
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

.city-dock {
  position: fixed;
  bottom: 1.2rem;
  left: 50%;
  transform: translateX(-50%);
  height: 46px;
  background: rgba(14, 18, 24, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 240, 255, 0.25);
  border-radius: 23px;
  display: flex;
  align-items: center;
  padding: 0 1.2rem;
  gap: 1.0rem;
  z-index: 1000;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.65);
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}
.dock-control {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.dock-label {
  font-size: 0.72rem;
  color: #8c8c90;
  white-space: nowrap;
}
.dock-slider {
  -webkit-appearance: none;
  width: 100px;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.dock-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #00f0ff;
  box-shadow: 0 0 8px #00f0ff;
  cursor: pointer;
}
.dock-separator {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.12);
}
.dock-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #b0b0b8;
  font-family: inherit;
  font-size: 0.72rem;
  padding: 4px 10px;
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
  title: "Sector 07 Megacity",
  hint: "Usa el dock inferior para modular la precipitacion y alternar la farola",
  readout: "Precipitacion: 48 mm/h // Modo: Tormenta // Red: 100%",
  keys: [
    { mark: "lit", label: "Farola Cenital & Mastil de Telecomunicaciones (Z: 360 mm)" },
    { mark: "raised", label: "Viaducto de Monorrail Elevado y Rascacielos Alfa" },
    { mark: "flat", label: "Asfalto con Charcos y Ondas Causticas en WebGL" },
  ],
  caption: CAPTION_TEXT,
  body: stageHtml,
});

const pageBody = `
${topNavHtml}
<style>${EXTRA_CSS}</style>
<div class="city-container">
  ${plateHtml}
</div>
${bottomDockHtml}
`;

const fullHtml = k.pageHtml({
  title: "Linux Groove - Sector 07 Megacity (Skill Anatomy & WebGL)",
  theme: "dark",
  body: pageBody,
  script: kitScript() + glScript() + CLIENT_JS.replace("__DATA__", JSON.stringify(DATA)),
  width: 760,
});

// Guardar como city.html y machine_city.html
writeFileSync("pruebas_web/public/city.html", fullHtml, "utf8");
writeFileSync("pruebas_web/public/machine_city.html", fullHtml, "utf8");

console.log("Ciudad Isometrica generada con exito!");
console.log("- Escrita en pruebas_web/public/city.html:", (fullHtml.length / 1024).toFixed(0), "KB");
console.log("- Escrita en pruebas_web/public/machine_city.html:", (fullHtml.length / 1024).toFixed(0), "KB");
