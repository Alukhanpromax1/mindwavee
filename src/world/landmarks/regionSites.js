// Hand-crafted landmarks for the Meadow, Neural Grove, Blooming Basin, Sanctuary and
// Constellation Hollow. Each exposes the hooks gameplay needs (progress, completion,
// camera framing) but contains no game rules itself.
import * as THREE from 'three';
import { SITES } from '../sites.js';
import { R_MEADOW, R_GROVE, R_BASIN, R_SANCTUARY, R_CONSTELLATION } from '../layout.js';
import { HeroFlower } from './heroFlower.js';
import { V, ground, stoneRing, dais, meshFrom, GeoBuilder, mat, lathe, addCollider } from './common.js';
import { buildNeuralTree, tubePath } from '../vegetation/prototypes.js';
import { createOrganicMaterial, createGlowSprite, R_ALWAYS } from '../materials.js';
import { sphere, petalGeometry } from '../vegetation/geoBuilder.js';
import { mulberry32 } from '../../core/noise.js';
import { damp, clamp } from '../../core/math.js';

// ================================================================== Meadow: the Dawn Seed
export function buildDawnSeed(scene) {
  const s = SITES.dawnSeed;
  const y = ground(s.x, s.z);
  const group = new THREE.Group();
  group.position.set(s.x, y - 0.1, s.z);
  scene.add(group);

  const b = new GeoBuilder();
  dais(b, 4.2, 0.55);
  stoneRing(b, { count: 7, radius: 7.5, height: 2.6, lean: -0.1, seed: 3, origin: group.position });
  group.add(meshFrom(b, R_MEADOW));

  const flower = new HeroFlower({
    region: R_MEADOW,
    stemHeight: 1.9,
    stemRadius: 0.09,
    stemBend: 0.04,
    leaves: 4,
    leafLength: 1.1,
    coreRadius: 0.26,
    rings: [
      { count: 8, length: 1.35, width: 0.85, cup: 0.6, curl: 0.25, closed: 0.12, open: 1.2, color: '#d9efd9', tip: '#ffffff' },
      { count: 6, length: 1.0, width: 0.7, cup: 0.7, curl: 0.1, closed: 0.04, open: 0.7, color: '#eef6e6', tip: '#fffdf2', delay: 0.25 },
    ],
  });
  flower.group.position.y = 0.55;
  group.add(flower.group);

  const top = new THREE.Vector3(s.x, y + 0.45 + flower.top.y + 0.35, s.z);
  return {
    id: 'dawnSeed',
    group,
    flower,
    position: new THREE.Vector3(s.x, y, s.z),
    focusPoint: top,
    cameraFrom: new THREE.Vector3(s.x + 4.5, y + 3.6, s.z + 7.5),
    update(dt) {
      flower.update(dt);
    },
  };
}

// ================================================================== Meadow: Calibration Circle
export function buildCalibration(scene) {
  const s = SITES.calibration;
  const y = ground(s.x, s.z);
  const b = new GeoBuilder();
  stoneRing(b, { count: 9, radius: 5, height: 1.4, lean: 0, seed: 9, origin: new THREE.Vector3(s.x, y - 0.15, s.z) });
  const disc = lathe([
    [0, 0.3],
    [1.6, 0.28],
    [1.8, 0],
    [1.7, -0.4],
  ], 28);
  b.add(disc, mat(), { color: '#ece6d2', sway: 0 });
  const ring = new THREE.TorusGeometry(1.1, 0.04, 6, 48);
  b.add(ring, mat(0, 0.31, 0, Math.PI / 2), { color: '#fff1c4', glow: 1, sway: 0 });
  const mesh = meshFrom(b, R_MEADOW);
  mesh.position.set(s.x, y - 0.15, s.z);
  scene.add(mesh);
  return { id: 'calibration', mesh, position: new THREE.Vector3(s.x, y, s.z) };
}

