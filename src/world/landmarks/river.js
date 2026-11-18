// The River of Signals. Its course mirrors the proposed processing sequence:
//   Source Spring (acquisition) → Sieve Reeds (quality & filtering) → Prism Lotus (feature
//   extraction) → Branching Gate (classification) → Bloom Lantern (visual feedback) → Basin.
// These are conceptual sculptures — nothing here processes real EEG data.
import * as THREE from 'three';
import { SITES } from '../sites.js';
import { R_RIVER, riverPointAt, riverHalfWidth, WATER_LEVEL } from '../layout.js';
import { GeoBuilder, mat, lathe, sphere, petalGeometry } from '../vegetation/geoBuilder.js';
import { tubePath } from '../vegetation/prototypes.js';
import { createOrganicMaterial, createGlowSprite, createPointsMaterial } from '../materials.js';
import { stoneRing, ground } from './common.js';
import { damp, clamp } from '../../core/math.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Local frame at a river station: origin at river centre, +X across the river, +Z downstream. */
function frameAt(site) {
  const g = new THREE.Group();
  g.position.set(site.x, WATER_LEVEL, site.z);
  g.rotation.y = Math.atan2(site.dx, site.dz);
  return g;
}

function stationCamera(site, side = 1, dist = 22, height = 7) {
  const hw = riverHalfWidth(site.t);
  // stand on the south/left bank, looking across and slightly upstream
  const nx = -site.dz * side;
  const nz = site.dx * side;
  const bank = new THREE.Vector3(site.x + nx * (hw + 6), 0, site.z + nz * (hw + 6));
  bank.y = Math.max(ground(bank.x, bank.z), 0) + 1;
  const from = new THREE.Vector3(site.x + nx * dist - site.dx * 8, 0, site.z + nz * dist - site.dz * 8);
  from.y = Math.max(ground(from.x, from.z), 0) + height;
  return { bank, from };
}

function makeStation(scene, id, site, buildFn, focusHeight) {
  const frame = frameAt(site);
  scene.add(frame);
  const b = new GeoBuilder();
  const extra = buildFn(b, riverHalfWidth(site.t), frame) || {};
  const material = createOrganicMaterial({ region: R_RIVER, glow: 0.6, sway: 0.2 });
  const mesh = new THREE.Mesh(b.build(10), material);
  frame.add(mesh);
  const cam = stationCamera(site);
  const glow = createGlowSprite('#fff1c6', 10, 0);
  glow.position.set(0, focusHeight, 0);
  frame.add(glow);
  return {
    id,
    frame,
    material,
    glow,
    extra,
    t: site.t,
    position: new THREE.Vector3(site.x, 0, site.z),
    bank: cam.bank,
    focusPoint: new THREE.Vector3(site.x, focusHeight, site.z),
    cameraFrom: cam.from,
    progress: 0,
    active: false,
    level: 0,
  };
}

