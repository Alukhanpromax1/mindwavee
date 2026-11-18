// The Living Garden — game orchestration.
import * as THREE from 'three';
import { World, QUALITY } from '../world/world.js';
import { Landmarks } from '../world/landmarks/index.js';
import { Player } from '../player/player.js';
import { Input } from '../player/input.js';
import { CameraRig } from '../camera/cameraRig.js';
import { Sparkles, Stream, LightRings } from '../world/fx.js';
import { shared, createGlowSprite } from '../world/materials.js';
import { SPAWN, REGIONS, R_MEADOW, R_GROVE, R_RIVER, R_BASIN, R_SANCTUARY, R_CONSTELLATION, R_WILDS, dominantRegion, heightAt, surfaceAt } from '../world/layout.js';
import { SITES } from '../world/sites.js';
import { Interactions } from '../interactions/interactions.js';
import { FocusController } from './focus.js';
import { TrialController } from './trials.js';
import { createProgress, createStats, lightsCount } from './progress.js';
import { REGION_TEXT, LANDMARK_TEXT, RIVER_ORDER, REST_TEXT, CLOSING } from '../content/text.js';
import { damp, clamp } from '../core/math.js';

const REGION_KEYS = ['meadow', 'grove', 'river', 'basin', 'sanctuary', 'constellation', 'wilds'];

export class Game {
  constructor({ canvas, settings, ui, audio }) {
    this.canvas = canvas;
    this.settings = settings;
    this.ui = ui;
    this.audio = audio;
    this.state = 'loading';
    this.progress = createProgress();
    this.stats = createStats();
    this.time = 0;
    this.lastNow = 0;

    // --- renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 5000);
    this.quality = settings.resolvedQuality();
    this.dprScale = 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // --- world
    this.world = new World(this.scene, this.quality);
    this.lm = new Landmarks(this.scene);
    this.world.onChunkLoad = (c) => this.onChunkLoad(c);
    this.world.onChunkUnload = (c) => this.onChunkUnload(c);
    this.player = new Player(this.scene);
    this.player.setPosition(SPAWN.x, SPAWN.z, SPAWN.heading);
    this.rig = new CameraRig(this.camera);
    this.rig.snapBehind(this.player);
    this.input = new Input(canvas, document.getElementById('joystick'));
    this.input.on('key', (e) => this.onKey(e));
    this.input.on('keyup', (e) => this.onKeyUp(e));
    this.fx = {
      sparkles: new Sparkles(this.scene, 700),
      stream: new Stream(this.scene, 150),
      rings: new LightRings(this.scene),
    };
    this.wisp = createGlowSprite('#fff4cc', 2.2, 0);
    this.scene.add(this.wisp);
    this.wispPos = new THREE.Vector3();

    this.interactions = new Interactions();
    this.focus = new FocusController(this);
    this.trials = new TrialController(this);
    this.vital = new Array(7).fill(0.2);
    this.autopilot = null;
    this.regionIndex = R_MEADOW;
    this.regionCandidate = R_MEADOW;
    this.regionTimer = 0;
    this.checkTimer = 0;
    this.frameTimes = [];
    this.adaptTimer = 0;

    this.registerInteractions();
    this.bindUI();
    this.applySettings();
    settings.onChange(() => this.applySettings());
  }

