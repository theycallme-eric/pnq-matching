/*
 * PNQ Sound Matching - Option 2 comparison logic (REQ-008, REQ-016).
 *
 * Pure module, no DOM access: the directional listen-and-respond phase
 * (volume first, then pitch, with halving steps; one "about right" answer
 * advances a phase, which is deliberately generous) and the A/B comparison
 * sequence. Three ordinary picks narrow around the retained winner. If that
 * winner differs from the original directional endpoint, one final validation
 * pair compares those exact identities; otherwise the duplicate pair is
 * skipped. Two uncertain answers in a row still return to the directional
 * phase. Sound 1 is always the retained winner and Sound 2 is the only
 * regenerated challenger during ordinary comparisons.
 *
 * Every function takes the r working state (freshR in app-shell.js) and
 * returns either { kind: "patch", patch } to stay on the stage or
 * { kind: "stage", stage, obj } to leave it.
 */

const clamp = (v) => Math.max(0, Math.min(1, v));

const pitchOf = (value, fallback) => Number.isFinite(value) ? clamp(value) : clamp(fallback);

// Place a challenger half a spread from the retained winner. Prefer the
// requested side, but cross to the other side rather than flattening a
// challenger against a range endpoint. The returned side records the actual
// placement so ordinary rounds can alternate around the winner.
function challengerFor(winner, spread, preferredSide = 1) {
  const distance = Math.max(0, spread) / 2;
  let side = preferredSide < 0 ? -1 : 1;
  if (winner + side * distance < 0 || winner + side * distance > 1) side *= -1;
  return { pitch: clamp(winner + side * distance), side };
}

function comparisonState(r) {
  const winnerPitch = pitchOf(r.winnerPitch, r.center);
  if (Number.isFinite(r.challengerPitch) && r.challengerPitch !== winnerPitch) {
    return {
      winnerPitch,
      challengerPitch: clamp(r.challengerPitch),
      challengerSide: r.challengerSide < 0 ? -1 : 1
    };
  }
  const challenger = challengerFor(winnerPitch, r.spread, r.challengerSide);
  return { winnerPitch, challengerPitch: challenger.pitch, challengerSide: challenger.side };
}

export const SPREAD_FLOOR = 0.06;
export const FATIGUE_ROUND = 10;
export const ORDINARY_CHOICE_LIMIT = 3;
export const DIRECTIONAL_CLOSE = {
  vol: "This volume is close",
  pitch: "This pitch is close"
};

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
      if (r.pitchOk >= 1) {
        const originalEndpoint = clamp(r.center);
        const spread = Math.max(.12, r.pstep * 1.8);
        const challenger = challengerFor(originalEndpoint, spread);
        return {
          kind: "stage",
          stage: "comp",
          obj: {
            center: originalEndpoint,
            originalEndpoint,
            winnerPitch: originalEndpoint,
            challengerPitch: challenger.pitch,
            challengerSide: challenger.side,
            spread,
            round: 1,
            ordinaryChoices: 0,
            validation: false,
            validationComplete: false,
            uncertain: 0
          }
        };
      }
      p.pitchOk = r.pitchOk + 1; p.msg = "";
    }
    else if (tag === "nohear") { p.level = Math.min(.85, r.level + .12); p.msg = "We made it a little easier to hear. Press play and try again."; }
  }
  p.dirRounds = r.dirRounds + 1;
  return { kind: "patch", patch: p };
}

// The current A/B pair: Sound 1 is the stable winner identity and Sound 2 is
// the current bounded challenger. Older scenario seeds without explicit
// identities are normalized on read so moderator jumps remain usable.
export function pairSpecs(r) {
  const pair = comparisonState(r);
  const A = { kind: "tone", pitch: pair.winnerPitch, level: r.level, bright: .3, behavior: "steady" };
  const B = { ...A, pitch: pair.challengerPitch };
  return { A, B };
}

