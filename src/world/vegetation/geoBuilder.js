import * as THREE from 'three';

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _nm = new THREE.Matrix3();
const _c = new THREE.Color();

/**
 * Accumulates transformed primitives into one BufferGeometry with the attribute layout
 * expected by the organic shader: position, normal, aColor, aGlow, aSway, aTintMask, aDist.
 */
export class GeoBuilder {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.col = [];
    this.glow = [];
    this.tint = [];
    this.dist = [];
    this.sway = [];
    this.idx = [];
    this.count = 0;
  }

  /**
   * @param {THREE.BufferGeometry} geo
   * @param {THREE.Matrix4} m
   * @param {object} o color|colorFn(localPos, worldPos, color), glow|glowFn, tint, dist|distFn, sway (fixed value)
   */
  add(geo, m, o = {}) {
    const p = geo.attributes.position;
    const n = geo.attributes.normal;
    _nm.getNormalMatrix(m);
    const base = this.count;
    const color = o.color !== undefined ? _c.set(o.color).clone() : new THREE.Color(1, 1, 1);
    const local = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      local.fromBufferAttribute(p, i);
      _v.copy(local).applyMatrix4(m);
      this.pos.push(_v.x, _v.y, _v.z);
      if (n) _n.fromBufferAttribute(n, i).applyMatrix3(_nm).normalize();
      else _n.set(0, 1, 0);
      this.nor.push(_n.x, _n.y, _n.z);
      if (o.colorFn) {
        const cc = o.colorFn(local, _v, color.clone());
        this.col.push(cc.r, cc.g, cc.b);
      } else this.col.push(color.r, color.g, color.b);
      this.glow.push(o.glowFn ? o.glowFn(local, _v) : (o.glow ?? 0));
      this.tint.push(o.tint ?? 0);
      this.dist.push(o.distFn ? o.distFn(local, _v) : (o.dist ?? 0));
      this.sway.push(o.sway ?? -1);
    }
    if (geo.index) {
      const ix = geo.index.array;
      for (let i = 0; i < ix.length; i++) this.idx.push(ix[i] + base);
    } else {
      for (let i = 0; i < p.count; i++) this.idx.push(i + base);
    }
    this.count += p.count;
    return this;
  }

  /** swayHeight: vertices at this height sway fully; -1 entries are computed from height. */
  build(swayHeight = 1) {
    const g = new THREE.BufferGeometry();
    const sway = this.sway.map((s, i) => (s >= 0 ? s : Math.min(1, Math.max(0, this.pos[i * 3 + 1] / swayHeight))));
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aGlow', new THREE.Float32BufferAttribute(this.glow, 1));
    g.setAttribute('aTintMask', new THREE.Float32BufferAttribute(this.tint, 1));
    g.setAttribute('aDist', new THREE.Float32BufferAttribute(this.dist, 1));
    g.setAttribute('aSway', new THREE.Float32BufferAttribute(sway, 1));
    g.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    return g;
  }
}

// ------------------------------------------------------------------ primitive helpers
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export function mat(px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _q.setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ'));
  _s.set(sx, sy, sz);
  return new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), _q, _s);
}

/** Matrix that maps a unit-height Y cylinder onto the segment a→b. */
export function segmentMatrix(a, b) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  dir.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(_up, dir);
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  return new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, len, 1));
}

/**
 * A soft petal/leaf: grows along +Y, cups around Z, bends outward toward +Z.
 */
export function petalGeometry({ length = 1, width = 0.4, cup = 0.3, curl = 0.25, segL = 5, segW = 2, tipSharp = 0.8 } = {}) {
  const g = new THREE.PlaneGeometry(1, 1, segW * 2, segL);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = p.getX(i) * 2; // -1..1 across
    const u = p.getY(i) + 0.5; // 0..1 along
    const prof = Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.92 + 0.04)), tipSharp) * (1 - 0.2 * u);
    const x = v * width * 0.5 * prof;
    const y = u * length;
    const z = cup * v * v * width * 0.5 * prof + curl * u * u * length;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

/** Blade with slight bend (for grass/spires). */
export function bladeGeometry({ height = 1, width = 0.08, bend = 0.25, segs = 3 } = {}) {
  const g = new THREE.PlaneGeometry(1, 1, 1, segs);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getY(i) + 0.5;
    const v = p.getX(i);
    p.setXYZ(i, v * width * (1 - u * 0.92), u * height, bend * u * u * height);
  }
  g.computeVertexNormals();
  return g;
}

export const cyl = (rt, rb, h = 1, rs = 6, hs = 1, open = true) => new THREE.CylinderGeometry(rt, rb, h, rs, hs, open);
export const sphere = (r, ws = 8, hs = 6) => new THREE.SphereGeometry(r, ws, hs);
export const cone = (r, h, rs = 6) => new THREE.ConeGeometry(r, h, rs, 1, true);
export const lathe = (pts, segs = 10) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), segs);

/** Unit cylinder of height 1 centred on origin (for segmentMatrix). */
export const unitTube = (r0, r1, rs = 6) => new THREE.CylinderGeometry(r1, r0, 1, rs, 1, true);

export { _m };
