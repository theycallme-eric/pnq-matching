/*
 * PNQ Sound Matching - preserved V5 flows (REQ-011, REQ-012, REQ-013).
 *
 * Pure module, no DOM access: the standalone Adaptive Refinement candidate
 * loop, the Longitudinal repeat-visit pair specs and the Education
 * sound-exploration field helpers, ported from the V5 mobile test prototype.
 * All three are reachable only through the moderator menu, never the
 * participant-facing options hub.
 */

// Fixed kind-cycling order for "Not like mine at all" (REQ-011).
export const KINDS = ["tone", "hiss", "buzz", "click"];

export const clamp = (v, a, b) => Math.max(a ?? .02, Math.min(b ?? .98, v));

/* ---------- adaptive refinement (REQ-011) ---------- */
// One candidate at a time. A directional answer moves the estimate and
// shrinks uncertainty; "not like mine" cycles the kind and restarts the
// search wide; repeated settled answers (stability) tighten into the
// loudness phase and then raise the final-check suggestion.

export function aResp(a, tag, rand = Math.random) {
  const p = { responded: true };
  if (a.phase === "pitch") {
    if (tag === "higher") { p.est = clamp(a.est + a.unc * .45); p.unc = Math.max(.07, a.unc * .85); p.closes = 0; p.msg = "You said higher. Trying a higher sound."; }
    else if (tag === "lower") { p.est = clamp(a.est - a.unc * .45); p.unc = Math.max(.07, a.unc * .85); p.closes = 0; p.msg = "You said lower. Trying a lower sound."; }
    else if (tag === "close") {
      p.closes = a.closes + 1; p.unc = Math.max(.06, a.unc * .5);
      p.msg = "Staying near this area. Your answers are settling.";
      if (p.closes >= 2 && p.unc <= .16) { p.phase = "loud"; p.msg = "Pitch feels settled. Now, how loud is yours compared with this?"; }
    }
    else if (tag === "notmine") { p.kIdx = (a.kIdx + 1) % 4; p.kind = KINDS[p.kIdx]; p.unc = .5; p.closes = 0; p.est = .5; p.msg = "That helps. We'll try a different kind of sound."; }
    else if (tag === "nohear") { p.level = Math.min(.85, a.level + .12); p.msg = "We made it a little easier to hear. Try again."; }
    p.cand = clamp((p.est ?? a.est) + (rand() - .5) * (p.unc ?? a.unc) * .6);
  } else {
    if (tag === "louder") { p.level = Math.min(.9, a.level + a.lstep); p.lstep = Math.max(.05, a.lstep * .65); p.lcloses = 0; p.msg = "A little louder, then."; }
    else if (tag === "softer") { p.level = Math.max(.06, a.level - a.lstep); p.lstep = Math.max(.05, a.lstep * .65); p.lcloses = 0; p.msg = "A little softer, then."; }
    else if (tag === "right") {
      p.lcloses = a.lcloses + 1; p.lstep = Math.max(.04, a.lstep * .6); p.msg = "Good. One more listen to be sure.";
      if (p.lcloses >= 2) { p.suggest = true; p.msg = "Your answers have settled."; }
    }
    else if (tag === "nohear") { p.level = Math.min(.85, a.level + .12); p.msg = "We made it a little easier to hear. Try again."; }
  }
  return p;
}

// The candidate voice while listening in the pitch phase; the settled
// estimate everywhere else.
export function aSpec(a, stage) {
  return { kind: a.kind, pitch: stage === "listen" && a.phase === "pitch" ? a.cand : a.est, level: a.level, bright: .3, behavior: "steady" };
}

// Final check: the settled estimate against a nearby probe.
export function aChalSpecs(a) {
  const A = { kind: a.kind, pitch: a.est, level: a.level, bright: .3, behavior: "steady" };
  return { A, B: { ...A, pitch: clamp(a.est + .04) } };
}

/* ---------- longitudinal (REQ-012) ---------- */
// Today vs. before: sound 2 is the prior match on file, sound 1 a nearby
// probe, so "similar to last time" is a real forced choice.

export function lPriorSpecs(l) {
  const A = { kind: l.prior.kind, pitch: clamp(l.prior.pitch - .07), level: l.prior.level, bright: .25, behavior: "steady" };
  const B = { kind: l.prior.kind, pitch: l.prior.pitch, level: l.prior.level, bright: .25, behavior: "steady" };
  return { A, B };
}

/* ---------- education field (REQ-013) ---------- */
// Across is pitch; down runs focused and tone-like toward broad and
// noise-like. Vocabulary stays hedged: these are education, not results.

