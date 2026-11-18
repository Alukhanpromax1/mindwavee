// Deterministic, streamed terrain chunks.
//  - Each chunk samples a 2 m "field" (height, region weights, paths) once.
//  - The terrain mesh is built from the field at a distance-based LOD, with skirts to hide seams.
//  - Vegetation is scattered deterministically from the same field (seeded per chunk).
//  - Chunks load in a time-budgeted queue around the player and are disposed when far away.
import * as THREE from 'three';
import { sampleTerrain, createSample, localContext, REGION_COUNT, R_MEADOW, R_GROVE, R_RIVER, R_BASIN, R_SANCTUARY, R_CONSTELLATION, R_WILDS, SEED } from '../layout.js';
import { createTerrainMaterial } from '../materials.js';
import { scatterChunk } from '../vegetation/scatter.js';
import { smoothstep } from '../../core/math.js';
import { noiseD } from '../layout.js';

export const CHUNK_SIZE = 64;
export const FIELD_RES = 32; // cells per chunk side in the field (2 m)
const FN = FIELD_RES + 1; // vertices per side
const FB = FN + 2; // with 1-vertex border for normals
const STEP = CHUNK_SIZE / FIELD_RES;

// ------------------------------------------------------------------ palette
const P = (hex) => new THREE.Color(hex);
const PAL = {
  meadow: [P('#a3cc55'), P('#c9d866'), P('#86bd4f')],
  grove: [P('#3f8e6e'), P('#5aa57c'), P('#2f7a68')],
  river: [P('#86cf98'), P('#a9dca0'), P('#7cc792')],
  basin: [P('#b2d85c'), P('#e2cd69'), P('#9fcf55')],
  sanctuary: [P('#b5e1b0'), P('#d4edbf'), P('#a3d9ab')],
  constellation: [P('#3b7a73'), P('#4f8f8a'), P('#356f6c')],
  wildGreen: [P('#5a9f6e'), P('#4d9468'), P('#6fae72')],
  wildGold: [P('#cdd86a'), P('#d9cf72'), P('#b8d062')],
  wildMeadow: [P('#9ccb58'), P('#b4d460'), P('#86c053')],
  rock: P('#cbc4a3'),
  alpine: P('#d3dbb9'),
  snow: P('#eef0e2'),
};
const REGION_PAL = [PAL.meadow, PAL.grove, PAL.river, PAL.basin, PAL.sanctuary, PAL.constellation];
const _col = new THREE.Color();
const _tmp = new THREE.Color();

function pickPal(pal, x, z) {
  const n = noiseD(x * 0.018 + 7, z * 0.018) * 0.5 + 0.5;
  const n2 = noiseD(x * 0.06, z * 0.06 + 3) * 0.5 + 0.5;
  _tmp.copy(pal[0]).lerp(pal[1], smoothstep(0.35, 0.75, n));
  return _tmp.lerp(pal[2], smoothstep(0.55, 0.9, n2) * 0.7);
}

// ------------------------------------------------------------------ field sampling
function computeField(cx, cz) {
  const x0 = cx * CHUNK_SIZE;
  const z0 = cz * CHUNK_SIZE;
  const ctx = localContext(x0, z0, x0 + CHUNK_SIZE, z0 + CHUNK_SIZE);
  const s = createSample();
  const n = FB * FB;
  const h = new Float32Array(n);
  const w = new Float32Array(n * REGION_COUNT);
  const path = new Float32Array(n);
  const riverD = new Float32Array(n);
  const wild = new Float32Array(n);
  for (let j = 0; j < FB; j++) {
    for (let i = 0; i < FB; i++) {
      const k = j * FB + i;
      const x = x0 + (i - 1) * STEP;
      const z = z0 + (j - 1) * STEP;
      sampleTerrain(x, z, s, ctx);
      h[k] = s.h;
      w.set(s.w, k * REGION_COUNT);
      path[k] = s.path;
      riverD[k] = s.riverD;
      wild[k] = s.wildKind;
    }
  }
  return { cx, cz, x0, z0, h, w, path, riverD, wild, ctx };
}

/** Bilinear height + nearest attributes from a chunk field at local coords (0..64). */
export function fieldSample(f, lx, lz, out) {
  const fx = lx / STEP + 1;
  const fz = lz / STEP + 1;
  const i = Math.min(FB - 2, Math.max(0, Math.floor(fx)));
  const j = Math.min(FB - 2, Math.max(0, Math.floor(fz)));
  const u = fx - i;
  const v = fz - j;
  const k = j * FB + i;
  const h = f.h;
  out.h = (h[k] * (1 - u) + h[k + 1] * u) * (1 - v) + (h[k + FB] * (1 - u) + h[k + FB + 1] * u) * v;
  const kn = (v < 0.5 ? j : j + 1) * FB + (u < 0.5 ? i : i + 1);
  out.k = kn;
  out.path = f.path[kn];
  out.riverD = f.riverD[kn];
  out.wild = f.wild[kn];
  out.wOffset = kn * REGION_COUNT;
  // slope estimate
  out.slope = Math.hypot(h[k + 1] - h[k], h[k + FB] - h[k]) / STEP;
  return out;
}

