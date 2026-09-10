import test from "node:test";
import assert from "node:assert/strict";
import * as comparison from "../../src/comparison.js";
import { freshR } from "../../src/app-shell.js";

const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, (msg || "") + " expected " + b + ", got " + a);

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

test("directional pitch answers step the center; the second settle enters A/B", () => {
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
  assert.equal(second.obj.round, 1);
  assert.equal(second.obj.uncertain, 0);
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

test("the pair straddles the center and a pick halves the spread onto it", () => {
  const r = { ...freshR(), phase: "pitch", center: .58, level: .46, spread: .26, round: 2 };
  const { A, B } = comparison.pairSpecs(r);
  close(A.pitch, .45);
  close(B.pitch, .71);
  assert.equal(A.level, .46);

  const res = comparison.pick(r, A.pitch);
  assert.equal(res.kind, "patch");
  close(res.patch.center, .45);
  close(res.patch.spread, .156);
  assert.equal(res.patch.round, 3);
  assert.equal(res.patch.uncertain, 0, "a decisive pick clears the uncertain streak");
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
