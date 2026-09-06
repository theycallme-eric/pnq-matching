import test from "node:test";
import assert from "node:assert/strict";
import {
  REQUIRED_COPY, STRUCTURAL_OVERLINES, auditParticipantStrings,
  normalizeParticipantStrings
} from "../../src/participant-copy.js";

test("copy-rules: required reassurance and neutral option labels are explicit", () => {
  assert.equal(REQUIRED_COPY.reassurance, "There are no wrong answers");
  assert.deepEqual(REQUIRED_COPY.options, ["Option 1", "Option 2", "Option 3"]);
});

test("copy-rules: banned research, synthesis, clinical, and internal language is rejected", () => {
  for (const sample of [
    "We're testing a hypothesis", "Play a sine wave", "Choose square wave",
    "This is pulsatile tinnitus", "Progressive Narrowing"
  ]) {
    assert.ok(auditParticipantStrings([sample]).length > 0, `expected rejection: ${sample}`);
  }
});

test("copy-rules: sentence case passes and uppercase is limited to registered structure", () => {
  assert.deepEqual(auditParticipantStrings(["Move around and listen", "There are no wrong answers."]), []);
  assert.deepEqual(auditParticipantStrings(["MATCHING"]), []);
  assert.ok(STRUCTURAL_OVERLINES.has("PNQ SOUND MATCHING"));
  assert.match(auditParticipantStrings(["THIS SHOULD NOT BE A HEADING"])[0], /uppercase/);
});

test("copy-rules: rendered copy normalization is stable and auditable", () => {
  assert.deepEqual(normalizeParticipantStrings(["  One   line\nSecond line ", "One line"]), ["One line", "Second line"]);
});

