/*
 * Unit tests for src/audio-engine.js (REQ-017) against a mocked AudioContext.
 *
 * Covers: deterministic calibration seams, freqOf exponential mapping over
 * the four kinds' ranges, reduced loudness gain, StereoPanner per-ear
 * routing, the single-playback-owner rule (play() always stops the previous
 * owner), and hard-stop/panic semantics (nothing audible afterwards, graph
 * immediately playable again).
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as comparison from "../../src/comparison.js";
import * as field from "../../src/field.js";
import { FRQ as technicalRanges, freqOf as technicalFreqOf, freshD, freshR } from "../../src/app-shell.js";

/* ---------- mocked Web Audio API ---------- */

class MockParam {
  constructor(value) {
    this.value = value;
    this.events = [];
  }
  cancelScheduledValues(t) {
    this.events.push({ type: "cancel", t });
  }
  setValueAtTime(v, t) {
    this.value = v;
    this.events.push({ type: "set", v, t });
  }
  linearRampToValueAtTime(v, t) {
    this.value = v;
    this.events.push({ type: "ramp", v, t });
  }
  setTargetAtTime(v, t, tc) {
    this.value = v;
    this.events.push({ type: "target", v, t, tc });
  }
  last(type) {
    for (let i = this.events.length - 1; i >= 0; i--) {
      if (this.events[i].type === type) return this.events[i];
    }
    return null;
  }
}

class MockNode {
  constructor(ctx, kind) {
    this.ctx = ctx;
    this.kind = kind;
    this.connections = [];
    ctx.nodes.push(this);
  }
  connect(dest) {
    this.connections.push(dest);
  }
  disconnect() {
    this.connections = [];
  }
}

class MockSource extends MockNode {
  constructor(ctx, kind) {
    super(ctx, kind);
    this.started = false;
    this.stoppedAt = null;
  }
  start() {
    this.started = true;
    this.ctx.sources.push(this);
  }
  stop(t) {
    this.stoppedAt = t ?? this.ctx.currentTime;
  }
}

class MockAudioContext {
  constructor() {
    this.state = "running";
    this.currentTime = 0;
    this.sampleRate = 8000;
    this.nodes = [];
    this.sources = [];
    this.destination = { kind: "destination", connections: [] };
    MockAudioContext.last = this;
  }
  resume() {
    this.state = "running";
  }
  createGain() {
    const n = new MockNode(this, "gain");
    n.gain = new MockParam(1);
    return n;
  }
  createStereoPanner() {
    const n = new MockNode(this, "panner");
    n.pan = new MockParam(0);
    return n;
  }
  createOscillator() {
    const n = new MockSource(this, "oscillator");
    n.type = "sine";
    n.frequency = new MockParam(440);
    return n;
  }
  createBufferSource() {
    const n = new MockSource(this, "bufferSource");
    n.buffer = null;
    n.loop = false;
    return n;
  }
  createBiquadFilter() {
    const n = new MockNode(this, "filter");
    n.type = "lowpass";
    n.frequency = new MockParam(350);
    n.Q = new MockParam(1);
    return n;
  }
  createBuffer(channels, length, sampleRate) {
    return {
      channels,
      length,
      sampleRate,
      getChannelData() {
        return new Float32Array(length);
      }
    };
  }
}

globalThis.window = { AudioContext: MockAudioContext };

const engine = await import("../../src/audio-engine.js");

/* ---------- helpers ---------- */

const ctx = () => MockAudioContext.last;

// The live output graph: the one StereoPanner connected to the destination,
// and the master gain feeding it. Torn-down panners have no connections.
function graph() {
  const c = ctx();
  const panner = c.nodes.find(
    (n) => n.kind === "panner" && n.connections.includes(c.destination)
  );
  const master = c.nodes.find(
    (n) => n.kind === "gain" && panner && n.connections.includes(panner)
  );
  return { panner, master };
}

function layerGains() {
  const { master } = graph();
  return ctx().nodes.filter(
    (n) => n.kind === "gain" && n !== master && n.connections.includes(master)
  );
}

function liveSources() {
  return ctx().sources.filter((s) => s.started && s.stoppedAt === null);
}

const expectedGainOf = (level) => {
  const l = Math.max(0, Math.min(1, level));
  return 0.015 + l * l * 0.2192;
};

const BASELINE_MASTER_LEVEL = 0.25;
const baselineGainOf = (level) => {
  const l = Math.max(0, Math.min(1, level));
  return 0.02 + l * l * 0.55;
};
const baselineEffectiveGainOf = (level) => BASELINE_MASTER_LEVEL * baselineGainOf(level);
const EFFECTIVE_GAIN_TOLERANCE = 1e-9;

