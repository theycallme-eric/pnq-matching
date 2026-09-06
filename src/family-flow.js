/*
 * PNQ Sound Matching - preserved V5 Sound-Family Guided flow (REQ-010).
 *
 * Pure module, no DOM access: the sound-family data embedded in the V5
 * prototype and the family/char/tune/layer stage transitions, ported exactly.
 * This is a limited prototype flow: the entries below are V5's placeholder
 * data, not a sound taxonomy, and nothing may be added beyond them.
 */

export const BEH_UI = ["Steady", "Comes and goes", "Pulsing"];
export const BEH_MAP = { "Steady": "steady", "Comes and goes": "gap", "Pulsing": "pulse" };
export const BEH_LBL = { steady: "Steady", gap: "Comes and goes", pulse: "Pulsing", waver: "Steady" };

// Character labels are object-first with an adjective sub-line (patients
// describe with objects, not adjectives). Rows marked `bridge` appear in every
// family they plausibly belong to, under the SAME label, with a spec tuned to
// that family's reading of the object. The repetition is the point: ambiguity
// is real data.
export const FAMS = {
  hiss: { name: "Hissing or rushing", short: "hiss", desc: "Airy, like static, steam, or rushing air.", ex: { kind: "hiss", pitch: .55, level: .42, bright: .35, behavior: "steady" }, chars: [
    { label: "Like radio static", sub: "Smooth and even", spec: { kind: "hiss", pitch: .5, level: .42, bright: .3, behavior: "steady" } },
    { label: "Like rushing air or water", sub: "Broad, and it moves", spec: { kind: "hiss", pitch: .3, level: .42, bright: .15, behavior: "waver" } },
    { label: "Like a radiator hissing", sub: "High and thin", spec: { kind: "hiss", pitch: .68, level: .42, bright: .5, behavior: "steady" } },
    { label: "Like wind or ocean waves", sub: "Low and broad", spec: { kind: "hiss", pitch: .2, level: .42, bright: .1, behavior: "waver" } },
    { label: "Like a swarm of bees", sub: "Dense and vibrating", bridge: 1, spec: { kind: "hiss", pitch: .38, level: .42, bright: .7, behavior: "steady" } },
    { label: "Like crackling", sub: "Grainy, uneven", bridge: 1, spec: { kind: "hiss", pitch: .55, level: .42, bright: .9, behavior: "gap" } }] },
  buzz: { name: "Buzzing or humming", short: "buzzing", desc: "Rough and low, like an appliance or electrical hum.", ex: { kind: "buzz", pitch: .35, level: .42, bright: .35, behavior: "steady" }, chars: [
    { label: "Like a refrigerator hum", sub: "Low and steady", spec: { kind: "buzz", pitch: .18, level: .42, bright: .12, behavior: "steady" } },
    { label: "Like a fluorescent light", sub: "Coarse, electrical", spec: { kind: "buzz", pitch: .45, level: .42, bright: .8, behavior: "steady" } },
    { label: "Like a distant car", sub: "Droning, slightly wavering", spec: { kind: "buzz", pitch: .28, level: .42, bright: .3, behavior: "waver" } },
    { label: "Like a swarm of bees", sub: "Dense and vibrating", bridge: 1, spec: { kind: "buzz", pitch: .6, level: .42, bright: .85, behavior: "steady" } },
    { label: "Like an old TV screen", sub: "A high electrical whine", bridge: 1, spec: { kind: "buzz", pitch: .85, level: .42, bright: .6, behavior: "steady" } },
    { label: "Like cicadas", sub: "A dense, pulsing swarm", bridge: 1, spec: { kind: "hiss", pitch: .72, level: .42, bright: .75, behavior: "pulse" } }] },
  tone: { name: "A tone", short: "tone", desc: "Clear and steady, like a whistle or a single note.", caution: "People often say “ringing” for tinnitus in general, whatever they actually hear. If none of these sound right, the other groups are worth a listen.", ex: { kind: "tone", pitch: .62, level: .42, bright: .2, behavior: "steady" }, chars: [
    { label: "Like a whistle", sub: "Clear and steady", spec: { kind: "tone", pitch: .66, level: .42, bright: .18, behavior: "steady" } },
    { label: "Like a hearing test tone", sub: "Smooth, a single note", spec: { kind: "tone", pitch: .6, level: .42, bright: .06, behavior: "steady" } },
    { label: "Like a dog whistle", sub: "Very high and thin", spec: { kind: "tone", pitch: .88, level: .42, bright: .3, behavior: "steady" } },
    { label: "Like a dial tone", sub: "Even, middle of the range", spec: { kind: "tone", pitch: .38, level: .42, bright: .12, behavior: "steady" } },
    { label: "Like an old TV screen", sub: "A narrow high whine", bridge: 1, spec: { kind: "tone", pitch: .72, level: .42, bright: .45, behavior: "steady" } },
    { label: "Like cicadas", sub: "A high, focused whine", bridge: 1, spec: { kind: "tone", pitch: .78, level: .42, bright: .55, behavior: "waver" } }] },
  click: { name: "Clicking or chirping", short: "clicking", desc: "Short sounds that repeat or come and go.", ex: { kind: "click", pitch: .5, level: .42, rate: .5, behavior: "steady" }, chars: [
    { label: "Like crickets", sub: "Chirping, repeating", spec: { kind: "click", pitch: .72, level: .42, rate: .7, behavior: "steady" } },
    { label: "Like a smoke alarm chirp", sub: "Short, well spaced", spec: { kind: "click", pitch: .8, level: .42, rate: .12, behavior: "gap" } },
    { label: "Like Morse code", sub: "Irregular, comes and goes", spec: { kind: "click", pitch: .5, level: .42, rate: .45, behavior: "gap" } },
    { label: "Like a hard drive", sub: "Fast and even", spec: { kind: "click", pitch: .35, level: .42, rate: .9, behavior: "steady" } },
    { label: "Like cicadas", sub: "Fast repeating events", bridge: 1, spec: { kind: "click", pitch: .7, level: .42, rate: .95, behavior: "steady" } },
    { label: "Like crackling", sub: "Grainy, uneven", bridge: 1, spec: { kind: "click", pitch: .55, level: .42, rate: .8, behavior: "gap" } }] },
  hard: { name: "Hard to describe", short: "sound", desc: "A mix, or something else. We'll find it by listening.", ex: null, chars: [
    { label: "Sound 1", spec: { kind: "tone", pitch: .7, level: .42, bright: .15, behavior: "steady" } },
    { label: "Sound 2", spec: { kind: "hiss", pitch: .5, level: .42, bright: .3, behavior: "steady" } },
    { label: "Sound 3", spec: { kind: "buzz", pitch: .3, level: .42, bright: .4, behavior: "steady" } },
    { label: "Sound 4", spec: { kind: "click", pitch: .55, level: .42, rate: .5, behavior: "steady" } },
    { label: "Sound 5", spec: { kind: "tone", pitch: .45, level: .42, bright: .2, behavior: "waver" } },
    { label: "Sound 6", spec: { kind: "hiss", pitch: .78, level: .42, bright: .7, behavior: "pulse" } }] }
};
export const FAMORDER = ["hiss", "buzz", "tone", "click", "hard"];

