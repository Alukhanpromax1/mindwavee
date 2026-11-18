// Deterministic vegetation scatter per chunk (seeded by chunk coordinates).
import * as THREE from 'three';
import { mulberry32, hash2i } from '../../core/noise.js';
import { REGION_COUNT, R_RIVER, R_SANCTUARY, R_BASIN, R_WILDS, SEED } from '../layout.js';
import { isExcluded } from '../sites.js';
import { fieldSample, CHUNK_SIZE } from '../terrain/chunks.js';

const c = (hex) => new THREE.Color(hex);
const TINT = {
  flower: [c('#ffffff'), c('#fff6e2'), c('#fde6ec'), c('#e4f6ee'), c('#fff0c2'), c('#f1ecff')],
  trumpet: [c('#ffffff'), c('#ffe7c4'), c('#ffd8a6'), c('#fff4dc')],
  green: [c('#ffffff'), c('#eaf6d8'), c('#d8efc6')],
  bulb: [c('#ffffff'), c('#d6fff0'), c('#e6f2ff'), c('#fff7da')],
  crystal: [c('#ffffff'), c('#dcf2ff'), c('#e3ffef')],
  platform: [c('#ffffff'), c('#fff1d6'), c('#ffe2c0')],
  rock: [c('#ffffff'), c('#f2efe6'), c('#e9efe2')],
};
const E = (t, w, s0, s1, tints = TINT.green, tilt = 0.12) => ({ t, w, s0, s1, tints, tilt });

// [small table, large table] per region; wilds use sub-kinds
const TABLES = {
  0: {
    small: [E('cupFlower', 3, 0.8, 1.45, TINT.flower), E('trumpet', 1, 0.55, 1.0, TINT.trumpet), E('fern', 1.1, 0.7, 1.3), E('spires', 0.5, 0.3, 0.6), E('rock', 0.2, 0.3, 0.7, TINT.rock, 0.3)],
    large: [E('giantFlower', 0.32, 0.55, 1.1, TINT.flower, 0.05), E('rock', 0.25, 1.2, 2.6, TINT.rock, 0.3), E('spires', 0.3, 1.0, 1.9), E('trumpet', 0.2, 1.6, 2.6, TINT.trumpet, 0.08)],
  },
  1: {
    small: [E('bulb', 3, 0.8, 1.5, TINT.bulb), E('fern', 2.2, 0.8, 1.6), E('spires', 1, 0.4, 0.9), E('cupFlower', 0.5, 0.8, 1.2, TINT.flower)],
    large: [E('neuralTree', 0.9, 0.9, 1.7, TINT.green, 0.04), E('bulb', 0.35, 2.2, 3.4, TINT.bulb), E('spires', 0.35, 1.2, 2.2), E('rock', 0.15, 1.2, 2.4, TINT.rock, 0.3)],
  },
  2: {
    small: [E('cupFlower', 2, 0.8, 1.3, TINT.flower), E('fern', 1.5, 0.7, 1.3), E('reeds', 1.2, 0.8, 1.3), E('spires', 0.5, 0.3, 0.7)],
    large: [E('rock', 0.3, 1.0, 2.2, TINT.rock, 0.3), E('spires', 0.25, 1.0, 1.8), E('giantFlower', 0.12, 0.5, 0.9, TINT.flower, 0.05)],
  },
  3: {
    small: [E('cupFlower', 3, 0.9, 1.6, TINT.flower), E('trumpet', 2.6, 0.7, 1.3, TINT.trumpet), E('fern', 0.6, 0.8, 1.3)],
    large: [E('giantFlower', 1.8, 0.8, 1.8, TINT.flower, 0.05), E('platform', 0.6, 0.7, 1.5, TINT.platform, 0.04), E('trumpet', 0.7, 2.0, 3.6, TINT.trumpet, 0.08)],
  },
  4: {
    small: [E('cupFlower', 3, 0.8, 1.4, TINT.flower), E('bulb', 1, 0.8, 1.3, TINT.bulb), E('fern', 1, 0.7, 1.2), E('rock', 0.35, 0.3, 0.8, TINT.rock, 0.3)],
    large: [E('giantFlower', 0.3, 0.55, 1.0, TINT.flower, 0.05), E('rock', 0.4, 1.0, 2.2, TINT.rock, 0.25), E('bulb', 0.25, 2.0, 3.0, TINT.bulb)],
  },
  5: {
    small: [E('crystals', 1.1, 0.3, 0.6, TINT.crystal, 0.2), E('bulb', 2, 0.8, 1.4, TINT.bulb), E('fern', 1, 0.7, 1.2), E('spires', 0.6, 0.4, 0.8)],
    large: [E('crystals', 0.8, 1.0, 2.6, TINT.crystal, 0.15), E('rock', 0.3, 1.0, 2.2, TINT.rock, 0.3), E('neuralTree', 0.1, 0.6, 1.0)],
  },
  wildGreen: {
    small: [E('fern', 2, 0.8, 1.5), E('bulb', 1.2, 0.8, 1.4, TINT.bulb), E('spires', 1, 0.4, 0.9), E('cupFlower', 0.6, 0.8, 1.2, TINT.flower)],
    large: [E('neuralTree', 0.3, 0.7, 1.4), E('spires', 0.4, 1.2, 2.2), E('rock', 0.3, 1.2, 3.0, TINT.rock, 0.3)],
  },
  wildGold: {
    small: [E('trumpet', 2, 0.6, 1.2, TINT.trumpet), E('cupFlower', 2, 0.8, 1.4, TINT.flower), E('fern', 0.5, 0.7, 1.2)],
    large: [E('giantFlower', 0.4, 0.6, 1.4, TINT.flower, 0.05), E('trumpet', 0.4, 1.8, 3.2, TINT.trumpet), E('platform', 0.2, 0.6, 1.2, TINT.platform, 0.04)],
  },
  wildMeadow: {
    small: [E('cupFlower', 2, 0.8, 1.4, TINT.flower), E('fern', 1.2, 0.7, 1.3), E('trumpet', 0.8, 0.6, 1.0, TINT.trumpet), E('spires', 0.5, 0.3, 0.7)],
    large: [E('giantFlower', 0.25, 0.5, 1.0, TINT.flower, 0.05), E('spires', 0.3, 1.0, 2.0), E('rock', 0.3, 1.2, 2.8, TINT.rock, 0.3)],
  },
};