function finalResult(r, winnerPitch, stop) {
  const winner = clamp(winnerPitch);
  return {
    kind: "stage",
    stage: "conf",
    obj: {
      center: winner,
      originalEndpoint: pitchOf(r.originalEndpoint, winner),
      winnerPitch: winner,
      challengerPitch: null,
      spread: r.spread,
      round: r.round,
      ordinaryChoices: ORDINARY_CHOICE_LIMIT,
      validation: false,
      validationComplete: true,
      uncertain: 0,
      stop
    }
  };
}

// Picking either side makes that exact pitch the next Sound 1. The first two
// ordinary choices create a closer challenger. The third either creates the
// one endpoint-validation pair or finishes immediately when the identities
// already match. A validation pick is terminal by construction.
export function pick(r, pitch) {
  if (r.validationComplete) {
    return finalResult(r, pitchOf(r.winnerPitch, r.center), r.stop || "validation");
  }
  const current = comparisonState(r);
  const winnerPitch = clamp(pitch);
  const originalEndpoint = pitchOf(r.originalEndpoint, current.winnerPitch);
  if (r.validation) return finalResult(r, winnerPitch, "validation");

  const ordinaryChoices = Math.min(
    ORDINARY_CHOICE_LIMIT,
    (Number.isFinite(r.ordinaryChoices) ? r.ordinaryChoices : 0) + 1
  );
  const spread = r.spread * .6;
  if (ordinaryChoices === ORDINARY_CHOICE_LIMIT) {
    if (winnerPitch === originalEndpoint) {
      return finalResult({ ...r, spread, round: r.round + 1 }, winnerPitch, "endpoint-match");
    }
    return {
      kind: "patch",
      patch: {
        center: winnerPitch,
        originalEndpoint,
        winnerPitch,
        challengerPitch: originalEndpoint,
        challengerSide: originalEndpoint < winnerPitch ? -1 : 1,
        spread,
        round: r.round + 1,
        ordinaryChoices,
        validation: true,
        validationComplete: false,
        uncertain: 0,
        note: ""
      }
    };
  }
  const challenger = challengerFor(winnerPitch, spread, -current.challengerSide);
  return {
    kind: "patch",
    patch: {
      center: winnerPitch,
      originalEndpoint,
      winnerPitch,
      challengerPitch: challenger.pitch,
      challengerSide: challenger.side,
      spread,
      round: r.round + 1,
      ordinaryChoices,
      validation: false,
      validationComplete: false,
      uncertain: 0,
      note: ""
    }
  };
}

// "Neither is close": the first widens out and moves on; a second in a row
// returns to the directional phase for simple higher/lower answers.
export function neither(r) {
  if (r.validation || r.validationComplete) {
    return finalResult(r, pitchOf(r.winnerPitch, r.center), r.stop || "validation");
  }
  const unc = r.uncertain + 1;
  if (unc >= 2) return {
    kind: "stage", stage: "dir",
    obj: { phase: "pitch", pstep: .18, pitchOk: 0, ordinaryChoices: 0, validation: false, validationComplete: false, uncertain: 0, dirRounds: r.dirRounds, dirBase: r.dirRounds, msg: "Neither of those was close, so we have gone back to simple directions. Is your sound higher or lower than this?" }
  };
  const current = comparisonState(r);
  const spread = Math.min(.4, r.spread * 1.9);
  const challenger = challengerFor(current.winnerPitch, spread, -current.challengerSide);
  return {
    kind: "patch",
    patch: {
      center: current.winnerPitch,
      originalEndpoint: pitchOf(r.originalEndpoint, current.winnerPitch),
      winnerPitch: current.winnerPitch,
      challengerPitch: challenger.pitch,
      challengerSide: challenger.side,
      spread,
      round: r.round + 1,
      uncertain: unc,
      note: "Neither, then. We have widened out and moved to a different area."
    }
  };
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
