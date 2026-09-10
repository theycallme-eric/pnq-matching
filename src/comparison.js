/*
 * PNQ Sound Matching - Option 2 comparison logic (REQ-008, REQ-016).
 *
 * Pure module, no DOM access: the directional listen-and-respond phase
 * (volume first, then pitch, with halving steps; one "about right" answer
 * advances a phase, which is deliberately generous) and the A/B comparison
 * loop (each pick halves the spread; the loop ends when the participant says
 * the two sound the same or the spread reaches its floor; two uncertain
 * answers in a row return to the directional phase). Step sizes, the halving
 * factor, the spread floor and the ~10-round fatigue point are the V5
 * prototype's invented numbers - inspectable, not optimal.
 *
 * Every function takes the r working state (freshR in app-shell.js) and
 * returns either { kind: "patch", patch } to stay on the stage or
 * { kind: "stage", stage, obj } to leave it.
 */

const clamp = (v) => Math.max(0, Math.min(1, v));

export const SPREAD_FLOOR = 0.06;
export const FATIGUE_ROUND = 10;

// One directional answer. Movement answers step a set amount and shrink the
// next step; "nohear" is the audibility escape (REQ-016): it raises the level
// and reassures, never recording a failure.
export function dirAnswer(r, tag) {
  const p = { note: "" };
  if (r.phase === "vol") {
    if (tag === "louder") { p.level = Math.min(.9, r.level + r.lstep); p.lstep = Math.max(.04, r.lstep * .6); p.volOk = 0; p.msg = ""; }
    else if (tag === "quieter") { p.level = Math.max(.08, r.level - r.lstep); p.lstep = Math.max(.04, r.lstep * .6); p.volOk = 0; p.msg = ""; }
    else if (tag === "right") {
      p.volOk = r.volOk + 1;
      if (p.volOk >= 1) { p.phase = "pitch"; p.msg = ""; p.dirBase = r.dirRounds + 1; }
      else p.msg = "";
    }
    else if (tag === "nohear") { p.level = Math.min(.85, r.level + .12); p.msg = "We made it a little easier to hear. Press play and try again."; }
  } else {
    if (tag === "higher") { p.center = clamp(r.center + r.pstep); p.pstep = Math.max(.05, r.pstep * .6); p.pitchOk = 0; p.msg = ""; }
    else if (tag === "lower") { p.center = clamp(r.center - r.pstep); p.pstep = Math.max(.05, r.pstep * .6); p.pitchOk = 0; p.msg = ""; }
    else if (tag === "right") {
      if (r.pitchOk >= 1) return { kind: "stage", stage: "comp", obj: { spread: Math.max(.12, r.pstep * 1.8), round: 1, uncertain: 0 } };
      p.pitchOk = r.pitchOk + 1; p.msg = "";
    }
    else if (tag === "nohear") { p.level = Math.min(.85, r.level + .12); p.msg = "We made it a little easier to hear. Press play and try again."; }
  }
  p.dirRounds = r.dirRounds + 1;
  return { kind: "patch", patch: p };
}

// The current A/B pair: A sits half the spread below the center, B above.
export function pairSpecs(r) {
  const A = { kind: "tone", pitch: clamp(r.center - r.spread / 2), level: r.level, bright: .3, behavior: "steady" };
  const B = { ...A, pitch: clamp(r.center + r.spread / 2) };
  return { A, B };
}

// Picking a side recenters on it and shrinks the spread. Below the floor the
// loop ends into Confidence with the floor stop recorded.
export function pick(r, pitch) {
  const spread = r.spread * .6;
  if (spread < SPREAD_FLOOR) return { kind: "stage", stage: "conf", obj: { center: pitch, spread, round: r.round + 1, stop: "floor" } };
  return { kind: "patch", patch: { center: pitch, spread, round: r.round + 1, uncertain: 0, note: "" } };
}

// "Neither is close": the first widens out and moves on; a second in a row
// returns to the directional phase for simple higher/lower answers.
export function neither(r) {
  const unc = r.uncertain + 1;
  if (unc >= 2) return {
    kind: "stage", stage: "dir",
    obj: { phase: "pitch", pstep: .18, pitchOk: 0, uncertain: 0, dirRounds: r.dirRounds, dirBase: r.dirRounds, msg: "Neither of those was close, so we have gone back to simple directions. Is your sound higher or lower than this?" }
  };
  return { kind: "patch", patch: { spread: Math.min(.4, r.spread * 1.9), round: r.round + 1, uncertain: unc, note: "Neither, then. We have widened out and moved to a different area." } };
}

// Comparison contextual Help (REQ-003): raise the level, reassure, stay put.
export function compNoHear(r) {
  return { kind: "patch", patch: { level: Math.min(.85, r.level + .12), note: "We made the sounds a little easier to hear. Check your headphones, then replay." } };
}

// After the fatigue point the pair screen offers a rest note (unless an answer
// just set one) and a way to finish from the best match so far.
export function compNote(r) {
  return r.round >= FATIGUE_ROUND && !r.note
    ? "You've been comparing for a while. It's fine to take a break, or finish from your best match so far."
    : r.note;
}