// ================================================================== Neural Grove
export function buildGrove(scene) {
  const s = SITES.groveTree;
  const y = ground(s.x, s.z);
  const group = new THREE.Group();
  group.position.set(s.x, y, s.z);
  scene.add(group);

  const b = new GeoBuilder();
  const nodes = buildNeuralTree(b, mulberry32(777), { height: 42, depth: 5, trunkRadius: 1.7, roots: 9, spread: 0.95, lenFactor: 0.7, trunkFrac: 0.3, trunk: '#256f68', tip: '#9fe3cf' });
  addCollider(s.x, s.z, 2.4, y + 14);
  const treeMat = createOrganicMaterial({ region: R_GROVE, pulse: true, pulseAmt: 0.12, sway: 0.15 });
  const tree = new THREE.Mesh(b.build(40), treeMat);
  group.add(tree);
  // a few soft glows on high nodes
  const glows = nodes
    .filter((n, i) => i % 4 === 0)
    .slice(0, 22)
    .map((n) => {
      const g = createGlowSprite('#dffff2', 4, 0);
      g.position.copy(n);
      group.add(g);
      return g;
    });

  const blossoms = SITES.groveBlossoms.map((p, i) => {
    const by = ground(p.x, p.z);
    const f = new HeroFlower({
      region: R_GROVE,
      stemHeight: 1.3,
      stemRadius: 0.07,
      stemColor: '#3f8a6e',
      leafColor: '#4e9a76',
      leaves: 3,
      leafLength: 0.9,
      coreRadius: 0.2,
      coreColor: '#e6fff4',
      glowColor: '#d9fff0',
      rings: [
        { count: 7, length: 1.1, width: 0.6, cup: 0.55, curl: 0.3, closed: 0.1, open: 1.15, color: '#9fd8c4', tip: '#f2fff9', glowBase: 0.25 },
        { count: 5, length: 0.75, width: 0.45, cup: 0.6, curl: 0.1, closed: 0.03, open: 0.65, color: '#c7eedf', tip: '#ffffff', delay: 0.3 },
      ],
    });
    f.group.position.set(p.x, by - 0.1, p.z);
    f.group.rotation.y = i * 2.1;
    scene.add(f.group);
    // ground vein from the blossom to the trunk (pulses once activated)
    const vb = new GeoBuilder();
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      const x = p.x + (s.x - p.x) * t + Math.sin(t * Math.PI * 2 + i) * 2.5 * (1 - t) * t * 4;
      const z = p.z + (s.z - p.z) * t + Math.cos(t * Math.PI * 2 + i) * 2.5 * (1 - t) * t * 4;
      pts.push(new THREE.Vector3(x - s.x, ground(x, z) + 0.12 - y, z - s.z));
    }
    tubePath(vb, pts, 0.22, 0.42, { color: '#4aa58e', radial: 6 });
    const veinMat = createOrganicMaterial({ region: R_GROVE, pulse: true, pulseAmt: 0, sway: 0 });
    const vein = new THREE.Mesh(vb.build(1), veinMat);
    group.add(vein);
    return {
      flower: f,
      vein: veinMat,
      position: new THREE.Vector3(p.x, by, p.z),
      focusPoint: new THREE.Vector3(p.x, by + 1.6, p.z),
      cameraFrom: new THREE.Vector3(p.x + (p.x - s.x) * 0.18 + 2, by + 3.4, p.z + (p.z - s.z) * 0.18 + 3),
    };
  });

  let activation = 0;
  return {
    id: 'grove',
    group,
    tree: treeMat,
    blossoms,
    position: new THREE.Vector3(s.x, y, s.z),
    setActivation(v) {
      activation = v;
    },
    update(dt) {
      treeMat.uniforms.uPulseAmt.value = damp(treeMat.uniforms.uPulseAmt.value, 0.12 + activation * 1.2, 1.5, dt);
      glows.forEach((g, i) => (g.material.opacity = damp(g.material.opacity, activation * (0.35 + 0.25 * Math.sin(i)), 1.5, dt)));
      blossoms.forEach((bl) => bl.flower.update(dt));
    },
  };
}