// The "shape it directly" starting point for the hard-to-describe path; also
// the working spec fallback and the silent-flow main-voice fallback.
export const HARD_SPEC = { kind: "hiss", pitch: .5, level: .4, bright: .3, behavior: "steady" };

// Which family the flow is currently working in: the tuned sound's family
// wins over the list selection once a character has been chosen.
export function famContext(f) {
  const famKey = f.work ? f.work.fam : f.fam;
  const famDef = famKey ? FAMS[famKey] : null;
  const tuneSpec = f.work ? f.work.spec : { ...HARD_SPEC };
  return { famKey, famDef, isHard: famKey === "hard", tuneSpec };
}

/* ---------- stage transitions (V5 handlers, verbatim outcomes) ---------- */
// Each returns { go: [stage, obj] } for a stage change or { pat: obj } for an
// in-place patch, so the outcomes stay pure and testable; the renderer maps
// them onto its go()/pat() navigation.

export function famContinue(f) {
  if (!f.fam) return { pat: { note: "Choose the closest kind, or “None of these fit.”" } };
  return { go: ["char", { charIdx: null }] };
}

export function noneFit() { return { go: ["char", { fam: "hard", charIdx: null }] }; }

export function famNoHear() {
  return { pat: { note: "That’s okay. We made the examples a little easier to hear. Check your headphones are snug." } };
}

