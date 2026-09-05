import test from "node:test";
import assert from "node:assert/strict";
import * as shell from "../../src/app-shell.js";

test("confidence helpers preserve each concept's contextual note and return target", () => {
  const n = { ...shell.initialState(), concept: "n", n: { ...shell.freshN(), closeEnough: true, conf: "Not close yet" } };
  assert.match(shell.confIntro(n), /Close enough/);
  assert.deepEqual(shell.keepRefiningTarget(n), {
    stage: "p3",
    obj: { conf: null, note: "Take your time. If it still feels off, keep fine-tuning or widen the range." }
  });

  const r = { ...shell.initialState(), concept: "r", r: { ...shell.freshR(), conf: "Not close yet" } };
  assert.equal(shell.keepRefiningTarget(r).stage, "comp");
});

test("completion data is derived from the final matched sound and participant state", () => {
  const state = {
    ...shell.initialState(), concept: "n", ear: "Left ear",
    n: { ...shell.freshN(), pitch: .62, level: .51, conf: "Very close" }
  };
  const done = shell.doneData(state, [{ kind: "tone", pitch: .62, level: .51 }]);
  assert.equal(done.title, "That’s this one done");
  assert.deepEqual(done.rows.map((row) => row.label), ["EAR", "HOW CLOSE IT FEELS"]);
  assert.equal(done.rows[0].sub, "Left ear");
  assert.equal(done.rows[1].sub, "Very close");
  assert.match(done.tech, /kHz|Hz/);
  assert.match(done.tech, /dB/);
});

test("returning home records the correct option once and preserves completion order", () => {
  const state = {
    ...shell.initialState(), screen: "flow", concept: "r", optOrder: ["n", "r"],
    r: { ...shell.freshR(), conf: "Fairly close" }
  };
  const complete = shell.completeOptionState(state);
  assert.equal(complete.screen, "home");
  assert.equal(complete.optDone.r, "Fairly close");
  assert.deepEqual(complete.optOrder, ["n", "r"]);
  assert.equal(complete.playKey, null);
});
