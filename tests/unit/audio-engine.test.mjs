/*
 * Unit tests for src/audio-engine.js (REQ-017) against a mocked AudioContext.
 *
 * Covers: the V5 export surface, freqOf exponential mapping over the four
 * kinds' FRQ ranges, squared-level gain, StereoPanner per-ear routing, the
 * single-playback-owner rule (play() always stops the previous owner), and
 * hard-stop/panic semantics (nothing audible afterwards, graph immediately
 * playable again).
 */
import test from "node:test";
import assert from "node:assert/strict";

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

const gainOf = (level) => {
  const l = Math.max(0, Math.min(1, level));
  return 0.02 + l * l * 0.55;
};

const spec = (kind, pitch = 0.5, level = 0.5, bright = 0) => ({
  kind,
  pitch,
  level,
  bright
});

/* ---------- export surface ---------- */

test("exports the exact V5 surface", () => {
  const surface = [
    "ready",
    "unlock",
    "freqOf",
    "play",
    "update",
    "stop",
    "panic",
    "setMuted",
    "setEar",
    "earIsRouted",
    "playingKey"
  ];
  for (const name of surface) {
    assert.equal(typeof engine[name], "function", `${name} is exported`);
  }
  assert.deepEqual(Object.keys(engine).sort(), surface.slice().sort());
});

test("ready() and unlock() build the graph on the mocked context", () => {
  assert.equal(engine.ready(), true);
  assert.equal(engine.unlock(), true);
  const { panner, master } = graph();
  assert.ok(panner, "a StereoPanner is connected to the destination");
  assert.ok(master, "the master gain feeds the panner");
  assert.equal(master.gain.value, 0.5);
});

/* ---------- freqOf: exponential mapping over per-kind FRQ ranges ---------- */

const FRQ = {
  tone: [250, 10000],
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
  assert.equal(engine.freqOf("tone", -2), 250);
  assert.equal(engine.freqOf("tone", 5), 10000);
  assert.equal(engine.freqOf("buzz", -0.01), 55);
  assert.equal(engine.freqOf("nonsense", 0), 250);
  assert.equal(engine.freqOf("nonsense", 1), 10000);
});

/* ---------- synthesis kinds and squared-level gain ---------- */

test("the four kinds synthesize with freqOf pitch and squared-level gain", () => {
  for (const kind of ["tone", "hiss", "buzz", "click"]) {
    engine.panic();
    assert.equal(engine.play(`k-${kind}`, [spec(kind, 0.5, 0.7)]), true);
    const gains = layerGains();
    assert.equal(gains.length, 1, `${kind}: one layer gain into master`);
    const ramp = gains[0].gain.last("ramp");
    assert.ok(ramp, `${kind}: level ramped in`);
    assert.ok(
      Math.abs(ramp.v - gainOf(0.7)) < 1e-9,
      `${kind}: gain is 0.02 + level^2 * 0.55`
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

test("gain is squared-level over the clamped 0..1 range (via update)", () => {
  engine.panic();
  engine.play("g", [spec("tone", 0.5, 0)]);
  for (const level of [0, 0.25, 0.5, 1, 2, -1]) {
    engine.update([spec("tone", 0.5, level)]);
    const target = layerGains()[0].gain.last("target");
    assert.ok(Math.abs(target.v - gainOf(level)) < 1e-9, `level ${level}`);
  }
  assert.equal(gainOf(0), 0.02);
  assert.ok(Math.abs(gainOf(1) - 0.57) < 1e-9);
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
  engine.setMuted(false);
  assert.equal(master.gain.value, 0.5);
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
  for (const s of playing) assert.notEqual(s.stoppedAt, null);
  assert.equal(liveSources().length, 0, "no source is producing output");
  const startedBefore = ctx().sources.length;
  engine.update([spec("tone")]);
  assert.equal(engine.playingKey(), null, "playKey null => nothing audible");
  assert.equal(ctx().sources.length, startedBefore, "update started no voice");
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
  assert.equal(engine.play("after-panic", [spec("tone")]), true);
  assert.equal(engine.playingKey(), "after-panic");
  assert.equal(liveSources().length, 1);
  assert.deepEqual(layerGains()[0].connections, [rebuilt.master]);
  engine.stop();
});
