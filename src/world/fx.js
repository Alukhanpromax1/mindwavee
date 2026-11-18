// Pooled particle effects: gentle sparkle bursts, focus streams and expanding light rings.
// No flashing: every effect fades in and out over hundreds of milliseconds.
import * as THREE from 'three';
import { createPointsMaterial } from './materials.js';

export class Sparkles {
  constructor(scene, max = 600, color = '#fff2c4') {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.points = new THREE.Points(g, createPointsMaterial({ color, size: 0.7, fogFade: false }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.cursor = 0;
    this.scale = 1;
  }

  emit(origin, count, { spread = 1.5, up = 2.5, speed = 1.5, life = 2.4, size = 1 } = {}) {
    count = Math.round(count * this.scale);
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * spread;
      this.pos[i * 3] = origin.x + Math.cos(a) * r;
      this.pos[i * 3 + 1] = origin.y + Math.random() * spread * 0.5;
      this.pos[i * 3 + 2] = origin.z + Math.sin(a) * r;
      this.vel[i * 3] = Math.cos(a) * speed * Math.random();
      this.vel[i * 3 + 1] = up * (0.4 + Math.random() * 0.6);
      this.vel[i * 3 + 2] = Math.sin(a) * speed * Math.random();
      this.life[i] = this.maxLife[i] = life * (0.6 + Math.random() * 0.6);
      this.size[i] = size * (0.6 + Math.random() * 0.9);
    }
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) {
        this.alpha[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      const k = i * 3;
      this.vel[k] *= 1 - dt * 0.8;
      this.vel[k + 1] *= 1 - dt * 0.6;
      this.vel[k + 2] *= 1 - dt * 0.8;
      this.pos[k] += this.vel[k] * dt;
      this.pos[k + 1] += this.vel[k + 1] * dt;
      this.pos[k + 2] += this.vel[k + 2] * dt;
      const t = this.life[i] / this.maxLife[i];
      this.alpha[i] = Math.sin(Math.PI * Math.min(1, t)) * 0.9; // fade in and out softly
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
  }
}

/** Particles that drift from a source to a target along a soft arc (Focus Mode feedback). */
export class Stream {
  constructor(scene, count = 140, color = '#fff0c0') {
    this.count = count;
    this.seed = new Float32Array(count).map(() => Math.random());
    this.side = new Float32Array(count * 2).map(() => Math.random() - 0.5);
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(count * 3);
    this.alpha = new Float32Array(count);
    this.size = new Float32Array(count).map(() => 0.5 + Math.random() * 0.8);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    this.points = new THREE.Points(g, createPointsMaterial({ color, size: 0.8, fogFade: false }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
    scene.add(this.points);
    this.from = new THREE.Vector3();
    this.to = new THREE.Vector3();
    this.intensity = 0;
    this.target = 0;
    this.t = 0;
    this.active = 1;
  }

  set(from, to) {
    this.from.copy(from);
    this.to.copy(to);
  }

  update(dt, rate = 1) {
    this.intensity += (this.target - this.intensity) * (1 - Math.exp(-4 * dt));
    this.t += dt * (0.25 + rate * 0.35);
    const d = this.from.distanceTo(this.to);
    const arc = Math.min(6, d * 0.35);
    for (let i = 0; i < this.count; i++) {
      const u = (this.seed[i] + this.t) % 1;
      const e = u * u * (3 - 2 * u);
      const sx = this.side[i * 2] * (1 - e) * 2.2;
      const sz = this.side[i * 2 + 1] * (1 - e) * 2.2;
      this.pos[i * 3] = this.from.x + (this.to.x - this.from.x) * e + sx;
      this.pos[i * 3 + 1] = this.from.y + (this.to.y - this.from.y) * e + Math.sin(Math.PI * e) * arc + this.side[i] * (1 - e);
      this.pos[i * 3 + 2] = this.from.z + (this.to.z - this.from.z) * e + sz;
      this.alpha[i] = Math.sin(Math.PI * u) * this.intensity * this.active;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aAlpha.needsUpdate = true;
    this.points.visible = this.intensity > 0.01;
  }
}

/** Expanding soft ring of light across ground/water. */
export class LightRings {
  constructor(scene) {
    this.scene = scene;
    this.rings = [];
    this.geo = new THREE.RingGeometry(0.9, 1, 96, 1).rotateX(-Math.PI / 2);
  }
  spawn(pos, { maxRadius = 40, duration = 3.5, color = '#fff2c4', y = 0.3 } = {}) {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    const mesh = new THREE.Mesh(this.geo, m);
    mesh.position.set(pos.x, y, pos.z);
    mesh.renderOrder = 4;
    this.scene.add(mesh);
    this.rings.push({ mesh, t: 0, duration, maxRadius });
  }
  update(dt) {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.t += dt / r.duration;
      const e = 1 - Math.pow(1 - Math.min(1, r.t), 2);
      const s = 1 + e * r.maxRadius;
      r.mesh.scale.set(s, 1, s);
      r.mesh.material.opacity = Math.sin(Math.PI * Math.min(1, r.t)) * 0.5;
      if (r.t >= 1) {
        this.scene.remove(r.mesh);
        r.mesh.material.dispose();
        this.rings.splice(i, 1);
      }
    }
  }
}

/** Soft vertical light column used as a distant landmark marker. */
export function createBeacon(color = '#ffe7a8') {
  const geo = new THREE.CylinderGeometry(1.4, 2.6, 160, 16, 1, true);
  geo.translate(0, 80, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 } },
    vertexShader: /* glsl */ `
      varying float vY; varying vec3 vN; varying vec3 vW;
      void main() { vY = position.y / 160.0; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity; varying float vY; varying vec3 vN; varying vec3 vW;
      void main() {
        vec3 V = normalize(cameraPosition - vW);
        float rim = pow(abs(dot(V, vN)), 1.5);
        float a = rim * (1.0 - vY) * smoothstep(0.0, 0.04, vY) * uOpacity;
        gl_FragColor = vec4(uColor * a, a);
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 3;
  mesh.frustumCulled = false;
  return mesh;
}
