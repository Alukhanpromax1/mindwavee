// ALL user-facing scientific and project content lives here so it can be reviewed in one place.
// Facts are limited to those documented in the MindWave Milestone 3 results (Team 7086).

export const DISCLAIMER = 'Conceptual prototype only. Simulated interactions — not a validated medical device or clinical treatment.';
export const SIM_LABEL = 'SIMULATED — NO EEG DATA IS BEING RECORDED.';
export const ILLUSTRATIVE = 'Illustrative demonstration data.';
export const FOCUS_INSTRUCTION = 'Imagine the movement. Hold your focus. Watch the garden respond.';
export const FOCUS_NOTE = 'Simulated interaction: this button stands in for a future EEG detection. No brain signals are recorded.';
export const PIPELINE_SENTENCE =
  'In the proposed system, EEG signals would be processed to estimate a user’s intended mental task. This prototype simulates the interaction and visual feedback without acquiring brain signals.';

export const TEAM = {
  name: 'MindWave',
  number: '7086',
  challenge: 'NYAS Junior Academy Innovation Challenge 2026 · BrainTech',
  project: 'An EEG-Based BCI Concept for Pediatric Cerebral Palsy Rehabilitation',
};

export const INTRO_CAPTIONS = [
  'Far from anywhere, a garden once moved to a quiet rhythm.',
  'Its light has faded. Its flowers are waiting.',
  'Small, intentional moments can bring it back.',
];

export const WELCOME = {
  eyebrow: 'MindWave · Team 7086 · NYAS Junior Academy BrainTech',
  title: 'The Living Garden',
  subtitle: 'Restore the Rhythm',
  body: [
    'MindWave is our student concept for a non-invasive EEG brain–computer interface that could one day turn a selected imagined movement into visual feedback — inside engaging activities that accompany, never replace, professional rehabilitation for children with cerebral palsy.',
    'This garden lets you explore that idea. Every “detection” in it is simulated by the interface: no headset is connected and nothing is recorded.',
  ],
};

export const TUTORIAL = [
  {
    title: 'Move',
    body: 'Use W A S D or the arrow keys. On a touch screen, use the joystick. Hold Shift to glide faster.',
    keys: ['W', 'A', 'S', 'D'],
  },
  {
    title: 'Look around',
    body: 'Drag with the mouse (or a finger) to turn the view. Scroll to zoom. The camera can also follow you on its own.',
    keys: ['Drag'],
  },
  {
    title: 'Interact & Focus',
    body: 'Near a glowing landmark, press E (or the action button). In Focus Mode, press and hold the large button — you can change how long it takes, or switch to tap-to-start, in Settings.',
    keys: ['E', 'Hold'],
  },
  {
    title: 'Rest any time',
    body: 'There are no timers and nothing to lose. Press Esc or the pause button to rest, change settings, or read how MindWave would work.',
    keys: ['Esc'],
  },
];

export const REGION_TEXT = {
  meadow: {
    name: 'The Luminous Meadow',
    tagline: 'Where every session would begin — calmly.',
    journal: 'The starting place. In a real MindWave session, setup would come first: fitting the headset comfortably, checking signal quality and calibrating, guided by a professional.',
  },
  grove: {
    name: 'The Neural Grove',
    tagline: 'Branching pathways, all a little different.',
    journal: 'Interconnected, branching forms are a reminder that brain signals arise from networks — and that patterns differ between people. Experts told us adult EEG findings should not be assumed to transfer to children, especially children with CP.',
  },
  river: {
    name: 'The River of Signals',
    tagline: 'Follow the light downstream.',
    journal: 'The river follows the proposed processing pipeline: acquisition → signal quality & filtering → feature extraction → classification → visual feedback. These are conceptual sculptures — nothing here processes real data.',
  },
  basin: {
    name: 'The Blooming Basin',
    tagline: 'Where a thought could become feedback.',
    journal: 'Simulated demonstration trials show how an accepted, interpreted command could become visual feedback. Every outcome here comes from the interface or a demo setting, not from brain signals.',
  },
  sanctuary: {
    name: 'The Sanctuary',
    tagline: 'Rest, reflect, and the Heart of the Garden.',
    journal: 'A calm place for rest and reflection. Breaks are part of the design: parents and caregivers in our survey asked for rest whenever a child is tired.',
  },
  constellation: {
    name: 'The Constellation Hollow',
    tagline: 'An experimental corner — optional.',
    journal: 'An optional research corner exploring imagined left- versus right-hand movement — the task in our preliminary offline analysis. It is an experiment to explore, not a validated capability.',
  },
  wilds: {
    name: 'The Wild Reaches',
    tagline: 'The garden keeps going.',
    journal: 'Beyond the five regions the garden continues in every direction, generated from a fixed seed so it is the same each visit. Hidden blossoms grow here.',
  },
};

