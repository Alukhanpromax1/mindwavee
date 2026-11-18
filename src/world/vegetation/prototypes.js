// Procedural plant library. Every model is generated from code — original designs, no external assets.
import * as THREE from 'three';
import { mulberry32 } from '../../core/noise.js';
import { GeoBuilder, mat, segmentMatrix, petalGeometry, bladeGeometry, unitTube, sphere, lathe } from './geoBuilder.js';

const C = (hex) => new THREE.Color(hex);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const gradientY = (from, to, h0, h1) => {
  const a = C(from);
  const b = C(to);
  return (local, world, col) => col.copy(a).lerp(b, THREE.MathUtils.clamp((world.y - h0) / (h1 - h0), 0, 1));
};

/** Curved tube through points (array of Vector3) with tapering radius. */
export function tubePath(b, pts, r0, r1, o = {}) {
  let acc = o.dist0 ?? 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const c = pts[i + 1];
    const ra = r0 + (r1 - r0) * (i / (pts.length - 1));
    const rb = r0 + (r1 - r0) * ((i + 1) / (pts.length - 1));
    const len = a.distanceTo(c);
    const start = acc;
    b.add(unitTube(ra, rb, o.radial ?? 6), segmentMatrix(a, c), {
      ...o,
      distFn: (local) => start + (local.y + 0.5) * len,
    });
    // joint sphere hides gaps between segments
    if (o.joints !== false && i > 0) b.add(sphere(ra * 1.02, 6, 4), mat(a.x, a.y, a.z), { ...o, dist: start });
    acc += len;
  }
  return acc;
}

function addFlowerHead(b, center, { count, length, width, cup, curl, tilt, color, tipColor, tint = 1, phase = 0, glow = 0, segL = 5, segW = 2 }) {
  const petal = petalGeometry({ length, width, cup, curl, segL, segW });
  const base = C(color);
  const tip = C(tipColor ?? color);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + phase;
    const m = new THREE.Matrix4()
      .makeTranslation(center.x, center.y, center.z)
      .multiply(new THREE.Matrix4().makeRotationY(a))
      .multiply(new THREE.Matrix4().makeRotationX(tilt));
    b.add(petal, m, {
      tint,
      glow,
      colorFn: (local, w, col) => col.copy(base).lerp(tip, Math.min(1, local.y / length)),
    });
  }
}

// ------------------------------------------------------------------ prototypes
export function grassTuft() {
  const b = new GeoBuilder();
  const rng = mulberry32(11);
  const colorFn = gradientY('#3f6f34', '#cfe38a', 0, 0.85);
  for (let i = 0; i < 7; i++) {
    const h = 0.4 + rng() * 0.55;
    const blade = bladeGeometry({ height: h, width: 0.08 + rng() * 0.035, bend: 0.2 + rng() * 0.4, segs: 2 });
    const a = rng() * Math.PI * 2;
    const r = 0.05 + rng() * 0.32;
    b.add(blade, mat(Math.cos(a) * r, 0, Math.sin(a) * r, 0, rng() * Math.PI * 2, 0), { tint: 1, colorFn });
  }
  return { geometry: b.build(0.9), height: 0.9 };
}

export function cupFlower() {
  const b = new GeoBuilder();
  const stem = '#5c9447';
  tubePath(b, [V(0, 0, 0), V(0.04, 0.45, 0.02), V(0, 0.92, 0.04)], 0.026, 0.018, { color: stem, radial: 4, joints: false });
  const leaf = petalGeometry({ length: 0.4, width: 0.16, cup: 0.3, curl: 0.35, segL: 3, segW: 1 });
  b.add(leaf, mat(0, 0.03, 0, 1.0, 0.4), { color: '#6ca852' });
  b.add(leaf, mat(0, 0.03, 0, 1.1, 3.4), { color: '#5f9d4b' });
  addFlowerHead(b, V(0, 0.92, 0.04), { count: 7, length: 0.3, width: 0.17, cup: 0.6, curl: 0.12, tilt: 0.5, color: '#e9f3dc', tipColor: '#ffffff', segL: 3, segW: 1 });
  b.add(sphere(0.055, 5, 4), mat(0, 0.97, 0.04), { color: '#ffe9a6', glow: 1 });
  return { geometry: b.build(1), height: 1 };
}

