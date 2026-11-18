// Session state. Everything shown in the summary is derived from these real game counters.
export function createProgress() {
  return {
    lights: { meadow: false, grove: false, river: false, basin: false },
    star: false,
    groveNodes: [false, false, false],
    riverStage: 0, // stations restored in order (0..4)
    bloomStage: 0, // simulated detections that opened the Great Bloom
    heartRestored: false,
    discovered: new Set(),
    hidden: new Set(),
    regionsVisited: new Set(),
    focusSaved: {},
  };
}

export function createStats() {
  return {
    startedAt: 0,
    focusCompleted: 0,
    trials: 0,
    detections: 0,
    nonDetections: 0,
    lrTrials: 0,
    lrMatches: 0,
    breaks: 0,
    restsOffered: 0,
    sinceRest: 0,
  };
}

export const lightsCount = (p) => Object.values(p.lights).filter(Boolean).length;
