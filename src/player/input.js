// Unified input: keyboard, mouse drag-to-look, touch joystick + touch look.
// Physical controls only ever move the explorer or press interface buttons — they are never
// treated as, or labelled as, brain activity.

export class Input {
  constructor(canvas, joystickEl) {
    this.canvas = canvas;
    this.keys = new Set();
    this.lookDX = 0;
    this.lookDY = 0;
    this.zoom = 0;
    this.joy = { x: 0, y: 0, active: false, id: null };
    this.enabled = true;
    this.handlers = {};
    this.dragging = false;
    this.lastLookTime = 0;

    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.keys.clear());

    // mouse look (drag)
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') {
        this.dragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
      } else this.touchStart(e);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') {
        if (!this.dragging) return;
        this.lookDX += e.clientX - this.lastX;
        this.lookDY += e.clientY - this.lastY;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.lastLookTime = performance.now();
      } else this.touchMove(e);
    });
    const end = (e) => {
      if (e.pointerType === 'mouse') this.dragging = false;
      else this.touchEnd(e);
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.zoom += Math.sign(e.deltaY);
      },
      { passive: false }
    );
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // touch look (any touch on the canvas that isn't the joystick)
    this.touchLook = new Map();

    // virtual joystick
    this.joyEl = joystickEl;
    if (joystickEl) {
      const knob = joystickEl.querySelector('.joy-knob');
      const area = joystickEl;
      const update = (e) => {
        const r = area.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        let dx = (e.clientX - cx) / (r.width / 2);
        let dy = (e.clientY - cy) / (r.height / 2);
        const l = Math.hypot(dx, dy);
        if (l > 1) {
          dx /= l;
          dy /= l;
        }
        this.joy.x = dx;
        this.joy.y = dy;
        knob.style.transform = `translate(${dx * 38}px, ${dy * 38}px)`;
      };
      area.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.joy.active = true;
        this.joy.id = e.pointerId;
        area.setPointerCapture(e.pointerId);
        update(e);
      });
      area.addEventListener('pointermove', (e) => {
        if (this.joy.active && e.pointerId === this.joy.id) update(e);
      });
      const stop = (e) => {
        if (e.pointerId !== this.joy.id) return;
        this.joy.active = false;
        this.joy.x = 0;
        this.joy.y = 0;
        knob.style.transform = '';
      };
      area.addEventListener('pointerup', stop);
      area.addEventListener('pointercancel', stop);
    }
  }

  touchStart(e) {
    this.touchLook.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.canvas.setPointerCapture(e.pointerId);
  }
  touchMove(e) {
    const t = this.touchLook.get(e.pointerId);
    if (!t) return;
    this.lookDX += (e.clientX - t.x) * 1.4;
    this.lookDY += (e.clientY - t.y) * 1.4;
    t.x = e.clientX;
    t.y = e.clientY;
    this.lastLookTime = performance.now();
  }
  touchEnd(e) {
    this.touchLook.delete(e.pointerId);
  }

  on(name, fn) {
    this.handlers[name] = fn;
  }

  onKey(e, down) {
    const tag = e.target?.tagName;
    const inForm = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
    const code = e.code;
    if (down) {
      if (inForm && code !== 'Escape') return;
      this.handlers.key?.(e);
      if (e.defaultPrevented) return;
      this.keys.add(code);
    } else {
      this.keys.delete(code);
      this.handlers.keyup?.(e);
    }
  }

  /** Movement vector in camera-relative input space: x = right, y = forward. */
  moveAxis() {
    if (!this.enabled) return { x: 0, y: 0, sprint: false };
    let x = 0;
    let y = 0;
    const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (this.joy.active) {
      x += this.joy.x;
      y -= this.joy.y;
    }
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    return { x, y, sprint: k.has('ShiftLeft') || k.has('ShiftRight') };
  }

  consumeLook() {
    const d = { x: this.lookDX, y: this.lookDY, zoom: this.zoom };
    this.lookDX = 0;
    this.lookDY = 0;
    this.zoom = 0;
    return d;
  }
}
