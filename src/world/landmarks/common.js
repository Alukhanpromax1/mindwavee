import * as THREE from 'three';
import { GeoBuilder, mat, lathe } from '../vegetation/geoBuilder.js';
import { createOrganicMaterial } from '../materials.js';
import { heightAt } from '../layout.js';
import { mulberry32 } from '../../core/noise.js';
import { addCollider } from '../colliders.js';
export { addCollider };

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const ground = (x, z) => heightAt(x, z);

/** Pale standing stones in a ring, each with a small glowing glyph. */
export function stoneRing(b, { count = 7, radius = 6, height = 2.2, lean = 0.12, seed = 1, glyph = true, color = '#e4dfcc', origin = null }) {
  const rng = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const h = height * (0.75 + rng() * 0.5);
    const g = new THREE.IcosahedronGeometry(0.5, 0);
    g.scale(0.9 + rng() * 0.4, h, 0.6 + rng() * 0.3);
    g.translate(0, h * 0.42, 0);
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    if (origin) addCollider(origin.x + x, origin.z + z, 0.75, origin.y + h);
    b.add(g, mat(x, 0, z, 0, -a, lean), {
      sway: 0,
      colorFn: (l, w, c) => c.set(color).lerp(new THREE.Color('#9cc27a'), Math.max(0, 0.3 - l.y / h) * 1.5),
    });
    if (glyph) {
      const s = new THREE.SphereGeometry(0.12, 8, 6);
      b.add(s, mat(x * 0.93, h * 0.62, z * 0.93), { color: '#fff1c4', glow: 1, sway: 0 });
    }
  }
}

/** Low pale stone dais. */
export function dais(b, radius = 4, h = 0.5, color = '#ece6d2') {
  const g = lathe([
    [0, h],
    [radius * 0.85, h],
    [radius, h * 0.6],
    [radius * 1.05, 0],
    [radius * 1.02, -0.6],
  ], 40);
  b.add(g, mat(), { sway: 0, colorFn: (l, w, c) => c.set(color).lerp(new THREE.Color('#d7cfb3'), Math.min(1, Math.hypot(l.x, l.z) / radius) * 0.6) });
  const ring = new THREE.TorusGeometry(radius * 0.6, 0.05, 6, 64);
  b.add(ring, mat(0, h + 0.01, 0, Math.PI / 2), { color: '#fff3cf', glow: 1, sway: 0 });
  const ring2 = new THREE.TorusGeometry(radius * 0.32, 0.04, 6, 48);
  b.add(ring2, mat(0, h + 0.01, 0, Math.PI / 2), { color: '#fff3cf', glow: 1, sway: 0 });
}

export function meshFrom(b, region, opts = {}) {
  return new THREE.Mesh(b.build(opts.swayHeight ?? 1), createOrganicMaterial({ region, sway: 0, ...opts }));
}

export { GeoBuilder, mat, lathe };