const spec = (kind, pitch = 0.5, level = 0.5, bright = 0) => ({
  kind,
  pitch,
  level,
  bright
});

/* ---------- export surface ---------- */

test("exports the playback surface and deterministic calibration seams", () => {
  const surface = [
    "MASTER_LEVEL",
    "effectiveGainOf",
    "gainOf",
    "ready",
    "unlock",
    "freqOf",
    "play",
    "update",
    "updateOwner",
    "stop",
    "panic",
    "setMuted",
    "setEar",
    "earIsRouted",
    "playingKey"
  ];
  for (const name of surface.filter((name) => name !== "MASTER_LEVEL")) {
    assert.equal(typeof engine[name], "function", `${name} is exported`);
  }
  assert.equal(typeof engine.MASTER_LEVEL, "number");
  assert.deepEqual(Object.keys(engine).sort(), surface.slice().sort());
});

test("ready() and unlock() build the graph on the mocked context", () => {
  assert.equal(engine.ready(), true);
  assert.equal(engine.unlock(), true);
  const { panner, master } = graph();
  assert.ok(panner, "a StereoPanner is connected to the destination");
  assert.ok(master, "the master gain feeds the panner");
  assert.equal(master.gain.value, 0.07, "one shared master starts at the quieter review level");
});

/* ---------- freqOf: exponential mapping over per-kind FRQ ranges ---------- */

const FRQ = {
  tone: [2200, 20000],
  hiss: [350, 8400],
  buzz: [55, 440],
  click: [400, 6400]
};

test("freqOf maps 0..1 exponentially across each kind's range", () => {
  for (const [kind, [lo, hi]] of Object.entries(FRQ)) {
    assert.ok(
      Math.abs(engine.freqOf(kind, 0) - lo) < 1e-9,
      `${kind} @0 = ${lo}`
    );
    assert.ok(
      Math.abs(engine.freqOf(kind, 1) - hi) < 1e-9,
      `${kind} @1 = ${hi}`
    );
    // Exponential: the midpoint is the geometric mean, not the arithmetic one.
    const mid = engine.freqOf(kind, 0.5);
    assert.ok(Math.abs(mid - Math.sqrt(lo * hi)) < 1e-6, `${kind} midpoint`);
    assert.notEqual(Math.round(mid), Math.round((lo + hi) / 2));
    // Equal pitch steps multiply frequency by a constant ratio.
    const r1 = engine.freqOf(kind, 0.25) / engine.freqOf(kind, 0);
    const r2 = engine.freqOf(kind, 0.75) / engine.freqOf(kind, 0.5);
    assert.ok(Math.abs(r1 - r2) < 1e-6, `${kind} constant ratio per step`);
  }
});

test("freqOf clamps pitch and falls back to the tone range", () => {
  assert.equal(engine.freqOf("tone", -2), 2200);
  assert.equal(engine.freqOf("tone", 5), 20000);
  assert.equal(engine.freqOf("buzz", -0.01), 55);
  assert.equal(engine.freqOf("nonsense", 0), 2200);
  assert.equal(engine.freqOf("nonsense", 1), 20000);
});

test("tone positions stay ordered and retain high-frequency interior resolution", () => {
  const positions = [0, 0.1, 0.25, 0.5, 0.75, 0.875, 0.99, 1];
  const frequencies = positions.map((position) => engine.freqOf("tone", position));
  for (let i = 1; i < frequencies.length; i++) {
    assert.ok(frequencies[i] > frequencies[i - 1], `${positions[i]} maps above ${positions[i - 1]}`);
  }
  assert.ok(engine.freqOf("tone", 0.875) > 15000, "a high-frequency target has useful interior reach");
  assert.ok(engine.freqOf("tone", 0.875) < 20000, "a high-frequency target is not pinned to maximum");
  assert.ok(engine.freqOf("tone", 0.99) < 20000, "fine adjustment remains available near the ceiling");
});

test("non-tone sound-family ranges remain at their baseline anchors", () => {
  for (const [kind, [lo, hi]] of Object.entries({
    hiss: [350, 8400],
    buzz: [55, 440],
    click: [400, 6400]
  })) {
    assert.equal(engine.freqOf(kind, 0), lo, `${kind} low endpoint`);
    assert.equal(engine.freqOf(kind, 1), hi, `${kind} high endpoint`);
  }
});