export function trumpetFlower() {
  const b = new GeoBuilder();
  const top = V(0.18, 2.3, 0.05);
  tubePath(b, [V(0, 0, 0), V(0.08, 0.8, 0), V(0.2, 1.6, 0.04), top], 0.04, 0.025, { color: '#7aa457', radial: 4, joints: false });
  const funnel = lathe([
    [0.02, 0],
    [0.05, 0.1],
    [0.11, 0.24],
    [0.24, 0.36],
    [0.38, 0.4],
    [0.42, 0.38],
  ], 12);
  const m = new THREE.Matrix4().makeTranslation(top.x, top.y - 0.04, top.z).multiply(new THREE.Matrix4().makeRotationZ(-0.28));
  b.add(funnel, m, {
    tint: 1,
    colorFn: (local, w, col) => col.copy(C('#f6c46e')).lerp(C('#fff1c9'), Math.min(1, local.y / 0.4)),
    glowFn: (local) => (local.y < 0.12 ? 0.7 : 0.06),
  });
  return { geometry: b.build(2.4), height: 2.4 };
}

export function spireCluster() {
  const b = new GeoBuilder();
  const rng = mulberry32(23);
  for (let i = 0; i < 7; i++) {
    const h = 0.9 + rng() * 2.6;
    const r = 0.1 + rng() * 0.16;
    const a = rng() * Math.PI * 2;
    const d = rng() * 0.6;
    const g = new THREE.ConeGeometry(r, h, 6, 3, true);
    g.translate(0, h / 2, 0);
    b.add(g, mat(Math.cos(a) * d, 0, Math.sin(a) * d, (rng() - 0.5) * 0.25, 0, (rng() - 0.5) * 0.25), {
      tint: 0.7,
      colorFn: (local, w, col) => col.copy(C('#3d8a4e')).lerp(C('#bfe6a8'), Math.min(1, local.y / h)),
    });
  }
  return { geometry: b.build(3.5), height: 3.5 };
}

export function bulbPlant() {
  const b = new GeoBuilder();
  const top = V(0.1, 1.55, 0.08);
  tubePath(b, [V(0, 0, 0), V(-0.06, 0.6, 0), V(0.05, 1.2, 0.05), top], 0.035, 0.02, { color: '#4f8f6c', radial: 4, joints: false });
  const leaf = petalGeometry({ length: 0.55, width: 0.2, cup: 0.4, curl: 0.5, segL: 3, segW: 1 });
  for (let i = 0; i < 3; i++) b.add(leaf, mat(0, 0.02, 0, 1.15, i * 2.1), { color: '#4a9470', tint: 0.4 });
  b.add(sphere(0.17, 8, 6), mat(top.x, top.y + 0.12, top.z), { color: '#dffbe9', glow: 1, tint: 1 });
  b.add(sphere(0.05, 6, 4), mat(top.x - 0.25, top.y - 0.25, top.z), { color: '#dffbe9', glow: 0.8, tint: 1 });
  return { geometry: b.build(1.8), height: 1.8 };
}

export function fernBush() {
  const b = new GeoBuilder();
  const rng = mulberry32(31);
  const leaf = petalGeometry({ length: 1.0, width: 0.32, cup: 0.25, curl: 0.7, segL: 4, segW: 1 });
  for (let i = 0; i < 8; i++) {
    b.add(leaf, mat(0, 0, 0, 0.75 + rng() * 0.5, (i / 8) * Math.PI * 2 + rng() * 0.3, 0, 0.8 + rng() * 0.4), {
      tint: 0.6,
      colorFn: (local, w, col) => col.copy(C('#3f8a4d')).lerp(C('#9fd479'), Math.min(1, local.y)),
    });
  }
  return { geometry: b.build(1.1), height: 1.1 };
}

