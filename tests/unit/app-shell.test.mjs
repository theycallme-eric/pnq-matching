/*
 * Unit tests for src/app-shell.js (REQ-001, REQ-020): fresh factories,
 * persistence whitelist and reload behavior, resetAll, screen labels,
 * conditional Back, framed/bare measurement, and the playKey-null invariant
 * on every navigation reducer (paired with the engine hard stop).
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as shell from "../../src/app-shell.js";

test("fresh factories seed the V5 values and never share state between runs", () => {
  assert.deepEqual(shell.freshN(), { pitch: .5, level: .4, center: .5, lo: .34, hi: .66, extra: 0, widened: 0, note: "", conf: null, closeEnough: false });
  assert.equal(shell.freshR().phase, "vol");
  assert.equal(shell.freshR().spread, .28);
  assert.deepEqual(shell.freshD(), { x: .5, y: .5, cx: .5, cy: .5, level: 0, heard: false, zoomed: false, note: "", conf: null });
  assert.equal(shell.freshA().kind, "tone");
  assert.equal(shell.freshT().y, .38);
  assert.equal(shell.freshL().prior.pitch, .68);
  const a = shell.freshN();
  a.pitch = .9;
  assert.equal(shell.freshN().pitch, .5, "each call returns a new object");
});

test("state machine covers the V5 screens, concepts and per-concept stages", () => {
  assert.deepEqual(shell.SCREENS, ["launch", "ear", "setup", "home", "edu", "flow"]);
  assert.deepEqual(shell.CONCEPT_IDS, ["n", "r", "d", "f", "a", "l", "t"]);
  const st = shell.initialState();
  assert.equal(st.screen, "launch");
  assert.deepEqual(st.stages, { n: "vol", f: "intro", r: "dir", d: "field", a: "listen", l: "ret", t: "field" });
  assert.equal(st.playKey, null);
  for (const c of shell.CONCEPT_IDS) assert.ok(shell.STAGES[c].length > 0, c + " has stages");
});

test("persistShape stores only the whitelist - no identifiers, no per-answer data", () => {
  const st = shell.initialState();
  st.n.pitch = .77;
  st.playKey = "main";
  const shape = shell.persistShape(st);
  assert.deepEqual(Object.keys(shape).sort(), [...shell.PERSIST_KEYS].sort());
  assert.deepEqual(shell.PERSIST_KEYS, ["ear", "hp", "vol", "setupSeen", "eduSeen", "optDone", "optOrder"]);
  const raw = JSON.stringify(shape);
  assert.ok(!raw.includes("playKey") && !raw.includes("pitch"), "no flow or playback state persisted");
});

test("reload mid-session restores setup/progress and lands on Matching options", () => {
  const saved = JSON.stringify({ ear: "Left ear", hp: true, vol: 100, setupSeen: true, eduSeen: true, optDone: { n: "Very close" }, optOrder: ["n"] });
  const r = shell.restoreSession(saved);
  assert.equal(r.screen, "home", "mid-session reload returns to the hub, not the cover");
  assert.equal(r.ear, "Left ear");
  assert.equal(r.optDone.n, "Very close");
  assert.ok(!("n" in r), "per-answer state is not restored; fresh factories reseed it");
  assert.equal(shell.restoreSession(null), null);
  assert.equal(shell.restoreSession("{nope"), null);
  assert.equal(shell.restoreSession(JSON.stringify({})).screen, "launch", "an untouched session still starts at Launch");
});

test("resetAll returns the app to first-run Launch state with fresh options", () => {
  let st = shell.initialState();
  st = shell.openOptionState(st, "n");
  st = shell.stageState(st, "n", "p2", { pitch: .9 });
  st = { ...st, setupSeen: true, eduSeen: true, hp: true, vol: 100, ear: "Left ear", playKey: "main" };
  const r = shell.resetAllState(st);
  assert.equal(r.screen, "launch");
  assert.equal(r.playKey, null);
  assert.equal(r.setupSeen, false);
  assert.equal(r.eduSeen, false);
  assert.deepEqual(r.optDone, {});
  assert.deepEqual(r.optOrder, []);
  assert.deepEqual(r.n, shell.freshN());
  assert.equal(r.stages.n, "vol");
  assert.equal(shell.STORAGE_KEY, "pnq-mtp-v1");
});

test("opening or restarting an option reseeds working state from its fresh factory", () => {
  let st = shell.initialState();
  st = shell.openOptionState(st, "n");
  assert.equal(st.screen, "flow");
  assert.equal(st.stages.n, "vol", "opens at the option's first working stage");
  st = shell.stageState(st, "n", "p3", { pitch: .91, extra: 2 });
  const again = shell.openOptionState(st, "n");
  assert.deepEqual(again.n, shell.freshN(), "restart never inherits a previous run's position");
  assert.deepEqual(again.optOrder, ["n"], "optOrder records each option once");
  const seeded = shell.openOptionState(st, "n", "p2", { ...shell.freshN(), center: .5, level: .44 });
  assert.equal(seeded.stages.n, "p2");
  assert.equal(seeded.n.level, .44);
});

test("every navigation reducer clears playKey so the hard stop leaves silence", () => {
  const playing = { ...shell.initialState(), playKey: "main" };
  assert.equal(shell.goScreenState(playing, "home").playKey, null);
  assert.equal(shell.openOptionState(playing, "r").playKey, null);
  assert.equal(shell.jumpState(playing, "t", "field", shell.freshT()).playKey, null);
  assert.equal(shell.stageState(playing, "n", "p1").playKey, null);
  assert.equal(shell.resetAllState(playing).playKey, null);
});

test("screen roots carry the exact V5 data-screen-label values", () => {
  assert.equal(shell.screenLabelOf("launch"), "Launch");
  assert.equal(shell.screenLabelOf("ear"), "Setup · Ear");
  assert.equal(shell.screenLabelOf("setup"), "Setup · Headphones and volume");
  assert.equal(shell.screenLabelOf("home"), "Matching options");
  assert.equal(shell.screenLabelOf("edu"), "Shared · What to listen for");
  assert.equal(shell.screenLabelOf("flow", "n", "p2"), "Narrowing · Refinement pass");
  assert.equal(shell.screenLabelOf("flow", "d", "field"), "Field · Pitch and volume");
  assert.equal(shell.screenLabelOf("flow", "n", "intro"), "Narrowing · Prepare");
  assert.equal(shell.screenLabelOf("flow", "r", "comp"), "Shared · Two-sound comparison");
  assert.equal(shell.screenLabelOf("flow", "n", "conf"), "Shared · Confidence");
  assert.equal(shell.screenLabelOf("flow", "n", "done"), "Shared · Match complete");
  assert.equal(shell.screenLabelOf("flow", "t", "zoom"), "Education · Sound exploration");
  assert.equal(shell.screenLabelOf("flow", "l", "ret"), "Longitudinal · Welcome back");
});

test("Back renders only where the prototype shows it and targets what it targets", () => {
  const st = shell.initialState();
  assert.equal(shell.navShow({ ...st, screen: "launch" }), false);
  assert.equal(shell.navShow({ ...st, screen: "home" }), false);
  assert.equal(shell.navShow({ ...st, screen: "setup" }), true);
  assert.equal(shell.navShow({ ...st, screen: "edu" }), true);
  const flowAt = (c, stage) => ({ ...st, screen: "flow", concept: c, stages: { ...st.stages, [c]: stage } });
  assert.equal(shell.navShow(flowAt("n", "intro")), false, "no Back on Prepare");
  assert.equal(shell.navShow(flowAt("l", "ret")), false);
  assert.equal(shell.navShow(flowAt("n", "vol")), true);
  assert.deepEqual(shell.backTarget({ ...st, screen: "setup" }), { kind: "screen", screen: "home" });
  assert.deepEqual(shell.backTarget({ ...st, screen: "edu" }), { kind: "screen", screen: "home" });
  assert.deepEqual(shell.backTarget(flowAt("n", "vol")), { kind: "screen", screen: "home" }, "first working stage goes home");
  assert.deepEqual(shell.backTarget(flowAt("n", "p2")), { kind: "stage", stage: "p1" });
  const zoomed = { ...flowAt("d", "zoom"), d: { ...shell.freshD(), level: 1 } };
  assert.deepEqual(shell.backTarget(zoomed), { kind: "zoomOut", stage: "field", level: 0 }, "zoom steps out before stages step back");
});

test("measure(): >=620px is the framed 390x844 device, narrower is bare fullscreen", () => {
  const wide = shell.measure(1024, 800);
  assert.equal(wide.framed, true);
  assert.equal(wide.devScale, Math.round(Math.min(980 / 390, 756 / 844, 1) * 1000) / 1000);
  const exact = shell.measure(620, 900);
  assert.equal(exact.framed, true);
  const narrow = shell.measure(390, 700);
  assert.equal(narrow.framed, false);
  assert.equal(narrow.devScale, 1, "bare mode never scales");
  assert.equal(shell.measure(619, 2000).framed, false);
  assert.ok(shell.measure(9999, 90).devScale >= .4, "scale floor holds");
});

test("progress header shows on flow stages that define it, hidden elsewhere", () => {
  const st = shell.initialState();
  assert.equal(shell.progress("n", "intro", st).show, false);
  assert.equal(shell.progress("n", "conf", st).show, false);
  assert.equal(shell.progress("t", "field", st).show, false, "education field has no progress");
  const vol = shell.progress("n", "vol", st);
  assert.deepEqual([vol.show, vol.lbl, vol.phase], [true, "MATCHING YOUR SOUND", "VOLUME"]);
  const p2 = shell.progress("n", "p2", st);
  assert.equal(p2.phase, "PITCH 2 OF 3");
  assert.equal(p2.w, "75%");
  const dz = shell.progress("d", "zoom", st);
  assert.deepEqual([dz.lbl, dz.w, dz.phase], ["FINDING YOUR SOUND", "80%", "CLOSER"]);
});

test("regression: with playKey null the engine reports nothing audible", async () => {
  // Minimal mocked AudioContext so the engine builds a graph in Node.
  class P { constructor(v) { this.value = v; } cancelScheduledValues() {} setValueAtTime(v) { this.value = v; } linearRampToValueAtTime(v) { this.value = v; } setTargetAtTime(v) { this.value = v; } }
  const sources = [];
  class Ctx {
    constructor() { this.state = "running"; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; }
    resume() {}
    createGain() { return { gain: new P(1), connect() {}, disconnect() {} }; }
    createStereoPanner() { return { pan: new P(0), connect() {}, disconnect() {} }; }
    createOscillator() { const n = { type: "sine", frequency: new P(440), connect() {}, disconnect() {}, started: false, stoppedAt: null, start() { this.started = true; }, stop(t) { this.stoppedAt = t ?? 0; } }; sources.push(n); return n; }
    createBufferSource() { const n = { buffer: null, loop: false, connect() {}, disconnect() {}, started: false, stoppedAt: null, start() { this.started = true; }, stop(t) { this.stoppedAt = t ?? 0; } }; sources.push(n); return n; }
    createBiquadFilter() { return { type: "lowpass", frequency: new P(350), Q: new P(1), connect() {}, disconnect() {} }; }
    createBuffer(ch, len, sr) { return { getChannelData() { return new Float32Array(len); } }; }
  }
  globalThis.window = globalThis.window || {};
  globalThis.window.AudioContext = Ctx;
  const engine = await import("../../src/audio-engine.js");
  engine.play("main", [{ kind: "tone", pitch: .5, level: .4, bright: 0 }]);
  assert.equal(engine.playingKey(), "main");
  // The shell reducer clears playKey; componentDidUpdate pairs that with stop().
  const next = shell.goScreenState({ ...shell.initialState(), playKey: "main" }, "home");
  assert.equal(next.playKey, null);
  if (next.playKey === null && engine.playingKey() !== null) engine.stop();
  assert.equal(engine.playingKey(), null, "playKey null => no owner");
  for (const s of sources.filter((x) => x.started)) {
    assert.notEqual(s.stoppedAt, null, "every started voice received stop()");
  }
});