export const FIELDWORD = (y) => y < .32 ? "more tone-like" : y < .66 ? "more like a hum or buzz" : "more like hiss or static";
export const FIELDPITCH = (x) => x < .34 ? "lower" : x < .67 ? "in the middle" : "higher";

// Behavior is a separate layer, not a third axis on the field. Clicking
// changes the sound itself rather than only its timing, which is exactly why
// it cannot be an axis.
export const FIELDBEHAVE = [
  ["Steady", "It stays the same", { behavior: "steady" }],
  ["Pulsing", "It beats in and out", { behavior: "pulse" }],
  ["Comes and goes", "It drops away, then returns", { behavior: "gap" }],
  ["Changing or fluttering", "It wavers without settling", { behavior: "waver" }],
  ["Clicking or chirping", "Short sounds instead of a continuous one", { kind: "click", rate: .6, behavior: "steady" }]
];

export function fieldSpec(tt, withBehavior) {
  const kind = tt.y < .32 ? "tone" : tt.y < .66 ? "buzz" : "hiss";
  const base = { kind, pitch: tt.x, level: .44, bright: Math.min(1, .04 + tt.y * 1.02), behavior: "steady" };
  if (!withBehavior || !tt.behavior) return base;
  const b = FIELDBEHAVE.find((x) => x[0] === tt.behavior);
  return b ? { ...base, ...b[2] } : base;
}

// The zoomed stage shows a window of the field rather than all of it, so the
// same finger movement covers less ground. Positions stay in global 0..1.
export function fieldWindow(tt, stage) {
  if (stage !== "zoom") return { x0: 0, y0: 0, span: 1 };
  const half = tt.span / 2;
  const cx = Math.max(half, Math.min(1 - half, tt.cx));
  const cy = Math.max(half, Math.min(1 - half, tt.cy));
  return { x0: cx - half, y0: cy - half, span: tt.span };
}

/* ---------- moderator jump targets ---------- */
// The preserved flows are reachable only from the session menu; scenario
// seeds are the V5 prototype's moderator presets for each flow.

export function jumpStagesA() {
  return [
    { label: "Prepare", stage: "intro", seed: {} },
    { label: "Broad start", stage: "listen", seed: {} },
    { label: "Answers clustering", stage: "listen", seed: { unc: .18, closes: 1, est: .6, cand: .58, responded: true, msg: "Staying near this area. Your answers are settling." } },
    { label: "Matching loudness", stage: "listen", seed: { unc: .1, phase: "loud", est: .6, cand: .6, responded: true, msg: "Pitch feels settled. Now, how loud is yours compared with this?" } },
    { label: "System suggests finishing", stage: "listen", seed: { unc: .09, phase: "loud", est: .6, cand: .6, suggest: true, responded: true, msg: "Your answers have settled." } },
    { label: "Patient stops early", stage: "conf", seed: { est: .6, stop: "patient", responded: true } },
    { label: "“Didn’t hear it”", stage: "listen", seed: { level: .57, responded: true, msg: "We made it a little easier to hear. Try again." } }
  ];
}

export function jumpStagesL() {
  return [
    { label: "Welcome back", stage: "ret", seed: {} },
    { label: "Blind prior check", stage: "prior", seed: { checkin: "About the same", transparent: false } },
    { label: "Labeled prior (transparent)", stage: "prior", seed: { checkin: "About the same", transparent: true } },
    { label: "“Different today”", stage: "reopen", seed: { checkin: "Different today", note: "We’ll search fresh today." } },
    { label: "First use · no prior", stage: "ret", seed: { hasPrior: false } },
    { label: "Refining near prior", stage: "refine", seed: { checkin: "About the same", picked: "prior" } }
  ];
}

export function jumpStagesT() {
  return [
    { label: "First use", stage: "field", seed: {} },
    { label: "Returning reminder", stage: "field", seed: { heard: true, labels: true, note: "Welcome back. Have another listen whenever you like, then carry on." } },
    { label: "Broad field", stage: "field", seed: { heard: true, labels: true } },
    { label: "Minimal labels", stage: "field", seed: { heard: true, labels: false } },
    { label: "Labels revealed", stage: "field", seed: { heard: true, labels: true, x: .78, y: .8 } },
    { label: "Zoomed field", stage: "zoom", seed: { heard: true, labels: true, x: .62, y: .5, cx: .62, cy: .5 } },
    { label: "Behavior layer", stage: "behave", seed: { heard: true, labels: true, x: .62, y: .5, cx: .62, cy: .5 } },
    { label: "What you heard", stage: "recap", seed: { heard: true, labels: true, x: .62, y: .5, behavior: "Pulsing" } },
    { label: "“Didn’t hear anything”", stage: "field", seed: { note: "That is okay, and worth telling us. We made it a little easier to hear. Press play and try again." } }
  ];
}
