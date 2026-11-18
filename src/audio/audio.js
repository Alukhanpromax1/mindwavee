// Gentle synthesized soundscape (WebAudio, no audio files): soft wind, a warm pad,
// pentatonic chimes for completions and a soft rising tone during Focus Mode.
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];

export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.6;
  }

  start() {
    if (this.ctx) {
      this.ctx.resume?.();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? this.volume * 0.5 : 0;
    this.master.connect(ctx.destination);

    // wind: filtered noise with slow swell
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 420;
    bp.Q.value = 0.6;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain).connect(windGain.gain);
    noise.connect(bp).connect(windGain).connect(this.master);
    noise.start();
    lfo.start();

    // pad: two soft detuned triangles through a lowpass
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.035;
    lp.connect(this.padGain).connect(this.master);
    [196, 293.66, 392.0 * 1.003].forEach((f) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.connect(lp);
      o.start();
    });

    // focus tone
    this.focusOsc = ctx.createOscillator();
    this.focusOsc.type = 'sine';
    this.focusOsc.frequency.value = 330;
    this.focusGain = ctx.createGain();
    this.focusGain.gain.value = 0;
    this.focusOsc.connect(this.focusGain).connect(this.master);
    this.focusOsc.start();
  }

  setEnabled(on, volume = this.volume) {
    this.enabled = on;
    this.volume = volume;
    if (this.master) this.master.gain.setTargetAtTime(on ? volume * 0.5 : 0, this.ctx.currentTime, 0.2);
  }

  chime(step = 0, delay = 0, gain = 0.18) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const f = 392 * Math.pow(2, PENTA[step % PENTA.length] / 12);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f * 2.01;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    const g2 = ctx.createGain();
    g2.gain.value = 0.25;
    o.connect(g).connect(this.master);
    o2.connect(g2).connect(g);
    o.start(t);
    o2.start(t);
    o.stop(t + 2.7);
    o2.stop(t + 2.7);
  }

  arpeggio(steps = [0, 2, 4, 5], spacing = 0.16) {
    steps.forEach((s, i) => this.chime(s, i * spacing, 0.14));
  }

  focus(level) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.focusGain.gain.setTargetAtTime(level > 0 ? 0.035 + level * 0.03 : 0, t, 0.15);
    this.focusOsc.frequency.setTargetAtTime(294 + level * 196, t, 0.2);
  }
}
