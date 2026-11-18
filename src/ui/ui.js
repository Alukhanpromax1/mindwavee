// DOM interface controller: screens, HUD, toasts, overlays and sheets.
import { DISCLAIMER, WELCOME, TUTORIAL, INTRO_CAPTIONS, FOCUS_INSTRUCTION, FOCUS_NOTE, REST_TEXT } from '../content/text.js';
import { renderScience, renderResearch, renderJournal, renderMap, renderSettings, renderSummary, drawMap } from './panels.js';

const $ = (sel) => document.querySelector(sel);

export class UI {
  constructor() {
    document.querySelectorAll('[data-disclaimer]').forEach((el) => (el.textContent = DISCLAIMER));
    $('#welcome-eyebrow').textContent = WELCOME.eyebrow;
    $('#welcome-title').textContent = WELCOME.title;
    $('#welcome-subtitle').textContent = WELCOME.subtitle;
    $('#welcome-body').innerHTML = WELCOME.body.map((p) => `<p>${p}</p>`).join('');
    $('#focus-instruction').textContent = FOCUS_INSTRUCTION;
    $('#focus-note').textContent = FOCUS_NOTE;
    $('#rest-title').textContent = REST_TEXT.title;
    $('#rest-body').textContent = REST_TEXT.body;
    $('#rest-breathing').textContent = REST_TEXT.breathing;
    this.hud = $('#hud');
    this.toastsEl = $('#toasts');
    this.sheetCleanup = null;
    this.sheetKind = null;
    this.lastFocus = null;
    this.handlers = {};
    this.tutorialStep = 0;

    // generic open buttons (data-open="science" etc.)
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-open]');
      if (b) this.handlers.open?.(b.dataset.open);
    });
    $('#sheet-close').addEventListener('click', () => this.handlers.closeSheet?.());
    $('#sheet').addEventListener('click', (e) => {
      if (e.target.id === 'sheet') this.handlers.closeSheet?.();
    });
    // focus trap for modal surfaces
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const modal = this.activeModal();
      if (!modal) return;
      const items = [...modal.querySelectorAll('button, select, input, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null && !el.disabled);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      } else if (!modal.contains(document.activeElement)) {
        first.focus();
        e.preventDefault();
      }
    });
  }

  on(name, fn) {
    this.handlers[name] = fn;
  }

  activeModal() {
    if ($('#sheet').classList.contains('is-open')) return $('#sheet');
    for (const id of ['#rest', '#pause', '#tutorial', '#welcome']) if ($(id).classList.contains('is-open')) return $(id);
    if ($('#trial-ui').classList.contains('is-open')) return $('#trial-ui');
    if ($('#focus-ui').classList.contains('is-open')) return $('#focus-ui');
    return null;
  }

  show(id, on = true) {
    const el = $(`#${id}`);
    el.classList.toggle('is-open', on);
    if (on) {
      const target = el.querySelector('.btn-primary, button, select');
      if (target) setTimeout(() => target.focus({ preventScroll: true }), 60);
    }
  }
  isOpen(id) {
    return $(`#${id}`).classList.contains('is-open');
  }

  setLoading(p, text) {
    $('#loading-fill').style.width = `${Math.round(p * 100)}%`;
    $('#loading').querySelector('[role=progressbar]').setAttribute('aria-valuenow', Math.round(p * 100));
    if (text) $('#loading-text').textContent = text;
  }

  // ------------------------------------------------------------ intro captions
  async playIntroCaptions(reduced, isCancelled) {
    const el = $('#intro-captions');
    const lines = [...INTRO_CAPTIONS.map((t) => ({ t })), { t: 'The Living Garden', cls: 'intro-title' }, { t: 'Restore the Rhythm', cls: 'intro-sub' }];
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < lines.length; i++) {
      if (isCancelled()) return;
      const isTitle = i >= INTRO_CAPTIONS.length;
      if (!isTitle || i === INTRO_CAPTIONS.length) el.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = lines[i].t;
      if (lines[i].cls) p.className = lines[i].cls;
      el.appendChild(p);
      await wait(60);
      p.classList.add('is-in');
      await wait(isTitle ? 1400 : reduced ? 2600 : 3000);
      if (!isTitle) {
        p.classList.remove('is-in');
        await wait(900);
      }
    }
    await wait(1600);
  }

  // ------------------------------------------------------------ tutorial
  renderTutorial(step) {
    this.tutorialStep = step;
    const s = TUTORIAL[step];
    $('#tutorial-step').textContent = `${step + 1} of ${TUTORIAL.length}`;
    $('#tutorial-title').textContent = s.title;
    $('#tutorial-body').textContent = s.body;
    $('#tutorial-keys').innerHTML = s.keys.map((k) => `<kbd>${k}</kbd>`).join('');
    $('#tutorial-dots').innerHTML = TUTORIAL.map((_, i) => `<span class="${i === step ? 'is-on' : ''}"></span>`).join('');
    $('#tutorial-back').style.visibility = step === 0 ? 'hidden' : 'visible';
    $('#tutorial-next').textContent = step === TUTORIAL.length - 1 ? 'Enter the garden' : 'Next';
    $('#tutorial-next').focus({ preventScroll: true });
  }

  // ------------------------------------------------------------ HUD
  setHud(on) {
    this.hud.classList.toggle('is-on', on);
    this.hud.setAttribute('aria-hidden', on ? 'false' : 'true');
  }
  setHudDim(on) {
    this.hud.classList.toggle('is-dim', on);
  }
  setRegion(name) {
    $('#hud-region').textContent = name;
  }
  setObjective(text, angle, dist) {
    const t = $('#hud-objective-text');
    if (t.textContent !== text) t.textContent = text;
    $('#hud-arrow').style.transform = angle === null ? 'none' : `rotate(${angle}rad)`;
    $('#hud-arrow').style.visibility = angle === null ? 'hidden' : 'visible';
    $('#hud-dist').textContent = dist === null ? '' : `${Math.round(dist)} m`;
  }
  setGuiding(on) {
    $('#hud-guiding').hidden = !on;
  }
  setLights(lights, star) {
    const el = $('#hud-lights');
    const html = lights.map((on) => `<span class="${on ? 'is-on' : ''}"></span>`).join('') + `<span class="is-star ${star ? 'is-on' : ''}" title="Optional star fragment"></span>`;
    if (el.innerHTML !== html) el.innerHTML = html;
    el.setAttribute('aria-label', `${lights.filter(Boolean).length} of 4 lights collected${star ? ', plus the optional star fragment' : ''}`);
  }
  setPrompt(text) {
    const p = $('#hud-prompt');
    if (!text) {
      p.hidden = true;
      return;
    }
    p.hidden = false;
    if ($('#hud-prompt-text').textContent !== text) $('#hud-prompt-text').textContent = text;
  }

  regionBanner(name, tag) {
    const b = $('#region-banner');
    $('#region-banner-title').textContent = name;
    $('#region-banner-tag').textContent = tag;
    b.classList.add('is-on');
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => b.classList.remove('is-on'), 4200);
  }

  toast(title, text, ms = 5200) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<strong></strong><span></span>`;
    t.querySelector('strong').textContent = title;
    t.querySelector('span').textContent = text;
    this.toastsEl.appendChild(t);
    while (this.toastsEl.children.length > 3) this.toastsEl.firstChild.remove();
    setTimeout(() => t.classList.add('is-out'), ms);
    setTimeout(() => t.remove(), ms + 900);
  }

  // ------------------------------------------------------------ info card
  info({ eyebrow, title, body, proto }) {
    $('#info-eyebrow').textContent = eyebrow ?? '';
    $('#info-title').textContent = title;
    $('#info-body').textContent = body;
    $('#info-proto').textContent = proto ?? '';
    $('#info-proto').hidden = !proto;
    $('#info-card').classList.add('is-open');
    $('#info-close').focus({ preventScroll: true });
  }
  closeInfo() {
    $('#info-card').classList.remove('is-open');
  }
  infoOpen() {
    return $('#info-card').classList.contains('is-open');
  }

  // ------------------------------------------------------------ focus mode overlay
  openFocus({ title, eyebrow, holdStyle }) {
    $('#focus-title').textContent = title;
    $('#focus-eyebrow').textContent = eyebrow ?? 'Focus Mode';
    this.updateFocusHint(holdStyle, false);
    this.setFocusProgress(0, false);
    this.show('focus-ui', true);
    setTimeout(() => $('#focus-button').focus({ preventScroll: true }), 80);
  }
  updateFocusHint(style, active) {
    const touch = document.body.classList.contains('is-touch');
    const key = touch ? '' : ' (or Space)';
    const label = $('#focus-button-label');
    const hint = $('#focus-hint');
    if (style === 'hold') {
      label.textContent = active ? 'Focusing…' : 'Hold';
      hint.textContent = `Press and hold${key}. Let go any time — your progress stays.`;
    } else if (style === 'toggle') {
      label.textContent = active ? 'Pause' : 'Start';
      hint.textContent = `Tap${key} to start, tap again to pause. Progress stays.`;
    } else {
      label.textContent = active ? 'Pause' : 'Begin';
      hint.textContent = active ? `Focusing on its own. Tap${key} to pause.` : `Settling in… it will begin on its own. Tap${key} to start now.`;
    }
  }
  setFocusProgress(p, active) {
    $('#focus-ring-fg').style.strokeDashoffset = String(339.3 * (1 - p));
    $('#focus-button').classList.toggle('is-active', active);
  }
  closeFocus() {
    this.show('focus-ui', false);
  }

  // ------------------------------------------------------------ sheets
  openSheet(kind, game) {
    if (this.sheetCleanup) this.sheetCleanup();
    this.sheetCleanup = null;
    this.sheetKind = kind;
    const body = $('#sheet-body');
    body.scrollTop = 0;
    const titles = {
      science: ['How it would work', 'From EEG signal to visual feedback'],
      research: ['Our research', 'Findings, limits and why Focus Mode'],
      journal: ['Discovery journal', 'What you have found'],
      map: ['Map', 'The garden and guided travel'],
      settings: ['Settings & accessibility', 'Make the garden comfortable for you'],
      summary: ['Session summary', 'Your time in the garden'],
    };
    const [eb, ti] = titles[kind];
    $('#sheet-eyebrow').textContent = eb;
    $('#sheet-title').textContent = ti;
    if (kind === 'science') this.sheetCleanup = renderScience(body);
    else if (kind === 'research') renderResearch(body);
    else if (kind === 'journal') renderJournal(body, game);
    else if (kind === 'map') renderMap(body, game, (dest) => this.handlers.guide?.(dest));
    else if (kind === 'settings') renderSettings(body, game.settings);
    else if (kind === 'summary') renderSummary(body, game, (a) => this.handlers.summaryAction?.(a));
    this.show('sheet', true);
    setTimeout(() => $('#sheet-close').focus({ preventScroll: true }), 60);
  }
  refreshMap(game) {
    if (this.sheetKind === 'map' && this.isOpen('sheet')) {
      const c = document.querySelector('#map-canvas');
      if (c) drawMap(c, game);
    }
  }
  closeSheet() {
    if (this.sheetCleanup) this.sheetCleanup();
    this.sheetCleanup = null;
    this.sheetKind = null;
    this.show('sheet', false);
  }

  fade(on) {
    $('#fade').classList.toggle('is-on', on);
  }

  async finaleCaptions(lines) {
    const box = $('#finale-captions');
    $('#finale').classList.add('is-open');
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (const l of lines) {
      box.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = l;
      box.appendChild(p);
      await wait(50);
      p.classList.add('is-in');
      await wait(3600);
      p.classList.remove('is-in');
      await wait(1400);
    }
    $('#finale').classList.remove('is-open');
  }
}
