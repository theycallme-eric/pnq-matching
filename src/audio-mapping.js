/*
 * Deterministic normalized-control mappings shared by synthesis and technical
 * display. These are application-relative prototype values; they do not
 * measure device volume or make a calibrated sound-pressure claim.
 */

export const MASTER_LEVEL = 0.07;

export const FREQUENCY_RANGES = Object.freeze({
  tone: Object.freeze([2200, 20000]),
  hiss: Object.freeze([350, 8400]),
  buzz: Object.freeze([55, 440]),
  click: Object.freeze([400, 6400])
});

const clampUnit = (value) => Math.max(0, Math.min(1, value));

export function freqOf(kind, position) {
  const range = FREQUENCY_RANGES[kind] || FREQUENCY_RANGES.tone;
  const normalized = clampUnit(position);
  return range[0] * Math.pow(range[1] / range[0], normalized);
}

// Preserve the established squared response while the shared master sets the
// quieter global ceiling. This keeps the relative control feel unchanged.
export function gainOf(level) {
  const normalized = clampUnit(level);
  return 0.015 + normalized * normalized * 0.2192;
}

export function effectiveGainOf(level) {
  return MASTER_LEVEL * gainOf(level);
}
