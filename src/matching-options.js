/*
 * Shared matching-options half-sheet model (REQ-007, REQ-008, REQ-009).
 *
 * Selection deliberately lives outside the persisted session shape. Opening
 * the sheet always starts a new, unselected interaction; choosing a row only
 * changes that local state, and confirmation is the sole emission point.
 */

export const MATCHING_OPTIONS = Object.freeze([
  Object.freeze({ id: "n", label: "Option 1" }),
  Object.freeze({ id: "r", label: "Option 2" }),
  Object.freeze({ id: "d", label: "Option 3" })
]);

const OPTION_IDS = new Set(MATCHING_OPTIONS.map((option) => option.id));

export function isMatchingOption(value) {
  return OPTION_IDS.has(value);
}

export function openMatchingOptions() {
  return { selectedOption: null };
}

export function selectMatchingOption(state, optionId) {
  if (!isMatchingOption(optionId)) return state;
  return { selectedOption: optionId };
}

export function confirmMatchingOption(state) {
  const optionId = state && state.selectedOption;
  return isMatchingOption(optionId) ? optionId : null;
}