export function giantFlower() {
  const b = new GeoBuilder();
  const top = V(0.6, 9.2, 0.3);
  tubePath(b, [V(0, 0, 0), V(0.3, 3, 0), V(0.75, 6.2, 0.2), top], 0.34, 0.2, { color: '#5f9b55', radial: 8 });
  const leaf = petalGeometry({ length: 3.2, width: 1.2, cup: 0.35, curl: 0.55, segL: 6 });
  for (let i = 0; i < 3; i++) b.add(leaf, mat(0, 0.1, 0, 1.05, i * 2.2 + 0.4), { color: '#5ea457', tint: 0.3 });
  addFlowerHead(b, top, { count: 9, length: 3.3, width: 1.7, cup: 0.5, curl: 0.32, tilt: 1.0, color: '#d9efd6', tipColor: '#fbfaf2' });
  addFlowerHead(b, V(top.x, top.y + 0.1, top.z), { count: 7, length: 2.3, width: 1.3, cup: 0.6, curl: 0.15, tilt: 0.5, color: '#e5f2dc', tipColor: '#ffffff', phase: 0.4 });
  b.add(sphere(0.55, 12, 8), mat(top.x, top.y + 0.35, top.z, 0, 0, 0, 1, 0.6, 1), { color: '#ffe3a0', glow: 0.9 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    b.add(sphere(0.09, 5, 4), mat(top.x + Math.cos(a) * 0.7, top.y + 0.7, top.z + Math.sin(a) * 0.7), { color: '#fff6c9', glow: 1 });
  }
  return { geometry: b.build(10), height: 10 };
}

/**
 * Dendritic "neural" branching structure. Exported so landmarks can build larger hero versions.
 */
export function buildNeuralTree(b, rng, o = {}) {
  const height = o.height ?? 16;
  const depth = o.depth ?? 4;
  const trunk = C(o.trunk ?? '#2f7f74');
  const tip = C(o.tip ?? '#8fdcc4');
  const nodeColor = o.node ?? '#f2fff6';
  const lenFactor = o.lenFactor ?? 0.68;
  const colorFn = (local, w, col) => col.copy(trunk).lerp(tip, Math.min(1, Math.max(0, w.y / height)));
  const nodes = [];
  const grow = (start, dir, len, radius, level, dist) => {
    const bend = V((rng() - 0.5) * 0.6, (rng() - 0.3) * 0.2, (rng() - 0.5) * 0.6).multiplyScalar(len * 0.35);
    const mid = start.clone().addScaledVector(dir, len * 0.5).add(bend);
    const end = start.clone().addScaledVector(dir, len).add(bend.multiplyScalar(0.4));
    const total = tubePath(b, [start, mid, end], radius, radius * 0.66, { colorFn, radial: level < 2 ? 8 : 5, dist0: dist, joints: level < 2 });
    const d = dist + total;
    if (level >= depth) {
      b.add(sphere(Math.max(0.14, radius * 2.2), 8, 6), mat(end.x, end.y, end.z), { color: nodeColor, glow: 1, dist: d });
      // a few fine dendrites around each terminal node
      for (let k = 0; k < 2; k++) {
        const fd = V(rng() - 0.5, rng() * 0.6 - 0.1, rng() - 0.5).normalize();
        const fe = end.clone().addScaledVector(fd, len * 0.45);
        tubePath(b, [end, fe], radius * 0.45, radius * 0.2, { colorFn, radial: 4, dist0: d, joints: false });
        b.add(sphere(Math.max(0.08, radius * 1.1), 6, 4), mat(fe.x, fe.y, fe.z), { color: nodeColor, glow: 0.9, dist: d + len * 0.45 });
      }
      nodes.push(end.clone());
      return;
    }
    if (level >= 1 && rng() < 0.6) {
      b.add(sphere(radius * 1.6, 10, 8), mat(end.x, end.y, end.z), { color: nodeColor, glow: 0.85, dist: d });
      nodes.push(end.clone());
    }
    const kids = level === 0 ? 3 + (rng() < 0.5 ? 1 : 0) : 2 + (rng() < 0.45 ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      const a = (k / kids) * Math.PI * 2 + rng() * 1.2;
      const spread = (o.spread ?? 0.8) * (0.7 + rng() * 0.6) * (level === 0 ? 0.8 : 1);
      const nd = dir.clone().multiplyScalar(Math.cos(spread)).add(V(Math.cos(a), 0, Math.sin(a)).multiplyScalar(Math.sin(spread)));
      nd.y = Math.max(nd.y, level >= 2 ? -0.1 : 0.2);
      nd.normalize();
      grow(end, nd, len * (lenFactor + rng() * 0.16), radius * 0.62, level + 1, d);
    }
  };
  const trunkLen = height * (o.trunkFrac ?? 0.34);
  grow(V(0, -0.4, 0), V(0, 1, 0), trunkLen, o.trunkRadius ?? height * 0.045, 0, 0);
  // roots
  const roots = o.roots ?? 5;
  for (let r = 0; r < roots; r++) {
    const a = (r / roots) * Math.PI * 2 + rng();
    const R = height * (0.22 + rng() * 0.12);
    const pts = [V(0, 0.6, 0), V(Math.cos(a) * R * 0.35, 0.25, Math.sin(a) * R * 0.35), V(Math.cos(a) * R, -0.25, Math.sin(a) * R)];
    tubePath(b, pts, height * 0.03, height * 0.008, { colorFn, radial: 5 });
  }
  return nodes;
}

export function neuralTree() {
  const b = new GeoBuilder();
  buildNeuralTree(b, mulberry32(41), { height: 16, depth: 3 });
  return { geometry: b.build(16), height: 16 };
}

export function rock() {
  const b = new GeoBuilder();
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  const rng = mulberry32(53);
  const off = [];
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    off[k] = off[k] ?? 0.82 + rng() * 0.3;
    p.setXYZ(i, p.getX(i) * off[k], p.getY(i) * off[k] * 0.62, p.getZ(i) * off[k]);
  }
  g.computeVertexNormals();
  b.add(g, mat(0, 0.2, 0), {
    sway: 0,
    colorFn: (local, w, col) => col.copy(C('#d6d0bb')).lerp(C('#93ba6e'), THREE.MathUtils.smoothstep(local.y, 0.25, 0.6)),
  });
  return { geometry: b.build(1), height: 1 };
}

