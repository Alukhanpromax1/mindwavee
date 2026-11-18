// World layout: deterministic regions, river, paths and terrain height.
// The geography mirrors the proposed MindWave pipeline:
//   Meadow (session start) → Neural Grove (signals) → River of Signals (quality → features →
//   classification → feedback) → Blooming Basin (visual feedback) → Sanctuary (rest + summary).
// Beyond the core regions, the "Wild Reaches" continue procedurally in every direction.

import { createNoise2D, fbm, ridged } from '../core/noise.js';
import { smoothstep, lerp, chaikin, polylineLengths, pointAt, clamp } from '../core/math.js';

export const SEED = 7086;
export const WATER_LEVEL = 0;

const nA = createNoise2D(SEED);
const nB = createNoise2D(SEED + 11);
const nC = createNoise2D(SEED + 23);
const nD = createNoise2D(SEED + 37);
export const noiseA = nA;
export const noiseB = nB;
export const noiseC = nC;
export const noiseD = nD;

// Region indices are shared with shaders (uniform float uVital[7]).
export const R_MEADOW = 0;
export const R_GROVE = 1;
export const R_RIVER = 2;
export const R_BASIN = 3;
export const R_SANCTUARY = 4;
export const R_CONSTELLATION = 5;
export const R_WILDS = 6;
export const REGION_COUNT = 7;

export const REGIONS = [
  {
    id: 'meadow',
    index: R_MEADOW,
    name: 'The Luminous Meadow',
    center: [0, 0],
    radius: 130,
  },
  {
    id: 'grove',
    index: R_GROVE,
    name: 'The Neural Grove',
    center: [-230, -215],
    radius: 118,
  },
  {
    id: 'river',
    index: R_RIVER,
    name: 'The River of Signals',
    center: [-30, -235],
    radius: 0, // defined by distance to the river
  },
  {
    id: 'basin',
    index: R_BASIN,
    name: 'The Blooming Basin',
    center: [300, -175],
    radius: 145,
  },
  {
    id: 'sanctuary',
    index: R_SANCTUARY,
    name: 'The Sanctuary',
    center: [30, 285],
    radius: 115,
  },
  {
    id: 'constellation',
    index: R_CONSTELLATION,
    name: 'The Constellation Hollow',
    center: [-305, 140],
    radius: 92,
  },
  {
    id: 'wilds',
    index: R_WILDS,
    name: 'The Wild Reaches',
    center: [0, 0],
    radius: 0,
  },
];

export const SPAWN = { x: 6, z: 46, heading: Math.PI }; // facing north (-z) toward the Dawn Seed

// ---------------------------------------------------------------- River of Signals
const RIVER_RAW = [
  [-332, -288],
  [-292, -312],
  [-236, -312],
  [-180, -296],
  [-122, -266],
  [-62, -240],
  [0, -226],
  [62, -214],
  [124, -210],
  [182, -200],
  [226, -188],
  [258, -178],
];
export const RIVER = chaikin(RIVER_RAW, 3);
const riverLen = polylineLengths(RIVER);
export const RIVER_LENGTH = riverLen.total;
export const riverPointAt = (t) => pointAt(RIVER, riverLen.cum, riverLen.total, t);
export const riverHalfWidth = (t) => 5 + 9 * t;

// Pipeline stations along the river (arc fraction). The spring at t=0 is "acquisition".
export const RIVER_STATIONS = [
  { id: 'spring', t: 0.0 },
  { id: 'quality', t: 0.2 },
  { id: 'features', t: 0.4 },
  { id: 'classification', t: 0.6 },
  { id: 'feedback', t: 0.82 },
];

// ---------------------------------------------------------------- Paths
function wobblyPath(points, amp, seed) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const [x, z] = points[i];
    if (i === 0 || i === points.length - 1) {
      out.push([x, z]);
      continue;
    }
    out.push([x + nD(seed + i * 3.1, 0.5) * amp, z + nD(0.5, seed + i * 2.7) * amp]);
  }
  return chaikin(out, 3);
}

function offsetRiverPath(side, extra) {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = 0.02 + (i / 40) * 0.93;
    const p = riverPointAt(t);
    const off = riverHalfWidth(t) + extra;
    pts.push([p.x - p.dz * off * side, p.z + p.dx * off * side]);
  }
  return chaikin(pts, 2);
}

export const PATHS = [
  wobblyPath([[-4, -32], [-48, -78], [-100, -118], [-150, -160], [-196, -196]], 14, 1),
  wobblyPath([[12, -30], [64, -84], [130, -128], [205, -150], [262, -160]], 14, 2),
  wobblyPath([[4, 30], [-6, 92], [16, 160], [26, 228]], 12, 3),
  wobblyPath([[-28, 10], [-100, 46], [-180, 92], [-262, 128]], 12, 4),
  wobblyPath([[-250, -168], [-282, -70], [-300, 30], [-302, 96]], 12, 5),
  wobblyPath([[70, 246], [150, 176], [228, 60], [280, -50], [294, -122]], 18, 6),
  offsetRiverPath(1, 10),
];

