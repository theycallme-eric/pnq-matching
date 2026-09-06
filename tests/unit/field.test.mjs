import test from "node:test";
import assert from "node:assert/strict";
import * as field from "../../src/field.js";
import { freshD, backTarget, initialState, keepRefiningTarget, stageState } from "../../src/app-shell.js";

const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, (msg || "") + " expected " + b + ", got " + a);

test("the marker maps horizontal to pitch and vertical to a capped volume", () => {
  const top = field.dSpec({ ...freshD(), x: .25, y: 0 });
  assert.equal(top.kind, "tone");
  close(top.pitch, .25);
  close(top.level, field.DVOL.max, "the top edge is the moderate ceiling");

  const bottom = field.dSpec({ ...freshD(), x: .9, y: 1 });
  close(bottom.pitch, .9);
  close(bottom.level, field.DVOL.min, "the bottom edge stays audible");

  assert.ok(field.DVOL.max <= .68, "the ceiling stops well short of full output");
});

test("zoom windows center on the chosen region and clamp inside the field", () => {
  close(field.dWindow(freshD()).span, 1, "level 0 shows the whole space");

  const mid = field.dWindow({ ...freshD(), level: 1, cx: .5, cy: .5 });
  close(mid.span, .38);
  close(mid.x0, .31);
  close(mid.y0, .31);

  const edge = field.dWindow({ ...freshD(), level: 1, cx: .02, cy: .98 });
  close(edge.x0, 0, "clamped at the left edge");
  close(edge.y0, 1 - .38, "clamped at the bottom edge");
});

test("dragging clamps into the visible window, so zoom cannot break the ceiling", () => {
  const whole = field.dragPoint({ x0: 0, y0: 0, span: 1 }, 1.4, -.3);
  close(whole.x, 1);
  close(whole.y, 0, "dragging past the top pins the marker at the ceiling");

  const win = field.dWindow({ ...freshD(), level: 1, cx: .5, cy: .5 });
  const p = field.dragPoint(win, .5, 0);
  close(p.x, .5);
  close(p.y, win.y0, "a zoomed drag stays inside its window");
});

test("the decorative grid layer scales with the zoom level", () => {
  const broad = field.view(freshD());
  close(broad.scale, 1);
  assert.equal(broad.origin, "50% 50%");
  assert.equal(broad.title, "Move around and listen");
  assert.equal(broad.level, 0);
  assert.ok(broad.hasNext);
  close(broad.regFrac, .38, "the preview box shows the next window's share");

  const zoomed = field.view({ ...freshD(), level: 1, cx: .5, cy: .5, x: .5, y: .5 });
  close(zoomed.scale, +(1 / .38).toFixed(4));
  assert.equal(zoomed.title, "Look closely at this area");
  close(zoomed.regFrac, .15 / .38);

  const last = field.view({ ...freshD(), level: 2, cx: .5, cy: .5, x: .5, y: .5 });
  assert.equal(last.title, "Closer still");
  assert.equal(last.hasNext, false, "the last level has no next window");
});

test("hues and grid are decorative tokens, one per refinement level", () => {
  assert.equal(field.GRID.length, 25);
  assert.notEqual(field.hueOf(0).base, field.hueOf(1).base);
  assert.match(field.fieldBg(1), /^linear-gradient\(180deg,color-mix/);
  assert.match(field.tint("var(--blue-500)", 24), /color-mix\(in srgb, var\(--blue-500\) 24%, transparent\)/);
});

test("advancing requires the sound to have been heard, then zooms in on the marker", () => {
  const unheard = field.advance(freshD());
  assert.equal(unheard.kind, "patch");
  assert.match(unheard.patch.note, /Press play first/);

  const d = { ...freshD(), heard: true, x: .68, y: .44 };
  const first = field.advance(d);
  assert.equal(first.kind, "zoom");
  close(first.obj.cx, .68, "the zoom recenters on the chosen region");
  close(first.obj.cy, .44);
  assert.equal(first.obj.level, 1);
  assert.equal(first.obj.heard, false, "each zoom level must be played before judgment");

  const second = field.advance({ ...d, level: 1 });
  assert.equal(second.kind, "zoom");
  assert.equal(second.obj.level, 2);

  const last = field.advance({ ...d, level: 2 });
  assert.equal(last.kind, "conf", "the participant confirms; nothing is computed");
});

test("escapes reassure without error framing and leave the stage runnable", () => {
  const note = field.noHear().note;
  assert.match(note, /okay, and worth telling us/);
  assert.match(note, /moving the marker higher/);
  assert.doesNotMatch(note, /error|wrong|fail/i);

  assert.match(field.zoomOutNote(1), /whole range/);
  assert.match(field.zoomOutNote(2), /one step/);
});

test("Back steps out one zoom level before it steps back a stage", () => {
  const s = { ...initialState(), screen: "flow", concept: "d" };
  s.stages = { ...s.stages, d: "zoom" };
  s.d = { ...freshD(), level: 2 };
  assert.deepEqual(backTarget(s), { kind: "zoomOut", stage: "zoom", level: 1 });
  s.d = { ...freshD(), level: 1 };
  assert.deepEqual(backTarget(s), { kind: "zoomOut", stage: "field", level: 0 });
  s.stages = { ...s.stages, d: "field" };
  s.d = freshD();
  assert.equal(backTarget(s).kind, "screen");
});

test("field refinement changes hard-stop the playing voice", () => {
  const s = { ...initialState(), screen: "flow", concept: "d", playKey: "dfield" };
  const next = stageState(s, "d", "zoom", { cx: .6, cy: .4, level: 1, zoomed: true, heard: false });
  assert.equal(next.playKey, null, "the tone stops across the jump");
  assert.equal(next.stages.d, "zoom");
  assert.equal(next.d.level, 1);
  assert.equal(next.d.heard, false);
  assert.equal(next.d.note, "");
});

test("keep refining re-enters the field zoomed on the confirmed marker", () => {
  const s = { ...initialState(), concept: "d" };
  s.d = { ...freshD(), heard: true, x: .68, y: .44, level: 2, conf: "Not close yet" };
  const t = keepRefiningTarget(s);
  assert.equal(t.stage, "zoom");
  close(t.obj.cx, .68);
  close(t.obj.cy, .44);
  assert.equal(t.obj.heard, false, "returning from Confidence must be replayed");
  assert.equal(t.obj.conf, null, "returning to Confidence asks again");
});
