// The explorer: a small luminous seed that floats over meadows and water.
import * as THREE from 'three';
import { GeoBuilder, mat, petalGeometry, lathe, sphere } from '../world/vegetation/geoBuilder.js';
import { createOrganicMaterial, createGlowSprite, createPointsMaterial, R_ALWAYS } from '../world/materials.js';
import { surfaceAt } from '../world/layout.js';
import { damp, dampAngle } from '../core/math.js';
import { pushOut } from '../world/colliders.js';

function buildSeedBody() {
  const b = new GeoBuilder();
  const body = lathe([
    [0.0, 0.0],
    [0.16, 0.04],
    [0.3, 0.2],
    [0.34, 0.42],
    [0.27, 0.66],
    [0.14, 0.86],
    [0.03, 0.96],
    [0.0, 0.97],
  ], 18);
  b.add(body, mat(0, 0, 0), {
    sway: 0,
    colorFn: (l, w, c) => c.set('#fbf6e6').lerp(new THREE.Color('#bfe8d6'), Math.max(0, 0.5 - l.y) * 1.4),
    glowFn: (l) => 0.25 + Math.max(0, 0.5 - Math.abs(l.y - 0.4)) * 0.6,
  });
  // soft equatorial band of light
  b.add(new THREE.TorusGeometry(0.335, 0.025, 6, 28), mat(0, 0.36, 0, Math.PI / 2, 0, 0), { color: '#fff1c4', glow: 1, sway: 0 });
  return b.build(1);
}

function buildSprout() {
  const b = new GeoBuilder();
  const leaf = petalGeometry({ length: 0.36, width: 0.17, cup: 0.5, curl: 0.45 });
  b.add(leaf, mat(0, 0, 0, 0.75, 0), { color: '#9fdba5', glow: 0.3, sway: 0 });
  b.add(leaf, mat(0, 0, 0, 0.75, Math.PI), { color: '#8fd39c', glow: 0.3, sway: 0 });
  b.add(sphere(0.03, 6, 4), mat(0, -0.02, 0), { color: '#6fbf87', sway: 0 });
  return b.build(1);
}