test("technical values use the same tone domain as synthesized consumers", () => {
  assert.deepEqual(technicalRanges.tone, [2200, 20000]);
  for (const position of [0, 0.22, 0.5, 0.78, 0.875, 1]) {
    assert.equal(technicalFreqOf("tone", position), engine.freqOf("tone", position));
  }
});

/* ---------- synthesis kinds and squared-level gain ---------- */

test("the four kinds synthesize with freqOf pitch and reduced squared-level gain", () => {
  for (const kind of ["tone", "hiss", "buzz", "click"]) {
    engine.panic();
    assert.equal(engine.play(`k-${kind}`, [spec(kind, 0.5, 0.7)]), true);
    const gains = layerGains();
    assert.equal(gains.length, 1, `${kind}: one layer gain into master`);
    const ramp = gains[0].gain.last("ramp");
    assert.ok(ramp, `${kind}: level ramped in`);
    assert.ok(
      Math.abs(ramp.v - expectedGainOf(0.7)) < 1e-9,
      `${kind}: gain is 0.015 + level^2 * 0.2192`
    );
    const live = liveSources();
    if (kind === "hiss") {
      assert.equal(live[0].kind, "bufferSource", "hiss is looped noise");
      assert.equal(live[0].loop, true);
      const filt = live[0].connections[0];
      assert.equal(filt.kind, "filter");
      assert.equal(filt.type, "bandpass");
      assert.ok(Math.abs(filt.frequency.value - engine.freqOf(kind, 0.5)) < 1e-9);
    } else {
      assert.equal(live[0].kind, "oscillator");
      assert.equal(live[0].type, kind === "buzz" ? "sawtooth" : "sine");
      assert.ok(
        Math.abs(live[0].frequency.value - engine.freqOf(kind, 0.5)) < 1e-9,
        `${kind}: oscillator pitched by freqOf`
      );
      if (kind === "buzz") {
        assert.equal(live[0].connections[0].type, "lowpass", "buzz is filtered saw");
      }
    }
  }
});

test("gain clamps safely and is strictly increasing across the participant range", () => {
  engine.panic();
  engine.play("g", [spec("tone", 0.5, 0)]);
  for (const level of [0, 0.12, 0.25, 0.5, 0.75, 1, 2, -1]) {
    engine.update([spec("tone", 0.5, level)]);
    const target = layerGains()[0].gain.last("target");
    assert.ok(Math.abs(target.v - expectedGainOf(level)) < 1e-9, `level ${level}`);
  }
  assert.equal(engine.gainOf(-1), engine.gainOf(0), "quiet endpoint clamps");
  assert.equal(engine.gainOf(2), engine.gainOf(1), "loud endpoint clamps");
  const ordered = [0, 0.01, 0.12, 0.25, 0.5, 0.75, 0.99, 1].map(engine.gainOf);
  for (let i = 1; i < ordered.length; i++) assert.ok(ordered[i] > ordered[i - 1]);
});

test("effective loudness anchors match the approved baseline relationships", () => {
  const priorReviewMasterLevel = 0.1;
  assert.equal(engine.MASTER_LEVEL, 0.07, "the shared master is reduced by 30% from the prior review level");

  const baselineQuiet = baselineEffectiveGainOf(0);
  const baselineLoud = baselineEffectiveGainOf(1);
  assert.ok(engine.effectiveGainOf(0) < baselineQuiet, "the new quiet end is below the baseline minimum");
  assert.ok(engine.effectiveGainOf(1) < baselineLoud * 0.35, "the loud end is materially below baseline maximum");

  for (const level of [0, 0.12, 0.25, 0.5, 0.75, 1]) {
    assert.ok(
      Math.abs(engine.effectiveGainOf(level) - priorReviewMasterLevel * engine.gainOf(level) * 0.7)
        <= EFFECTIVE_GAIN_TOLERANCE,
      `level ${level} is exactly 30% below the prior review output`
    );
    assert.ok(
      engine.effectiveGainOf(level) < baselineEffectiveGainOf(level),
      `level ${level} is lower than the corresponding baseline output`
    );
  }
});