  // ================================================================ setup
  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const maxDpr = QUALITY[this.quality]?.maxDpr ?? 1.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr) * this.dprScale);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 68 : 55;
    this.camera.updateProjectionMatrix();
  }

  applySettings() {
    const s = this.settings;
    const rm = s.get('reducedMotion');
    document.body.classList.toggle('reduced-motion', rm);
    document.documentElement.style.setProperty('--text-scale', s.get('textSize'));
    this.rig.sensitivity = s.get('camSensitivity');
    this.rig.autoFollow = s.get('autoCamera');
    this.rig.reducedMotion = rm;
    this.player.reducedMotion = rm;
    this.lm.reducedMotion = rm;
    this.fx.sparkles.scale = rm ? 0.4 : 1;
    this.audio.setEnabled(s.get('sound'), s.get('volume'));
    const q = s.resolvedQuality();
    if (q !== this.quality) {
      this.quality = q;
      this.world.setQuality(q);
      this.dprScale = 1;
      this.resize();
    }
  }

  bindUI() {
    const ui = this.ui;
    ui.on('open', (kind) => this.openSheet(kind));
    ui.on('closeSheet', () => this.closeSheet());
    ui.on('guide', (dest) => this.guideTo(dest));
    ui.on('summaryAction', (a) => {
      if (a === 'explore') {
        this.closeSheet();
        this.setState('play');
      } else if (a === 'restart') location.reload();
      else this.openSheet(a);
    });
    const $ = (s) => document.querySelector(s);
    $('#btn-begin').addEventListener('click', () => this.beginTutorial());
    $('#intro-skip').addEventListener('click', () => this.skipIntro());
    $('#tutorial-next').addEventListener('click', () => {
      if (ui.tutorialStep >= 3) this.enterGarden();
      else ui.renderTutorial(ui.tutorialStep + 1);
    });
    $('#tutorial-back').addEventListener('click', () => ui.renderTutorial(Math.max(0, ui.tutorialStep - 1)));
    $('#btn-pause').addEventListener('click', () => this.pause());
    $('#pause-resume').addEventListener('click', () => this.resume());
    $('#pause-rest').addEventListener('click', () => {
      ui.show('pause', false);
      this.openRest('voluntary');
    });
    $('#pause-end').addEventListener('click', () => this.endSession());
    $('#rest-continue').addEventListener('click', () => this.closeRest());
    $('#rest-break').addEventListener('click', () => this.takeBreak());
    $('#rest-end').addEventListener('click', () => this.endSession());
    $('#hud-prompt').addEventListener('click', () => this.interact());
    $('#info-close').addEventListener('click', () => ui.closeInfo());
    $('#touch-jump').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.player.jump();
    });
  }

  // ================================================================ state
  setState(s) {
    this.state = s;
    const playing = s === 'play';
    this.ui.setHudDim(!playing);
    this.input.enabled = playing;
    if (!playing) this.autopilot = null;
  }

  async boot() {
    this.ui.setLoading(0.05, 'Growing the garden…');
    await this.world.chunks.preload(SPAWN.x, SPAWN.z, (p) => this.ui.setLoading(0.05 + p * 0.9, p < 0.5 ? 'Growing the garden…' : 'Waking the flowers…'));
    // warm up shaders
    this.renderer.compile(this.scene, this.camera);
    this.ui.setLoading(1, 'Ready');
    this.startLoop();
    await new Promise((r) => setTimeout(r, 300));
    this.ui.show('loading', false);
    this.playIntro();
  }

  startLoop() {
    this.lastNow = performance.now();
    let errors = 0;
    const tick = (now) => {
      this.raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, Math.max(0, ((now ?? performance.now()) - this.lastNow) / 1000));
      this.lastNow = now ?? performance.now();
      try {
        this.frame(dt);
      } catch (err) {
        // never let a single bad frame stop the world; report the first few
        if (errors++ < 3) console.error(err);
      }
    };
    tick(performance.now());
  }

  // ================================================================ intro / welcome / tutorial
  playIntro() {
    this.setState('intro');
    this.ui.show('intro', true);
    const rm = this.settings.get('reducedMotion');
    const d = SITES.dawnSeed;
    const end = new THREE.Vector3(SPAWN.x + 1, heightAt(SPAWN.x, SPAWN.z + 10) + 4.2, SPAWN.z + 10);
    const endLook = new THREE.Vector3(d.x, heightAt(d.x, d.z) + 2.4, d.z);
    if (rm) {
      this.rig.playCinematic([end.clone(), end.clone().add(new THREE.Vector3(0, 0.01, 0))], [endLook, endLook], 30);
    } else {
      this.rig.playCinematic(
        [new THREE.Vector3(-150, 70, 210), new THREE.Vector3(-90, 48, 130), new THREE.Vector3(-30, 24, 82), new THREE.Vector3(end.x - 4, end.y + 3, end.z + 8), end],
        [new THREE.Vector3(60, 20, -160), new THREE.Vector3(40, 12, -120), new THREE.Vector3(10, 6, -60), endLook.clone().add(new THREE.Vector3(0, 1, 0)), endLook],
        22
      );
    }
    this.introCancelled = false;
    this.ui.playIntroCaptions(rm, () => this.introCancelled).then(() => {
      if (!this.introCancelled) this.showWelcome();
    });
  }

  skipIntro() {
    if (this.state !== 'intro') return;
    this.introCancelled = true;
    this.showWelcome();
  }

  showWelcome() {
    this.introCancelled = true;
    this.ui.show('intro', false);
    // settle the camera into a gentle hold looking at the Dawn Seed
    const d = SITES.dawnSeed;
    const end = new THREE.Vector3(SPAWN.x + 1, heightAt(SPAWN.x, SPAWN.z + 10) + 4.2, SPAWN.z + 10);
    const endLook = new THREE.Vector3(d.x, heightAt(d.x, d.z) + 2.4, d.z);
    this.rig.cine = null;
    this.rig.setFocus({ target: endLook, from: end });
    this.setState('welcome');
    this.ui.show('welcome', true);
  }

  beginTutorial() {
    this.audio.start();
    this.ui.show('welcome', false);
    this.setState('tutorial');
    this.ui.show('tutorial', true);
    this.ui.renderTutorial(0);
  }

  enterGarden() {
    this.ui.show('tutorial', false);
    this.rig.setFocus(null);
    this.rig.snapBehind(this.player);
    this.rig.initialized = true; // glide from the current view
    this.stats.startedAt = performance.now();
    this.setState('play');
    this.ui.setHud(true);
    this.discoverRegion(R_MEADOW, true);
    setTimeout(() => this.ui.toast('Your first objective', 'Find the Dawn Seed just ahead — a closed bud on a pale stone dais. Press E (or tap the button) when you are close.', 8000), 2200);
  }

  // ================================================================ menus & sheets
  pause() {
    if (this.state !== 'play') return;
    this.setState('menu');
    this.ui.show('pause', true);
  }
  resume() {
    this.ui.show('pause', false);
    this.setState('play');
  }
  openSheet(kind) {
    this.prevState = this.state === 'menu' && this.ui.isOpen('pause') ? 'pause' : this.state;
    if (this.state === 'play' || this.state === 'summary') this.setState('menu');
    this.ui.openSheet(kind, this);
  }
  closeSheet() {
    const kind = this.ui.sheetKind;
    this.ui.closeSheet();
    if (kind === 'summary') {
      this.setState('play');
      return;
    }
    if (this.ui.isOpen('pause') || this.ui.isOpen('welcome') || this.ui.isOpen('rest')) {
      const btn = document.querySelector(this.ui.isOpen('pause') ? '#pause-resume' : this.ui.isOpen('rest') ? '#rest-continue' : '#btn-begin');
      btn?.focus({ preventScroll: true });
      return;
    }
    if (this.state === 'menu') this.setState('play');
  }

  // ================================================================ rest
  afterInteraction() {
    this.stats.sinceRest++;
    this.checkRest();
  }
  checkRest() {
    const every = this.settings.get('restEvery');
    if (every > 0 && this.stats.sinceRest >= every) this.restPending = 1.2; // shown once the player is back in the world
  }
  openRest(kind) {
    this.stats.sinceRest = 0;
    this.restPending = 0;
    if (kind === 'invite') this.stats.restsOffered++;
    else this.stats.breaks++;
    document.querySelector('#rest-title').textContent = kind === 'invite' ? REST_TEXT.title : 'Resting';
    document.querySelector('#rest-body').textContent = kind === 'invite' ? REST_TEXT.body : 'Stay as long as you like. The garden will wait.';
    document.querySelector('#rest-break').hidden = kind !== 'invite';
    this.setState('rest');
    this.ui.setHud(false);
    this.ui.show('rest', true);
    this.audio.chime(0, 0, 0.06);
  }
  takeBreak() {
    this.stats.breaks++;
    document.querySelector('#rest-title').textContent = REST_TEXT.breakTitle;
    document.querySelector('#rest-body').textContent = REST_TEXT.breakBody;
    document.querySelector('#rest-break').hidden = true;
    document.querySelector('#rest-continue').textContent = 'I’m ready to continue';
    document.querySelector('#rest-continue').focus();
  }
  closeRest() {
    this.ui.show('rest', false);
    document.querySelector('#rest-continue').textContent = 'Continue when ready';
    this.ui.setHud(true);
    this.setState('play');
  }
  endSession() {
    this.ui.show('pause', false);
    this.ui.show('rest', false);
    this.ui.setHud(true);
    this.setState('summary');
    this.ui.openSheet('summary', this);
  }

  /** Illustrative session figures — derived only from real in-game counters. */
  summaryStats() {
    const p = this.progress;
    const s = this.stats;
    const total = this.settings.get('trialsToBloom');
    const areaKeys = ['meadow', 'grove', 'river', 'basin', 'sanctuary', 'constellation'];
    const areas = areaKeys.filter((k) => p.regionsVisited.has(k)).length;
    const interactions = s.focusCompleted + s.trials + s.lrTrials + p.hidden.size;
    const restored = (p.lights.meadow ? 1 : 0) + p.groveNodes.filter(Boolean).length + p.riverStage + Math.min(total, p.bloomStage) + (p.heartRestored ? 1 : 0);
    const restoredTotal = 1 + 3 + 4 + total + 1;
    const landmarks = Object.keys(LANDMARK_TEXT).filter((k) => p.discovered.has(k)).length;
    const secs = s.startedAt ? Math.round((performance.now() - s.startedAt) / 1000) : 0;
    const duration = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    const engagement = Math.min(100, Math.round(areas * 7 + Math.min(20, interactions) * 2.4 + landmarks * 1.5 + Math.min(5, p.hidden.size) * 2));
    return {
      areas,
      areasTotal: areaKeys.length,
      interactions,
      restored,
      restoredTotal,
      landmarks,
      trials: s.trials,
      detections: s.detections,
      lrTrials: s.lrTrials,
      hidden: p.hidden.size,
      duration,
      breaks: s.breaks,
      engagement,
    };
  }

  // ================================================================ objectives
  currentObjective() {
    const p = this.progress;
    const L = this.lm;
    if (!p.lights.meadow) return { key: 'dawn', text: 'Awaken the Dawn Seed', target: L.dawn.position };
    if (p.heartRestored) return { key: 'free', text: 'The garden is restored — explore freely', target: null };
    if (lightsCount(p) === 4) return { key: 'heart', text: 'Carry the four lights to the Heart of the Garden', target: L.heart.position };
    if (!p.lights.grove) {
      const n = p.groveNodes.filter(Boolean).length;
      const idx = p.groveNodes.findIndex((v) => !v);
      return { key: 'grove', text: `Wake the Neural Grove · ${n} of 3 blossoms`, target: L.grove.blossoms[idx].position };
    }
    if (!p.lights.river) {
      if (p.riverStage === 0 && !p.discovered.has('spring')) return { key: 'spring', text: 'Find the Source Spring of the River of Signals', target: L.river.stations[0].bank };
      const st = L.river.stations[p.riverStage + 1];
      return { key: 'river', text: `Follow the River of Signals · ${p.riverStage} of 4 stages`, target: st.bank };
    }
    if (!p.lights.basin) {
      const total = this.settings.get('trialsToBloom');
      return { key: 'basin', text: `Bloom the Great Flower · ${p.bloomStage} of ${total} trials`, target: L.bloom.position };
    }
    return { key: 'free', text: 'Explore freely', target: null };
  }

  guideTo(dest) {
    let target = null;
    if (dest === 'objective') target = this.currentObjective()?.target;
    else {
      const r = REGIONS.find((x) => x.id === dest);
      if (dest === 'river') target = this.lm.river.stations[Math.min(4, this.progress.riverStage + (this.progress.discovered.has('spring') ? 1 : 0))].bank;
      else if (r) target = new THREE.Vector3(r.center[0], 0, r.center[1] + (dest === 'basin' || dest === 'sanctuary' ? 40 : 0));
    }
    this.closeSheet();
    this.ui.show('pause', false);
    this.setState('play');
    if (target) {
      this.autopilot = target.clone();
      this.ui.toast('Guided travel', 'Gliding toward your destination. Press any movement key to stop.', 4000);
    }
  }

  // ================================================================ interactions
  registerInteractions() {
    const p = this.progress;
    const L = this.lm;
    const I = this.interactions;
    const info = (id) => {
      const t = LANDMARK_TEXT[id];
      this.discover(id);
      this.ui.info({ eyebrow: t.stage ?? REGION_TEXT[t.region]?.name, title: t.name, body: t.body, proto: t.prototype });
    };

    // Meadow
    I.add({
      id: 'dawn',
      pos: L.dawn.position,
      radius: 12.5,
      label: () => (!p.lights.meadow ? 'Awaken the Dawn Seed' : null),
      action: () =>
        this.focus.start({
          id: 'dawn',
          title: 'The Dawn Seed',
          focusPoint: L.dawn.focusPoint,
          cameraFrom: L.dawn.cameraFrom,
          onProgress: (v) => {
            L.dawn.flower.setOpen(v * 0.4);
            L.dawn.flower.setGlow(v);
          },
          onComplete: () => {
            L.dawn.flower.setOpen(1);
            p.lights.meadow = true;
            this.discover('dawnSeed');
            this.collectLight(L.dawn.focusPoint, 'The first light', 'The Dawn Seed opens and the meadow wakes. Next: the Neural Grove to the north-west — follow the glowing path or the guide light.');
            this.pulse(R_MEADOW);
          },
        }),
    });
    I.add({ id: 'calibration', pos: L.calibration.position, radius: 8, label: () => 'Read the Calibration Circle', action: () => info('calibration') });

    // Grove
    I.add({ id: 'groveTree', pos: L.grove.position, radius: 14, label: () => 'Listen to the Signal Tree', action: () => info('groveTree') });
    L.grove.blossoms.forEach((b, i) =>
      I.add({
        id: `blossom${i}`,
        pos: b.position,
        radius: 6,
        label: () => (!p.groveNodes[i] ? 'Wake the blossom' : null),
        action: () =>
          this.focus.start({
            id: `blossom${i}`,
            title: `Grove blossom ${i + 1} of 3`,
            focusPoint: b.focusPoint,
            cameraFrom: b.cameraFrom,
            durationMul: 0.85,
            onProgress: (v) => {
              b.flower.setOpen(v * 0.4);
              b.vein.uniforms.uPulseAmt.value = v * 0.4;
            },
            onComplete: () => {
              b.flower.setOpen(1);
              b.vein.uniforms.uPulseAmt.value = 1.2;
              p.groveNodes[i] = true;
              const n = p.groveNodes.filter(Boolean).length;
              L.grove.setActivation(n / 3);
              this.discover('groveTree');
              this.pulse(R_GROVE);
              if (n === 3) {
                p.lights.grove = true;
                this.collectLight(L.grove.position.clone().add(new THREE.Vector3(0, 14, 0)), 'The Neural Grove is awake', 'Light runs along every branch. The River of Signals begins at the Source Spring, just north of here.');
              } else this.ui.toast('A blossom wakes', `${n} of 3 — light travels toward the Signal Tree.`);
            },
          }),
      })
    );

    // River
    const R = L.river;
    I.add({ id: 'spring', pos: R.stations[0].position, radius: 22, label: () => 'Visit the Source Spring', action: () => info('spring') });
    RIVER_ORDER.forEach((id, k) => {
      const st = R.stations[k + 1];
      I.add({
        id: `station-${id}`,
        pos: st.position,
        radius: 19,
        label: () => {
          if (p.riverStage > k) return `${LANDMARK_TEXT[id].name} (restored)`;
          if (p.riverStage === k) return `Restore ${LANDMARK_TEXT[id].name}`;
          return 'Waiting for the signal from upstream';
        },
        action: () => {
          if (p.riverStage > k) return info(id);
          if (p.riverStage < k) {
            this.ui.toast('Follow the light', 'This stage waits for the signal to arrive from upstream. Begin at the Source Spring and follow the travelling light.');
            return;
          }
          this.focus.start({
            id: `station-${id}`,
            title: `${LANDMARK_TEXT[id].name}`,
            eyebrow: `Focus Mode · ${LANDMARK_TEXT[id].stage}`,
            focusPoint: st.focusPoint,
            cameraFrom: st.cameraFrom,
            durationMul: 0.75,
            onProgress: (v) => R.setProgress(st.id, v),
            onComplete: () => {
              R.setActive(st.id, true);
              p.riverStage = k + 1;
              R.setReached(k + 1);
              this.discover(id);
              this.pulse(R_RIVER);
              if (p.riverStage === 4) {
                p.lights.river = true;
                this.collectLight(st.focusPoint, 'The River of Signals flows', 'All four stages shine. The Bloom Lantern points to the Blooming Basin — the Great Bloom is waiting.');
              }
            },
            afterExit: () => info(id),
          });
        },
      });
    });

    // Basin
    I.add({
      id: 'bloom',
      pos: L.bloom.position,
      radius: 26,
      label: () => (p.bloomStage < this.settings.get('trialsToBloom') ? 'Begin a demonstration trial' : 'Another demonstration trial'),
      action: () => {
        this.discover('greatBloom');
        this.trials.start('bloom');
      },
    });

    // Sanctuary
    I.add({
      id: 'heart',
      pos: L.heart.position,
      radius: 24,
      label: () => {
        const n = lightsCount(p);
        if (p.heartRestored) return 'Open the session summary';
        return n < 4 ? `The Heart waits for light (${n} of 4)` : 'Restore the Heart of the Garden';
      },
      action: () => {
        this.discover('heart');
        const n = lightsCount(p);
        if (p.heartRestored) return this.endSession();
        if (n < 4) return info('heart');
        this.focus.start({
          id: 'heart',
          title: 'The Heart of the Garden',
          eyebrow: 'Focus Mode · final restoration',
          focusPoint: L.heart.crownWorld,
          cameraFrom: L.heart.cameraFrom,
          durationMul: 1.5,
          noRest: true,
          onProgress: (v) => {
            L.heart.crown.setOpen(v * 0.25);
            L.heart.vessels.forEach((ves) => ves.setGlow(1));
          },
          onComplete: () => {},
          afterExit: () => this.finale(),
        });
      },
    });
    I.add({ id: 'rest', pos: L.rest.position, radius: 9, label: () => 'Rest on the stones', action: () => {
      this.discover('restStones');
      this.openRest('voluntary');
    } });
    I.add({ id: 'guardian', pos: L.guardian.position, radius: 9, label: () => 'Read the Guardian’s Arch', action: () => info('guardian') });

    // Constellation
    I.add({
      id: 'star',
      pos: L.constellation.position,
      radius: 15,
      label: () => 'Try the experimental left/right demo',
      action: () => {
        this.discover('starAltar');
        this.trials.start('lr');
      },
    });
  }

  interact() {
    if (this.ui.infoOpen()) {
      this.ui.closeInfo();
      return;
    }
    if (this.state !== 'play') return;
    this.audio.start();
    this.interactions.trigger();
  }

  // ================================================================ events
  collectLight(from, title, text) {
    this.player.lightCount = lightsCount(this.progress);
    this.fx.sparkles.emit(from, 90, { spread: 2.5, up: 3, speed: 2.2, life: 3 });
    this.audio.arpeggio([0, 2, 4, 7, 9], 0.14);
    this.ui.toast(title, text, 9000);
    this.updateHudLights();
  }

  onBloomDetection() {
    const L = this.lm;
    const total = this.settings.get('trialsToBloom');
    const p = this.progress;
    L.bloom.flower.setOpen(p.bloomStage / total);
    L.bloom.flower.setGlow(0.4 + 0.6 * (p.bloomStage / total));
    this.pulse(R_BASIN);
    this.fx.sparkles.emit(L.bloom.top, 80, { spread: 4, up: 3, speed: 2.5, life: 3.2 });
    this.fx.rings.spawn(L.bloom.position, { maxRadius: 70, duration: 4.5, y: 0.35 });
    this.audio.arpeggio([2, 4, 7]);
    if (p.bloomStage >= total && !p.lights.basin) {
      p.lights.basin = true;
      this.collectLight(L.bloom.top, 'The Great Bloom is open', 'You now carry its light. When you hold all four lights, bring them to the Heart of the Garden in the Sanctuary (south).');
    }
  }

  onStar() {
    this.audio.arpeggio([4, 7, 9, 12]);
    this.updateHudLights();
    this.ui.toast('Optional star fragment', 'Found in the Constellation Hollow — a reminder that left/right remains a research direction.', 8000);
  }

  pulse(region) {
    shared.uPulse.value[region] = 1;
  }

  discover(id) {
    if (this.progress.discovered.has(id)) return false;
    this.progress.discovered.add(id);
    const t = LANDMARK_TEXT[id];
    if (t) this.ui.toast(`Discovered: ${t.name}`, 'Added to your journal (J).', 4200);
    return true;
  }

  discoverRegion(index, silent = false) {
    const key = REGION_KEYS[index];
    const first = !this.progress.regionsVisited.has(key);
    this.progress.regionsVisited.add(key);
    this.progress.discovered.add(key);
    const r = REGION_TEXT[key];
    this.ui.setRegion(r.name);
    if (first || !silent) this.ui.regionBanner(r.name, r.tagline);
  }

  async finale() {
    const L = this.lm;
    const p = this.progress;
    p.heartRestored = true;
    this.setState('finale');
    this.ui.setHud(false);
    L.heart.setRestored(1);
    L.heart.crown.setOpen(1);
    L.heart.crown.setGlow(1);
    this.audio.arpeggio([0, 2, 4, 7, 9, 12, 14], 0.22);
    L.heart.vessels.forEach((v, i) => {
      setTimeout(() => {
        const wp = v.group.getWorldPosition(new THREE.Vector3());
        this.fx.sparkles.emit(wp.add(new THREE.Vector3(0, 1.5, 0)), 60, { spread: 1, up: 9, speed: 0.6, life: 3 });
      }, i * 500);
    });
    for (let i = 0; i < 3; i++) setTimeout(() => this.fx.rings.spawn(L.heart.position, { maxRadius: 160, duration: 6, y: 0.4 }), 1500 + i * 1600);
    const c = L.heart.position;
    const rm = this.settings.get('reducedMotion');
    const pts = [];
    const looks = [];
    for (let i = 0; i <= 6; i++) {
      const a = -Math.PI / 2 + (i / 6) * Math.PI * (rm ? 0.01 : 1.1);
      const r = 46 - i * 2;
      pts.push(new THREE.Vector3(c.x + Math.cos(a) * r, c.y + 12 + i * 2.5, c.z + Math.sin(a) * r));
      looks.push(new THREE.Vector3(c.x, c.y + 13, c.z));
    }
    this.rig.playCinematic(pts, looks, 20);
    await this.ui.finaleCaptions(CLOSING);
    this.ui.setHud(true);
    this.rig.mode = 'follow';
    this.rig.cine = null;
    this.endSession();
  }

  // ================================================================ chunk hooks
  onChunkLoad(c) {
    const b = c.scatter.blossom;
    if (!b) return;
    const collected = this.progress.hidden.has(b.id);
    const hb = this.lm.addHidden(b, collected);
    this.interactions.add({
      id: b.id,
      pos: new THREE.Vector3(b.x, b.y, b.z),
      radius: 4.5,
      label: () => (this.progress.hidden.has(b.id) ? null : 'Open the hidden blossom'),
      action: () => {
        this.progress.hidden.add(b.id);
        hb.collected = true;
        hb.flower.setOpen(1);
        hb.halo.material.opacity = 0.2;
        this.fx.sparkles.emit(new THREE.Vector3(b.x, b.y + 1, b.z), 40, { spread: 1, up: 2, speed: 1 });
        this.audio.arpeggio([4, 7, 9]);
        this.ui.toast('A hidden blossom', `You have found ${this.progress.hidden.size}. Hidden blossoms grow all across the garden — even far beyond the five regions.`);
      },
    });
  }
  onChunkUnload(c) {
    const b = c.scatter.blossom;
    if (!b) return;
    this.lm.removeHidden(b.id);
    this.interactions.remove(b.id);
  }

  // ================================================================ input
  onKey(e) {
    const s = this.state;
    const code = e.code;
    if (e.repeat && (code === 'Space' || code === 'Enter' || code === 'KeyE')) {
      if (s === 'focus' || s === 'play') e.preventDefault();
      return;
    }
    if (s === 'intro') {
      if (code === 'Enter' || code === 'Escape' || code === 'Space') {
        e.preventDefault();
        this.skipIntro();
      }
      return;
    }
    if (code === 'Escape') {
      if (this.ui.isOpen('sheet')) return this.closeSheet();
      if (this.ui.infoOpen()) return this.ui.closeInfo();
      if (s === 'focus') return this.focus.cancel();
      if (s === 'trial') return this.trials.exit();
      if (s === 'rest') return this.closeRest();
      if (s === 'menu' && this.ui.isOpen('pause')) return this.resume();
      if (s === 'play') return this.pause();
      return;
    }
    if (s === 'focus') {
      if (code === 'Space' || code === 'Enter' || code === 'KeyE') {
        e.preventDefault();
        this.focus.press();
      }
      return;
    }
    if (s !== 'play') return;
    if (code === 'KeyE' || code === 'Enter') {
      if (document.activeElement && document.activeElement.tagName === 'BUTTON' && code === 'Enter' && document.activeElement.id !== 'hud-prompt') return;
      e.preventDefault();
      this.interact();
    } else if (code === 'Space') {
      e.preventDefault();
      this.player.jump();
    } else if (code === 'KeyJ') this.openSheet('journal');
    else if (code === 'KeyM') this.openSheet('map');
    else if (code === 'KeyG') this.guideTo('objective');
  }
  onKeyUp(e) {
    if (this.state === 'focus' && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE')) {
      e.preventDefault();
      this.focus.release();
    }
  }

  // ================================================================ per-frame
  updateHudLights() {
    const l = this.progress.lights;
    this.ui.setLights([l.meadow, l.grove, l.river, l.basin], this.progress.star);
  }

  frame(dt) {
    this.time += dt;
    const s = this.state;

    // --- movement
    if (s === 'play') {
      let ax = this.input.moveAxis();
      const look = this.input.consumeLook();
      if (this.settings.get('invertY')) look.y = -look.y;
      this.rig.applyLook(look, dt);
      let move = { x: 0, z: 0 };
      const { f, r } = this.rig.groundBasis();
      if (ax.x || ax.y) {
        this.autopilot = null;
        move = { x: f.x * ax.y + r.x * ax.x, z: f.z * ax.y + r.z * ax.x };
      } else if (this.autopilot) {
        const dx = this.autopilot.x - this.player.pos.x;
        const dz = this.autopilot.z - this.player.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 9) {
          this.autopilot = null;
          this.ui.toast('You have arrived', 'Look around — something nearby is waiting.', 3500);
        } else move = { x: (dx / d) * Math.min(1, d / 12), z: (dz / d) * Math.min(1, d / 12) };
      }
      const speed = 9 * this.settings.get('moveSpeed') * (ax.sprint ? 1.7 : 1) * (this.autopilot ? 1.5 : 1);
      this.player.update(dt, move, speed, this.time);
      this.ui.setGuiding(!!this.autopilot);
    } else {
      this.input.consumeLook();
      this.player.update(dt, { x: 0, z: 0 }, 0, this.time);
    }
    shared.uPlayerPos.value.copy(this.player.pos);

    // --- camera
    const lookActive = performance.now() - this.input.lastLookTime < 1500;
    this.rig.update(dt, this.player, this.player.moving, lookActive);

    // --- controllers
    this.focus.update(dt);
    this.trials.update(dt);

    // --- world streaming follows the camera during cinematics, the player otherwise
    const focusPos = this.rig.mode === 'cinematic' ? this.camera.position : this.player.pos;
    this.world.update(dt, this.time, focusPos, this.camera, { reducedMotion: this.settings.get('reducedMotion'), budget: s === 'intro' ? 8 : 5 });

    // --- vitality & pulses
    this.updateVitality(dt);

    // --- landmarks & fx
    const obj = this.currentObjective();
    this.updateBeacons(obj);
    const nextRiver = this.progress.lights.meadow && !this.progress.lights.river ? this.progress.riverStage + 1 : 0;
    this.lm.update(dt, { nextRiverIndex: nextRiver, player: this.player.pos, showBeacons: this.settings.get('beacons') && (s === 'play' || s === 'menu') });
    this.fx.sparkles.update(dt);
    this.fx.stream.update(dt, 1);
    this.fx.rings.update(dt);
    this.updateWisp(dt, obj);

    // --- HUD & discovery
    if (s === 'play' || s === 'menu') this.updateHud(dt, obj);
    if (this.restPending && s === 'play' && !this.ui.infoOpen()) {
      this.restPending -= dt;
      if (this.restPending <= 0) {
        this.restPending = 0;
        this.openRest('invite');
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.adaptResolution(dt);
  }

  updateVitality(dt) {
    const p = this.progress;
    const n = lightsCount(p);
    const total = this.settings.get('trialsToBloom');
    const targets = [
      p.lights.meadow ? 1 : 0.2,
      0.2 + 0.8 * (p.groveNodes.filter(Boolean).length / 3),
      0.2 + 0.8 * (p.riverStage / 4),
      0.2 + 0.8 * Math.min(1, p.bloomStage / total),
      p.heartRestored ? 1 : 0.25 + 0.12 * n,
      p.star ? 1 : 0.45 + 0.15 * Math.min(3, this.stats.lrTrials),
      p.heartRestored ? 1 : 0.3 + 0.6 * (n / 4),
    ];
    const rate = p.heartRestored ? 0.5 : 0.8;
    for (let i = 0; i < 7; i++) {
      this.vital[i] = damp(this.vital[i], targets[i], rate, dt);
      shared.uVital.value[i] = this.vital[i];
      shared.uPulse.value[i] = Math.max(0, shared.uPulse.value[i] - dt * 0.45);
    }
    this.world.restored = damp(this.world.restored, p.heartRestored ? 1 : n * 0.15, 0.6, dt);
  }

  updateBeacons(obj) {
    const p = this.progress;
    const L = this.lm;
    const key = obj.key;
    const set = (k, pos, cond, objKey) => L.setBeacon(k, pos, !cond ? 'off' : key === objKey ? 'next' : 'open');
    set('dawn', L.dawn.position, !p.lights.meadow, 'dawn');
    set('grove', L.grove.position, p.lights.meadow && !p.lights.grove, 'grove');
    const st = L.river.stations[Math.min(4, p.riverStage + (p.discovered.has('spring') || p.riverStage > 0 ? 1 : 0))];
    set('river', st.position, p.lights.meadow && !p.lights.river, key === 'spring' ? 'spring' : 'river');
    set('basin', L.bloom.position, p.lights.meadow && !p.lights.basin, 'basin');
    set('heart', L.heart.position, p.lights.meadow && !p.heartRestored, 'heart');
  }

  updateWisp(dt, obj) {
    const show = this.state === 'play' && this.settings.get('guideLight') && obj.target;
    let target = 0;
    if (show) {
      const pp = this.player.pos;
      const dx = obj.target.x - pp.x;
      const dz = obj.target.z - pp.z;
      const d = Math.hypot(dx, dz);
      if (d > 14) {
        const lead = Math.min(7, d * 0.4);
        const bob = this.settings.get('reducedMotion') ? 0 : Math.sin(this.time * 2.4) * 0.35;
        const tx = pp.x + (dx / d) * lead;
        const tz = pp.z + (dz / d) * lead;
        const ty = surfaceAt(tx, tz) + 2.2 + bob;
        if (this.wisp.material.opacity < 0.02) this.wispPos.set(tx, ty, tz);
        this.wispPos.x = damp(this.wispPos.x, tx, 3, dt);
        this.wispPos.y = damp(this.wispPos.y, ty, 3, dt);
        this.wispPos.z = damp(this.wispPos.z, tz, 3, dt);
        target = 0.85;
      }
    }
    this.wisp.material.opacity = damp(this.wisp.material.opacity, target, 3, dt);
    this.wisp.position.copy(this.wispPos);
    this.wisp.visible = this.wisp.material.opacity > 0.01;
  }

  updateHud(dt, obj) {
    // objective + compass
    if (obj.target) {
      const pp = this.player.pos;
      const dx = obj.target.x - pp.x;
      const dz = obj.target.z - pp.z;
      const d = Math.hypot(dx, dz);
      const targetAng = Math.atan2(dx, -dz);
      const { f } = this.rig.groundBasis();
      const camAng = Math.atan2(f.x, -f.z);
      this.ui.setObjective(obj.text, targetAng - camAng, d);
    } else this.ui.setObjective(obj.text, null, null);
    this.updateHudLights();

    // interaction prompt
    if (this.state === 'play') {
      const near = this.interactions.update(this.player.pos);
      this.ui.setPrompt(near ? near.label : null);
    } else this.ui.setPrompt(null);

    // region tracking + discoveries (throttled)
    this.checkTimer -= dt;
    if (this.checkTimer <= 0) {
      this.checkTimer = 0.4;
      const ri = dominantRegion(this.player.pos.x, this.player.pos.z);
      if (ri !== this.regionCandidate) {
        this.regionCandidate = ri;
        this.regionTimer = 0;
      } else this.regionTimer += 0.4;
      if (ri !== this.regionIndex && this.regionTimer >= 0.8) {
        this.regionIndex = ri;
        const first = !this.progress.regionsVisited.has(REGION_KEYS[ri]);
        this.discoverRegion(ri, !first);
        if (!first) this.ui.setRegion(REGION_TEXT[REGION_KEYS[ri]].name);
      }
      const pp = this.player.pos;
      const nearby = [
        ['dawnSeed', this.lm.dawn.position, 18],
        ['calibration', this.lm.calibration.position, 14],
        ['groveTree', this.lm.grove.position, 40],
        ['spring', this.lm.river.stations[0].position, 30],
        ['quality', this.lm.river.stations[1].position, 26],
        ['features', this.lm.river.stations[2].position, 26],
        ['classification', this.lm.river.stations[3].position, 26],
        ['feedback', this.lm.river.stations[4].position, 26],
        ['greatBloom', this.lm.bloom.position, 45],
        ['heart', this.lm.heart.position, 45],
        ['restStones', this.lm.rest.position, 14],
        ['guardian', this.lm.guardian.position, 14],
        ['starAltar', this.lm.constellation.position, 24],
      ];
      for (const [id, pos, r] of nearby) {
        if (!this.progress.discovered.has(id) && Math.hypot(pos.x - pp.x, pos.z - pp.z) < r) this.discover(id);
      }
      this.ui.refreshMap(this);
    }
  }

  adaptResolution(dt) {
    this.frameTimes.push(dt);
    this.adaptTimer += dt;
    if (this.adaptTimer < 2.5) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    this.adaptTimer = 0;
    const before = this.dprScale;
    if (avg > 1 / 38 && this.dprScale > 0.55) this.dprScale = Math.max(0.55, this.dprScale - 0.12);
    else if (avg < 1 / 57 && this.dprScale < 1) this.dprScale = Math.min(1, this.dprScale + 0.06);
    if (before !== this.dprScale) this.resize();
    window.__mw = { fps: Math.round(1 / avg), dpr: this.renderer.getPixelRatio().toFixed(2), calls: this.renderer.info.render.calls, tris: this.renderer.info.render.triangles, chunks: this.world.chunks.chunks.size };
  }
}

