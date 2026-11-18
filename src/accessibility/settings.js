// Player settings, persisted locally (no network, no personal data).
const KEY = 'mindwave.livinggarden.settings.v1';

const prefersReduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

function autoQuality() {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  if (coarse || cores <= 4 || mem <= 4) return coarse ? 'low' : 'medium';
  return 'high';
}

export const DEFAULTS = {
  focusDuration: 3, // seconds of (simulated) focus to complete an interaction
  holdStyle: 'hold', // hold | toggle | auto
  moveSpeed: 1,
  camSensitivity: 1,
  invertY: false,
  autoCamera: true,
  reducedMotion: prefersReduced,
  quality: 'auto',
  restEvery: 4, // completed interactions between rest invitations (0 = off)
  trialsToBloom: 4,
  simOutcome: 'detect', // detect | ask | random
  lrMode: 'nearChance', // nearChance | ask
  guideLight: true,
  beacons: true,
  textSize: 1,
  sound: true,
  volume: 0.6,
};

export const OPTIONS = {
  focusDuration: [
    [2, 'Short (2 s)'],
    [3, 'Medium (3 s)'],
    [5, 'Long (5 s)'],
    [8, 'Very long (8 s)'],
  ],
  holdStyle: [
    ['hold', 'Press and hold'],
    ['toggle', 'Tap to start / tap to pause'],
    ['auto', 'Automatic — begins on its own (no press needed)'],
  ],
  moveSpeed: [
    [0.6, 'Gentle'],
    [0.8, 'Calm'],
    [1, 'Standard'],
    [1.3, 'Brisk'],
  ],
  camSensitivity: [
    [0.5, 'Low'],
    [1, 'Standard'],
    [1.6, 'High'],
  ],
  quality: [
    ['auto', 'Automatic'],
    ['low', 'Low (fastest)'],
    ['medium', 'Medium'],
    ['high', 'High'],
  ],
  restEvery: [
    [3, 'Every 3 interactions'],
    [4, 'Every 4 interactions'],
    [6, 'Every 6 interactions'],
    [0, 'Off (pause any time)'],
  ],
  trialsToBloom: [
    [3, '3 trials'],
    [4, '4 trials'],
    [5, '5 trials'],
  ],
  simOutcome: [
    ['detect', 'Always simulate a detection'],
    ['ask', 'Presenter chooses each trial'],
    ['random', 'Random (arbitrary 75% demo value)'],
  ],
  lrMode: [
    ['nearChance', 'Illustrate a near-chance result (57.6%)'],
    ['ask', 'Presenter chooses each output'],
  ],
  textSize: [
    [1, 'Standard'],
    [1.15, 'Large'],
    [1.3, 'Extra large'],
  ],
};

export class Settings {
  constructor() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    } catch {
      saved = {};
    }
    this.values = { ...DEFAULTS, ...saved };
    this.listeners = new Set();
  }
  get(k) {
    return this.values[k];
  }
  set(k, v) {
    this.values[k] = v;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.values));
    } catch {
      /* storage unavailable: settings still apply for this session */
    }
    for (const fn of this.listeners) fn(k, v);
  }
  onChange(fn) {
    this.listeners.add(fn);
  }
  resolvedQuality() {
    const q = this.values.quality;
    return q === 'auto' ? autoQuality() : q;
  }
  reset() {
    for (const k of Object.keys(DEFAULTS)) this.set(k, DEFAULTS[k]);
  }
}

export const isTouch = coarse;
