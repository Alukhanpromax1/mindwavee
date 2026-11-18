/** Tiny event bus used to decouple gameplay, world and UI. */
export class EventBus {
  constructor() {
    this.map = new Map();
  }
  on(name, fn) {
    if (!this.map.has(name)) this.map.set(name, new Set());
    this.map.get(name).add(fn);
    return () => this.map.get(name)?.delete(fn);
  }
  emit(name, payload) {
    const set = this.map.get(name);
    if (set) for (const fn of [...set]) fn(payload);
  }
}

export const bus = new EventBus();
