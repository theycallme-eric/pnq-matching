import { test } from "node:test";
import assert from "node:assert/strict";
import * as pres from "../../src/preserved.js";
import { freshA, freshL, freshT, STAGES } from "../../src/app-shell.js";

test("adaptive: directional answers move the estimate and shrink uncertainty", () => {
  const a = freshA();
  const p = pres.aResp(a, "higher", () => .5);
  assert.equal(p.est, .725);
  assert.equal(p.unc, .425);
  assert.equal(p.closes, 0);
  // rand of .5 keeps the candidate exactly on the estimate
  assert.equal(p.cand, p.est);
  const q = pres.aResp(a, "lower", () => .5);
  assert.equal(q.est, .275);
});

test("adaptive: 'not like mine' cycles kinds in fixed order and restarts wide", () => {
  let a = freshA();
  const order = [];
  for (let i = 0; i < 5; i++) {
    const p = pres.aResp(a, "notmine", () => .5);
    order.push(p.kind);
    assert.equal(p.unc, .5);
    assert.equal(p.est, .5);
    assert.equal(p.closes, 0);
    a = { ...a, ...p };
  }
  assert.deepEqual(order, ["hiss", "buzz", "click", "tone", "hiss"]);
});

test("adaptive: repeated settled answers reach loudness, then suggest the final check", () => {
  let a = freshA();
  a = { ...a, ...pres.aResp(a, "close", () => .5) };
  assert.equal(a.phase, "pitch");
  assert.equal(a.closes, 1);
  a = { ...a, ...pres.aResp(a, "close", () => .5) };
  assert.equal(a.phase, "loud");
  assert.equal(a.msg, "Pitch feels settled. Now, how loud is yours compared with this?");
  a = { ...a, ...pres.aResp(a, "right") };
  assert.equal(a.lcloses, 1);
  assert.equal(a.suggest, false);
  a = { ...a, ...pres.aResp(a, "right") };
  assert.equal(a.lcloses, 2);
  assert.equal(a.suggest, true);
  assert.equal(a.msg, "Your answers have settled.");
});

test("adaptive: the escape raises the level, reassures, and stays in the loop", () => {
  const p = pres.aResp(freshA(), "nohear", () => .5);
  assert.equal(p.level, .57);
  assert.equal(p.msg, "We made it a little easier to hear. Try again.");
  const capped = pres.aResp({ ...freshA(), level: .8 }, "nohear", () => .5);
  assert.equal(capped.level, .85);
});

test("adaptive: candidate plays while listening in pitch; the estimate elsewhere", () => {
  const a = { ...freshA(), est: .6, cand: .52 };
  assert.equal(pres.aSpec(a, "listen").pitch, .52);
  assert.equal(pres.aSpec(a, "chal").pitch, .6);
  assert.equal(pres.aSpec({ ...a, phase: "loud" }, "listen").pitch, .6);
  const { A, B } = pres.aChalSpecs(a);
  assert.equal(A.pitch, .6);
  assert.ok(Math.abs(B.pitch - .64) < 1e-9);
});

test("longitudinal: the 6-day-old prior seeds the comparison, sound 2 exactly on it", () => {
  const l = freshL();
  assert.deepEqual(l.prior, { kind: "tone", pitch: .68, level: .42 });
  assert.equal(l.pitch, .68);
  assert.equal(l.level, .42);
  const { A, B } = pres.lPriorSpecs(l);
  assert.equal(B.pitch, .68);
  assert.equal(B.level, .42);
  assert.ok(Math.abs(A.pitch - .61) < 1e-9);
});

test("education: field position maps to kind, behavior patches, hedged words", () => {
  assert.equal(pres.fieldSpec({ x: .5, y: .1 }).kind, "tone");
  assert.equal(pres.fieldSpec({ x: .5, y: .5 }).kind, "buzz");
  assert.equal(pres.fieldSpec({ x: .5, y: .9 }).kind, "hiss");
  const withB = pres.fieldSpec({ x: .5, y: .5, behavior: "Clicking or chirping" }, true);
  assert.equal(withB.kind, "click");
  assert.equal(withB.rate, .6);
  assert.equal(pres.FIELDWORD(.1), "more tone-like");
  assert.equal(pres.FIELDPITCH(.9), "higher");
});

test("education: the zoom window clamps to the field; STAGES.t has no confidence step", () => {
  const w = pres.fieldWindow({ ...freshT(), cx: 0, cy: 1 }, "zoom");
  assert.equal(w.x0, 0);
  assert.ok(Math.abs(w.y0 - .66) < 1e-9);
  assert.equal(pres.fieldWindow(freshT(), "field").span, 1);
  assert.deepEqual(STAGES.t.map((z) => z[0]), ["field", "zoom", "behave", "recap"]);
  assert.deepEqual(STAGES.a.map((z) => z[0]), ["intro", "listen", "chal", "conf", "done"]);
  assert.deepEqual(STAGES.l.map((z) => z[0]), ["ret", "check", "prior", "refine", "reopen", "done"]);
});
