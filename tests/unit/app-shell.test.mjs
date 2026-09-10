/*
 * Unit tests for src/app-shell.js (REQ-001, REQ-006, REQ-011, REQ-020): shell
 * journey, participant-controlled option selection, persistence allowlist and
 * safe reload behavior, resetAll, screen labels, conditional Back,
 * framed/bare measurement, and the playKey-null navigation invariant.
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

test("initial state starts at the first-run splash with fresh shell and option state", () => {
  assert.deepEqual(shell.SCREENS, ["launch", "account", "dashboard", "ear", "setup", "edu", "home", "flow", "conclusion"]);
  assert.deepEqual(shell.CONCEPT_IDS, ["n", "r", "d", "f", "a", "l", "t"]);
  const st = shell.initialState();
  assert.equal(st.screen, "launch");
  assert.equal(st.onboardingSeen, false);
  assert.equal(st.earSeen, false);
  assert.equal(st.onboardingInput, "");
  assert.deepEqual(st.stages, { n: "vol", f: "intro", r: "dir", d: "field", a: "listen", l: "ret", t: "field" });
  assert.equal(st.playKey, null);
  assert.deepEqual(st.optDone, {});
  assert.deepEqual(st.optOrder, []);
  for (const c of shell.CONCEPT_IDS) assert.ok(shell.STAGES[c].length > 0, c + " has stages");
});

test("the shared selector exposes exactly three neutral options after headphone setup", () => {
  assert.deepEqual(shell.OPTORDER, ["n", "r", "d"]);
  assert.deepEqual(shell.OPTORDER.map((cid) => shell.OPTLABEL[cid]), ["Option 1", "Option 2", "Option 3"]);

  const state = shell.initialState();
  assert.equal(shell.optionSelectionReady(state), false);
  assert.equal(shell.optionSelectionReady({ ...state, setupSeen: true }), true);
  assert.equal(shell.optionSelectionReady({ ...state, eduSeen: true }), false);
  assert.equal(shell.optionSelectionReady({ ...state, setupSeen: true, eduSeen: true }), true);
});

test("persistShape stores only non-identifying gates and neutral option completion", () => {
  const st = shell.initialState();
  st.onboardingSeen = true;
  st.earSeen = true;
  st.ear = "Left ear";
  st.hp = true;
  st.vol = 100;
  st.onboardingInput = "SIMULATED-RX-123";
  st.n.pitch = .77;
  st.n.conf = "Very close";
  st.playKey = "main";
  st.optDone = { n: "Very close", r: true, f: "research response" };
  st.optOrder = ["n", "n", "bogus", "r", "d", "r"];
  const shape = shell.persistShape(st);
  assert.deepEqual(Object.keys(shape).sort(), [...shell.PERSIST_KEYS].sort());
  assert.deepEqual(shell.PERSIST_KEYS, ["onboardingSeen", "earSeen", "setupSeen", "eduSeen", "optDone", "optOrder"]);
  assert.deepEqual(shape.optDone, { n: true, r: true });
  assert.deepEqual(shape.optOrder, ["n", "r"], "order contains completed option ids once");
  const raw = JSON.stringify(shape);
  for (const forbidden of ["Left ear", "hp", "vol", "SIMULATED-RX-123", "Very close", "pitch", "playKey", "research response"]) {
    assert.ok(!raw.includes(forbidden), forbidden + " is not persisted");
  }
});

test("reload chooses splash, dashboard, the next session gate, or the option selector and never restores working state", () => {
  const preOnboarding = shell.restoreSession(JSON.stringify({ onboardingSeen: false, setupSeen: true, optDone: { n: true } }));
  assert.equal(preOnboarding.screen, "launch", "onboarding is the outer restore boundary");
  assert.deepEqual(preOnboarding.optDone, {});

  const dashboard = shell.restoreSession(JSON.stringify({ onboardingSeen: true }));
  assert.equal(dashboard.screen, "dashboard", "onboarding without an active session returns to the dashboard");

  const afterEar = shell.restoreSession(JSON.stringify({ onboardingSeen: true, earSeen: true }));
  assert.equal(afterEar.screen, "setup", "ear completion resumes at device setup, not the selector");
  const afterSetup = shell.restoreSession(JSON.stringify({ onboardingSeen: true, earSeen: true, setupSeen: true }));
  assert.equal(afterSetup.screen, "home", "device completion resumes at the matching-options sheet");

  const saved = JSON.stringify({ onboardingSeen: true, earSeen: true, setupSeen: true, eduSeen: true, optDone: { n: "Very close" }, optOrder: ["n", "n"] });
  const r = shell.restoreSession(saved);
  assert.equal(r.screen, "home", "session progress returns to the option selector");
  assert.equal(r.ear, "");
  assert.equal(r.hp, false);
  assert.equal(r.vol, 36);
  assert.equal(r.playKey, null);
  assert.deepEqual(r.optDone, { n: true });
  assert.deepEqual(r.optOrder, ["n"]);
  assert.deepEqual(r.n, shell.freshN(), "per-option working state is fresh");
  assert.equal(shell.restoreSession(null), null);
});

test("malformed, unknown, and hostile stored values fail safely without audio", () => {
  for (const raw of ["{nope", "null", "[]", JSON.stringify({ unknown: { playKey: "main" } })]) {
    const restored = shell.restoreSession(raw);
    assert.ok(restored === null || shell.SCREENS.includes(restored.screen));
    if (restored) {
      assert.equal(restored.screen, "launch");
      assert.equal(restored.playKey, null);
    }
  }
  const dirty = shell.restoreSession(JSON.stringify({
    onboardingSeen: true, earSeen: "yes", setupSeen: 1, eduSeen: true,
    optDone: { n: true, r: false, d: { confidence: "raw" }, __proto__: true },
    optOrder: ["d", "n", "d", "f", null], playKey: "main", n: { pitch: .99 }
  }));
  assert.equal(dirty.screen, "ear", "inconsistent later progress cannot bypass the missing ear gate");
  assert.equal(dirty.earSeen, false, "gate values require real booleans");
  assert.equal(dirty.setupSeen, false);
  assert.deepEqual(dirty.optDone, { n: true });
  assert.deepEqual(dirty.optOrder, ["n"]);
  assert.equal(dirty.playKey, null);
  assert.deepEqual(dirty.n, shell.freshN());
});

test("resetAll returns every shell and option value to first-run splash state", () => {
  let st = shell.initialState();
  st = shell.openOptionState(st, "n");
  st = shell.stageState(st, "n", "p2", { pitch: .9 });
  st = {
    ...st, screen: "conclusion", onboardingSeen: true, earSeen: true, onboardingInput: "SIM-123",
    setupSeen: true, eduSeen: true, hp: true, vol: 100, ear: "Left ear", playKey: "main",
    menuOpen: true, jumpOpen: true, menuStopped: true, setupWarn: true, earWarn: true,
    optDone: { n: true, r: true, d: true }, optOrder: ["n", "r", "d"]
  };
  const r = shell.resetAllState(st);
  assert.deepEqual(r, shell.initialState());
  assert.equal(shell.STORAGE_KEY, "pnq-mtp-v1");
});

test("shell journey preserves participant-selected completion order without auto-advancing", () => {
  let st = shell.initialState();
  st = shell.advanceShellState(st);
  assert.equal(st.screen, "account");
  st = shell.advanceShellState({ ...st, onboardingInput: "PNQ-RX-4821" });
  assert.equal(st.screen, "dashboard");
  assert.equal(st.onboardingSeen, true);
  assert.equal(st.onboardingInput, "");
  st = shell.advanceShellState(st);
  assert.equal(st.screen, "ear");
  st = shell.advanceShellState({ ...st, ear: "Both ears" });
  assert.equal(st.screen, "setup");
  assert.equal(st.earSeen, true);
  st = shell.advanceShellState({ ...st, hp: true, vol: 100 });
  assert.equal(st.screen, "home");
  assert.equal(st.setupSeen, true);
  assert.equal(st.eduSeen, false);
  assert.equal(st.hp, true);
  assert.equal(st.vol, 100);
  for (const [cid, expectedOrder] of [["d", ["d"]], ["n", ["d", "n"]]]) {
    st = shell.openOptionState(st, cid);
    assert.equal(st.screen, "flow");
    assert.equal(st.concept, cid);
    st = shell.completeOptionState(st);
    assert.equal(st.screen, "home", "an unfinished session returns to the shared selector");
    assert.deepEqual(st.optOrder, expectedOrder);
    assert.equal(st.optDone[cid], true);
  }
  st = shell.completeOptionState(shell.openOptionState(st, "r"));
  assert.equal(st.screen, "conclusion");
  assert.deepEqual(st.optOrder, ["d", "n", "r"]);
  assert.deepEqual(st.optDone, { n: true, r: true, d: true });

  const completedAgain = shell.completeOptionState(shell.openOptionState(st, "d"));
  assert.deepEqual(completedAgain.optOrder, ["d", "n", "r"], "recompletion never duplicates or reorders a marker");
});

test("opening or restarting each option resets only that option and retains Done state", () => {
  const st = {
    ...shell.initialState(), screen: "home",
    optDone: { n: true, r: true, d: true }, optOrder: ["r", "d", "n"],
    n: { ...shell.freshN(), pitch: .91, extra: 2 },
    r: { ...shell.freshR(), spread: .05, round: 8 },
    d: { ...shell.freshD(), x: .88, y: .12, zoomed: true }
  };

  for (const cid of shell.OPTORDER) {
    const otherIds = shell.OPTORDER.filter((other) => other !== cid);
    const again = shell.openOptionState(st, cid);
    assert.equal(again.screen, "flow");
    assert.equal(again.concept, cid);
    assert.equal(again.stages[cid], shell.OPTFIRST[cid]);
    assert.deepEqual(again[cid], shell.freshFor(cid), cid + " restarts from its current V5 factory");
    for (const other of otherIds) assert.deepEqual(again[other], st[other], other + " is not reset");
    assert.deepEqual(again.optDone, st.optDone);
    assert.deepEqual(again.optOrder, st.optOrder);
  }

  const seeded = shell.openOptionState(st, "n", "p2", { ...shell.freshN(), center: .5, level: .44 });
  assert.equal(seeded.stages.n, "p2");
  assert.equal(seeded.n.level, .44);
});

test("moderator jump targets mirror V5's stage jumps plus its scenario presets", () => {
  assert.deepEqual(shell.jumpStages("n").map((j) => j.label), [
    "Volume", "Pitch · coarse", "Pitch · medium", "Pitch · fine", "Confidence",
    "Extended · 5 passes", "“Didn’t hear anything”", "Recovered · widened", "Low confidence", "High confidence"
  ]);
  assert.deepEqual(shell.jumpStages("r").map((j) => j.label), [
    "Directional · volume", "Directional · pitch", "A/B comparisons", "A/B · near the floor", "A/B · long session", "Confidence",
    "Steps converging", "A/B · early", "A/B · nearly identical", "“Neither is close”", "Bounced back to directions", "Long session · fatigue"
  ]);
  assert.deepEqual(shell.jumpStages("d").map((j) => j.label), [
    "Whole field", "Closer look", "Closer look · closest", "Confidence",
    "Heard it · exploring", "Edge of the range", "“Didn’t hear anything”", "Low confidence", "High confidence"
  ]);
  // Every chip names a real stage and its seed builds on the fresh factory,
  // so the destination can actually run (audio playable, CTAs gated).
  for (const cid of shell.OPTORDER) {
    const ids = shell.STAGES[cid].map((z) => z[0]);
    for (const j of shell.jumpStages(cid)) {
      assert.ok(ids.includes(j.stage), cid + " chip “" + j.label + "” targets a real stage");
      for (const k of Object.keys(shell.freshFor(cid))) assert.ok(k in j.seed, cid + " seed keeps fresh key " + k);
    }
  }
  const ext = shell.jumpStages("n").find((j) => j.label === "Extended · 5 passes");
  assert.equal(ext.stage, "p3");
  assert.equal(ext.seed.extra, 2, "extended pass seeds the deeper window");
  const edge = shell.jumpStages("d").find((j) => j.label === "Edge of the range");
  assert.deepEqual([edge.seed.heard, edge.seed.x, edge.seed.y], [true, .96, .06]);
});

test("every navigation reducer clears playback, menus, warnings, and transient flow state", () => {
  const playing = {
    ...shell.initialState(), playKey: "main", menuOpen: true, jumpOpen: true, menuStopped: true,
    setupWarn: true, earWarn: true, heardStage: { old: true }, prKey: "pair", prHeardA: true, prHeardB: true
  };
  const results = [
    shell.goScreenState(playing, "home", { playKey: "cannot-override" }),
    shell.openOptionState(playing, "r"),
    shell.jumpState(playing, "t", "field", shell.freshT()),
    shell.stageState(playing, "n", "p1"),
    shell.resetAllState(playing)
  ];
  for (const state of results) {
    assert.equal(state.playKey, null);
    assert.equal(state.menuOpen, false);
    assert.equal(state.jumpOpen, false);
    assert.equal(state.menuStopped, false);
    assert.equal(state.setupWarn, false);
    assert.equal(state.earWarn, false);
    assert.equal(state.prKey, null);
    assert.equal(state.prHeardA, false);
    assert.equal(state.prHeardB, false);
    assert.deepEqual(state.heardStage, {});
  }
  assert.deepEqual(results[0].n, shell.freshN(), "safe shell screens discard option working state");
});

test("screen roots carry the established data-screen-label values without Privacy", () => {
  assert.equal(shell.screenLabelOf("launch"), "Launch");
  assert.equal(shell.screenLabelOf("privacy"), "");
  assert.equal(shell.screenLabelOf("account"), "Create account");
  assert.equal(shell.screenLabelOf("dashboard"), "Dashboard");
  assert.equal(shell.screenLabelOf("ear"), "Setup · Ear");
  assert.equal(shell.screenLabelOf("setup"), "Setup · Headphones and volume");
  assert.equal(shell.screenLabelOf("home"), "Matching options");
  assert.equal(shell.screenLabelOf("edu"), "Shared · What to listen for");
  assert.equal(shell.screenLabelOf("conclusion"), "Session complete");
  assert.equal(shell.screenLabelOf("flow", "n", "p2"), "Narrowing · Refinement pass");
  assert.equal(shell.screenLabelOf("flow", "d", "field"), "Field · Pitch and volume");
  assert.equal(shell.screenLabelOf("flow", "n", "intro"), "Narrowing · Prepare");
  assert.equal(shell.screenLabelOf("flow", "r", "comp"), "Shared · Two-sound comparison");
  assert.equal(shell.screenLabelOf("flow", "n", "conf"), "Shared · Confidence");
  assert.equal(shell.screenLabelOf("flow", "n", "done"), "Shared · Match complete");
  assert.equal(shell.screenLabelOf("flow", "t", "zoom"), "Education · Sound exploration");
  assert.equal(shell.screenLabelOf("flow", "l", "ret"), "Longitudinal · Welcome back");
});

test("Back renders only on the established screens and targets what it targets", () => {
  const st = shell.initialState();
  assert.equal(shell.navShow({ ...st, screen: "launch" }), false);
  assert.equal(shell.navShow({ ...st, screen: "home" }), false);
  assert.equal(shell.navShow({ ...st, screen: "ear" }), true);
  assert.equal(shell.navShow({ ...st, screen: "setup" }), true);
  assert.equal(shell.navShow({ ...st, screen: "edu" }), true);
  const flowAt = (c, stage) => ({ ...st, screen: "flow", concept: c, stages: { ...st.stages, [c]: stage } });
  assert.equal(shell.navShow(flowAt("n", "intro")), false, "no Back on Prepare");
  assert.equal(shell.navShow(flowAt("l", "ret")), false);
  assert.equal(shell.navShow(flowAt("n", "vol")), true);
  assert.deepEqual(shell.backTarget({ ...st, screen: "ear" }), { kind: "screen", screen: "dashboard" });
  assert.deepEqual(shell.backTarget({ ...st, screen: "setup" }), { kind: "screen", screen: "ear" });
  assert.deepEqual(shell.backTarget({ ...st, screen: "edu" }), { kind: "screen", screen: "setup" });
  assert.deepEqual(shell.backTarget({ ...st, screen: "setup", setupSeen: true }), { kind: "screen", screen: "home" });
  assert.deepEqual(shell.backTarget({ ...st, screen: "edu", setupSeen: true }), { kind: "screen", screen: "home" });
  assert.deepEqual(shell.backTarget({ ...st, screen: "setup", setupSeen: true, eduSeen: true }), { kind: "screen", screen: "home" });
  assert.deepEqual(shell.backTarget({ ...st, screen: "edu", eduSeen: true }), { kind: "screen", screen: "home" });
  assert.deepEqual(shell.backTarget(flowAt("n", "vol")), { kind: "screen", screen: "home" }, "first working stage goes home");
  assert.deepEqual(shell.backTarget(flowAt("n", "p2")), { kind: "stage", stage: "p1" });
  const zoomed = { ...flowAt("d", "zoom"), d: { ...shell.freshD(), level: 1 } };
  assert.deepEqual(shell.backTarget(zoomed), { kind: "zoomOut", stage: "field", level: 0 }, "zoom steps out before stages step back");

  const activeSetup = { ...st, screen: "ear", onboardingSeen: true, ear: "Right ear", hp: true, vol: 72 };
  const target = shell.backTarget(activeSetup);
  const returned = shell.goScreenState(activeSetup, target.screen);
  assert.deepEqual(
    { screen: returned.screen, onboardingSeen: returned.onboardingSeen, ear: returned.ear, hp: returned.hp, vol: returned.vol },
    { screen: "dashboard", onboardingSeen: true, ear: "Right ear", hp: true, vol: 72 },
    "Back retains the active setup session"
  );
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
