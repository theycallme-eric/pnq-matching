import test from "node:test";
import assert from "node:assert/strict";
import {
  REQUIRED_COPY, STRUCTURAL_OVERLINES, auditParticipantStrings,
  normalizeParticipantStrings
} from "../../src/participant-copy.js";
import {
  APPLICATION_BANNED_COPY_PATTERNS,
  APPLICATION_STRUCTURAL_OVERLINES,
  auditApplicationParticipantStrings
} from "../../src/app-copy.js";

test("copy-rules: required reassurance and neutral option labels are explicit", () => {
  assert.equal(REQUIRED_COPY.reassurance, "There are no wrong answers");
  assert.deepEqual(REQUIRED_COPY.options, ["Option 1", "Option 2", "Option 3"]);
});

test("copy-rules: the protected contract still rejects its original banned categories", () => {
  const samples = new Map([
    ["We're testing a hypothesis", "research framing"],
    ["Play a sine wave", "synthesis terminology"],
    ["Choose square wave", "synthesis terminology"],
    ["This is pulsatile tinnitus", "clinical subtype terminology"],
    ["Progressive Narrowing", "internal concept name"],
    ["Use the 2D Pitch-Volume Field", "internal concept name"]
  ]);
  for (const [sample, expectedRule] of samples) {
    const issues = auditParticipantStrings([sample]);
    assert.ok(issues.some((issue) => issue.startsWith(expectedRule + ":")), `expected ${expectedRule}: ${sample}`);
  }
});

test("copy-rules: application audit retains every immersive-shell banned category", () => {
  const samples = new Map([
    ["We're testing a hypothesis", "research framing"],
    ["Play a sine wave", "synthesis terminology"],
    ["Choose square wave", "synthesis terminology"],
    ["This is pulsatile tinnitus", "clinical subtype terminology"],
    ["Progressive Narrowing", "internal concept name"],
    ["Use the 2D Pitch–Volume Field", "internal concept name"],
    ["Fictional profile ready", "prototype or fictional framing"],
    ["Research prototype", "prototype or fictional framing"],
    ["The adaptive algorithm chooses the next sound", "prototype implementation terminology"],
    ["Your match is 4.2 kHz and 52 dB", "technical audio value"],
    ["Technical values are shown in Hz and dB", "technical audio value"],
    ["Option 2 is a fallback if Option 1 fails", "failure-recovery framing"],
    ["Option 1 is the first stage", "sequential option framing"],
    ["Complete Option 2 next", "sequential option framing"],
    ["Option 3 is the winning method", "sequential option framing"],
    ["Option 1 is the recommended choice", "sequential option framing"],
    ["The options are ranked from best to worst", "sequential option framing"],
    ["The alternatives are three sequential stages", "sequential option framing"],
    ["You have been placed in an assigned arm", "sequential option framing"],
    ["This sound is clinically proven to cure tinnitus", "unsupported clinical claim"],
    ["This treatment will work for you", "unsupported clinical claim"]
  ]);
  for (const [sample, expectedRule] of samples) {
    const issues = auditApplicationParticipantStrings([sample]);
    assert.ok(issues.some((issue) => issue.startsWith(expectedRule + ":")), `expected ${expectedRule}: ${sample}`);
  }
  assert.deepEqual(
    APPLICATION_BANNED_COPY_PATTERNS.map(({ label }) => label),
    [
      "internal concept name", "prototype or fictional framing", "prototype implementation terminology", "technical audio value",
      "failure-recovery framing", "sequential option framing", "unsupported clinical claim"
    ]
  );
});

test("copy-rules: neutral alternatives and non-claim treatment boundaries pass", () => {
  assert.deepEqual(auditApplicationParticipantStrings([
    "Choose an option with your moderator.",
    "Option 1", "Option 2", "Option 3", "Done", "Return to matching options"
  ]), []);
});

test("copy-rules: sentence case passes and uppercase is limited to registered structure", () => {
  assert.deepEqual(auditParticipantStrings(["Move around and listen", "There are no wrong answers."]), []);
  assert.deepEqual(auditParticipantStrings(["MATCHING"]), []);
  assert.ok(STRUCTURAL_OVERLINES.has("PNQ SOUND MATCHING"));
  assert.match(auditParticipantStrings(["THIS SHOULD NOT BE A HEADING"])[0], /uppercase/);
});

test("copy-rules: application owns shell-only labels and prescription identifiers", () => {
  assert.deepEqual([...APPLICATION_STRUCTURAL_OVERLINES], ["EXPLORE PNQ", "TAKE YOUR TIME"]);
  assert.match(auditParticipantStrings(["EXPLORE PNQ"])[0], /uppercase/);
  assert.match(auditParticipantStrings(["PNQ-RX-4821"])[0], /uppercase/);
  assert.deepEqual(auditApplicationParticipantStrings([
    "EXPLORE PNQ", "TAKE YOUR TIME", "PNQ-RX-4821"
  ]), []);
});

test("copy-rules: rendered copy normalization is stable and auditable", () => {
  assert.deepEqual(normalizeParticipantStrings(["  One   line\nSecond line ", "One line"]), ["One line", "Second line"]);
});
