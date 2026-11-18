// Fixed positions of every hand-placed landmark. Shared by world building, scatter
// exclusion, gameplay, the map and the journal so everything stays consistent.
import { REGIONS, R_BASIN, R_SANCTUARY, R_CONSTELLATION, R_GROVE, riverPointAt, RIVER_STATIONS } from './layout.js';

const grove = REGIONS[R_GROVE].center;
const station = (id) => {
  const s = RIVER_STATIONS.find((r) => r.id === id);
  const p = riverPointAt(s.t);
  return { x: p.x, z: p.z, dx: p.dx, dz: p.dz, t: s.t };
};

export const SITES = {
  dawnSeed: { x: 0, z: -16, r: 12 },
  calibration: { x: -42, z: 18, r: 11 },
  groveTree: { x: grove[0], z: grove[1], r: 24 },
  groveBlossoms: [0.4, 2.45, 4.4].map((a) => ({ x: grove[0] + Math.cos(a) * 34, z: grove[1] + Math.sin(a) * 34, r: 6 })),
  spring: station('spring'),
  quality: station('quality'),
  features: station('features'),
  classification: station('classification'),
  feedback: station('feedback'),
  greatBloom: { x: REGIONS[R_BASIN].center[0], z: REGIONS[R_BASIN].center[1], r: 16 },
  heart: { x: REGIONS[R_SANCTUARY].center[0], z: REGIONS[R_SANCTUARY].center[1], r: 20 },
  restStones: { x: 74, z: 236, r: 9 },
  guardian: { x: -14, z: 238, r: 9 },
  starAltar: { x: REGIONS[R_CONSTELLATION].center[0], z: REGIONS[R_CONSTELLATION].center[1], r: 26 },
};

export const EXCLUSIONS = [
  SITES.dawnSeed,
  SITES.calibration,
  SITES.groveTree,
  ...SITES.groveBlossoms,
  { ...SITES.spring, r: 14 },
  { ...SITES.quality, r: 16 },
  { ...SITES.features, r: 16 },
  { ...SITES.classification, r: 18 },
  { ...SITES.feedback, r: 16 },
  { ...SITES.greatBloom, r: 18 },
  SITES.heart,
  SITES.restStones,
  SITES.guardian,
  SITES.starAltar,
  { x: 6, z: 46, r: 6 }, // spawn
];

export function isExcluded(x, z, pad = 0) {
  for (const e of EXCLUSIONS) {
    const dx = x - e.x;
    const dz = z - e.z;
    if (dx * dx + dz * dz < (e.r + pad) * (e.r + pad)) return true;
  }
  return false;
}