export const LANDMARK_TEXT = {
  dawnSeed: {
    name: 'The Dawn Seed',
    region: 'meadow',
    body: 'The first source of light. Its Focus Mode interaction is the simplest version of the MindWave idea: one intentional moment, one visible response.',
  },
  calibration: {
    name: 'The Calibration Circle',
    region: 'meadow',
    body: 'Calibration (proposed): a real system would need a participant-specific calibration before each session, because brain signals and abilities differ from person to person. Nothing is calibrated in this prototype.',
  },
  groveTree: {
    name: 'The Signal Tree',
    region: 'grove',
    body: 'Light travelling along branching paths — a picture of interconnected signals. Wake the three blossoms at its roots to send light through it.',
  },
  spring: {
    name: 'The Source Spring',
    stage: '1 · Signal acquisition',
    region: 'river',
    body: 'Proposed: a non-invasive EEG headset would record electrical activity from the scalp.',
    prototype: 'Here: no headset is connected and nothing is recorded.',
  },
  quality: {
    name: 'The Sieve Reeds',
    stage: '2 · Signal quality & filtering',
    region: 'river',
    body: 'Proposed: check electrode contact, flag artifacts (for example from movement or blinking) and filter out noise before analysis.',
    prototype: 'Here: the jittery light becoming smooth is only an illustration.',
  },
  features: {
    name: 'The Prism Lotus',
    stage: '3 · Feature extraction',
    region: 'river',
    body: 'Proposed: methods such as Common Spatial Patterns (CSP) would summarise signal patterns that differ between mental tasks.',
    prototype: 'Here: the three ribbons of light are illustrative — no features are computed.',
  },
  classification: {
    name: 'The Branching Gate',
    stage: '4 · Classification',
    region: 'river',
    body: 'Proposed: a classifier (such as LDA) would estimate the intended task. Uncertain outputs would be flagged instead of acted on.',
    prototype: 'Here: outcomes come from your button press or a demo setting.',
  },
  feedback: {
    name: 'The Bloom Lantern',
    stage: '5 · Visual feedback',
    region: 'river',
    body: 'Proposed: only accepted classifications would trigger feedback in the game.',
    prototype: 'Here: the lantern shines toward the Blooming Basin, where simulated trials make the Great Bloom open.',
  },
  greatBloom: {
    name: 'The Great Bloom',
    region: 'basin',
    body: 'The central MindWave demonstration: Ready → imagery period → simulated signal → simulated classification → visual response.',
  },
  heart: {
    name: 'The Heart of the Garden',
    region: 'sanctuary',
    body: 'Bring the four lights here to restore the garden’s central rhythm. The session summary waits beside it.',
  },
  restStones: {
    name: 'The Resting Stones',
    region: 'sanctuary',
    body: 'Rest here whenever you like. Taking breaks is never a failure.',
  },
  guardian: {
    name: 'The Guardian’s Arch',
    region: 'sanctuary',
    body: 'Professional oversight (proposed): qualified professionals would help select suitable tasks and instructions, review comfort and signal quality, and decide whether to adjust, pause or stop a session. MindWave would accompany professional rehabilitation, never replace it.',
  },
  starAltar: {
    name: 'The Star Altar',
    region: 'constellation',
    body: 'An experimental left/right activity based on the task in our preliminary offline analysis. Clearly experimental — not a validated capability.',
  },
};

export const RIVER_ORDER = ['quality', 'features', 'classification', 'feedback'];

