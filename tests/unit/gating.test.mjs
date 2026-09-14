import test from "node:test";
import assert from "node:assert/strict";
import * as gating from "../../src/gating.js";
import * as shell from "../../src/app-shell.js";

test("stage judgment carries while playback is preserved and locks after silence", () => {
  const start = { ...shell.initialState(), screen: "flow", concept: "n" };
  assert.equal(gating.heardHere(start), false);
  const heard = { ...start, ...gating.markHeardState(start) };
  assert.equal(gating.heardHere(heard), true);
  const next = shell.stageState(heard, "n", "p1");
  assert.equal(gating.heardHere(next), false, "heard history alone does not imply active playback");

  const sounding = { ...heard, playKey: "main" };
  const carried = shell.stageState(sounding, "n", "p1");
  assert.equal(gating.heardHere(carried), true, "a preserved owner carries heard state forward");
  assert.equal(carried.playKey, "main");
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

test("entering A/B with a carried directional sound does not count either audition", () => {
  const initial = shell.initialState();
  const directional = {
    ...initial,
    screen: "flow",
    concept: "r",
    playKey: "main",
    stages: { ...initial.stages, r: "dir" },
    r: { ...initial.r, phase: "pitch", pitchOk: 1 }
  };
  const pair = shell.stageState(directional, "r", "comp", { round: 1, uncertain: 0 });
  const key = gating.pairKeyOf(pair);
  assert.equal(pair.playKey, null, "the first pair waits for an explicit audition");
  assert.equal(pair.prKey, null);
  assert.equal(pair.prHeardA, false);
  assert.equal(pair.prHeardB, false);
  assert.equal(gating.prReady(pair, key), false);
});