// ================================================================== Blooming Basin: the Great Bloom
export function buildGreatBloom(scene) {
  const s = SITES.greatBloom;
  const y = ground(s.x, s.z);
  const group = new THREE.Group();
  group.position.set(s.x, y, s.z);
  scene.add(group);

  const flower = new HeroFlower({
    region: R_BASIN,
    stemHeight: 5.5,
    stemRadius: 0.42,
    stemBend: 0.05,
    leaves: 5,
    leafLength: 4.2,
    coreRadius: 0.95,
    speed: 0.7,
    coreGlowMax: 1,
    rings: [
      { count: 11, length: 5.4, width: 2.7, cup: 0.55, curl: 0.3, closed: 0.16, open: 1.3, color: '#cfe9cf', tip: '#ffffff' },
      { count: 9, length: 4.1, width: 2.1, cup: 0.6, curl: 0.18, closed: 0.08, open: 0.92, color: '#e2f1da', tip: '#fffdf4', delay: 0.15 },
      { count: 7, length: 2.8, width: 1.5, cup: 0.7, curl: 0.06, closed: 0.02, open: 0.55, color: '#f4efd6', tip: '#fff6dc', delay: 0.32, glowBase: 0.3 },
    ],
  });
  const BLOOM_SCALE = 1.6;
  flower.group.scale.setScalar(BLOOM_SCALE);
  group.add(flower.group);

  // ring of small lotus stones around the island edge
  const b = new GeoBuilder();
  const rng = mulberry32(5);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = 12.5 + rng() * 1.5;
    const pg = petalGeometry({ length: 1.2, width: 0.8, cup: 0.6, curl: 0.2, segL: 4, segW: 1 });
    for (let k = 0; k < 5; k++) b.add(pg, mat(Math.cos(a) * r, -0.6, Math.sin(a) * r, 0.9, (k / 5) * Math.PI * 2), { color: '#f2ead2', sway: 0, glow: 0.05 });
    b.add(sphere(0.18, 8, 6), mat(Math.cos(a) * r, -0.3, Math.sin(a) * r), { color: '#ffe9a8', glow: 1, sway: 0 });
  }
  group.add(meshFrom(b, R_BASIN));

  const top = new THREE.Vector3(s.x + flower.top.x * BLOOM_SCALE, y + flower.top.y * BLOOM_SCALE + 2.4, s.z + flower.top.z * BLOOM_SCALE);
  return {
    id: 'greatBloom',
    group,
    flower,
    position: new THREE.Vector3(s.x, y, s.z),
    top,
    focusPoint: top.clone().add(new THREE.Vector3(0, -0.5, 0)),
    cameraFrom: new THREE.Vector3(s.x + 12, y + 12, s.z + 36),
    update(dt) {
      flower.update(dt);
    },
  };
}

// ================================================================== Sanctuary: Heart of the Garden
export function buildHeart(scene) {
  const s = SITES.heart;
  const y = ground(s.x, s.z);
  const group = new THREE.Group();
  group.position.set(s.x, y, s.z);
  scene.add(group);

  const b = new GeoBuilder();
  const rng = mulberry32(99);
  // three intertwined spiral trunks
  for (let k = 0; k < 3; k++) {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const a = k * ((Math.PI * 2) / 3) + t * Math.PI * 1.6;
      const r = 1.6 * (1 - t * 0.55) + Math.sin(t * Math.PI) * 0.8;
      pts.push(new THREE.Vector3(Math.cos(a) * r, -0.5 + t * 17, Math.sin(a) * r));
    }
    tubePath(b, pts, 0.85, 0.35, { color: '#3d8f7f', colorFn: (l, w, c) => c.set('#3a8a7a').lerp(new THREE.Color('#a9e2cf'), Math.min(1, w.y / 18)) });
  }
  // cradle arms holding the crown
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const pts = [new THREE.Vector3(0, 15.5, 0), new THREE.Vector3(Math.cos(a) * 2.6, 17.2, Math.sin(a) * 2.6), new THREE.Vector3(Math.cos(a) * 3.6, 19.2, Math.sin(a) * 3.6)];
    tubePath(b, pts, 0.32, 0.12, { color: '#7fcbb5' });
    b.add(sphere(0.3, 8, 6), mat(pts[2].x, pts[2].y, pts[2].z), { color: '#f4fff8', glow: 1 });
  }
  // roots into the island
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + rng();
    tubePath(b, [new THREE.Vector3(0, 1.2, 0), new THREE.Vector3(Math.cos(a) * 3, 0.3, Math.sin(a) * 3), new THREE.Vector3(Math.cos(a) * 7, -0.4, Math.sin(a) * 7)], 0.6, 0.15, { color: '#3d8f7f' });
  }
  addCollider(s.x, s.z, 3.0, y + 16);
  const treeMat = createOrganicMaterial({ region: R_SANCTUARY, pulse: true, pulseAmt: 0.1, sway: 0.1 });
  const tree = new THREE.Mesh(b.build(20), treeMat);
  group.add(tree);

  const crown = new HeroFlower({
    region: R_SANCTUARY,
    stemHeight: 0,
    coreRadius: 1.3,
    speed: 0.45,
    coreGlowMax: 1,
    glowColor: '#fff3cf',
    rings: [
      { count: 12, length: 5.6, width: 2.6, cup: 0.55, curl: 0.35, closed: 0.12, open: 1.35, color: '#bfe6d6', tip: '#ffffff' },
      { count: 9, length: 4.0, width: 2.0, cup: 0.6, curl: 0.15, closed: 0.05, open: 0.95, color: '#e6f5e6', tip: '#fffef6', delay: 0.18 },
      { count: 7, length: 2.6, width: 1.4, cup: 0.7, curl: 0.05, closed: 0.02, open: 0.55, color: '#fff3d6', tip: '#fff9e8', delay: 0.35, glowBase: 0.4 },
    ],
  });
  crown.group.position.y = 17.6;
  group.add(crown.group);

  // four vessels that receive the collected lights
  const vessels = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const vx = Math.cos(a) * 9.5;
    const vz = Math.sin(a) * 9.5;
    const v = new HeroFlower({
      region: R_ALWAYS,
      stemHeight: 1.4,
      stemRadius: 0.07,
      leaves: 2,
      coreRadius: 0.22,
      rings: [{ count: 6, length: 0.8, width: 0.5, cup: 0.7, curl: 0.15, closed: 0.25, open: 0.95, color: '#e4f3e4', tip: '#ffffff' }],
    });
    v.group.position.set(vx, ground(s.x + vx, s.z + vz) - y - 0.1, vz);
    group.add(v.group);
    vessels.push(v);
  }
  const bigGlow = createGlowSprite('#fff4d2', 40, 0);
  bigGlow.position.y = 18;
  group.add(bigGlow);

  let restored = 0;
  return {
    id: 'heart',
    group,
    crown,
    vessels,
    position: new THREE.Vector3(s.x, y, s.z),
    focusPoint: new THREE.Vector3(s.x, y + 14, s.z),
    cameraFrom: new THREE.Vector3(s.x + 10, y + 7, s.z - 34),
    crownWorld: new THREE.Vector3(s.x, y + 18, s.z),
    setRestored(v) {
      restored = v;
    },
    update(dt) {
      crown.update(dt);
      vessels.forEach((v) => v.update(dt));
      treeMat.uniforms.uPulseAmt.value = damp(treeMat.uniforms.uPulseAmt.value, 0.12 + restored * 1.1, 1, dt);
      bigGlow.material.opacity = damp(bigGlow.material.opacity, restored * 0.55, 0.8, dt);
    },
  };
}