// ---------------------------------------------------------------- Segment acceleration
function toSegments(poly, withT) {
  const segs = [];
  let cum = 0;
  let total = 0;
  for (let i = 0; i < poly.length - 1; i++) total += Math.hypot(poly[i + 1][0] - poly[i][0], poly[i + 1][1] - poly[i][1]);
  for (let i = 0; i < poly.length - 1; i++) {
    const [ax, az] = poly[i];
    const [bx, bz] = poly[i + 1];
    const vx = bx - ax;
    const vz = bz - az;
    const len = Math.hypot(vx, vz);
    segs.push({
      ax,
      az,
      vx,
      vz,
      l2: vx * vx + vz * vz,
      t0: withT ? cum / total : 0,
      t1: withT ? (cum + len) / total : 0,
      minX: Math.min(ax, bx),
      maxX: Math.max(ax, bx),
      minZ: Math.min(az, bz),
      maxZ: Math.max(az, bz),
    });
    cum += len;
  }
  return segs;
}

const RIVER_SEGS = toSegments(RIVER, true);
const PATH_SEGS = PATHS.flatMap((p) => toSegments(p, false));

/** Collect the river/path segments relevant to an area (used per terrain chunk for speed). */
export function localContext(minX, minZ, maxX, maxZ, margin = 90) {
  const f = (s) => s.maxX >= minX - margin && s.minX <= maxX + margin && s.maxZ >= minZ - margin && s.minZ <= maxZ + margin;
  return { river: RIVER_SEGS.filter(f), paths: PATH_SEGS.filter(f) };
}
export const GLOBAL_CONTEXT = { river: RIVER_SEGS, paths: PATH_SEGS };

const _seg = { d: 0, t: 0 };
function nearestSeg(segs, x, z, out) {
  let best = 1e12;
  let bt = 0;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    let u = ((x - s.ax) * s.vx + (z - s.az) * s.vz) / s.l2;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    const cx = s.ax + s.vx * u - x;
    const cz = s.az + s.vz * u - z;
    const d = cx * cx + cz * cz;
    if (d < best) {
      best = d;
      bt = s.t0 + (s.t1 - s.t0) * u;
    }
  }
  out.d = segs.length ? Math.sqrt(best) : 1e6;
  out.t = bt;
  return out;
}

export function riverInfo(x, z, ctx = GLOBAL_CONTEXT) {
  return nearestSeg(ctx.river, x, z, { d: 0, t: 0 });
}

// ---------------------------------------------------------------- Sample (height + biome)
/**
 * Full terrain sample. Returns a reusable object:
 *  h          terrain height
 *  w[7]       region weights (sum = 1, index 6 = wilds)
 *  path       0..1 closeness to a path
 *  riverD     distance to river centre
 *  riverT     river arc fraction at nearest point
 */
export function createSample() {
  return { h: 0, w: new Float32Array(REGION_COUNT), path: 0, riverD: 1e6, riverT: 0, wildKind: 0 };
}

function circleWeight(x, z, r, wob) {
  const d = Math.hypot(x - r.center[0], z - r.center[1]) + wob;
  return smoothstep(r.radius, r.radius * 0.5, d);
}

