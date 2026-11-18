// Focus Mode — the primary mechanic. A SIMULATED interaction controlled by the interface:
// the player presses (or taps) a large button that stands in for a future EEG detection.
// Progress never decreases, there is no time limit, and stepping back keeps progress.
import * as THREE from 'three';

export class FocusController {
  constructor(game) {
    this.game = game;
    this.target = null;
    this.progress = 0;
    this.engaged = false;
    this.completing = false;
    this.autoTimer = 0;
    const btn = document.getElementById('focus-button');
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.setPointerCapture?.(e.pointerId);
      this.press();
    });
    const up = () => this.release();
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('click', (e) => e.preventDefault());
    document.getElementById('focus-cancel').addEventListener('click', () => this.cancel());
  }

  get active() {
    return !!this.target;
  }
  get style() {
    return this.game.settings.get('holdStyle');
  }

  start(target) {
    const g = this.game;
    this.target = target;
    this.progress = g.progress.focusSaved[target.id] ?? 0;
    this.engaged = false;
    this.completing = false;
    this.autoTimer = this.style === 'auto' ? 1.4 : 0;
    g.ui.openFocus({ title: target.title, eyebrow: target.eyebrow, holdStyle: this.style });
    g.ui.setFocusProgress(this.progress, false);
    g.rig.setFocus({ target: target.focusPoint, from: target.cameraFrom });
    g.setState('focus');
    g.fx.stream.target = 0.15;
    target.onProgress?.(this.progress);
  }

  press() {
    if (!this.target || this.completing) return;
    if (this.style === 'hold') this.engaged = true;
    else this.engaged = !this.engaged;
    this.autoTimer = 0;
    this.game.audio.start();
    this.game.ui.updateFocusHint(this.style, this.engaged);
  }
  release() {
    if (!this.target || this.style !== 'hold') return;
    this.engaged = false;
    this.game.ui.updateFocusHint(this.style, false);
  }

  update(dt) {
    if (!this.target) return;
    const g = this.game;
    if (this.autoTimer > 0) {
      this.autoTimer -= dt;
      if (this.autoTimer <= 0) {
        this.engaged = true;
        g.ui.updateFocusHint(this.style, true);
      }
    }
    const from = g.player.pos.clone().add(new THREE.Vector3(0, 0.5, 0));
    g.fx.stream.set(from, this.target.focusPoint);
    if (this.engaged && !this.completing) {
      const dur = g.settings.get('focusDuration') * (this.target.durationMul ?? 1);
      this.progress = Math.min(1, this.progress + dt / dur);
      this.target.onProgress?.(this.progress);
      if (this.progress >= 1) this.complete();
    }
    g.fx.stream.target = this.completing ? 0 : this.engaged ? 1 : 0.12;
    g.ui.setFocusProgress(this.progress, this.engaged);
    g.audio.focus(this.engaged ? this.progress : 0);
  }

  complete() {
    const g = this.game;
    const t = this.target;
    this.completing = true;
    this.engaged = false;
    g.progress.focusSaved[t.id] = 0;
    g.stats.focusCompleted++;
    g.audio.focus(0);
    g.audio.arpeggio([0, 2, 4, 7]);
    g.fx.sparkles.emit(t.focusPoint, 70, { spread: 2.2, up: 2.4, speed: 2, life: 2.8 });
    g.fx.rings.spawn(t.focusPoint, { maxRadius: 26, y: Math.max(0.3, t.focusPoint.y - 2) });
    t.onComplete?.();
    setTimeout(() => this.exit(true), 1500);
  }

  cancel() {
    if (!this.target || this.completing) return;
    this.game.progress.focusSaved[this.target.id] = this.progress;
    this.exit(false);
  }

  exit(completed) {
    const g = this.game;
    const t = this.target;
    this.target = null;
    this.engaged = false;
    this.completing = false;
    g.ui.closeFocus();
    g.rig.setFocus(null);
    g.fx.stream.target = 0;
    g.audio.focus(0);
    if (g.state === 'focus') g.setState('play');
    if (completed) t?.afterExit?.();
    if (completed && !t?.noRest) g.afterInteraction();
  }
}
