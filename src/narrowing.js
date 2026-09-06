/*
 * PNQ Sound Matching - Option 1 progressive narrowing logic (REQ-007, REQ-016).
 *
 * Pure module, no DOM access: volume is set once, then three pitch passes
 * (coarse -> medium -> fine) whose visible window tightens around each choice.
 * Tick marks never move - the layer holding them scales (NTICKS). The pass
 * count is fixed and system-owned (the control condition); "Keep fine-tuning"
 * adds narrower passes, "Wider range" reopens the coarse pass, and "Can't
 * hear this" raises the level. Every escape stays runnable and reassures.
 * Half-widths and the .6 shrink factor are the V5 prototype's invented
 * numbers - inspectable, not optimal.
 */

const clamp = (v) => Math.max(0, Math.min(1, v));

export const NEXT = { vol: "p1", p1: "p2", p2: "p3", p3: "conf" };
export const PASS_STAGES = Object.keys(NEXT);

// Tick positions in the full pitch range. They never move; the layer holding
// them scales.
export const NTICKS = Array.from({ length: 26 }, (_, i) => (i * 4) + "%");

// One hue per refinement depth, the prototype's DHUE ramp: blue for the whole
// range, magenta for the first tightening, deep navy-blue for the last. The
// window band is the solid at .16 alpha. Expressed through design-system
// tokens (the lint forbids the prototype's raw rgb triplets); the deep
// navy-blue sits between --blue-700 and --navy-600, so it is mixed from them.
const DEEP = "color-mix(in srgb, var(--blue-700) 55%, var(--navy-600))";
export const HUES = [
  { solid: "var(--blue-500)", band: "color-mix(in srgb, var(--blue-500) 16%, transparent)" },
  { solid: "var(--magenta-500)", band: "color-mix(in srgb, var(--magenta-500) 16%, transparent)" },
  { solid: DEEP, band: "color-mix(in srgb, " + DEEP + " 16%, transparent)" }
];
export function hueIndex(s) { return s === "p2" ? 1 : s === "p3" ? 2 : 0; }

// The visible pitch window: per-pass half-width (extra fine passes shrink by
// .6 each), its span, the left edge clamped into the full range, and the
// thumb's position within the window.
export function windowOf(s, n) {
  const hw = s === "p2" ? .16 : s === "p3" ? .05 * Math.pow(.6, n.extra || 0) : .5;
  const span = Math.min(2 * hw, 1);
  const edge = Math.max(0, Math.min(1 - span, (n.center == null ? n.pitch : n.center) - hw));
  const pos = clamp((n.pitch - edge) / span);
  return { hw, span, edge, pos };
}

// The fixed-tick layer behind the slider: 100/span wide and offset so the
// ticks keep their world positions while the layer scales with the window.
export function tickLayer(win) {
  return {
    left: (-(win.edge / win.span) * 100).toFixed(2) + "%",
    width: (100 / win.span).toFixed(2) + "%"
  };
}

// The fine slider maps its 0..100 position into the current window; the step
// buttons nudge by 16% of the pass's half-width.
export function slidePitch(win, pct) { return { pitch: clamp(win.edge + (pct / 100) * win.span) }; }
export function stepPitch(n, win, dir) { return { pitch: clamp(n.pitch + dir * win.hw * .16) }; }

/* ---------- per-pass copy, the V5 prototype's exactly ---------- */

export function passTitle(s, n) {
  return {
    vol: "Start with how loud it is",
    p1: "Now find the pitch",
    p2: "Getting closer",
    p3: n.extra ? "Closer still" : "Small adjustments now"
  }[s] || "";
}

export function passBody(s) {
  return {
    vol: "Press play, then move the slider until the sound is about as loud as your tinnitus feels. This is the only volume step.",
    p1: "The volume is set. Now move the slider until the pitch is near yours. Close is good enough here, and two closer passes follow.",
    p2: "Same task, smaller range. We narrowed around your last choice, so you do not need to manage that part.",
    p3: "Small adjustments only. If it still feels off when you get here, you can keep going."
  }[s] || "";
}

// The label names what comes next, so nobody thinks the first pitch choice is
// final.
export const PRIMARY = {
  vol: "The volume is about right",
  p1: "Next: closer adjustments",
  p2: "Next: fine adjustments",
  p3: "This matches what I hear"
};

export const VOL_HINT = "Set this to how loud your tinnitus feels, not how loud is comfortable.";

/* ---------- transitions ---------- */

// Signing off a pass recenters the next window on the choice. Every step but
// the last is live: the tone carries across instead of restarting. The pass
// count is fixed and system-owned - p3 always ends in shared Confidence.
export function advance(s, n) {
  const nx = NEXT[s];
  return nx === "conf"
    ? { kind: "stage", stage: "conf", obj: {} }
    : { kind: "live", stage: nx, obj: { center: n.pitch } };
}

// "Keep fine-tuning" on the last pass: three is the default, not the limit.
export function keepGoing(n) {
  return { extra: n.extra + 1, center: n.pitch, note: "Another pass, narrower again. Keep going for as long as it helps." };
}

// Audibility escape (REQ-016): raise the level, reassure, stay put.
export function noHear(n) {
  return { level: Math.min(.85, n.level + .12), note: "That’s okay. We made the sound a little easier to hear. Press play and try again." };
}

// "Wider range" reopens the coarse pass around the current choice, so octave
// confusion recovers by widening instead of dead-ending.
export function widen(n) {
  return {
    stage: "p1",
    obj: { extra: 0, center: n.pitch, widened: n.widened + 1, note: "We’ve widened the pitch range again. Take your time. Close is good enough at this stage." }
  };
}
