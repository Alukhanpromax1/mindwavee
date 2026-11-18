// MindWave — The Living Garden (NYAS Junior Academy BrainTech · Team 7086)
// Conceptual prototype only. Simulated interactions — not a validated medical device or clinical treatment.
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import './styles/main.css';
import { Settings, isTouch } from './accessibility/settings.js';
import { UI } from './ui/ui.js';
import { Audio } from './audio/audio.js';
import { Game } from './gameplay/game.js';

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

function fatal(message) {
  const el = document.getElementById('loading-text');
  if (el) el.textContent = message;
  const bar = document.querySelector('#loading .progress');
  if (bar) bar.style.display = 'none';
}

async function start() {
  if (isTouch) document.body.classList.add('is-touch');
  if (!webglAvailable()) {
    fatal('This experience needs WebGL 2. Please try a recent version of Chrome, Edge, Firefox or Safari.');
    return;
  }
  const settings = new Settings();
  const ui = new UI();
  const audio = new Audio();
  try {
    const game = new Game({ canvas: document.getElementById('scene'), settings, ui, audio });
    window.__game = game; // handy for presenters / debugging in the console
    await game.boot();
  } catch (err) {
    console.error(err);
    fatal('Something went wrong while growing the garden. Please reload the page.');
  }
}

start();