export function charContinue(f) {
  if (f.charIdx == null) return { pat: { note: "Play a few and pick the closest. It doesn’t have to be exact." } };
  const { famKey, famDef } = famContext(f);
  const spec = { ...famDef.chars[f.charIdx].spec };
  return { go: ["tune", { work: { fam: famKey, charIdx: f.charIdx, spec } }] };
}

export function charGhost(f) {
  if (famContext(f).isHard) {
    return { go: ["tune", { work: { fam: "hard", charIdx: -1, spec: { ...HARD_SPEC } }, note: "That’s okay. We’ll keep the search wide and shape the sound directly." }] };
  }
  return { go: ["family", { note: "Try another kind, or choose “Hard to describe.” Both are normal." }] };
}

export function tuneDone(f) {
  const saved = { ...f.work };
  if (f.editing === 2) return { go: ["layer", { s2: saved, work: null }] };
  return { go: ["layer", { s1: saved, work: null }] };
}

export function tuneNoHear(f) {
  const { tuneSpec } = famContext(f);
  return { pat: { work: { ...f.work, spec: { ...tuneSpec, level: Math.min(.85, tuneSpec.level + .12) } }, note: "That’s okay. We made it a little easier to hear. Press play and try again." } };
}

export function addSound() {
  return { go: ["family", { editing: 2, fam: null, charIdx: null, note: "Matching sound 2 now. Same steps, and sound 1 is saved." }] };
}

export function removeSecond() { return { pat: { s2: null, editing: 1 } }; }

export function layerDone() { return { go: ["conf"] }; }

/* ---------- playback ---------- */

export function layerSounds(f) { return [f.s1, f.s2].filter(Boolean); }

// The main voice for the family flow: the sound being tuned while on the tune
// stage, otherwise the saved sound(s) - both together when there are two.
export function mainSpecs(f, stage) {
  if (stage === "tune" && f.work) return [f.work.spec];
  const arr = layerSounds(f).map((sd) => sd.spec);
  return arr.length ? arr : [{ ...HARD_SPEC }];
}

/* ---------- moderator jump targets ---------- */
// The preserved flow is reachable only from here (REQ-010): the session menu
// renders these as a jump group, never the participant-facing options hub.
// Scenario seeds are the V5 prototype's moderator presets for this flow.

export function jumpStages() {
  return [
    { label: "Prepare", stage: "intro", seed: {} },
    { label: "Families open", stage: "family", seed: {} },
    { label: "“None of these fit”", stage: "char", seed: { fam: "hard" } },
    { label: "Hard-to-describe path", stage: "char", seed: { fam: "hard" } },
    { label: "Tuning one sound", stage: "tune", seed: { fam: "hiss", charIdx: 0, work: { fam: "hiss", charIdx: 0, spec: { ...FAMS.hiss.chars[0].spec } } } },
    { label: "Two sounds", stage: "layer", seed: { s1: { fam: "hiss", charIdx: 0, spec: { ...FAMS.hiss.chars[0].spec } }, s2: { fam: "tone", charIdx: 0, spec: { ...FAMS.tone.chars[0].spec, pitch: .72 } }, editing: 2 } },
    { label: "One sound", stage: "layer", seed: { s1: { fam: "hiss", charIdx: 0, spec: { ...FAMS.hiss.chars[0].spec } } } },
    { label: "Couldn’t hear examples", stage: "family", seed: { note: "That’s okay. We made the examples a little easier to hear. Check your headphones are snug." } }
  ];
}
