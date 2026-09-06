/*
 * PNQ Sound Matching - Option 3 2D pitch-volume field logic (REQ-009, REQ-016).
 *
 * Pure module, no DOM access: one draggable marker on a square field,
 * horizontal = pitch and vertical = volume, ported from the V5 prototype.
 * A broad pass over the whole space, then up to two zoom levels that show a
 * smaller window of the same space, so the decorative grid drawn on it
 * appears to scale up - the grid marks no real pitch or volume value. There
 * is no computed endpoint: the participant confirms the marker to finish.
 *
 * The vertical axis maps to DVOL, which stops well short of full output so
 * exploration cannot reach an uncomfortable level; below the floor a tone
 * stops being audible for many people. The spans, hues and note copy are the
 * V5 prototype's values exactly.
 */

const clamp = (v) => Math.max(0, Math.min(1, v));

// The field's vertical axis is capped at a moderate level (REQ-009).
export const DVOL = { min: .12, max: .68 };

// Refinement levels on the field: each shows a smaller window of the space.
export const DSPAN = [1, .38, .15];

// Grid lines are individual SVG lines rather than a repeating gradient:
// percentage-stepped gradients round per tile, which dropped and thickened
// lines as the layer scaled.
export const GRID = Array.from({ length: 25 }, (_, i) => +(i * 100 / 24).toFixed(4));

// One hue per refinement level, so the field itself says which step you are
// on. Blue is the whole range, magenta the first zoom, deep navy-blue the
// last. The preview box wears the NEXT level's hue. The prototype's literal
// rgba values map onto design-system tokens; alpha comes from color-mix so
// no new palette literals enter the app.
const HUES = [
  { base: "var(--blue-500)", line: "var(--navy-800)", lineA: 8.5 },
  { base: "var(--magenta-500)", line: "var(--magenta-500)", lineA: 18 },
  { base: "color-mix(in srgb, var(--blue-700) 62%, var(--navy-800))", line: "color-mix(in srgb, var(--blue-700) 62%, var(--navy-800))", lineA: 26 }
];

export const tint = (color, pct) => "color-mix(in srgb, " + color + " " + pct + "%, transparent)";

export function hueOf(level) { return HUES[level] || HUES[0]; }

export function fieldBg(level) {
  const h = hueOf(level);
  return "linear-gradient(180deg," + tint(h.base, 17) + " 0%," + tint(h.base, 5.5) + " 62%," + tint(h.base, 2) + " 100%)";
}

// The marker's field position becomes the played tone: horizontal = pitch,
// vertical = volume capped inside DVOL (REQ-009).
export function dSpec(d) {
  return { kind: "tone", pitch: d.x, level: DVOL.max - d.y * (DVOL.max - DVOL.min), bright: .3, behavior: "steady" };
}

// The window of the space the current refinement level shows, centered on the
// chosen region and clamped inside the whole field.
export function dWindow(d) {
  const span = DSPAN[d.level || 0] || 1;
  if (span >= 1) return { x0: 0, y0: 0, span: 1 };
  const half = span / 2;
  return { x0: Math.max(0, Math.min(1 - span, d.cx - half)), y0: Math.max(0, Math.min(1 - span, d.cy - half)), span };
}

// A local (0..1) position inside the visible window mapped back to the whole
// space. Dragging clamps to the window's edges, so a zoomed pass cannot leave
// its region - and the volume ceiling holds because y can never pass 0.
export function dragPoint(win, lx, ly) {
  lx = clamp(lx); ly = clamp(ly);
  if (win.span >= 1) return { x: lx, y: ly };
  return { x: clamp(win.x0 + lx * win.span), y: clamp(win.y0 + ly * win.span) };
}

// Everything the field screen draws, derived from the d working state: the
// window, the marker's position inside it, the scaled decorative layer
// (zooming reads as the grid growing rather than as a new screen), and the
// dashed preview of the next refinement's region.
export function view(d) {
  const win = dWindow(d);
  const level = d.level || 0;
  const nextSpan = DSPAN[level + 1];
  const hasNext = nextSpan != null;
  const locX = (d.x - win.x0) / win.span, locY = (d.y - win.y0) / win.span;
  const regFrac = hasNext ? nextSpan / win.span : 0;
  const clampReg = (v) => Math.max(0, Math.min(1 - regFrac, v - regFrac / 2));
  return {
    win, level, hasNext, locX, locY, regFrac,
    regionLeft: clampReg(locX), regionTop: clampReg(locY),
    scale: +(1 / win.span).toFixed(4),
    origin: win.span >= 1 ? "50% 50%"
      : ((win.x0 / (1 - win.span)) * 100).toFixed(2) + "% " + ((win.y0 / (1 - win.span)) * 100).toFixed(2) + "%",
    title: level === 0 ? "Move around and listen" : level === 1 ? "Look closely at this area" : "Closer still",
    body: level === 0
      ? (d.heard ? "Drag the marker anywhere. Across changes the pitch, up and down changes the volume." : "Press play, then drag the marker around and listen for what changes.")
      : level === 1
        ? "Same idea, a smaller area, so small movements matter less. The grid grew because you moved in closer."
        : "The smallest area. Settle on the spot that sounds most like what you hear."
  };
}

// The step-forward action: locked until the marker has been heard, then it
// zooms into the chosen region, or - on the last level - hands over to the
// shared Confidence step. The participant owns that call; nothing is computed.
export function advance(d) {
  if (!d.heard) return { kind: "patch", patch: { note: "Press play first, so you can hear what this spot sounds like." } };
  const level = d.level || 0;
  if (DSPAN[level + 1] != null) {
    return {
      kind: "zoom",
      obj: { cx: d.x, cy: d.y, level: level + 1, zoomed: true, heard: false, note: "" }
    };
  }
  return { kind: "conf" };
}

// "Can't hear this" (REQ-016): reassure and stay put. The marker's own
// vertical axis is the volume control, so the note points there instead of
// the system changing the level behind the participant's back.
export function noHear() {
  return { note: "That’s okay, and worth telling us. Try moving the marker higher for a louder sound, or check your headphones are snug." };
}

// Back steps out one refinement level before it steps back a stage. The
// marker stays exactly where the participant left it.
export function zoomOutNote(level) {
  return level === 1 ? "Back to the whole range. Your marker is where you left it." : "Back out one step. Your marker is where you left it.";
}