export const PIPELINE = [
  {
    id: 'acq',
    name: 'EEG signal',
    proposed: 'A non-invasive EEG headset would record electrical activity from the scalp.',
    prototype: 'No headset is connected. No brain signals are recorded.',
  },
  {
    id: 'quality',
    name: 'Signal quality',
    proposed: 'Check electrode contact, flag artifacts and filter noise before analysis.',
    prototype: 'Shows a simulated, illustrative waveform only.',
  },
  {
    id: 'features',
    name: 'Feature extraction',
    proposed: 'Summarise patterns that differ between mental tasks, e.g. with Common Spatial Patterns (CSP).',
    prototype: 'No features are computed.',
  },
  {
    id: 'classify',
    name: 'Classification',
    proposed: 'A participant-specific classifier (e.g. LDA) estimates the intended task; uncertain outputs are flagged, not acted on.',
    prototype: 'Outcomes come from your button press or a clearly labelled demo setting.',
  },
  {
    id: 'feedback',
    name: 'Visual feedback',
    proposed: 'Only accepted classifications trigger feedback in an engaging activity.',
    prototype: 'The garden responds to simulated events.',
  },
  {
    id: 'summary',
    name: 'Session summary',
    proposed: 'A summary to help the user, caregivers and professionals reflect on the session.',
    prototype: 'Shows illustrative counts of game actions — never brain performance or progress.',
  },
];

export const SUPPORTING = [
  {
    name: 'Calibration',
    text: 'A real system would need a participant-specific calibration process before a session.',
  },
  {
    name: 'Professional oversight',
    text: 'Qualified professionals would help select suitable tasks, review comfort and signal quality, and decide whether the experience should be adjusted, paused or stopped.',
  },
];

export const WORKFLOWS = [
  {
    name: 'A · Offline research & model training',
    steps: ['Prepare EEG datasets and task labels', 'Check labels; filter and segment signals', 'Handle artifacts and check signal quality', 'Extract CSP features', 'Train an LDA classifier', 'Evaluate on held-out runs'],
  },
  {
    name: 'B · Proposed real-time session',
    steps: ['Place the headset and check electrode contact', 'Calibrate the selected task', 'Acquire and preprocess EEG', 'Extract features and classify', 'Flag uncertain outputs', 'Map accepted classifications to visual feedback', 'Prepare a session summary'],
  },
  {
    name: 'C · Professional considerations',
    steps: ['Select an appropriate task and instructions', 'Monitor comfort and signal quality', 'Decide whether to adjust, pause or stop'],
  },
];