// ================================================================== Sanctuary: rest stones + guardian's arch
export function buildSanctuaryExtras(scene) {
  const r = SITES.restStones;
  const ry = ground(r.x, r.z);
  const b = new GeoBuilder();
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.15 + (i / 4) * 0.7);
    const g = new THREE.CylinderGeometry(1.0, 1.15, 0.45, 18);
    b.add(g, mat(Math.cos(a) * 4, 0.1, Math.sin(a) * 4, 0, i), { color: '#ece6d2', sway: 0 });
  }
  b.add(new THREE.CylinderGeometry(0.06, 0.08, 2.4, 6), mat(0, 1.2, 0), { color: '#5d9a55', sway: 0 });
  b.add(sphere(0.32, 12, 10), mat(0, 2.55, 0), { color: '#fff4d2', glow: 1, sway: 0 });
  const rest = meshFrom(b, R_ALWAYS);
  rest.position.set(r.x, ry, r.z);
  scene.add(rest);
  const lamp = createGlowSprite('#fff0c8', 6, 0.6);
  lamp.position.set(r.x, ry + 2.55, r.z);
  scene.add(lamp);

  const g = SITES.guardian;
  const gy = ground(g.x, g.z);
  const gb = new GeoBuilder();
  tubePath(gb, [V(-2.4, -0.3, 0), V(-2.2, 2.5, 0.3), V(-1.2, 4.6, 0), V(0, 5.2, 0)], 0.3, 0.16, { color: '#3d8f7f' });
  tubePath(gb, [V(2.4, -0.3, 0), V(2.2, 2.5, -0.3), V(1.2, 4.6, 0), V(0, 5.2, 0)], 0.3, 0.16, { color: '#3d8f7f' });
  gb.add(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 4), mat(0, 4.6, 0), { color: '#cfe8d8', sway: 0 });
  gb.add(sphere(0.35, 12, 10), mat(0, 3.8, 0), { color: '#fff1c4', glow: 1, sway: 0 });
  gb.add(new THREE.BoxGeometry(2.8, 0.35, 0.9), mat(0, 0.35, 1.6), { color: '#ece6d2', sway: 0 });
  const arch = meshFrom(gb, R_SANCTUARY);
  arch.position.set(g.x, gy, g.z);
  arch.rotation.y = 0.4;
  scene.add(arch);
  const gl = createGlowSprite('#fff0c8', 5, 0.5);
  gl.position.set(g.x, gy + 3.8, g.z);
  scene.add(gl);
  return {
    rest: { position: new THREE.Vector3(r.x, ry, r.z) },
    guardian: { position: new THREE.Vector3(g.x, gy, g.z) },
  };
}

