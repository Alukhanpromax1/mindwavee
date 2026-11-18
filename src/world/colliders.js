// Simple vertical-cylinder colliders for large solid objects (standing stones, trunks).
// Used to keep the explorer and the camera from passing through them.
export const COLLIDERS = [];

export function addCollider(x, z, r, top = 30) {
  COLLIDERS.push({ x, z, r, top });
}

/** Push a point out of any collider (horizontal only). Returns true if moved. */
export function pushOut(p, pad = 0.4) {
  let moved = false;
  for (const c of COLLIDERS) {
    if (p.y > c.top) continue;
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const d = Math.hypot(dx, dz);
    const R = c.r + pad;
    if (d < R) {
      const k = d > 1e-4 ? R / d : 1;
      p.x = c.x + dx * k;
      p.z = c.z + (d > 1e-4 ? dz * k : R);
      moved = true;
    }
  }
  return moved;
}

/** Is a point inside any collider? */
export function blocked(x, y, z, pad = 0.3) {
  for (const c of COLLIDERS) {
    if (y > c.top) continue;
    if (Math.hypot(x - c.x, z - c.z) < c.r + pad) return true;
  }
  return false;
}