export const RESEARCH = {
  whyFocus: [
    'Our preliminary offline analysis examined imagined left- versus right-hand movement. Average results were only slightly above the 50% chance level and varied substantially between participants.',
    'So this prototype demonstrates a simpler, single-action interaction — Focus Mode — based on a proposed imagery-versus-rest direction.',
    'We have not tested Focus Mode with EEG, and we have not shown that it is more accurate, easier for children, or clinically effective. The left/right results below do not describe Focus Mode.',
    'Left/right classification remains a research direction. You can explore it in the optional Constellation Hollow.',
  ],
  dataset: [
    ['Dataset', 'PhysioNet EEG Motor Movement/Imagery Dataset (public)'],
    ['Participants analysed', '13 healthy adults'],
    ['Task', 'Imagined left- vs right-hand movement'],
    ['Runs', '4, 8 and 12 · 15 imagery trials per run'],
    ['Trials', '45 per participant · 585 in total'],
    ['Methods', 'Python + MNE preprocessing · CSP features · LDA and SVM'],
    ['Evaluation', 'Leave-one-run-out'],
  ],
  results: [
    ['Mean balanced accuracy', '56.75%', '57.60%'],
    ['Median balanced accuracy', '53.87%', '55.14%'],
    ['Mean macro F1', '0.555', '0.563'],
  ],
  resultNotes: [
    'Chance level for this balanced two-class task: 50%.',
    'Five of the 13 participants scored at or below 50% with both classifiers. Results varied substantially between participants.',
    'The submitted results file did not include the complete Python code and preprocessing pipeline, so the analysis could not be independently verified in full.',
    'This is an exploratory technical result — not evidence of reliable BCI operation, not a result in children with CP, and not evidence of clinical effectiveness.',
  ],
  experts: [
    ['Dr. Jane Huggins', 'University of Michigan', 'The BCI paradigm should match the intended application. Motor imagery may be relevant to motor-rehabilitation activities, but the task itself needs to be appropriate.'],
    ['Dr. Naznin Virji-Babul', 'University of British Columbia', 'Adult EEG findings should not be assumed to transfer to children, especially children with CP. CP presents differently across individuals, and imagining a movement is not necessarily connected to being able to perform it.'],
    ['Dr. Adam Kirton', 'University of Calgary / BCI4Kids', 'Consider headset comfort, individual differences and engagement, and distinguish rehabilitation-support BCIs from systems that bypass the motor system. Avoid unsupported clinical claims.'],
    ['Dr. Alexandre Gramfort', 'MNE-Python', 'Recommended the official MNE-Python and pyRiemann examples as methodological starting points.'],
    ['Prof. Sergio Lerma-Lara', 'Clínica Universitaria La Salle', 'Current evidence is insufficient to recommend mental practice broadly for children with CP, because their ability to generate motor imagery is not clearly established.'],
  ],
  expertNote: 'These were informal consultations on our written student concept — not endorsements, clinical evaluations or validation of MindWave. No expert has reviewed or approved this game.',
  survey: {
    intro: 'An anonymous bilingual survey (Kazakh and Russian) received 23 submissions. One was excluded because the required voluntary consent was not given, leaving 22 valid adult responses.',
    groups: [
      ['Teachers or educators', 7],
      ['Health or rehabilitation professionals', 3],
      ['Parents or caregivers', 2],
      ['Other adults', 9],
      ['Preferred not to say', 1],
    ],
    barriers: [
      ['Equipment & maintenance costs', 10],
      ['Limited access to qualified specialists', 10],
      ['Setup / usability', 1],
      ['Internet / electricity access', 1],
    ],
    concerns: [
      ['Equipment cost', 7],
      ['Insufficient scientific evidence', 4],
      ['Reliability', 3],
      ['Safety / supervision', 3],
      ['Brain-data privacy', 3],
      ['Ease of use', 1],
      ['Unsure', 1],
    ],
    caregivers: 'Both parent/caregiver respondents rated our original concept as unclear. They asked for simple instructions, activities adapted to individual abilities, different game options, rest when a child is tired, and a clearer explanation of EEG signals and visual feedback.',
    note: 'A small convenience sample of adults — not statistically representative. No children with CP participated.',
  },
  designResponses: [
    ['Simple instructions', 'One short instruction per activity, with the current objective always on screen.'],
    ['Individual abilities', 'Adjustable Focus duration, hold or tap-to-start styles, movement speed, guided travel, larger text.'],
    ['Different game options', 'Focus Mode, a follow-the-light sequence, demonstration trials and an optional left/right experiment.'],
    ['Rest when tired', 'Gentle rest invitations, a pause button, Resting Stones — and no timers or penalties.'],
    ['Clearer explanation of EEG', 'The River of Signals and the “How MindWave would work” page separate proposed from simulated.'],
  ],
  isNot: [
    'A working EEG device or a functioning real-time BCI',
    'A clinically validated rehabilitation system or certified medical device',
    'A proven treatment for cerebral palsy',
    'A system that can read thoughts',
    'Evidence that imagined movement improves motor function in children with CP',
  ],
  scope: 'No EEG hardware is connected. No new EEG recordings were made from children or anyone else. No identifiable neural or health data were collected.',
};

export const REST_TEXT = {
  title: 'Your garden can wait.',
  body: 'Take a moment to rest.',
  breathing: 'Breathe in as the circle grows… and out as it settles.',
  breakTitle: 'Taking a break',
  breakBody: 'The garden is paused. Come back whenever you are ready.',
};

export const CLOSING = [
  'The garden remembers its rhythm.',
  'Every light came from a small, intentional moment.',
  'Thank you for exploring MindWave.',
];
