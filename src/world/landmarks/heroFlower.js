// A hand-crafted flower whose petals physically open (used for the Dawn Seed, the
// Neural Grove blossoms, the Great Bloom, the Heart crown and hidden blossoms).
import * as THREE from 'three';
import { GeoBuilder, mat, petalGeometry, sphere } from '../vegetation/geoBuilder.js';
import { tubePath } from '../vegetation/prototypes.js';
import { createOrganicMaterial, createGlowSprite } from '../materials.js';
import { damp, clamp, lerp } from '../../core/math.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class HeroFlower {
  /**
   * @param {object} o
   *  region, stemHeight, stemRadius, stemBend, rings:[{count,length,width,cup,curl,closed,open,color,tip,delay}],
   *  coreColor, coreRadius, glowColor, leaves, leafLength
   */
  constructor(o) {
    this.o = o;
    this.group = new THREE.Group();
    this.material = createOrganicMaterial({ region: o.region ?? 6, glow: o.glow ?? 1.2, sway: 0, glowColor: o.glowColor ?? '#fff1c8' });
    const H = o.stemHeight ?? 1.2;
    const bend = o.stemBend ?? 0.08;
    this.top = V(bend * H, H, bend * 0.4 * H);

    if (H > 0.05) {
      const b = new GeoBuilder();
      tubePath(b, [V(0, -0.2, 0), V(bend * 0.4 * H, H * 0.45, 0), V(bend * 0.9 * H, H * 0.8, bend * 0.2 * H), this.top], o.stemRadius ?? 0.05, (o.stemRadius ?? 0.05) * 0.65, {
        color: o.stemColor ?? '#5d9a55',
        radial: 7,
      });
      const leafCount = o.leaves ?? 3;
      const ll = o.leafLength ?? H * 0.35;
      const leaf = petalGeometry({ length: ll, width: ll * 0.4, cup: 0.35, curl: 0.55, segL: 5 });
      for (let i = 0; i < leafCount; i++) b.add(leaf, mat(0, 0, 0, 1.05, (i / leafCount) * Math.PI * 2 + 0.3), { color: o.leafColor ?? '#5fa55a' });
      this.stem = new THREE.Mesh(b.build(H), this.material);
      this.group.add(this.stem);
    }

    this.head = new THREE.Group();
    this.head.position.copy(this.top);
    this.group.add(this.head);
    this.petals = [];
    (o.rings ?? []).forEach((r, ri) => {
      const b = new GeoBuilder();
      const base = new THREE.Color(r.color);
      const tip = new THREE.Color(r.tip ?? r.color);
      b.add(petalGeometry({ length: r.length, width: r.width, cup: r.cup ?? 0.5, curl: r.curl ?? 0.2, segL: 6, segW: 2 }), mat(), {
        sway: 0,
        colorFn: (l, w, c) => c.copy(base).lerp(tip, clamp(l.y / r.length)),
        glowFn: (l) => (r.glowBase ? r.glowBase * (1 - clamp(l.y / r.length)) : 0),
      });
      const geo = b.build(1);
      for (let i = 0; i < r.count; i++) {
        const pivot = new THREE.Group();
        pivot.rotation.y = (i / r.count) * Math.PI * 2 + (r.phase ?? ri * 0.35);
        const m = new THREE.Mesh(geo, this.material);
        m.rotation.x = r.closed;
        pivot.add(m);
        this.head.add(pivot);
        this.petals.push({ mesh: m, ring: r, i });
      }
    });
    const cb = new GeoBuilder();
    cb.add(sphere(o.coreRadius ?? 0.12, 12, 10), mat(0, (o.coreRadius ?? 0.12) * 0.4, 0, 0, 0, 0, 1, 0.75, 1), { color: o.coreColor ?? '#ffe7a3', glow: 1, sway: 0 });
    this.core = new THREE.Mesh(cb.build(1), createOrganicMaterial({ region: 7, glow: 1.0, sway: 0 }));
    this.head.add(this.core);
    this.coreGlow = createGlowSprite(o.glowColor ?? '#fff1c8', (o.coreRadius ?? 0.12) * 14, 0);
    this.coreGlow.position.y = (o.coreRadius ?? 0.12) * 0.8;
    this.head.add(this.coreGlow);

    this.open = 0;
    this.targetOpen = 0;
    this.glowLevel = 0;
    this.targetGlow = 0;
    this.time = Math.random() * 10;
    this.speed = o.speed ?? 1.1;
    this.reducedMotion = false;
    this.coreGlowMax = o.coreGlowMax ?? 0.9;
  }

  setOpen(v, instant = false) {
    this.targetOpen = clamp(v);
    if (instant) this.open = this.targetOpen;
  }
  setGlow(v, instant = false) {
    this.targetGlow = v;
    if (instant) this.glowLevel = v;
  }

  update(dt) {
    this.time += dt;
    this.open = damp(this.open, this.targetOpen, this.reducedMotion ? 6 : this.speed, dt);
    this.glowLevel = damp(this.glowLevel, this.targetGlow, 2, dt);
    const breathe = this.reducedMotion ? 0 : Math.sin(this.time * 1.2) * 0.025;
    for (const p of this.petals) {
      const r = p.ring;
      const d = r.delay ?? 0;
      const t = clamp((this.open - d) / Math.max(0.0001, 1 - d));
      const ease = t * t * (3 - 2 * t);
      p.mesh.rotation.x = lerp(r.closed, r.open, ease) + breathe * (0.5 + 0.5 * Math.sin(p.i));
    }
    const g = Math.max(this.glowLevel, this.open * 0.6);
    this.coreGlow.material.opacity = g * this.coreGlowMax;
    this.core.material.uniforms.uGlowAmt.value = 0.3 + g * 1.4;
  }
}