export function buildRiver(scene) {
  const stations = [];

  // ---------------------------------------------- Source Spring (acquisition)
  stations.push(
    makeStation(scene, 'spring', SITES.spring, (b) => {
      stoneRing(b, { count: 8, radius: 15, height: 2.4, seed: 21, lean: -0.08 });
      const g = new THREE.OctahedronGeometry(1.1, 0);
      g.scale(1, 1.8, 1);
      b.add(g, mat(0, 3.2, 0), { color: '#e9fbff', glow: 0.8, sway: 0 });
      for (let i = 0; i < 3; i++) {
        b.add(new THREE.TorusGeometry(2.4 + i * 1.6, 0.06, 6, 64), mat(0, 0.12, 0, Math.PI / 2), { color: '#f2fff8', glow: 0.7, sway: 0 });
      }
    }, 3.2)
  );

  // ---------------------------------------------- Sieve Reeds (signal quality & filtering)
  stations.push(
    makeStation(scene, 'quality', SITES.quality, (b, hw) => {
      for (let k = -3; k <= 3; k++) {
        const z = k * 2.4;
        for (const side of [-1, 1]) {
          const base = V(side * (hw + 2.5), -0.5, z);
          const pts = [base, V(side * (hw + 2.2), 4, z), V(side * hw * 0.7, 8.2, z), V(side * 0.4, 9.4 - Math.abs(k) * 0.3, z)];
          tubePath(b, pts, 0.2, 0.08, { color: '#5aa57a', colorFn: (l, w, c) => c.set('#4f9a6c').lerp(new THREE.Color('#d6f2c8'), clamp(w.y / 9)) });
        }
      }
      // the woven membrane — a ring with radial filaments standing across the river
      b.add(new THREE.TorusGeometry(4.2, 0.16, 8, 64), mat(0, 4.6, 0), { color: '#f6f1da', glow: 0.5, sway: 0 });
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const g = new THREE.CylinderGeometry(0.03, 0.03, 4.2, 4);
        g.translate(0, 2.1, 0);
        b.add(g, mat(0, 4.6, 0, 0, 0, a), { color: '#fff6dc', glow: 0.6, sway: 0 });
      }
    }, 4.6)
  );

  // ---------------------------------------------- Prism Lotus (feature extraction)
  let ribbons;
  stations.push(
    makeStation(scene, 'features', SITES.features, (b, hw, frame) => {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const g = new THREE.OctahedronGeometry(0.9, 0);
        g.scale(0.7, 2.6, 0.25);
        g.translate(0, 2.2, 0);
        b.add(g, mat(0, 0.4, 0, 0.75, a), {
          sway: 0,
          colorFn: (l, w, c) => c.set('#bfe9e2').lerp(new THREE.Color('#ffffff'), clamp(l.y / 4)),
          glowFn: (l) => 0.25 + clamp(l.y / 4) * 0.5,
        });
      }
      const pad = new THREE.CircleGeometry(4.5, 24);
      pad.rotateX(-Math.PI / 2);
      b.add(pad, mat(0, 0.15, 0), { color: '#5fae74', sway: 0 });
      b.add(sphere(0.8, 14, 10), mat(0, 1.6, 0), { color: '#fff8e0', glow: 1, sway: 0 });
      // three light ribbons flowing downstream: the "features"
      const colors = ['#8fe3d5', '#d5f5b8', '#ffd98c'];
      ribbons = colors.map((col, i) => {
        const g = new THREE.PlaneGeometry(0.7, 36, 1, 40);
        const p = g.attributes.position;
        for (let k = 0; k < p.count; k++) {
          const yy = p.getY(k);
          p.setX(k, p.getX(k) + (i - 1) * 2.2 + Math.sin(yy * 0.25 + i) * 0.8);
        }
        g.rotateX(-Math.PI / 2);
        g.translate(0, 0.45 + i * 0.05, 22);
        const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true });
        const mesh = new THREE.Mesh(g, m);
        frame.add(mesh);
        return m;
      });
      return { ribbons };
    }, 2.4)
  );

  // ---------------------------------------------- Branching Gate (classification)
  let lanterns;
  stations.push(
    makeStation(scene, 'classification', SITES.classification, (b, hw, frame) => {
      const base = V(-(hw + 4), -0.6, 0);
      const fork = V(-(hw * 0.3), 9.5, 0);
      tubePath(b, [base, V(-(hw + 3), 4, 0.5), V(-(hw * 0.9), 7.6, 0), fork], 0.9, 0.55, { color: '#3d8f7f', colorFn: (l, w, c) => c.set('#3a8a7a').lerp(new THREE.Color('#9fdcc6'), clamp(w.y / 12)) });
      const armA = [fork, V(-hw * 0.1, 11.5, -3), V(hw * 0.5, 12, -6.5), V(hw * 0.95, 10.5, -8)];
      const armB = [fork, V(hw * 0.05, 11.2, 3), V(hw * 0.55, 11.6, 6.5), V(hw * 0.95, 10.2, 8)];
      tubePath(b, armA, 0.5, 0.2, { color: '#5aa58e' });
      tubePath(b, armB, 0.5, 0.2, { color: '#5aa58e' });
      tubePath(b, [V(hw * 0.95, 10.2, 8), V(hw + 3, 5, 7), V(hw + 4, -0.6, 6)], 0.25, 0.4, { color: '#5aa58e' });
      tubePath(b, [V(hw * 0.95, 10.5, -8), V(hw + 3, 5, -7), V(hw + 4, -0.6, -6)], 0.25, 0.4, { color: '#5aa58e' });
      const lanternGeo = lathe([
        [0.0, -0.9],
        [0.5, -0.7],
        [0.75, -0.1],
        [0.6, 0.5],
        [0.15, 0.8],
        [0.05, 1.0],
      ], 16);
      const lA = V(hw * 0.5, 9.6, -6.5);
      const lB = V(hw * 0.55, 9.4, 6.5);
      b.add(lanternGeo, mat(lA.x, lA.y, lA.z), { color: '#fff1c4', glow: 0.35, sway: 0 });
      b.add(lanternGeo, mat(lB.x, lB.y, lB.z), { color: '#dff7ee', glow: 0.35, sway: 0 });
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 4), mat(lA.x, lA.y + 1.6, lA.z), { color: '#cfe8d8', sway: 0 });
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 4), mat(lB.x, lB.y + 1.6, lB.z), { color: '#cfe8d8', sway: 0 });
      const gA = createGlowSprite('#ffe6a6', 6, 0);
      gA.position.copy(lA);
      const gB = createGlowSprite('#d6fff0', 6, 0);
      gB.position.copy(lB);
      frame.add(gA, gB);
      lanterns = { a: gA, b: gB };
      return { lanterns };
    }, 10)
  );

  // ---------------------------------------------- Bloom Lantern (visual feedback)
  let beam;
  stations.push(
    makeStation(scene, 'feedback', SITES.feedback, (b, hw, frame) => {
      const root = V(hw + 4, -0.5, 0);
      const tip = V(hw * 0.2, 12, 4);
      tubePath(b, [root, V(hw + 4.5, 6, 0), V(hw + 2.5, 11, 1), V(hw * 0.9, 13.4, 3), tip], 0.6, 0.25, { color: '#4f9a6c' });
      const bell = lathe([
        [0.05, 0.6],
        [0.6, 0.45],
        [1.4, -0.4],
        [2.2, -1.9],
        [2.6, -2.9],
        [2.4, -3.0],
      ], 20);
      b.add(bell, mat(tip.x, tip.y, tip.z, 0.25, 0, 0), {
        sway: 0,
        colorFn: (l, w, c) => c.set('#fbf3dc').lerp(new THREE.Color('#ffd98f'), clamp(-l.y / 3)),
        glowFn: (l) => (l.y < -2.4 ? 0.6 : 0.1),
      });
      const leaf = petalGeometry({ length: 3, width: 1.2, cup: 0.4, curl: 0.5, segL: 5 });
      for (let i = 0; i < 3; i++) b.add(leaf, mat(hw + 4, 0, 0, 1.1, i * 2.1), { color: '#5ea457' });
      // beam toward the Blooming Basin (downstream = +Z)
      const g = new THREE.CylinderGeometry(0.6, 3.5, 40, 16, 1, true);
      g.rotateX(Math.PI / 2);
      g.translate(0, 0, 20);
      const bm = new THREE.MeshBasicMaterial({ color: '#fff0c4', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true });
      const beamMesh = new THREE.Mesh(g, bm);
      beamMesh.position.set(tip.x, tip.y - 2.6, tip.z);
      beamMesh.rotation.x = 0.18;
      frame.add(beamMesh);
      beam = bm;
      return { beam };
    }, 11)
  );

  // ---------------------------------------------- flowing light along the river
  const N = 320;
  const pos = new Float32Array(N * 3);
  const alpha = new Float32Array(N);
  const size = new Float32Array(N);
  const s = new Float32Array(N);
  const lat = new Float32Array(N);
  const jit = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    s[i] = Math.random();
    lat[i] = (Math.random() - 0.5) * 1.6;
    size[i] = 0.6 + Math.random() * 1.1;
    jit[i] = Math.random() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const flow = new THREE.Points(geo, createPointsMaterial({ color: '#fff4cc', size: 0.9 }));
  flow.frustumCulled = false;
  scene.add(flow);

  // the travelling signal orb that shows the sequence to follow
  const orb = createGlowSprite('#fff3c2', 7, 0.9);
  scene.add(orb);
  let orbT = 0;

  let reached = 0; // index of the furthest activated station (0 = spring only)
  let time = 0;

  return {
    id: 'river',
    stations,
    flow,
    orb,
    setReached(i) {
      reached = i;
    },
    /** focus progress on a station (0..1) */
    setProgress(id, p) {
      const st = stations.find((x) => x.id === id);
      if (st) st.progress = p;
    },
    setActive(id, on) {
      const st = stations.find((x) => x.id === id);
      if (st) st.active = on;
    },
    update(dt, nextIndex, reducedMotion) {
      time += dt;
      for (const st of stations) {
        const target = st.active ? 1 : st.progress * 0.8;
        st.level = damp(st.level, target, 2, dt);
        st.material.uniforms.uGlowAmt.value = 0.4 + st.level * 1.6;
        st.glow.material.opacity = st.level * 0.55 + (st.progress > 0 && !st.active ? 0.1 * Math.sin(time * 2) + 0.1 : 0);
      }
      const feat = stations[2];
      feat.extra.ribbons?.forEach((m, i) => (m.opacity = feat.level * (0.32 + 0.08 * Math.sin(time * 1.3 + i))));
      const cls = stations[3];
      if (cls.extra.lanterns) {
        cls.extra.lanterns.a.material.opacity = cls.level * 0.9;
        cls.extra.lanterns.b.material.opacity = cls.level * 0.18;
      }
      const fb = stations[4];
      if (fb.extra.beam) fb.extra.beam.opacity = fb.level * 0.16;

      // flow particles: bright up to the furthest restored stage, dim beyond
      const reachT = reached >= 4 ? 1.1 : stations[Math.min(reached, 4)].t + 0.04;
      const jitterAmt = stations[1].level; // after filtering the flow becomes smooth
      for (let i = 0; i < N; i++) {
        s[i] += dt * (reducedMotion ? 0.004 : 0.012) * (0.7 + (i % 5) * 0.1);
        if (s[i] > 1) s[i] -= 1;
        const p = riverPointAt(s[i]);
        const hw = riverHalfWidth(s[i]);
        const noisy = s[i] < stations[1].t ? (1 - jitterAmt) : 0;
        const wob = Math.sin(time * 9 + jit[i]) * 0.9 * noisy;
        const l = lat[i] * hw * 0.8 + wob;
        pos[i * 3] = p.x - p.dz * l;
        pos[i * 3 + 1] = 0.35 + Math.sin(time * 1.5 + jit[i]) * 0.1 + Math.abs(wob) * 0.3;
        pos[i * 3 + 2] = p.z + p.dx * l;
        const lit = s[i] < reachT ? 1 : 0.18;
        alpha[i] = lit * (0.45 + 0.35 * Math.sin(time * 0.9 + jit[i]));
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aAlpha.needsUpdate = true;

      // signal orb glides from the last restored stage to the next one, then repeats
      if (nextIndex >= 1 && nextIndex <= 4) {
        const a = stations[nextIndex - 1].t;
        const bT = stations[nextIndex].t;
        orbT += dt / (reducedMotion ? 14 : 7);
        if (orbT > 1) orbT = 0;
        const e = orbT * orbT * (3 - 2 * orbT);
        const p = riverPointAt(a + (bT - a) * e);
        orb.position.set(p.x, 1.6 + Math.sin(time * 2) * 0.2, p.z);
        orb.material.opacity = Math.sin(Math.PI * orbT) * 0.9;
        orb.visible = true;
      } else orb.visible = false;
    },
  };
}