export function sampleTerrain(x, z, out = createSample(), ctx = GLOBAL_CONTEXT) {
  const w = out.w;
  const wob = nC(x * 0.009, z * 0.009) * 20;

  // --- river distance
  nearestSeg(ctx.river, x, z, _seg);
  const rd = _seg.d;
  const rt = _seg.t;
  out.riverD = rd;
  out.riverT = rt;

  // --- region weights
  w[R_MEADOW] = circleWeight(x, z, REGIONS[R_MEADOW], wob);
  w[R_GROVE] = circleWeight(x, z, REGIONS[R_GROVE], wob);
  w[R_RIVER] = smoothstep(62, 24, rd + wob * 0.4);
  w[R_BASIN] = circleWeight(x, z, REGIONS[R_BASIN], wob);
  w[R_SANCTUARY] = circleWeight(x, z, REGIONS[R_SANCTUARY], wob);
  w[R_CONSTELLATION] = circleWeight(x, z, REGIONS[R_CONSTELLATION], wob);
  let sum = 0;
  for (let i = 0; i < 6; i++) sum += w[i];
  if (sum > 1) {
    for (let i = 0; i < 6; i++) w[i] /= sum;
    sum = 1;
  }
  w[R_WILDS] = 1 - sum;

  // --- base landform
  const r = Math.hypot(x, z);
  let h = 5 + fbm(nA, x * 0.0032, z * 0.0032, 4) * 13 + fbm(nB, x * 0.011, z * 0.011, 3) * 3.2;
  const far = smoothstep(520, 1100, r);
  if (far > 0) {
    const mask = smoothstep(-0.25, 0.45, nC(x * 0.0011 + 40, z * 0.0011 - 12));
    h += far * (ridged(nB, x * 0.0022, z * 0.0022, 4) * 120 * mask + 10);
  }

  // --- Meadow: soft, open, gently rolling
  if (w[R_MEADOW] > 0) {
    const d = Math.hypot(x, z);
    const target = 3.2 + fbm(nB, x * 0.02, z * 0.02, 2) * 1.4 + (d / 130) * (d / 130) * 4;
    h = lerp(h, target, w[R_MEADOW] * 0.92);
  }
  // --- Grove: raised, mounded, root-like ridges
  if (w[R_GROVE] > 0) {
    const target = h * 0.55 + 8 + ridged(nA, x * 0.018, z * 0.018, 2) * 9;
    h = lerp(h, target, w[R_GROVE]);
  }
  // --- Constellation Hollow: elevated plateau with a gentle bowl
  {
    const c = REGIONS[R_CONSTELLATION].center;
    const d = Math.hypot(x - c[0], z - c[1]);
    const blend = smoothstep(120, 70, d + wob * 0.5);
    if (blend > 0) {
      const target = 13 - 3.5 * smoothstep(55, 5, d) + fbm(nB, x * 0.03, z * 0.03, 2) * 0.8 + smoothstep(55, 80, d) * 3;
      h = lerp(h, target, blend);
    }
  }
  // --- Blooming Basin: bowl valley with a pool and a central island
  {
    const c = REGIONS[R_BASIN].center;
    const d = Math.hypot(x - c[0], z - c[1]);
    if (d < 190) {
      let p = 1.4;
      p = lerp(p, -1.7, smoothstep(11, 16, d));
      p = lerp(p, 0.9, smoothstep(34, 42, d));
      p += smoothstep(42, 125, d) * 5.5 + fbm(nB, x * 0.025, z * 0.025, 2) * 0.6 * smoothstep(40, 60, d);
      const rim = smoothstep(105, 135, d) * smoothstep(185, 140, d) * 7;
      const blend = smoothstep(160, 118, d + wob * 0.4);
      h = lerp(h, p, blend) + rim * (1 - smoothstep(0.85, 1, blend)) * 0.6;
    }
  }
  // --- Sanctuary: still pond with a heart island
  {
    const c = REGIONS[R_SANCTUARY].center;
    const d = Math.hypot(x - c[0], z - c[1]);
    if (d < 150) {
      let p = 1.5 + smoothstep(16, 0, d) * 0.6;
      p = lerp(p, -1.6, smoothstep(14, 19, d));
      p = lerp(p, 1.0, smoothstep(50, 58, d));
      p += smoothstep(58, 110, d) * 3;
      const blend = smoothstep(135, 95, d + wob * 0.4);
      h = lerp(h, p, blend);
    }
  }
  // --- River: soften the valley, then carve the bed
  if (rd < 90) {
    const hw = 5 + 9 * rt;
    h = lerp(h, Math.min(h, 2.6 + rd * 0.07), smoothstep(80, 18, rd));
    h = lerp(h, -1.9, smoothstep(hw + 7, hw * 0.55, rd));
    // The Source Spring pool
    const sx = RIVER[0][0];
    const sz = RIVER[0][1];
    const sd = Math.hypot(x - sx, z - sz);
    if (sd < 30) h = lerp(h, -1.8, smoothstep(22, 12, sd));
  }

  // --- paths: a faint groove
  let pathC = 0;
  if (ctx.paths.length) {
    nearestSeg(ctx.paths, x, z, _seg);
    pathC = smoothstep(3.6, 1.2, _seg.d);
    h -= pathC * 0.18;
  }
  out.path = pathC;
  out.h = h;
  out.wildKind = nD(x * 0.0045, z * 0.0045); // -1..1 sub-biome selector in the wilds
  return out;
}

const _tmpSample = createSample();
export function heightAt(x, z) {
  return sampleTerrain(x, z, _tmpSample).h;
}
/** Height of the walkable surface (the seed floats on water). */
export function surfaceAt(x, z) {
  return Math.max(heightAt(x, z), WATER_LEVEL + 0.05);
}

export function dominantRegion(x, z) {
  const s = sampleTerrain(x, z, _tmpSample);
  let best = R_WILDS;
  let bw = s.w[R_WILDS] * 0.9; // regions win ties so names feel stable
  for (let i = 0; i < 6; i++) {
    if (s.w[i] > bw) {
      bw = s.w[i];
      best = i;
    }
  }
  return best;
}

export function distanceToRegion(index, x, z) {
  const r = REGIONS[index];
  if (index === R_RIVER) return riverInfo(x, z).d;
  return Math.hypot(x - r.center[0], z - r.center[1]);
}

export { clamp };
