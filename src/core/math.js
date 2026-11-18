export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
/** Frame-rate independent exponential damping. */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const dampAngle = (a, b, lambda, dt) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * (1 - Math.exp(-lambda * dt));
};
export const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

/** Closest point on a polyline (array of [x,z]). Returns { d, t (0..1 arc fraction), x, z, seg }. */
export function closestOnPolyline(px, pz, pts, cumLen, totalLen) {
  let best = Infinity;
  let bt = 0;
  let bx = 0;
  let bz = 0;
  let bseg = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0];
    const az = pts[i][1];
    const vx = pts[i + 1][0] - ax;
    const vz = pts[i + 1][1] - az;
    const l2 = vx * vx + vz * vz;
    let u = ((px - ax) * vx + (pz - az) * vz) / l2;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    const cx = ax + vx * u;
    const cz = az + vz * u;
    const d = (px - cx) * (px - cx) + (pz - cz) * (pz - cz);
    if (d < best) {
      best = d;
      bx = cx;
      bz = cz;
      bseg = i;
      bt = cumLen ? (cumLen[i] + Math.sqrt(l2) * u) / totalLen : 0;
    }
  }
  return { d: Math.sqrt(best), t: bt, x: bx, z: bz, seg: bseg };
}

/** Smooth a polyline with Chaikin subdivision (keeps endpoints). */
export function chaikin(pts, iterations = 3) {
  let out = pts;
  for (let k = 0; k < iterations; k++) {
    const next = [out[0]];
    for (let i = 0; i < out.length - 1; i++) {
      const [ax, az] = out[i];
      const [bx, bz] = out[i + 1];
      next.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25]);
      next.push([ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]);
    }
    next.push(out[out.length - 1]);
    out = next;
  }
  return out;
}

export function polylineLengths(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  return { cum, total: cum[cum.length - 1] };
}

/** Point at arc fraction t along a polyline. */
export function pointAt(pts, cum, total, t) {
  const target = clamp(t) * total;
  let i = 0;
  while (i < cum.length - 2 && cum[i + 1] < target) i++;
  const segLen = cum[i + 1] - cum[i] || 1;
  const u = (target - cum[i]) / segLen;
  const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u;
  const z = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u;
  const dx = pts[i + 1][0] - pts[i][0];
  const dz = pts[i + 1][1] - pts[i][1];
  const l = Math.hypot(dx, dz) || 1;
  return { x, z, dx: dx / l, dz: dz / l };
}
