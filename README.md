# MindWave — The Living Garden

**NYAS Junior Academy Innovation Challenge 2026 · BrainTech · Team 7086**
*An EEG-Based BCI Concept for Pediatric Cerebral Palsy Rehabilitation — Milestone 4 interactive demonstration*

> **Conceptual prototype only. Simulated interactions — not a validated medical device or clinical treatment.**
> No EEG headset is connected, no brain signals are recorded, and no classifier runs. Every “detection”, signal, confidence value and score in this game is simulated or illustrative and is labelled as such on screen.

The Living Garden is a real-time 3D browser game. You explore a continuous, procedurally generated botanical world as a small luminous seed. The garden's light has faded, and your mission is to **restore the rhythm** by waking five connected regions. Their geography follows MindWave's proposed pipeline:

| Region | What it represents | Gameplay |
|---|---|---|
| **The Luminous Meadow** (start) | Calm session start · *Calibration Circle* | Tutorial; wake the **Dawn Seed** with Focus Mode |
| **The Neural Grove** | Interconnected signals, individual differences | Wake 3 blossoms; light pulses along a 40 m dendritic Signal Tree |
| **The River of Signals** | Acquisition → quality & filtering → features → classification → feedback | Follow a travelling light from the Source Spring and restore 4 pipeline stations **in order** |
| **The Blooming Basin** | Visual feedback | **Simulated demonstration trials** open the Great Bloom: Ready → imagery period → simulated signal → simulated classification → visual response |
| **The Sanctuary** | Rest, reflection, summary · *Guardian's Arch* (professional oversight) | Resting Stones; carry 4 lights to the **Heart of the Garden** → finale → session summary |
| **The Constellation Hollow** *(optional, experimental)* | Left/right imagery: the task in our offline analysis | Left/right cue trials that illustrate a near-chance (57.6%) result |
| **The Wild Reaches** | — | Terrain keeps generating in every direction; hidden blossoms to find |

## Run locally

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run preview
```

```bash
npm run check
```

`npm run check` scans user-facing text for overclaiming wording (e.g. “cures”, “reads thoughts”) and checks that the required disclaimers and research figures are present.

Requirements: Node 18+ and a browser with WebGL 2 (current Chrome, Edge, Firefox or Safari).

## Deploy to Vercel

`vercel.json` is included (framework `vite`, build `npm run build`, output `dist`). Import the repository in Vercel; no environment variables or secrets are needed. The build uses relative asset paths (`base: './'`), so it also works from any static host or sub-path. All assets (fonts, geometry, textures, sound) are bundled or generated in code — there are no CDN or remote requests at runtime.

## Controls

| | Desktop | Touch |
|---|---|---|
| Move | `W A S D` / arrow keys (`Shift` = glide faster) | Left joystick |
| Look | Drag with the mouse · scroll to zoom | Drag anywhere |
| Interact | `E` (or click the prompt) | Tap the prompt |
| Focus Mode | Hold `Space` / the large button | Hold the large button |
| Hop | `Space` | Hop button |
| Pause / rest | `Esc` | ‖ button |
| Journal / Map / Guide to objective | `J` / `M` / `G` | Top-right buttons |

## Implemented features

- **3D open world (Three.js + Vite, vanilla JS):** deterministic seeded terrain (simplex fBm, ridged mountains), 64 m chunks streamed around the player in a time-budgeted queue, distance-based terrain LOD with skirts, unloading and disposal of far chunks, natural biome blending, a carved river, ponds and luminous paths.
- **Rendering:** custom shaders shared by every surface (one lighting model, fog, wind sway and a per-region “dormant ↔ alive” response, so the world visibly comes back to life as you restore it); a sky with soft clouds and flowing contour lines; local night in the Constellation Hollow; animated water; three layers of distant landscape; and ambient light motes. Vegetation is 13 procedural plant models, drawn as one `InstancedMesh` per type for all loaded chunks (a few dozen draw calls in total).
- **Gameplay:** Focus Mode (hold, tap-to-toggle, or fully automatic), with progress that never decreases; the river sequence; simulated trials with a presenter-controlled outcome; the optional left/right experiment; hidden blossoms; four lights plus an optional star fragment; and a finale cinematic.
- **Guidance:** an objective with a compass and distance, distant light beacons, a guide-light wisp, a map with **guided travel** (the seed glides there by itself), a discovery journal, region title cards and landmark info cards.
- **Rest:** rest invitations after a configurable number of interactions (*“Your garden can wait. Take a moment to rest.”*), a breathing guide, a longer-break option, Resting Stones and a pause menu. There are no timers, countdowns or penalties.
- **Science surfaces:** *How MindWave would work* (proposed vs. prototype for each of the 6 stages, a simulated waveform with unfiltered/filtered views and SIMULATED labels, supporting processes, and the 3-workflow architecture). *Our research* (why Focus Mode is the default, the offline analysis, expert feedback, the survey, how the design responds, and what MindWave is not).
- **Session summary:** areas, interactions, restored elements, landmarks, trials, simulated responses, left/right experiments, hidden blossoms, duration, breaks, and an illustrative engagement score. All figures are counted from real game state and labelled *Illustrative demonstration data*.
- **Accessibility:** large targets (≥ 48 px, 132 px Focus button); full keyboard play; focus-trapped dialogs with visible focus rings; ARIA live regions; adjustable Focus duration, Focus style, movement speed and camera sensitivity; invert-Y; auto-camera toggle; reduced motion (follows `prefers-reduced-motion`); 3 text sizes; no flashing (every effect fades over hundreds of ms); and sound on/off.
- **Performance:** automatic quality (Low/Medium/High: chunk radius, plant density, particles) chosen from the device, with adaptive render resolution based on measured frame time.
- **Mobile:** joystick, touch look, hop button, a responsive HUD and bottom-sheet trial panel. Verified at iPhone 13 size.

## Scientific accuracy

All project facts live in one reviewable file, `src/content/text.js`. They are limited to the Milestone 3 results:

- Offline analysis of the PhysioNet EEG Motor Movement/Imagery Dataset: 13 healthy adults, runs 4/8/12, 585 trials, CSP + LDA/SVM, and leave-one-run-out evaluation. Mean balanced accuracy was **56.75% / 57.60%** against a **50%** chance level, and 5 of 13 participants scored ≤ 50%. These figures are shown as preliminary, are not attributed to Focus Mode, and are not presented as clinical evidence.
- The five expert consultations are described as informal comments, **not endorsements**.
- The survey (22 valid adult responses) is described as a small convenience sample with no children with CP.
- The left/right “near-chance” option draws random outputs that match the cue 57.6% of the time. It illustrates the *size* of our result; it is not our model running.

## Project structure

```
src/
  main.js                 boot (WebGL check, settings, UI, game)
  content/text.js         ALL user-facing scientific copy (single place to review)
  core/                   seeded noise, math, event bus
  world/                  layout (regions/river/paths/height), sites, shaders, atmosphere, fx, colliders
    terrain/chunks.js     chunk streaming, LOD, skirts, disposal
    vegetation/           geometry builder, 13 procedural plants, deterministic scatter, instanced layers
    landmarks/            Dawn Seed, Neural Grove, river stations, Great Bloom, Heart, Constellation, hidden blossoms
  player/                 seed explorer, input (keyboard/mouse/touch joystick)
  camera/cameraRig.js     third-person follow, focus framing, cinematics, terrain/obstacle avoidance
  gameplay/               game orchestration, Focus Mode, simulated trials, progress
  interactions/           interaction registry
  simulation/             simulated waveform + simulated outcomes (clearly separated from input)
  ui/                     DOM controller and panels (science, research, map, journal, settings, summary)
  accessibility/          persisted settings
  audio/                  synthesized ambience and chimes (WebAudio, no files)
  styles/main.css         design system