test("setup, education, and Options 1-3 use the shared reduced mappings", () => {
  const option2Pair = comparison.pairSpecs(freshR());
  const consumers = [
    ["setup sample", spec("tone", 0.5, 0.42, 0.2)],
    ["education lower sample", spec("tone", 0.22, 0.42, 0.1)],
    ["education higher sample", spec("tone", 0.78, 0.42, 0.2)],
    ["education quiet sample", spec("tone", 0.5, 0.26, 0.14)],
    ["education loud sample", spec("tone", 0.5, 0.62, 0.14)],
    ["Option 1", spec("tone", 0.5, 0.4, 0.3)],
    ["Option 2 directional", spec("tone", freshR().center, freshR().level, 0.3)],
    ["Option 2 A", option2Pair.A],
    ["Option 2 B", option2Pair.B],
    ["Option 3", field.dSpec(freshD())]
  ];

  for (const [name, consumerSpec] of consumers) {
    engine.panic();
    assert.equal(engine.play(name, [consumerSpec]), true);
    const { master } = graph();
    const layer = layerGains()[0];
    const source = liveSources()[0];
    assert.equal(master.gain.value, engine.MASTER_LEVEL, `${name}: reduced shared master`);
    assert.deepEqual(layer.connections, [master], `${name}: voice routes through the shared master`);
    assert.ok(
      Math.abs(layer.gain.last("ramp").v - engine.gainOf(consumerSpec.level)) < 1e-9,
      `${name}: shared loudness mapping`
    );
    assert.ok(
      Math.abs(source.frequency.value - engine.freqOf("tone", consumerSpec.pitch)) < 1e-9,
      `${name}: shared tone mapping`
    );
    assert.ok(
      engine.effectiveGainOf(consumerSpec.level) < baselineEffectiveGainOf(consumerSpec.level),
      `${name}: effective output is lower than baseline`
    );
  }
});

/* ---------- per-ear routing through the single StereoPanner ---------- */

test("earIsRouted and setEar route fully left / right / both", () => {
  assert.equal(engine.earIsRouted(), true);
  const { panner } = graph();
  engine.setEar("left");
  assert.equal(panner.pan.value, -1, "'left' pans fully left");
  engine.setEar("right");
  assert.equal(panner.pan.value, 1, "'right' pans fully right");
  engine.setEar("both");
  assert.equal(panner.pan.value, 0, "'both' is centered");
  engine.setEar("sideways");
  assert.equal(panner.pan.value, 0, "unknown ear falls back to both");
});

test("each ear sample uses the selected channel, including a changed next selection", () => {
  engine.panic();
  const sample = [spec("tone", 0.5, 0.42, 0.2)];
  const routes = [
    ["left", -1],
    ["right", 1],
    ["both", 0],
    ["left", -1]
  ];

  for (const [selectedEar, expectedPan] of routes) {
    engine.setEar(selectedEar);
    assert.equal(engine.play("ear-sample", sample), true);
    assert.equal(graph().panner.pan.value, expectedPan, `${selectedEar} sample route`);
    assert.equal(engine.playingKey(), "ear-sample");
    engine.stop();
  }
});

test("every voice routes through the one StereoPanner", () => {
  engine.panic();
  engine.setEar("left");
  engine.play("route", [spec("tone"), spec("hiss"), spec("buzz")]);
  const { panner, master } = graph();
  assert.equal(panner.pan.value, -1, "rebuilt graph keeps the ear setting");
  assert.equal(layerGains().length, 3);
  for (const g of layerGains()) {
    assert.deepEqual(g.connections, [master], "layer -> master only");
  }
  assert.deepEqual(master.connections, [panner], "master -> panner only");
  assert.deepEqual(panner.connections, [ctx().destination]);
  engine.setEar("both");
});

test("setMuted silences and restores the master gain", () => {
  const { master } = graph();
  engine.setMuted(true);
  assert.equal(master.gain.value, 0);
  engine.panic();
  assert.equal(graph().master.gain.value, 0, "a rebuild cannot bypass mute");
  engine.setMuted(false);
  assert.equal(graph().master.gain.value, 0.07, "unmute restores the quieter shared review level");
});

/* ---------- single playback owner ---------- */

test("play() stops the previous owner; playingKey reflects the single owner", () => {
  engine.panic();
  engine.play("first", [spec("tone"), spec("hiss")]);
  assert.equal(engine.playingKey(), "first");
  const firstSources = liveSources();
  const firstGains = layerGains();
  assert.equal(firstSources.length, 2);

  engine.play("second", [spec("buzz")]);
  assert.equal(engine.playingKey(), "second", "one owner at a time");
  for (const s of firstSources) {
    assert.notEqual(s.stoppedAt, null, "previous owner's sources are stopped");
  }
  for (const g of firstGains) {
    assert.equal(g.gain.last("ramp").v, 0, "previous owner's gains ramp to 0");
  }
  assert.equal(liveSources().length, 1, "only the new owner's voice is live");
});