export function reeds() {
  const b = new GeoBuilder();
  const rng = mulberry32(61);
  const colorFn = gradientY('#4f7f3c', '#c6d98b', 0, 2);
  for (let i = 0; i < 9; i++) {
    const h = 1.1 + rng() * 1.0;
    const a = rng() * Math.PI * 2;
    const d = rng() * 0.45;
    b.add(bladeGeometry({ height: h, width: 0.06, bend: 0.12 + rng() * 0.2 }), mat(Math.cos(a) * d, 0, Math.sin(a) * d, 0, rng() * 6.28), { colorFn, tint: 0.5 });
    if (i < 3) {
      const t = V(Math.cos(a) * d, h * 0.92, Math.sin(a) * d);
      b.add(new THREE.CapsuleGeometry(0.045, 0.22, 2, 6), mat(t.x, t.y, t.z), { color: '#e3c27a', glow: 0.25 });
    }
  }
  return { geometry: b.build(2), height: 2 };
}

export function lilyPads() {
  const b = new GeoBuilder();
  const rng = mulberry32(71);
  for (let i = 0; i < 3; i++) {
    const g = new THREE.CircleGeometry(0.55 + rng() * 0.4, 14, 0.3, Math.PI * 2 - 0.45);
    g.rotateX(-Math.PI / 2);
    const a = rng() * 6.28;
    b.add(g, mat(Math.cos(a) * 0.9 * i, 0.02, Math.sin(a) * 0.9 * i, 0, rng() * 6.28), { color: i === 1 ? '#6fb36a' : '#5aa564', sway: 0.06, tint: 0.4 });
  }
  addFlowerHead(b, V(0, 0.05, 0), { count: 6, length: 0.22, width: 0.14, cup: 0.6, curl: 0.05, tilt: 0.55, color: '#f6e9ef', tipColor: '#ffffff', segL: 2, segW: 1 });
  b.add(sphere(0.04, 5, 4), mat(0, 0.1, 0), { color: '#ffe7a0', glow: 1 });
  return { geometry: b.build(1), height: 1 };
}

export function petalPlatform() {
  const b = new GeoBuilder();
  const g = lathe([
    [0.0, 0.52],
    [1.2, 0.5],
    [2.3, 0.36],
    [2.9, 0.1],
    [3.0, -0.2],
    [2.6, -0.6],
  ], 28);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const s = 1 + Math.sin(a * 7) * 0.07;
    p.setX(i, x * s);
    p.setZ(i, z * s);
  }
  g.computeVertexNormals();
  b.add(g, mat(0, 0, 0), {
    sway: 0,
    tint: 1,
    colorFn: (local, w, col) => col.copy(C('#f5d48a')).lerp(C('#eea154'), Math.min(1, Math.hypot(local.x, local.z) / 3)),
    glowFn: (local) => (local.y > 0.45 ? 0.12 : 0),
  });
  return { geometry: b.build(1), height: 1 };
}

export function crystalSpires() {
  const b = new GeoBuilder();
  const rng = mulberry32(83);
  for (let i = 0; i < 5; i++) {
    const h = 1.2 + rng() * 3.2;
    const g = new THREE.OctahedronGeometry(0.32, 0);
    g.scale(1, h / 0.64, 1);
    g.translate(0, h / 2, 0);
    const a = rng() * 6.28;
    const d = rng() * 0.7;
    b.add(g, mat(Math.cos(a) * d, -0.2, Math.sin(a) * d, (rng() - 0.5) * 0.4, rng() * 6, (rng() - 0.5) * 0.4), {
      sway: 0,
      tint: 1,
      colorFn: (local, w, col) => col.copy(C('#5aa7a0')).lerp(C('#e6fbff'), Math.min(1, Math.max(0, local.y / h))),
      glowFn: (local) => 0.25 + 0.6 * Math.min(1, Math.max(0, local.y / h)),
    });
  }
  return { geometry: b.build(4), height: 4 };
}

export const PROTOTYPES = {
  grass: grassTuft,
  cupFlower,
  trumpet: trumpetFlower,
  spires: spireCluster,
  bulb: bulbPlant,
  fern: fernBush,
  giantFlower,
  neuralTree,
  rock,
  reeds,
  lily: lilyPads,
  platform: petalPlatform,
  crystals: crystalSpires,
};
