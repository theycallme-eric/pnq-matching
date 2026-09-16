/*
 * Deterministic normalized-control mappings shared by synthesis and technical
 * display. These are application-relative prototype values; they do not
 * measure device volume or make a calibrated sound-pressure claim.
 */

export const MASTER_LEVEL = 0.1;

export const FREQUENCY_RANGES = Object.freeze({
  tone: Object.freeze([1600, 16000]),
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

// Preserve the established squared response while moving the usable range
// down. With the shared master, level .5 equals the previous mapping at .12
// (the third .04 marked step), while both endpoints sit below the previous
// effective range.
export function gainOf(level) {
  const normalized = clampUnit(level);
  return 0.015 + normalized * normalized * 0.2192;
}

export function effectiveGainOf(level) {
  return MASTER_LEVEL * gainOf(level);
}
