/*
 * PNQ Sound Matching - shared playback gating (REQ-018).
 *
 * Pure helpers, no DOM access: participants must actually hear a sound before
 * they can judge it. heardHere() gates each stage's primary CTA until that
 * stage's sound has been played; in A/B comparison both sounds of the current
 * pair (prHeardA/prHeardB keyed by pairKeyOf) must have been played before
 * either choice unlocks. Disabled CTAs stay in place and go gray - the
 * renderer only flips the color, never the layout.
 */

// A stage is identified by concept|stage; the directional stage runs two
// phases in place, so each phase has to be heard on its own.
export function heardKey(x) {
  const c = x.concept, s = x.stages[c];
  if (c === "r" && s === "dir") return "r|dir|" + x.r.phase;
  return c + "|" + s;
}

// Heard once this stage, or the main voice is sounding right now.
export function heardHere(x) {
  return !!x.heardStage[heardKey(x)] || x.playKey === "main";
}

// State patch recording that the current stage's sound has started playing.
export function markHeardState(s) {
  return { heardStage: { ...s.heardStage, [heardKey(s)]: true } };
}

// A pair is identified by where it sits in the flow, not by the floats it
// plays. Comparing stringified pitches would let rounding differences look
// like a new pair and reset the heard flags.
export function pairKeyOf(x) {
  const c = x.concept, s = x.stages[c];
  if (c === "r" && s === "comp") return "r|comp|" + x.r.round + "|" + x.r.uncertain;
  if (c === "a" && s === "chal") return "a|chal";
  if (c === "l" && s === "prior") return "l|prior";
  return null;
}

// Both sounds of the current pair heard: the A/B choices may unlock.
export function prReady(x, key) {
  return !!key && x.prKey === key && x.prHeardA && x.prHeardB;
}

// State patch for playing one side of a pair. Each new pair has to be heard
// again before it can be judged, so a key change resets both flags.
export function prHeardState(s, which, key) {
  return s.prKey === key
    ? (which === "a" ? { prHeardA: true } : { prHeardB: true })
    : { prKey: key, prHeardA: which === "a", prHeardB: which === "b" };
}