// ================================================================== Constellation Hollow
const LEFT_SHAPE = [
  [-3, 0],
  [-1.2, 1.6],
  [0.6, 3.4],
  [1.8, 1.4],
  [3.2, 0.2],
  [0.6, -1.2],
  [-1.6, -2.4],
];
const RIGHT_SHAPE = [
  [0, 3.2],
  [2.2, 1.6],
  [2.6, -0.8],
  [0, -2.6],
  [-2.6, -0.8],
  [-2.2, 1.6],
  [0, 0],
];
const LEFT_EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 0],
  [1, 3],
];
const RIGHT_EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 0],
  [6, 0],
  [6, 2],
  [6, 4],
];

export function buildConstellation(scene) {
  const s = SITES.starAltar;
  const y = ground(s.x, s.z);
  const group = new THREE.Group();
  group.position.set(s.x, y, s.z);
  scene.add(group);

  const b = new GeoBuilder();
  dais(b, 5, 0.4, '#dfe7e2');
  const rng = mulberry32(17);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const h = 2 + rng() * 3;
    const g = new THREE.OctahedronGeometry(0.4, 0);
    g.scale(1, h / 0.8, 1);
    g.translate(0, h / 2, 0);
    b.add(g, mat(Math.cos(a) * 11, -0.2, Math.sin(a) * 11, (rng() - 0.5) * 0.2, rng() * 3, (rng() - 0.5) * 0.2), {
      sway: 0,
      colorFn: (l, w, c) => c.set('#6fb6b0').lerp(new THREE.Color('#effcff'), clamp(l.y / h)),
      glowFn: (l) => 0.3 + 0.5 * clamp(l.y / h),
    });
  }
  group.add(meshFrom(b, R_CONSTELLATION));

  const makeSide = (shape, edges, cx, color) => {
    const g = new THREE.Group();
    g.position.set(cx, 15, -12);
    group.add(g);
    const stars = shape.map(([px, py]) => {
      const sp = createGlowSprite(color, 2.6, 0.35);
      sp.position.set(px * 1.6, py * 1.6, 0);
      g.add(sp);
      return sp;
    });
    const lp = [];
    for (const [a, c] of edges) lp.push(stars[a].position.clone(), stars[c].position.clone());
    const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lp), lineMat);
    g.add(lines);
    return { group: g, stars, lineMat, level: 0.15, target: 0.15, cue: 0 };
  };
  const left = makeSide(LEFT_SHAPE, LEFT_EDGES, -12, '#d8f3ff');
  const right = makeSide(RIGHT_SHAPE, RIGHT_EDGES, 12, '#fff1cf');
  let t = 0;
  return {
    id: 'constellation',
    group,
    left,
    right,
    position: new THREE.Vector3(s.x, y, s.z),
    focusPoint: new THREE.Vector3(s.x, y + 10, s.z - 12),
    cameraFrom: new THREE.Vector3(s.x, y + 4, s.z + 16),
    update(dt) {
      t += dt;
      for (const side of [left, right]) {
        side.level = damp(side.level, side.target, 2, dt);
        const shimmer = side.cue ? 0.15 + 0.1 * Math.sin(t * 2.2) : 0;
        side.lineMat.opacity = side.level * 0.75 + shimmer;
        side.stars.forEach((st, i) => {
          st.material.opacity = 0.3 + side.level * 0.65 + shimmer + 0.05 * Math.sin(t * 0.8 + i);
          st.scale.setScalar(2.4 + side.level * 1.6);
        });
      }
    },
  };
}

// ================================================================== Hidden blossoms (procedural)
export function createHiddenBlossom(scene, b) {
  const f = new HeroFlower({
    region: R_ALWAYS,
    stemHeight: 0.7,
    stemRadius: 0.04,
    leaves: 2,
    leafLength: 0.5,
    coreRadius: 0.11,
    glowColor: '#f4e6ff',
    rings: [
      { count: 6, length: 0.55, width: 0.34, cup: 0.6, curl: 0.25, closed: 0.15, open: 1.1, color: '#e8dcf7', tip: '#ffffff', glowBase: 0.35 },
      { count: 5, length: 0.38, width: 0.26, cup: 0.6, curl: 0.1, closed: 0.05, open: 0.7, color: '#f6efff', tip: '#ffffff', delay: 0.3 },
    ],
  });
  f.group.position.set(b.x, b.y - 0.05, b.z);
  const halo = createGlowSprite('#efe2ff', 3.5, 0.5);
  halo.position.y = 0.9;
  f.group.add(halo);
  f.setOpen(0.15, true);
  scene.add(f.group);
  return { flower: f, halo, data: b };
}
