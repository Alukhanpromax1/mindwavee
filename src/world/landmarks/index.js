import * as THREE from 'three';
import { buildDawnSeed, buildCalibration, buildGrove, buildGreatBloom, buildHeart, buildSanctuaryExtras, buildConstellation, createHiddenBlossom } from './regionSites.js';
import { buildRiver } from './river.js';
import { createBeacon } from '../fx.js';
import { damp, smoothstep } from '../../core/math.js';

export class Landmarks {
  constructor(scene) {
    this.scene = scene;
    this.dawn = buildDawnSeed(scene);
    this.calibration = buildCalibration(scene);
    this.grove = buildGrove(scene);
    this.river = buildRiver(scene);
    this.bloom = buildGreatBloom(scene);
    this.heart = buildHeart(scene);
    const extras = buildSanctuaryExtras(scene);
    this.rest = extras.rest;
    this.guardian = extras.guardian;
    this.constellation = buildConstellation(scene);
    this.hidden = new Map(); // id -> blossom
    this.beacons = new Map();
    this.reducedMotion = false;
  }

  addHidden(data, collected) {
    if (this.hidden.has(data.id)) return this.hidden.get(data.id);
    const hb = createHiddenBlossom(this.scene, data);
    hb.collected = collected;
    if (collected) {
      hb.flower.setOpen(1, true);
      hb.halo.material.opacity = 0.15;
    }
    this.hidden.set(data.id, hb);
    return hb;
  }

  removeHidden(id) {
    const hb = this.hidden.get(id);
    if (!hb) return;
    this.scene.remove(hb.flower.group);
    hb.flower.group.traverse((o) => {
      if (o.isMesh) o.geometry.dispose();
      if (o.material && o.material.dispose) o.material.dispose();
    });
    this.hidden.delete(id);
  }

  /** Beacons: key → position; visible state is set by gameplay each frame. */
  setBeacon(key, pos, state) {
    let b = this.beacons.get(key);
    if (!b) {
      b = { mesh: createBeacon('#ffe9b0'), level: 0 };
      this.scene.add(b.mesh);
      this.beacons.set(key, b);
    }
    b.mesh.position.set(pos.x, pos.y - 2, pos.z);
    b.state = state; // 'next' | 'open' | 'off'
  }

  update(dt, ctx) {
    const rm = this.reducedMotion;
    for (const f of [this.dawn.flower, this.bloom.flower, this.heart.crown, ...this.heart.vessels, ...this.grove.blossoms.map((b) => b.flower)]) f.reducedMotion = rm;
    this.dawn.update(dt);
    this.grove.update(dt);
    this.bloom.update(dt);
    this.heart.update(dt);
    this.constellation.update(dt);
    this.river.update(dt, ctx.nextRiverIndex, rm);
    for (const hb of this.hidden.values()) {
      hb.flower.update(dt);
      if (!hb.collected) hb.halo.material.opacity = 0.35 + 0.2 * Math.sin(performance.now() / 700);
    }
    for (const b of this.beacons.values()) {
      const d = Math.hypot(b.mesh.position.x - ctx.player.x, b.mesh.position.z - ctx.player.z);
      const near = smoothstep(25, 70, d);
      const target = (b.state === 'next' ? 0.55 : b.state === 'open' ? 0.2 : 0) * near * (ctx.showBeacons ? 1 : 0);
      b.level = damp(b.level, target, 1.5, dt);
      b.mesh.material.uniforms.uOpacity.value = b.level;
      b.mesh.material.uniforms.uColor.value.set(b.state === 'next' ? '#ffe2a0' : '#d9f5e6');
      b.mesh.visible = b.level > 0.005;
    }
  }
}