scripts/check-claims.mjs  wording guard
```

## Demo guide for NYAS judges (≈ 4 minutes)

1. **Open the page.** Let the 20-second intro play (or press `Enter`). The welcome card explains MindWave and shows the disclaimer.
2. **Begin the journey → tutorial (4 cards) → Enter the garden.** Walk forward to the **Dawn Seed** and press `E`. Hold `Space` (or the big button): the bud opens, light streams in, and the meadow regains colour. Point out the line *“this button stands in for a future EEG detection.”*
3. **Press `M` and choose “The Neural Grove”.** The seed glides there (guided travel, for players who find movement tiring). Wake a blossom and watch light pulse along the Signal Tree.
4. **Choose the River of Signals in the map.** Visit the Source Spring, then restore *The Sieve Reeds* and read the info card: proposed system vs. this prototype.
5. **Go to the Blooming Basin and press `E` at the Great Bloom.** Run one trial: Ready → imagery period → **SIMULATED** waveform → **SIMULATED** classification → the flower opens. In *Settings → Presenter demo controls*, switch the outcome to **“Presenter chooses each trial”** and show a *no detection* outcome (*“Let’s try another moment. The world will wait.”*).
6. **Optional:** in the **Constellation Hollow**, run a left/right experiment and press **“Why Focus Mode?”** to open the research page.
7. **Press `Esc` → *Our research* and *How MindWave would work*.** These show the 56.75% / 57.60% vs. 50% chart, the expert and survey findings, and the six-stage pipeline.
8. **Press `Esc` → *End session & summary*.** Every figure is labelled *Illustrative demonstration data*.

Presenter shortcut: in the browser console, `__game` exposes the game state. For example, `__game.player.setPosition(x, z)` teleports the seed.

## Known limitations

- This is a demonstration of a *proposed* experience. There is no EEG input, signal processing, classifier, calibration or data storage, by design.
- The world is effectively endless but not infinite: core regions sit within about 400 m of the start, and the Wild Reaches are procedural terrain with hidden blossoms and no further authored quests.
- There is no collision with small plants. Large stones and trunks block the player and camera, which use simple cylinder colliders.
- Water reflections are approximated in the shader, not ray-traced or planar.
- Progress is not saved between visits (each demo is a fresh session). Only settings persist, in `localStorage`.
- Automated testing ran in headless Chromium with software WebGL (SwiftShader). Frame rate on real GPUs has not been benchmarked here, so quality is chosen automatically and adapts at runtime.
- A live Vercel deployment was not performed from this environment. The production build was verified locally with `vite preview`.

## Asset licences

- Three.js — MIT. Vite — MIT.
- Fraunces and Inter typefaces via `@fontsource-variable/*` — SIL Open Font License 1.1, bundled locally.
- All 3D models, textures (glow sprite generated on a canvas), shaders and sounds (WebAudio synthesis) are original and generated in code for this project. No third-party game assets are used. The art direction was inspired by luminous botanical exploration games but copies none of them.
