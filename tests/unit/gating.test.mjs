import test from "node:test";
import assert from "node:assert/strict";
import * as gating from "../../src/gating.js";
import * as shell from "../../src/app-shell.js";

test("stage judgment stays locked until the current stage has played", () => {
  const start = { ...shell.initialState(), screen: "flow", concept: "n" };
  assert.equal(gating.heardHere(start), false);
  const heard = { ...start, ...gating.markHeardState(start) };
  assert.equal(gating.heardHere(heard), true);
  const next = shell.stageState(heard, "n", "p1");
  assert.equal(gating.heardHere(next), false, "a new stage relocks judgment");
});

test("directional phases have independent heard keys", () => {
  const volume = { ...shell.initialState(), concept: "r", stages: { ...shell.initialState().stages, r: "dir" } };
  const heardVolume = { ...volume, ...gating.markHeardState(volume) };
  assert.equal(gating.heardHere(heardVolume), true);
  const pitch = { ...heardVolume, r: { ...heardVolume.r, phase: "pitch" } };
  assert.equal(gating.heardHere(pitch), false);
});

test("A/B judgment unlocks only after both sounds of the same pair", () => {
  const state = { ...shell.initialState(), concept: "r", stages: { ...shell.initialState().stages, r: "comp" } };
  const firstKey = gating.pairKeyOf(state);
  const afterA = { ...state, ...gating.prHeardState(state, "a", firstKey) };
  assert.equal(gating.prReady(afterA, firstKey), false);
  const afterB = { ...afterA, ...gating.prHeardState(afterA, "b", firstKey) };
  assert.equal(gating.prReady(afterB, firstKey), true);

  const nextPair = { ...afterB, r: { ...afterB.r, round: afterB.r.round + 1 } };
  const nextKey = gating.pairKeyOf(nextPair);
  assert.notEqual(nextKey, firstKey);
  assert.equal(gating.prReady(nextPair, nextKey), false, "a new pair relocks judgment");
});
