// One InstancedMesh per vegetation bucket for ALL loaded chunks → a handful of draw calls
// for the whole world. Small plants and grass only render in the rings nearest the player.
import * as THREE from 'three';
import { PROTOTYPES } from './prototypes.js';
import { createOrganicMaterial } from '../materials.js';

const SMALL_TYPES = ['cupFlower', 'trumpet', 'fern', 'spires', 'bulb', 'reeds', 'lily', 'rock', 'crystals'];
const LARGE_TYPES = ['giantFlower', 'neuralTree', 'rock', 'spires', 'bulb', 'platform', 'trumpet', 'crystals'];

export class VegLayer {
  constructor(scene, { grassRing = 1, smallRing = 2, grassFade = 60 } = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'vegetation';
    scene.add(this.group);
    this.protoGeo = {};
    this.buckets = {};
    const def = (key, type, ring, matOpts) => {
      if (!this.protoGeo[type]) this.protoGeo[type] = PROTOTYPES[type]().geometry;
      this.buckets[key] = { key, type, ring, mesh: null, capacity: 0, material: createOrganicMaterial({ instanced: true, ...matOpts }) };
    };
    def('grass', 'grass', grassRing, { grass: true, fadeFar: grassFade, sway: 1.2 });
    for (const t of SMALL_TYPES) def(t, t, smallRing, { sway: t === 'rock' || t === 'crystals' ? 0 : 1 });
    for (const t of LARGE_TYPES) def(`${t}:L`, t, Infinity, { sway: t === 'neuralTree' ? 0.35 : t === 'rock' || t === 'platform' || t === 'crystals' ? 0 : 0.7, pulse: t === 'neuralTree' });
    this.instanceCount = 0;
  }

  setRings({ grassRing, smallRing, grassFade }) {
    if (grassRing !== undefined) this.buckets.grass.ring = grassRing;
    if (grassFade !== undefined) this.buckets.grass.material.uniforms.uFadeFar.value = grassFade;
    if (smallRing !== undefined) for (const t of SMALL_TYPES) this.buckets[t].ring = smallRing;
  }

  ensureCapacity(b, n) {
    if (b.mesh && b.capacity >= n) return;
    const cap = Math.max(64, Math.ceil(n * 1.3));
    if (b.mesh) {
      this.group.remove(b.mesh);
      b.mesh.geometry.dispose();
      b.mesh.dispose?.();
    }
    const geo = this.protoGeo[b.type].clone();
    geo.setAttribute('aInst', new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4));
    geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3));
    const mesh = new THREE.InstancedMesh(geo, b.material, cap);
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.name = `veg:${b.key}`;
    this.group.add(mesh);
    b.mesh = mesh;
    b.capacity = cap;
  }

  rebuild(chunks, center) {
    let total = 0;
    for (const key in this.buckets) {
      const b = this.buckets[key];
      const parts = [];
      let n = 0;
      for (const c of chunks.values()) {
        const ring = Math.max(Math.abs(c.cx - center.cx), Math.abs(c.cz - center.cz));
        if (ring > b.ring) continue;
        const part = c.scatter.buckets[key];
        if (part && part.count) {
          parts.push(part);
          n += part.count;
        }
      }
      if (n === 0) {
        if (b.mesh) b.mesh.count = 0;
        continue;
      }
      this.ensureCapacity(b, n);
      const mArr = b.mesh.instanceMatrix.array;
      const iArr = b.mesh.geometry.attributes.aInst.array;
      const tArr = b.mesh.geometry.attributes.aTint.array;
      let o = 0;
      for (const p of parts) {
        mArr.set(p.m, o * 16);
        iArr.set(p.inst, o * 4);
        tArr.set(p.tint, o * 3);
        o += p.count;
      }
      b.mesh.count = n;
      b.mesh.instanceMatrix.clearUpdateRanges();
      b.mesh.instanceMatrix.addUpdateRange(0, n * 16);
      b.mesh.instanceMatrix.needsUpdate = true;
      const ai = b.mesh.geometry.attributes.aInst;
      ai.clearUpdateRanges();
      ai.addUpdateRange(0, n * 4);
      ai.needsUpdate = true;
      const at = b.mesh.geometry.attributes.aTint;
      at.clearUpdateRanges();
      at.addUpdateRange(0, n * 3);
      at.needsUpdate = true;
      total += n;
    }
    this.instanceCount = total;
  }
}