test("update() with same kinds retunes in place and keeps the owner", () => {
  engine.panic();
  engine.play("tune", [spec("tone", 0.2, 0.4)]);
  const osc = liveSources()[0];
  engine.update([spec("tone", 0.9, 0.8)]);
  assert.equal(engine.playingKey(), "tune");
  assert.equal(liveSources()[0], osc, "no rebuild for same kinds");
  const target = osc.frequency.last("target");
  assert.ok(Math.abs(target.v - engine.freqOf("tone", 0.9)) < 1e-9);
});

test("updateOwner() hands the live graph to the selected candidate without stopping it", () => {
  engine.panic();
  engine.play("prB", [spec("tone", 0.8, 0.4)]);
  const osc = liveSources()[0];
  assert.equal(engine.updateOwner("prA", [spec("tone", 0.3, 0.4)]), true);
  assert.equal(engine.playingKey(), "prA");
  assert.equal(liveSources()[0], osc, "candidate handoff keeps the existing source");
  assert.equal(osc.stoppedAt, null, "handoff does not introduce a silent stop");
  assert.ok(Math.abs(osc.frequency.last("target").v - engine.freqOf("tone", 0.3)) < 1e-9);
});

test("update() with a kind change rebuilds under the same owner key", () => {
  engine.panic();
  engine.play("morph", [spec("tone")]);
  const before = liveSources()[0];
  engine.update([spec("hiss")]);
  assert.equal(engine.playingKey(), "morph", "owner key survives the rebuild");
  assert.notEqual(before.stoppedAt, null, "old voice is stopped");
  assert.equal(liveSources().length, 1);
  assert.equal(liveSources()[0].kind, "bufferSource");
});

/* ---------- hard stop and panic ---------- */

test("stop() leaves nothing audible; update() while stopped starts nothing", () => {
  engine.panic();
  engine.play("s", [spec("tone"), spec("buzz")]);
  const playing = liveSources();
  engine.stop();
  assert.equal(engine.playingKey(), null);
  assert.equal(graph().master.gain.value, 0.07, "stop does not alter the shared master");
  for (const s of playing) assert.notEqual(s.stoppedAt, null);
  assert.equal(liveSources().length, 0, "no source is producing output");
  const startedBefore = ctx().sources.length;
  engine.update([spec("tone")]);
  assert.equal(engine.playingKey(), null, "playKey null => nothing audible");
  assert.equal(ctx().sources.length, startedBefore, "update started no voice");
});

test("play and update failures panic to one silent, rebuildable graph", () => {
  engine.panic();
  const c = ctx();
  const createFilter = c.createBiquadFilter;
  c.createBiquadFilter = () => { throw new Error("filter failed"); };
  assert.equal(engine.play("broken-play", [spec("hiss")]), false);
  assert.equal(engine.playingKey(), null);
  assert.equal(liveSources().length, 0, "a partially built source is stopped");
  assert.equal(graph().master.gain.value, 0.07);
  c.createBiquadFilter = createFilter;

  assert.equal(engine.play("broken-update", [spec("tone")]), true);
  const source = liveSources()[0];
  source.frequency.setTargetAtTime = () => { throw new Error("automation failed"); };
  Object.defineProperty(source.frequency, "value", { configurable: true, set() { throw new Error("fallback failed"); } });
  assert.equal(engine.update([spec("tone", .8)]), false);
  assert.equal(engine.playingKey(), null);
  assert.notEqual(source.stoppedAt, null);
  assert.equal(liveSources().length, 0);
  assert.equal(graph().master.gain.value, 0.07);
});

test("panic() tears the graph down, rebuilds it, and it plays again immediately", () => {
  engine.panic();
  engine.play("p", [spec("hiss")]);
  const old = graph();
  const oldSources = liveSources();
  engine.panic();
  assert.equal(engine.playingKey(), null);
  for (const s of oldSources) assert.notEqual(s.stoppedAt, null);
  assert.equal(old.master.connections.length, 0, "old master is orphaned");
  assert.equal(old.panner.connections.length, 0, "old panner is orphaned");
  const rebuilt = graph();
  assert.ok(rebuilt.master && rebuilt.panner, "fresh graph reaches destination");
  assert.notEqual(rebuilt.master, old.master);
  assert.equal(rebuilt.master.gain.value, 0.07, "panic rebuild restores the same shared master");
  assert.equal(engine.play("after-panic", [spec("tone")]), true);
  assert.equal(engine.playingKey(), "after-panic");
  assert.equal(liveSources().length, 1);
  assert.deepEqual(layerGains()[0].connections, [rebuilt.master]);
  engine.stop();
});
