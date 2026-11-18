// Registry of things the explorer can interact with. The nearest enabled item in range
// gets the on-screen prompt; pressing E / the prompt button runs its action.
export class Interactions {
  constructor() {
    this.items = new Map();
    this.current = null;
  }
  add(item) {
    // item: { id, pos: Vector3, radius, label(): string|null, action() }
    this.items.set(item.id, item);
  }
  remove(id) {
    this.items.delete(id);
    if (this.current?.id === id) this.current = null;
  }
  update(playerPos) {
    let best = null;
    let bestD = Infinity;
    for (const it of this.items.values()) {
      const d = Math.hypot(it.pos.x - playerPos.x, it.pos.z - playerPos.z);
      if (d > it.radius) continue;
      const label = it.label();
      if (!label) continue;
      const score = d / it.radius;
      if (score < bestD) {
        bestD = score;
        best = { item: it, label };
      }
    }
    this.current = best;
    return best;
  }
  trigger() {
    if (this.current) {
      this.current.item.action();
      return true;
    }
    return false;
  }
}