export class Player {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.name = 'player';
    this.visual = new THREE.Group();
    this.group.add(this.visual);
    // the explorer always looks alive, regardless of the region's vitality
    const m = createOrganicMaterial({ region: R_ALWAYS, glow: 1.2, sway: 0 });
    this.material = m;
    this.body = new THREE.Mesh(buildSeedBody(), m);
    this.body.scale.setScalar(0.95);
    this.visual.add(this.body);
    this.sprout = new THREE.Mesh(buildSprout(), m);
    this.sprout.position.y = 0.9;
    this.visual.add(this.sprout);
    this.glow = createGlowSprite('#fff2c6', 3.2, 0.55);
    this.glow.position.y = 0.42;
    this.visual.add(this.glow);
    // blob shadow
    const sh = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#1f4a3a', transparent: true, opacity: 0.22, depthWrite: false })
    );
    this.shadow = sh;
    scene.add(sh);
    // trail
    this.trail = this.createTrail();
    scene.add(this.trail.points);
    scene.add(this.group);

    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.heading = 0;
    this.vy = 0;
    this.airY = 0; // height above hover point while hopping
    this.grounded = true;
    this.bobT = 0;
    this.speedMul = 1;
    this.reducedMotion = false;
    this.lightCount = 0;
    this.moving = false;
  }

  createTrail() {
    const n = 40;
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const alpha = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
    const points = new THREE.Points(g, createPointsMaterial({ color: '#fff0bf', size: 0.32 }));
    points.frustumCulled = false;
    return { points, n, i: 0, life: new Float32Array(n), timer: 0 };
  }

  setPosition(x, z, heading = this.heading) {
    this.pos.set(x, surfaceAt(x, z) + 0.9, z);
    this.vel.set(0, 0, 0);
    this.heading = heading;
    this.group.position.copy(this.pos);
  }

  jump() {
    if (this.grounded) {
      this.vy = 5.2;
      this.grounded = false;
    }
  }

  /**
   * @param dt seconds
   * @param move {x,z} desired direction in world space (length ≤ 1)
   * @param baseSpeed m/s
   */
  update(dt, move, baseSpeed, time) {
    const speed = baseSpeed * this.speedMul;
    const targetVX = move.x * speed;
    const targetVZ = move.z * speed;
    const accel = move.x || move.z ? 6 : 4.5;
    this.vel.x = damp(this.vel.x, targetVX, accel, dt);
    this.vel.z = damp(this.vel.z, targetVZ, accel, dt);
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    pushOut(this.pos, 0.45);
    const hv = Math.hypot(this.vel.x, this.vel.z);
    this.moving = hv > 0.3;
    if (hv > 0.4) this.heading = dampAngle(this.heading, Math.atan2(this.vel.x, this.vel.z), 8, dt);

    // vertical: hover above surface with a spring; hop with gravity
    const ground = surfaceAt(this.pos.x, this.pos.z);
    const hover = ground + 0.85;
    if (!this.grounded) {
      this.vy -= 13 * dt;
      this.airY += this.vy * dt;
      if (this.airY <= 0) {
        this.airY = 0;
        this.vy = 0;
        this.grounded = true;
      }
    }
    const targetY = hover + this.airY;
    this.pos.y = this.grounded ? damp(this.pos.y, targetY, 14, dt) : targetY;

    // visual life
    this.bobT += dt;
    const bob = this.reducedMotion ? 0 : Math.sin(this.bobT * 2.2) * 0.07;
    this.group.position.set(this.pos.x, this.pos.y + bob, this.pos.z);
    this.visual.rotation.y = this.heading;
    const lean = Math.min(0.28, hv * 0.025);
    this.visual.rotation.x = damp(this.visual.rotation.x, lean, 6, dt);
    this.sprout.rotation.z = this.reducedMotion ? 0 : Math.sin(this.bobT * 3.1) * 0.12;
    this.sprout.rotation.x = -lean * 1.5;
    const pulse = 0.55 + 0.1 * Math.sin(time * 2) + Math.min(0.35, this.lightCount * 0.07);
    this.glow.material.opacity = pulse;
    this.glow.scale.setScalar(3 + this.lightCount * 0.25);

    // shadow
    this.shadow.position.set(this.pos.x, ground + 0.06, this.pos.z);
    const sh = 1 / (1 + this.airY * 0.5);
    this.shadow.scale.setScalar(sh);
    this.shadow.material.opacity = 0.2 * sh;

    this.updateTrail(dt, hv);
  }

  updateTrail(dt, hv) {
    const t = this.trail;
    const pos = t.points.geometry.attributes.position;
    const size = t.points.geometry.attributes.aSize;
    const alpha = t.points.geometry.attributes.aAlpha;
    t.timer -= dt;
    if (hv > 1 && t.timer <= 0) {
      t.timer = 0.05;
      const i = t.i;
      t.i = (t.i + 1) % t.n;
      pos.setXYZ(i, this.pos.x + (Math.random() - 0.5) * 0.3, this.pos.y + 0.2 + (Math.random() - 0.5) * 0.3, this.pos.z + (Math.random() - 0.5) * 0.3);
      t.life[i] = 1;
      size.setX(i, 0.6 + Math.random() * 0.6);
    }
    for (let i = 0; i < t.n; i++) {
      if (t.life[i] > 0) {
        t.life[i] = Math.max(0, t.life[i] - dt * 1.1);
        pos.setY(i, pos.getY(i) + dt * 0.25);
      }
      alpha.setX(i, t.life[i] * 0.7);
    }
    pos.needsUpdate = true;
    size.needsUpdate = true;
    alpha.needsUpdate = true;
  }
}
