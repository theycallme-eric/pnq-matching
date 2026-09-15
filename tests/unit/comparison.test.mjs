import test from "node:test";
import assert from "node:assert/strict";
import * as comparison from "../../src/comparison.js";
import { freshR } from "../../src/app-shell.js";

const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, (msg || "") + " expected " + b + ", got " + a);

test("directional confirmations use the approved context-specific close language", () => {
  assert.deepEqual(comparison.DIRECTIONAL_CLOSE, {
    vol: "This volume is close",
    pitch: "This pitch is close"
  });
  assert.doesNotMatch(Object.values(comparison.DIRECTIONAL_CLOSE).join("\n"), /set|finish up/i);
});

test("directional volume answers step the level and halve the next step", () => {
  const r = freshR();
  const res = comparison.dirAnswer(r, "louder");
  assert.equal(res.kind, "patch");
  close(res.patch.level, .58);
  close(res.patch.lstep, .108);
  assert.equal(res.patch.volOk, 0);
  assert.equal(res.patch.dirRounds, 1);

  const quieter = comparison.dirAnswer({ ...r, ...res.patch }, "quieter");
  close(quieter.patch.level, .58 - .108);
  close(quieter.patch.lstep, .108 * .6);
});

test("one about-right volume answer advances to the pitch phase", () => {
  const res = comparison.dirAnswer(freshR(), "right");
  assert.equal(res.kind, "patch", "phase change happens in place");
  assert.equal(res.patch.phase, "pitch");
  assert.equal(res.patch.dirBase, 1);
});

test("directional pitch answers step the center; the second settle preserves the exact endpoint in A/B", () => {
  const r = { ...freshR(), phase: "pitch" };
  const higher = comparison.dirAnswer(r, "higher");
  close(higher.patch.center, .7);
  close(higher.patch.pstep, .12);
  const lower = comparison.dirAnswer(r, "lower");
  close(lower.patch.center, .3);

  const first = comparison.dirAnswer(r, "right");
  assert.equal(first.kind, "patch");
  assert.equal(first.patch.pitchOk, 1);
  const second = comparison.dirAnswer({ ...r, ...first.patch }, "right");
  assert.equal(second.kind, "stage");
  assert.equal(second.stage, "comp");
  close(second.obj.spread, Math.max(.12, .2 * 1.8));
  close(second.obj.originalEndpoint, .5);
  close(second.obj.winnerPitch, .5);
  assert.notEqual(second.obj.challengerPitch, .5);
  const firstPair = comparison.pairSpecs({ ...r, ...second.obj });
  close(firstPair.A.pitch, .5, "Sound 1 is the exact directional endpoint");
  close(firstPair.B.pitch, second.obj.challengerPitch);
  assert.notEqual((firstPair.A.pitch + firstPair.B.pitch) / 2, .5, "the endpoint is not reinterpreted as a midpoint");
  assert.equal(second.obj.round, 1);
  assert.equal(second.obj.uncertain, 0);
});

test("first comparison challengers stay distinct and in range at both endpoints", () => {
  for (const center of [0, 1]) {
    const r = { ...freshR(), phase: "pitch", center, pitchOk: 1, pstep: .2 };
    const entered = comparison.dirAnswer(r, "right");
    const { A, B } = comparison.pairSpecs({ ...r, ...entered.obj });
    close(entered.obj.originalEndpoint, center);
    close(A.pitch, center);
    assert.ok(B.pitch >= 0 && B.pitch <= 1);
    assert.notEqual(B.pitch, center);
  }
});

test("the directional escape raises the level and reassures in both phases", () => {
  for (const phase of ["vol", "pitch"]) {
    const res = comparison.dirAnswer({ ...freshR(), phase }, "nohear");
    assert.equal(res.kind, "patch");
    close(res.patch.level, .52);
    assert.match(res.patch.msg, /easier to hear/);
  }
  const capped = comparison.dirAnswer({ ...freshR(), level: .8 }, "nohear");
  close(capped.patch.level, .85);
});

