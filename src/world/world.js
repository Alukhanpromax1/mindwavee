// Assembles the continuous world: streamed terrain + vegetation, sky, water, distant layers,
// ambient particles and the hand-crafted landmarks.
import * as THREE from 'three';
import { ChunkManager } from './terrain/chunks.js';
import { VegLayer } from './vegetation/vegLayer.js';
import { createSky, createWater, createBackdrop, createMotes, PALETTE } from './atmosphere.js';
import { shared } from './materials.js';
import { REGIONS, R_CONSTELLATION } from './layout.js';
import { damp, smoothstep } from '../core/math.js';

export const QUALITY = {
  low: { radius: 4, lodNearRing: 0, density: 0.45, grassRing: 1, smallRing: 1, grassFade: 34, motes: 140, maxDpr: 1 },
  medium: { radius: 5, lodNearRing: 1, density: 0.72, grassRing: 1, smallRing: 2, grassFade: 46, motes: 300, maxDpr: 1.5 },
  high: { radius: 6, lodNearRing: 1, density: 1, grassRing: 1, smallRing: 2, grassFade: 60, motes: 520, maxDpr: 2 },
};

export class World {
  constructor(scene, quality = 'high') {
    this.scene = scene;
    this.q = QUALITY[quality];
    this.qualityName = quality;
    scene.fog = new THREE.FogExp2(PALETTE.fog.clone(), this.fogDensity());
    scene.background = PALETTE.fog.clone();

    this.sky = createSky();
    scene.add(this.sky);
    this.backdrop = createBackdrop();
    scene.add(this.backdrop);
    this.water = createWater();
    scene.add(this.water);
    this.motes = createMotes(QUALITY.high.motes);
    this.motes.geometry.setDrawRange(0, this.q.motes);
    scene.add(this.motes);

    // light objects for any standard materials (kept in sync with shader uniforms)
    this.hemi = new THREE.HemisphereLight(shared.uSkyColor.value, shared.uGroundColor.value, 1.4);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(shared.uSunColor.value, 1.6);
    this.sun.position.copy(shared.uSunDir.value).multiplyScalar(100);
    scene.add(this.sun);

    this.veg = new VegLayer(scene, this.q);
    this.chunks = new ChunkManager(scene, {
      ...this.q,
      vegLayer: this.veg,
      onChunkLoad: (c) => this.onChunkLoad?.(c),
      onChunkUnload: (c) => this.onChunkUnload?.(c),
    });
    this.night = 0;
    this.restored = 0;
  }

  fogDensity() {
    return 1.62 / (this.q.radius * 64 + 20);
  }

  setQuality(name) {
    this.qualityName = name;
    this.q = QUALITY[name];
    this.scene.fog.density = this.fogDensity();
    this.veg.setRings(this.q);
    this.chunks.setQuality(this.q);
    // density changes need rebuilt scatter: rebuild every chunk
    for (const [k, c] of [...this.chunks.chunks]) this.chunks.disposeChunk(k, c);
    this.motes.geometry.setDrawRange(0, this.q.motes);
  }

  /** Per-frame update. focus = position chunks stream around. */
  update(dt, time, focus, camera, opts = {}) {
    shared.uTime.value = time;
    this.chunks.update(focus.x, focus.z, opts.budget ?? 5);
    this.sky.position.copy(camera.position);
    this.backdrop.position.set(camera.position.x, 0, camera.position.z);
    this.water.position.set(Math.round(camera.position.x), 0, Math.round(camera.position.z));
    this.motes.material.uniforms.uCenter.value.copy(camera.position);
    this.motes.material.uniforms.uSpeed.value = opts.reducedMotion ? 0.25 : 1;
    shared.uWind.value = opts.reducedMotion ? 0.35 : 1;

    // local night in the Constellation Hollow
    const c = REGIONS[R_CONSTELLATION].center;
    const d = Math.hypot(focus.x - c[0], focus.z - c[1]);
    const targetNight = smoothstep(150, 60, d) * 0.92;
    this.night = damp(this.night, targetNight, 1.2, dt);
    shared.uNight.value = this.night;
    this.scene.fog.color.copy(PALETTE.fog).lerp(PALETTE.fogNight, this.night);
    this.sky.material.uniforms.uRestored.value = this.restored;
    this.hemi.intensity = 1.4 * (1 - this.night * 0.6);
    this.sun.intensity = 1.6 * (1 - this.night * 0.7);
  }
}
