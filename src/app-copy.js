/*
 * Application-owned participant-copy rules for the immersive shell (REQ-004).
 *
 * The protected V5 audit remains the base contract. Shell-specific banned
 * language and the shell's small uppercase allowlist live here so the app can
 * extend that contract without changing src/participant-copy.js.
 */
import {
  auditParticipantStrings,
  normalizeParticipantStrings
} from "./participant-copy.js";

export const APPLICATION_BANNED_COPY_PATTERNS = Object.freeze([
  // The protected rule owns the original hyphenated spelling. These shell
  // variants retain the broader separator coverage added by the option hub.
  { label: "internal concept name", pattern: /\b2D Pitch(?:[–—]|\s)Volume Field\b/i },
  { label: "prototype or fictional framing", pattern: /\b(?:prototype|fictional)\b/i },
  { label: "prototype implementation terminology", pattern: /\b(?:algorithm|implementation detail|state machine|internal (?:id|identifier)|prototype code)\b/i },
  { label: "technical audio value", pattern: /\b(?:\d+(?:\.\d+)?\s*)?(?:k?hz|db)\b/i },
  {
    label: "failure-recovery framing",
    pattern: /(?:\boptions?\s*(?:[123])?\b.{0,48}\b(?:fail(?:ed|ure|s)?|fallbacks?|retr(?:y|ies))\b|\b(?:fail(?:ed|ure|s)?|fallbacks?|retr(?:y|ies))\b.{0,48}\boptions?\s*(?:[123])?\b|\b(?:next|another|remaining)\s+option\b.{0,48}\b(?:fail(?:ed|ure|s)?|did(?:n't| not) work)\b|\b(?:fail(?:ed|ure|s)?|did(?:n't| not) work)\b.{0,48}\b(?:next|another|remaining)\s+option\b)/i
  },
  {
    label: "sequential option framing",
    pattern: /(?:\b(?:options?\s*(?:[123])?|alternatives?)\b.{0,48}\b(?:stages?|methods?|approaches?|concepts?|assigned arms?|winners?|fallbacks?|ranked?|ranking|recommend(?:ed|ation)?|first|second|third|next|previous)\b|\b(?:stages?|methods?|approaches?|concepts?|assigned arms?|winners?|fallbacks?|ranked?|ranking|recommend(?:ed|ation)?|first|second|third|next|previous)\b.{0,48}\b(?:options?\s*(?:[123])?|alternatives?)\b|\bassigned arms?\b)/i
  },
  {
    label: "unsupported clinical claim",
    pattern: /(?:\b(?:clinically|medically) proven\b|\bguaranteed (?:outcome|relief|results?)\b|\b(?:clinically proven|guaranteed|cures?|treats?|will (?:cure|treat|reduce|relieve|eliminate))\b.{0,64}\b(?:tinnitus|symptoms?)\b|\b(?:tinnitus|symptoms?)\b.{0,64}\b(?:clinically proven|guaranteed|cures?|treats?|will (?:cure|treat|reduce|relieve|eliminate))\b|\btreatment\b.{0,40}\b(?:will work|effective|relief|outcome|cure)\b)/i
  }
]);

export const APPLICATION_STRUCTURAL_OVERLINES = Object.freeze(new Set([
  "EXPLORE PNQ", "TAKE YOUR TIME"
]));

const PRESCRIPTION_IDENTIFIER = /^PNQ(?:-RX)?-[A-Z0-9-]+$/;
const UPPERCASE_ISSUE_PREFIX = "uppercase is not a registered structural label: ";

function applicationAllowsUppercase(text) {
  return APPLICATION_STRUCTURAL_OVERLINES.has(text) || PRESCRIPTION_IDENTIFIER.test(text);
}

export function auditApplicationParticipantStrings(values) {
  const strings = normalizeParticipantStrings(values);
  const issues = auditParticipantStrings(strings).filter((issue) => {
    if (!issue.startsWith(UPPERCASE_ISSUE_PREFIX)) return true;
    return !applicationAllowsUppercase(issue.slice(UPPERCASE_ISSUE_PREFIX.length));
  });

  for (const text of strings) {
    for (const rule of APPLICATION_BANNED_COPY_PATTERNS) {
      if (rule.pattern.test(text)) issues.push(`${rule.label}: ${text}`);
    }
  }
  return issues;
}