test("Sound 1 wins consecutive rounds while only narrowing challengers are regenerated", () => {
  const r = {
    ...freshR(), phase: "pitch", center: .58, level: .46, spread: .26, round: 2,
    originalEndpoint: .58, winnerPitch: .58, challengerPitch: .71, challengerSide: 1
  };
  const { A, B } = comparison.pairSpecs(r);
  close(A.pitch, .58);
  close(B.pitch, .71);
  assert.equal(A.level, .46);

  const res = comparison.pick(r, A.pitch);
  assert.equal(res.kind, "patch");
  close(res.patch.center, .58);
  close(res.patch.winnerPitch, .58);
  assert.notEqual(res.patch.challengerPitch, B.pitch, "only Sound 2 gets a new identity");
  close(res.patch.spread, .156);
  assert.equal(res.patch.round, 3);
  assert.equal(res.patch.uncertain, 0, "a decisive pick clears the uncertain streak");

  const next = { ...r, ...res.patch };
  const nextPair = comparison.pairSpecs(next);
  close(nextPair.A.pitch, .58, "the unchanged winner stays in Sound 1");
  assert.ok(Math.abs(nextPair.B.pitch - nextPair.A.pitch) < Math.abs(B.pitch - A.pitch));

  const again = comparison.pick(next, nextPair.A.pitch);
  const thirdPair = comparison.pairSpecs({ ...next, ...again.patch });
  close(thirdPair.A.pitch, .58, "the same winner survives another comparison");
  assert.ok(Math.abs(thirdPair.B.pitch - thirdPair.A.pitch) < Math.abs(nextPair.B.pitch - nextPair.A.pitch));
  close(again.patch.originalEndpoint, .58, "the phase-one endpoint remains distinct from pair updates");
});

test("a Sound 2 win moves that exact challenger to Sound 1 and narrows a new bounded challenger around it", () => {
  const r = {
    ...freshR(), phase: "pitch", center: .58, level: .46, spread: .26, round: 2,
    originalEndpoint: .58, winnerPitch: .58, challengerPitch: .71, challengerSide: 1
  };
  const before = comparison.pairSpecs(r);
  const res = comparison.pick(r, before.B.pitch);
  assert.equal(res.kind, "patch");
  close(res.patch.center, .71);
  close(res.patch.winnerPitch, .71);
  close(res.patch.originalEndpoint, .58);

  const after = comparison.pairSpecs({ ...r, ...res.patch });
  close(after.A.pitch, before.B.pitch, "the selected challenger is now Sound 1");
  assert.notEqual(after.B.pitch, before.A.pitch);
  assert.notEqual(after.B.pitch, before.B.pitch);
  assert.ok(after.B.pitch >= 0 && after.B.pitch <= 1);
  assert.ok(Math.abs(after.B.pitch - after.A.pitch) < Math.abs(before.B.pitch - before.A.pitch));
});

test("a pick below the spread floor ends the loop into Confidence", () => {
  const r = { ...freshR(), phase: "pitch", center: .58, spread: .075, round: 7 };
  const res = comparison.pick(r, .6);
  assert.equal(res.kind, "stage");
  assert.equal(res.stage, "conf");
  assert.equal(res.obj.stop, "floor");
  close(res.obj.spread, .045);
});

test("two uncertain answers in a row return to the directional phase", () => {
  const r = { ...freshR(), phase: "pitch", center: .58, spread: .26, round: 2, dirRounds: 5 };
  const first = comparison.neither(r);
  assert.equal(first.kind, "patch");
  assert.equal(first.patch.uncertain, 1);
  close(first.patch.spread, .4, "widens toward the cap");
  assert.match(first.patch.note, /widened out/);

  const second = comparison.neither({ ...r, ...first.patch });
  assert.equal(second.kind, "stage");
  assert.equal(second.stage, "dir");
  assert.equal(second.obj.phase, "pitch");
  assert.equal(second.obj.uncertain, 0);
  assert.equal(second.obj.dirBase, 5);
  assert.match(second.obj.msg, /back to simple directions/);
});

test("comparison contextual help raises only the level, reassures, and never leaves the pair", () => {
  const r = { ...freshR(), level: .46, center: .63, spread: .17, round: 6, uncertain: 1 };
  const before = structuredClone(r);
  const res = comparison.compNoHear(r);
  assert.equal(res.kind, "patch");
  assert.deepEqual(Object.keys(res.patch).sort(), ["level", "note"]);
  close(res.patch.level, .58);
  assert.equal(res.patch.note, "We made the sounds a little easier to hear. Check your headphones, then replay.");
  assert.deepEqual(r, before, "opening comparison assistance does not mutate pair progress");
});

test("the fatigue note appears from round 10 unless an answer just set one", () => {
  const r = { ...freshR(), round: 11, note: "" };
  assert.match(comparison.compNote(r), /comparing for a while/);
  assert.equal(comparison.compNote({ ...r, note: "kept" }), "kept");
  assert.equal(comparison.compNote({ ...r, round: 3 }), "");
});