const GRASS_TINT = [
  [1.0, 1.0, 0.8],
  [0.7, 0.95, 0.92],
  [0.9, 1.03, 0.92],
  [1.06, 1.0, 0.72],
  [0.92, 1.03, 0.95],
  [0.6, 0.86, 0.95],
];
const WILD_GRASS = { wildGreen: [0.78, 0.98, 0.9], wildGold: [1.08, 1.0, 0.7], wildMeadow: [0.98, 1.02, 0.82] };

function pickRegion(f, wOffset, r) {
  let acc = 0;
  for (let i = 0; i < REGION_COUNT; i++) {
    acc += f.w[wOffset + i];
    if (r <= acc) return i;
  }
  return R_WILDS;
}
const wildTable = (kind) => (kind < -0.2 ? 'wildGreen' : kind > 0.3 ? 'wildGold' : 'wildMeadow');

function pickEntry(list, rng, noneWeight) {
  let total = noneWeight;
  for (const e of list) total += e.w;
  let r = rng() * total;
  for (const e of list) {
    r -= e.w;
    if (r <= 0) return e;
  }
  return null;
}

class Bucket {
  constructor() {
    this.m = [];
    this.inst = [];
    this.tint = [];
    this.count = 0;
  }
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

function push(buckets, key, x, y, z, yaw, tiltX, tiltZ, scale, region, phase, tint) {
  const b = buckets[key] || (buckets[key] = new Bucket());
  _e.set(tiltX, yaw, tiltZ, 'YXZ');
  _q.setFromEuler(_e);
  _p.set(x, y, z);
  _s.setScalar(scale);
  _m.compose(_p, _q, _s);
  for (let i = 0; i < 16; i++) b.m.push(_m.elements[i]);
  b.inst.push(region, phase, 0, 0);
  b.tint.push(tint[0], tint[1], tint[2]);
  b.count++;
}

/**
 * @returns {{ buckets: Record<string, Bucket>, blossom: {x,y,z,id}|null }}
 * Bucket keys: '<type>' for small (near rings only), '<type>:L' for large, 'grass'.
 */
export function scatterChunk(f, density = 1) {
  const rng = mulberry32(hash2i(f.cx, f.cz, SEED));
  const buckets = {};
  const s = {};
  const x0 = f.x0;
  const z0 = f.z0;

  // --- large landmarks-of-nature (sparse, visible from far)
  const placedLarge = [];
  const largeTries = 11;
  for (let i = 0; i < largeTries; i++) {
    const lx = rng() * CHUNK_SIZE;
    const lz = rng() * CHUNK_SIZE;
    const rr = rng();
    const roll = rng();
    const yaw = rng() * Math.PI * 2;
    const sr = rng();
    const tr = rng();
    const tilt1 = rng() - 0.5;
    const tilt2 = rng() - 0.5;
    fieldSample(f, lx, lz, s);
    const x = x0 + lx;
    const z = z0 + lz;
    if (s.h < 0.4 || s.path > 0.05 || s.slope > 0.9 || isExcluded(x, z, 10)) continue;
    if (placedLarge.some((p) => (p[0] - x) ** 2 + (p[1] - z) ** 2 < 14 * 14)) continue;
    const region = pickRegion(f, s.wOffset, rr);
    const table = region === R_WILDS ? TABLES[wildTable(s.wild)] : TABLES[region];
    const e = pickEntry(table.large, () => roll, 1.0);
    if (!e) continue;
    const scale = e.s0 + (e.s1 - e.s0) * sr;
    const tint = e.tints[Math.floor(tr * e.tints.length)];
    push(buckets, `${e.t}:L`, x, s.h - 0.15 * scale, z, yaw, tilt1 * e.tilt, tilt2 * e.tilt, scale, region, yaw * 3, [tint.r, tint.g, tint.b]);
    placedLarge.push([x, z]);
  }

  // --- small plants
  const smallTries = Math.round(120 * density);
  for (let i = 0; i < smallTries; i++) {
    const lx = rng() * CHUNK_SIZE;
    const lz = rng() * CHUNK_SIZE;
    const rr = rng();
    const roll = rng();
    const yaw = rng() * Math.PI * 2;
    const sr = rng();
    const tr = rng();
    const tilt1 = rng() - 0.5;
    const tilt2 = rng() - 0.5;
    fieldSample(f, lx, lz, s);
    const x = x0 + lx;
    const z = z0 + lz;
    if (s.path > 0.25 || isExcluded(x, z, 1)) continue;
    const region = pickRegion(f, s.wOffset, rr);
    if (s.h < -0.3) {
      if (s.h > -1.95 && roll < 0.4 && (region === R_RIVER || region === R_SANCTUARY || region === R_BASIN || region === R_WILDS)) {
        push(buckets, 'lily', x, 0.03, z, yaw, 0, 0, 0.8 + sr * 0.6, region, yaw, [1, 1, 1]);
      }
      continue;
    }
    if (s.h < 0.1) continue;
    if (s.h < 1.0 && (s.riverD < 32 || region === R_SANCTUARY || region === R_BASIN)) {
      if (roll < 0.55) push(buckets, 'reeds', x, s.h - 0.1, z, yaw, tilt1 * 0.1, tilt2 * 0.1, 0.8 + sr * 0.5, region, yaw, [1, 1, 1]);
      continue;
    }
    if (s.slope > 1.1) continue;
    const table = region === R_WILDS ? TABLES[wildTable(s.wild)] : TABLES[region];
    const e = pickEntry(table.small, () => roll, 1.6);
    if (!e) continue;
    const scale = e.s0 + (e.s1 - e.s0) * sr;
    const tint = e.tints[Math.floor(tr * e.tints.length)];
    push(buckets, e.t, x, s.h - 0.04, z, yaw, tilt1 * e.tilt, tilt2 * e.tilt, scale, region, yaw * 2, [tint.r, tint.g, tint.b]);
  }

  // --- grass
  const grassTries = Math.round(1500 * density);
  for (let i = 0; i < grassTries; i++) {
    const lx = rng() * CHUNK_SIZE;
    const lz = rng() * CHUNK_SIZE;
    const rr = rng();
    const yaw = rng() * Math.PI * 2;
    const sr = rng();
    fieldSample(f, lx, lz, s);
    if (s.h < 0.25 || s.path > 0.3 || s.slope > 0.95 || s.h > 60) continue;
    const region = pickRegion(f, s.wOffset, rr);
    const tint = region === R_WILDS ? WILD_GRASS[wildTable(s.wild)] : GRASS_TINT[region];
    push(buckets, 'grass', x0 + lx, s.h - 0.05, z0 + lz, yaw, 0, 0, 0.75 + sr * 0.75, region, yaw * 4, tint);
  }

  // --- hidden blossom (rare, deterministic per chunk)
  let blossom = null;
  const hb = hash2i(f.cx * 7 + 3, f.cz * 13 - 5, SEED + 99) % 1000;
  if (hb < 70) {
    for (let tries = 0; tries < 6 && !blossom; tries++) {
      const lx = 8 + rng() * 48;
      const lz = 8 + rng() * 48;
      fieldSample(f, lx, lz, s);
      const x = x0 + lx;
      const z = z0 + lz;
      if (s.h > 0.6 && s.slope < 0.6 && !isExcluded(x, z, 12)) blossom = { x, y: s.h, z, id: `hb_${f.cx}_${f.cz}` };
    }
  }

  // finalise into typed arrays
  for (const k in buckets) {
    const b = buckets[k];
    b.m = new Float32Array(b.m);
    b.inst = new Float32Array(b.inst);
    b.tint = new Float32Array(b.tint);
  }
  return { buckets, blossom };
}
