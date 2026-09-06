import test from "node:test";
import assert from "node:assert/strict";
import * as nar from "../../src/narrowing.js";
import { freshN } from "../../src/app-shell.js";

const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, (msg || "") + " expected " + b + ", got " + a);

test("the stage order is fixed: vol, p1, p2, p3, then shared confidence", () => {
  assert.deepEqual(nar.PASS_STAGES, ["vol", "p1", "p2", "p3"]);
  assert.deepEqual(nar.NEXT, { vol: "p1", p1: "p2", p2: "p3", p3: "conf" });
});

test("the window tightens per pass around the center and clamps at the edges", () => {
  const n = { ...freshN(), pitch: .7, center: .7 };
  const p1 = nar.windowOf("p1", n);
  close(p1.hw, .5); close(p1.span, 1); close(p1.edge, 0, "coarse shows the whole range");
  close(p1.pos, .7);

  const p2 = nar.windowOf("p2", n);
  close(p2.hw, .16); close(p2.span, .32); close(p2.edge, .54);
  close(p2.pos, .5, "the choice sits centered in the tightened window");

  const p3 = nar.windowOf("p3", n);
  close(p3.hw, .05); close(p3.span, .1); close(p3.edge, .65);

  const hi = nar.windowOf("p2", { ...n, pitch: .97, center: .97 });
  close(hi.edge, .68, "edge clamps so the window stays inside 0..1");
});

test("extra fine passes shrink the half-width by .6 each", () => {
  const n = { ...freshN(), pitch: .5, center: .5, extra: 2 };
  close(nar.windowOf("p3", n).hw, .05 * .36);
});

test("ticks never move: the layer scales and offsets instead", () => {
  assert.equal(nar.NTICKS.length, 26);
  assert.equal(nar.NTICKS[0], "0%");
  assert.equal(nar.NTICKS[25], "100%");

  const whole = nar.tickLayer(nar.windowOf("p1", { ...freshN(), center: .5 }));
  assert.equal(whole.width, "100.00%");

  const n = { ...freshN(), pitch: .7, center: .7 };
  const p2 = nar.tickLayer(nar.windowOf("p2", n));
  assert.equal(p2.width, "312.50%");
  assert.equal(p2.left, "-168.75%");
  const p3 = nar.tickLayer(nar.windowOf("p3", n));
  assert.equal(p3.width, "1000.00%");
  assert.equal(p3.left, "-650.00%");
});

test("the fine slider maps into the window; step buttons nudge by 16% of half-width", () => {
  const n = { ...freshN(), pitch: .7, center: .7 };
  const win = nar.windowOf("p2", n);
  close(nar.slidePitch(win, 0).pitch, .54);
  close(nar.slidePitch(win, 100).pitch, .86);
  close(nar.slidePitch(win, 50).pitch, .7);
  close(nar.stepPitch(n, win, 1).pitch, .7 + .16 * .16);
  close(nar.stepPitch(n, win, -1).pitch, .7 - .16 * .16);
  close(nar.stepPitch({ ...n, pitch: .999 }, win, 1).pitch, 1, "steps clamp at the range ends");
});

test("signing off recenters the next window live; the last pass ends in confidence", () => {
  const n = { ...freshN(), pitch: .62 };
  const fromVol = nar.advance("vol", n);
  assert.deepEqual(fromVol, { kind: "live", stage: "p1", obj: { center: .62 } });
  assert.deepEqual(nar.advance("p1", n).stage, "p2");
  const last = nar.advance("p3", n);
  assert.equal(last.kind, "stage");
  assert.equal(last.stage, "conf");
});

test("keep fine-tuning adds a narrower pass around the current choice", () => {
  const p = nar.keepGoing({ ...freshN(), pitch: .58, extra: 1 });
  assert.equal(p.extra, 2);
  close(p.center, .58);
  assert.match(p.note, /Another pass, narrower again/);
});

test("the can't-hear escape raises the level, reassures, and stays runnable", () => {
  const p = nar.noHear({ ...freshN(), level: .4 });
  close(p.level, .52);
  assert.equal(p.note, "That’s okay. We made the sound a little easier to hear. Press play and try again.");
  close(nar.noHear({ ...freshN(), level: .8 }).level, .85, "the raise caps below full level");
});

test("wider range reopens the coarse pass around the choice with its note", () => {
  const r = nar.widen({ ...freshN(), pitch: .3, extra: 2, widened: 1 });
  assert.equal(r.stage, "p1");
  assert.equal(r.obj.extra, 0);
  close(r.obj.center, .3);
  assert.equal(r.obj.widened, 2);
  assert.match(r.obj.note, /widened the pitch range again/);
});

test("per-pass copy matches the prototype", () => {
  assert.equal(nar.passTitle("vol", freshN()), "Start with how loud it is");
  assert.equal(nar.passTitle("p3", freshN()), "Small adjustments now");
  assert.equal(nar.passTitle("p3", { ...freshN(), extra: 1 }), "Closer still");
  assert.equal(nar.PRIMARY.p3, "This matches what I hear");
  assert.match(nar.passBody("p1"), /two closer passes follow/);
});
