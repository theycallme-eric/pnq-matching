/*
 * Auditable participant-copy contract (REQ-022).
 *
 * The browser suite extracts the text that is actually rendered on every
 * participant screen and passes it through this module. Auditing rendered
 * copy, rather than maintaining a second hand-copied catalogue, means dynamic
 * messages and future UI changes cannot silently fall outside the check.
 * Anything explicitly marked data-moderator-only is outside this contract.
 */

export const REQUIRED_COPY = Object.freeze({
  reassurance: "There are no wrong answers",
  options: Object.freeze(["Option 1", "Option 2", "Option 3"])
});

export const BANNED_COPY_PATTERNS = Object.freeze([
  { label: "research framing", pattern: /\b(?:hypothesis|research study|research arm|control group|we(?:'re| are) testing|good answer)\b/i },
  { label: "synthesis terminology", pattern: /\b(?:sine(?: wave)?|sawtooth|square wave|oscillator|waveform generator)\b/i },
  { label: "clinical subtype terminology", pattern: /\b(?:pulsatile tinnitus|somatic tinnitus|tonal tinnitus|subjective tinnitus|objective tinnitus)\b/i },
  { label: "internal concept name", pattern: /\b(?:Progressive Narrowing|Comparison \+ Adaptive|2D Pitch-Volume Field|Sound-Family Guided|Adaptive Refinement)\b/i }
]);

// Uppercase is reserved for structural overlines and compact progress labels.
// Dynamic ear labels (LEFT/RIGHT/BOTH EARS) are handled by the pattern below.
export const STRUCTURAL_OVERLINES = Object.freeze(new Set([
  "PNQ SOUND MATCHING", "SOUND PLAYS IN", "GETTING SET UP", "MATCHING",
  "PITCH", "LOUDNESS", "VOLUME", "BEHAVIOR", "HOW DOES IT COMPARE?",
  "LOUDER", "QUIETER", "LOWER", "HIGHER", "YOUR SOUND",
  "PREVIOUS MATCH", "TODAY'S MATCH", "YOUR MATCHED SOUND", "WHAT YOU HEARD",
  "WHAT IT SOUNDS LIKE", "HOW IT BEHAVES", "WHY THIS CAME FIRST",
  "EAR", "HOW CLOSE IT FEELS", "HOW IT ENDED", "COMPARED WITH LAST TIME",
  "MATCHING YOUR SOUND", "FINDING YOUR SOUND", "GETTING CLOSER", "COMPARING",
  "BROAD", "CLOSER", "MATCHING PITCH", "MATCHING LOUDNESS",
  "EDUCATION · SOUND EXPLORATION", "EDUCATION · A CLOSER LOOK",
  "EDUCATION · HOW SOUND BEHAVES", "EDUCATION · WHAT YOU HEARD"
]));

const EAR_OVERLINE = /^(?:LEFT|RIGHT|BOTH) EARS?$/;
const PHASE_OVERLINE = /^(?:PITCH|PAIR) \d+ OF \d+$/;
const SOUND_OVERLINE = /^SOUND \d+$/;
const OPTION_OVERLINE = /^OPTION [123]$/;

export function normalizeParticipantStrings(values) {
  return [...new Set(values
    .flatMap((value) => String(value || "").split(/\n+/))
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean))];
}

export function auditParticipantStrings(values) {
  const strings = normalizeParticipantStrings(values);
  const issues = [];
  for (const text of strings) {
    for (const rule of BANNED_COPY_PATTERNS) {
      if (rule.pattern.test(text)) issues.push(`${rule.label}: ${text}`);
    }
    const letters = text.replace(/[^A-Za-z]/g, "");
    const uppercase = letters.length >= 3 && letters === letters.toUpperCase();
    if (uppercase && !STRUCTURAL_OVERLINES.has(text) && !EAR_OVERLINE.test(text) && !PHASE_OVERLINE.test(text) && !SOUND_OVERLINE.test(text) && !OPTION_OVERLINE.test(text)) {
      issues.push(`uppercase is not a registered structural label: ${text}`);
    }
  }
  return issues;
}
