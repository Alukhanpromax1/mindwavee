// SIMULATED signal visualisation. This module generates smooth synthetic waveforms purely
// for illustration. It does not read, record, process or classify any brain activity.

export class SimulatedSignal {
  constructor(seed = 1) {
    this.t = 0;
    this.seed = seed;
    this.phases = Array.from({ length: 12 }, (_, i) => (Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % (Math.PI * 2));
  }

  /** Synthetic value for channel c at time t. filtered=true removes the illustrative "noise". */
  sample(c, t, filtered) {
    const p = this.phases;
    const base = Math.sin(t * 2 * Math.PI * 1.1 + p[c]) * 0.45 + Math.sin(t * 2 * Math.PI * 2.3 + p[c + 3]) * 0.28 + Math.sin(t * 2 * Math.PI * 0.4 + p[c + 6]) * 0.22;
    if (filtered) return base;
    const jitter = Math.sin(t * 2 * Math.PI * 17 + p[c + 1]) * 0.18 + Math.sin(t * 2 * Math.PI * 31 + p[c + 2]) * 0.12;
    const drift = Math.sin(t * 0.7 + c) * 0.35;
    return base + jitter + drift;
  }

  /**
   * Draw the illustrative waveform into a canvas.
   * @param {HTMLCanvasElement} canvas
   * @param {object} o { filtered, channels, time, label }
   */
  draw(canvas, o = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const ch = o.channels ?? 3;
    const time = o.time ?? 0;
    const span = 4; // seconds shown
    const colors = ['#2f8f83', '#5aa36f', '#c9973f'];
    // subtle grid
    ctx.strokeStyle = 'rgba(31,79,74,0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      const x = (i / 8) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let c = 0; c < ch; c++) {
      const cy = ((c + 0.5) / ch) * h;
      const amp = (h / ch) * 0.36;
      ctx.strokeStyle = colors[c % colors.length];
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const steps = Math.max(60, Math.round(w / 2));
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * w;
        const t = time - span + (i / steps) * span;
        const y = cy - this.sample(c, t, o.filtered) * amp * (o.gain ?? 1);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(15,59,58,0.55)';
      ctx.font = '600 10px Inter Variable, system-ui, sans-serif';
      ctx.fillText(`Simulated channel ${c + 1}`, 8, cy - amp - 2);
    }
    // watermark
    ctx.save();
    ctx.fillStyle = 'rgba(176,96,36,0.85)';
    ctx.font = '700 11px Inter Variable, system-ui, sans-serif';
    const label = o.label ?? 'SIMULATED · ILLUSTRATIVE ONLY';
    const tw = ctx.measureText(label).width;
    ctx.fillText(label, w - tw - 8, h - 8);
    ctx.restore();
  }
}

/**
 * Simulated classification for demonstration trials. The outcome is decided by the
 * demo settings — never by user input or any signal.
 */
export function simulateFocusOutcome(mode, presenterChoice) {
  let detected;
  if (mode === 'ask') detected = presenterChoice === true;
  else if (mode === 'random') detected = Math.random() < 0.75;
  else detected = true;
  // Illustrative confidence number for display only. Clearly labelled as simulated.
  const confidence = detected ? 0.72 + Math.random() * 0.16 : 0.3 + Math.random() * 0.15;
  return { detected, confidence };
}

/** Left/right research illustration. nearChance: output matches the cue 57.6% of the time. */
export function simulateLeftRight(mode, cue, presenterChoice) {
  let output;
  if (mode === 'ask') output = presenterChoice;
  else output = Math.random() < 0.576 ? cue : cue === 'left' ? 'right' : 'left';
  const confidence = 0.5 + Math.random() * 0.12;
  return { output, matches: output === cue, confidence };
}