// ------------------------------------------------------------------ terrain mesh
function groundColor(f, k, x, z, slope) {
  const w = f.w;
  const o = k * REGION_COUNT;
  _col.setRGB(0, 0, 0);
  for (let r = 0; r < 6; r++) {
    const wr = w[o + r];
    if (wr > 0.001) {
      const c = pickPal(REGION_PAL[r], x, z);
      _col.r += c.r * wr;
      _col.g += c.g * wr;
      _col.b += c.b * wr;
    }
  }
  const ww = w[o + R_WILDS];
  if (ww > 0.001) {
    const kind = f.wild[k];
    const pal = kind < -0.2 ? PAL.wildGreen : kind > 0.3 ? PAL.wildGold : PAL.wildMeadow;
    const c = pickPal(pal, x, z);
    _col.r += c.r * ww;
    _col.g += c.g * ww;
    _col.b += c.b * ww;
  }
  const h = f.h[k];
  _col.lerp(PAL.rock, smoothstep(0.55, 1.1, slope) * 0.75);
  _col.lerp(PAL.alpine, smoothstep(32, 70, h) * 0.8);
  _col.lerp(PAL.snow, smoothstep(85, 125, h) * 0.9);
  return _col;
}

function buildTerrainGeometry(f, lod) {
  const stride = FIELD_RES / lod; // 1 or 2 field cells per quad
  const n = lod + 1;
  const vCount = n * n + 4 * lod; // + skirt
  const pos = new Float32Array(vCount * 3);
  const nor = new Float32Array(vCount * 3);
  const col = new Float32Array(vCount * 3);
  const w0 = new Float32Array(vCount * 4);
  const w1 = new Float32Array(vCount * 3);
  const pth = new Float32Array(vCount);
  const H = f.h;
  const writeVertex = (vi, i, j, yOffset) => {
    const fi = i * stride + 1;
    const fj = j * stride + 1;
    const k = fj * FB + fi;
    const lx = i * stride * STEP;
    const lz = j * stride * STEP;
    // central differences (the field has a 1-cell border; clamp for coarser LODs)
    const kl = fj * FB + Math.max(0, fi - stride);
    const kr = fj * FB + Math.min(FB - 1, fi + stride);
    const kd = Math.max(0, fj - stride) * FB + fi;
    const ku = Math.min(FB - 1, fj + stride) * FB + fi;
    const dx = (H[kr] - H[kl]) / (((Math.min(FB - 1, fi + stride) - Math.max(0, fi - stride)) * STEP) || 1);
    const dz = (H[ku] - H[kd]) / (((Math.min(FB - 1, fj + stride) - Math.max(0, fj - stride)) * STEP) || 1);
    const nx = -dx;
    const nz = -dz;
    const nl = Math.hypot(nx, 1, nz);
    pos[vi * 3] = lx;
    pos[vi * 3 + 1] = H[k] + yOffset;
    pos[vi * 3 + 2] = lz;
    nor[vi * 3] = nx / nl;
    nor[vi * 3 + 1] = 1 / nl;
    nor[vi * 3 + 2] = nz / nl;
    const slope = Math.hypot(dx, dz);
    const c = groundColor(f, k, f.x0 + lx, f.z0 + lz, slope);
    col[vi * 3] = c.r;
    col[vi * 3 + 1] = c.g;
    col[vi * 3 + 2] = c.b;
    const o = k * REGION_COUNT;
    w0[vi * 4] = f.w[o + R_MEADOW];
    w0[vi * 4 + 1] = f.w[o + R_GROVE];
    w0[vi * 4 + 2] = f.w[o + R_RIVER];
    w0[vi * 4 + 3] = f.w[o + R_BASIN];
    w1[vi * 3] = f.w[o + R_SANCTUARY];
    w1[vi * 3 + 1] = f.w[o + R_CONSTELLATION];
    w1[vi * 3 + 2] = f.w[o + R_WILDS];
    pth[vi] = f.path[k];
  };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) writeVertex(j * n + i, i, j, 0);
  const idx = [];
  for (let j = 0; j < lod; j++) {
    for (let i = 0; i < lod; i++) {
      const a = j * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  // skirt: perimeter loop
  const perim = [];
  for (let i = 0; i < lod; i++) perim.push([i, 0]);
  for (let j = 0; j < lod; j++) perim.push([lod, j]);
  for (let i = lod; i > 0; i--) perim.push([i, lod]);
  for (let j = lod; j > 0; j--) perim.push([0, j]);
  const base = n * n;
  perim.forEach(([i, j], p) => writeVertex(base + p, i, j, -4));
  for (let p = 0; p < perim.length; p++) {
    const q = (p + 1) % perim.length;
    const a = perim[p][1] * n + perim[p][0];
    const b = perim[q][1] * n + perim[q][0];
    idx.push(a, b, base + p, b, base + q, base + p);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aW0', new THREE.BufferAttribute(w0, 4));
  g.setAttribute('aW1', new THREE.BufferAttribute(w1, 3));
  g.setAttribute('aPath', new THREE.BufferAttribute(pth, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

// ------------------------------------------------------------------ manager
export class ChunkManager {
  /**
   * @param {THREE.Scene} scene
   * @param {object} o  { radius, lodNear, vegLayer, onChunkLoad, onChunkUnload, density }
   */
  constructor(scene, o) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'terrain';
    scene.add(this.group);
    this.material = createTerrainMaterial();
    this.chunks = new Map();
    this.queue = [];
    this.center = { cx: 1e9, cz: 1e9 };
    this.vegLayer = o.vegLayer;
    this.onChunkLoad = o.onChunkLoad;
    this.onChunkUnload = o.onChunkUnload;
    this.setQuality(o);
    this.vegDirty = true;
    this.stats = { loaded: 0, built: 0, disposed: 0 };
  }

  setQuality({ radius = 5, lodNearRing = 1, density = 1 }) {
    this.radius = radius;
    this.lodNearRing = lodNearRing;
    this.density = density;
    this.center = { cx: 1e9, cz: 1e9 }; // force refresh
  }

  key(cx, cz) {
    return `${cx},${cz}`;
  }

  ringOf(c) {
    return Math.max(Math.abs(c.cx - this.center.cx), Math.abs(c.cz - this.center.cz));
  }

  /** Call every frame with the focus position (player or cinematic camera). */
  update(x, z, budgetMs = 5) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    if (cx !== this.center.cx || cz !== this.center.cz) {
      this.center = { cx, cz };
      this.refreshWanted();
    }
    const t0 = performance.now();
    let did = false;
    while (this.queue.length && performance.now() - t0 < budgetMs) {
      const job = this.queue.shift();
      this.runJob(job);
      did = true;
    }
    if (did || this.vegDirty) {
      this.vegLayer.rebuild(this.chunks, this.center);
      this.vegDirty = false;
    }
  }

  refreshWanted() {
    const R = this.radius;
    const wanted = new Set();
    const jobs = [];
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        const cx = this.center.cx + dx;
        const cz = this.center.cz + dz;
        const k = this.key(cx, cz);
        wanted.add(k);
        const ring = Math.max(Math.abs(dx), Math.abs(dz));
        const lod = ring <= this.lodNearRing ? 32 : ring <= this.lodNearRing + 2 ? 16 : 8;
        const c = this.chunks.get(k);
        if (!c) jobs.push({ type: 'build', cx, cz, lod, d: dx * dx + dz * dz });
        else if (c.lod !== lod) jobs.push({ type: 'lod', cx, cz, lod, d: dx * dx + dz * dz + 0.5 });
      }
    }
    // dispose chunks outside radius + 1 (hysteresis)
    for (const [k, c] of this.chunks) {
      if (!wanted.has(k) && this.ringOf(c) > R + 1) this.disposeChunk(k, c);
    }
    jobs.sort((a, b) => a.d - b.d);
    this.queue = jobs;
    this.vegDirty = true;
  }

  runJob(job) {
    const k = this.key(job.cx, job.cz);
    if (job.type === 'build') {
      if (this.chunks.has(k)) return;
      const field = computeField(job.cx, job.cz);
      const geo = buildTerrainGeometry(field, job.lod);
      const mesh = new THREE.Mesh(geo, this.material);
      mesh.position.set(field.x0, 0, field.z0);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      this.group.add(mesh);
      const scatter = scatterChunk(field, this.density);
      const chunk = { cx: job.cx, cz: job.cz, lod: job.lod, field, mesh, scatter };
      this.chunks.set(k, chunk);
      this.stats.built++;
      this.onChunkLoad?.(chunk);
    } else if (job.type === 'lod') {
      const c = this.chunks.get(k);
      if (!c || c.lod === job.lod) return;
      c.mesh.geometry.dispose();
      c.mesh.geometry = buildTerrainGeometry(c.field, job.lod);
      c.lod = job.lod;
    }
  }

  disposeChunk(k, c) {
    this.group.remove(c.mesh);
    c.mesh.geometry.dispose();
    this.chunks.delete(k);
    this.stats.disposed++;
    this.onChunkUnload?.(c);
  }

  /** Synchronously build everything wanted around a point (used during loading). */
  preload(x, z, onProgress) {
    this.update(x, z, 0);
    const total = this.queue.length;
    return new Promise((resolve) => {
      const step = () => {
        const t0 = performance.now();
        while (this.queue.length && performance.now() - t0 < 30) this.runJob(this.queue.shift());
        onProgress?.(1 - this.queue.length / Math.max(1, total));
        if (this.queue.length) setTimeout(step, 0);
        else {
          this.vegLayer.rebuild(this.chunks, this.center);
          resolve();
        }
      };
      step();
    });
  }

  get pending() {
    return this.queue.length;
  }
}

export { SEED };
