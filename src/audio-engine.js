// Placeholder sound generation for the mobile test prototype.
// Ported from the V5 prototype's audio-engine-test.js; dynamically imported on mount.
//
// Two things this engine does that the V4 one does not:
//
// 1. REAL PER-EAR ROUTING. Every voice runs through one stereo panner, so "Left ear" means the
//    left EarPod only. V4 summed to mono and ignored the ear setting.
// 2. ONE OWNER, HARD STOP. Playback is owned by a single key. Starting anything stops everything
//    first, and panic() tears the whole graph down and rebuilds it, so no voice can outlive the
//    screen that started it. A caller can always silence the app without knowing what is playing.
//
// It is not device-validated audio. Real, calibrated sound generation replaces this wholesale.

let ctx = null, master = null, panner = null, layers = [], noise = null;
let muted = false, curKey = null, ear = 'both', gen = 0;

const EARPAN = { left: -1, right: 1, both: 0 };

function buildGraph(c) {
  master = c.createGain();
  master.gain.value = muted ? 0 : 0.5;
  panner = c.createStereoPanner ? c.createStereoPanner() : null;
  if (panner) {
    panner.pan.value = EARPAN[ear] ?? 0;
    master.connect(panner);
    panner.connect(c.destination);
  } else {
    master.connect(c.destination);
  }
}
function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    buildGraph(ctx);
  }
  if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
  return ctx;
}
export function ready() { return !!ac(); }
export function unlock() { const c = ac(); return !!c && c.state === 'running'; }

function noiseBuf(c) {
  if (noise) return noise;
  const len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  noise = b; return b;
}
const FR = { tone: [250, 10000], hiss: [350, 8400], buzz: [55, 440], click: [400, 6400] };
export function freqOf(kind, p) {
  const r = FR[kind] || FR.tone, q = Math.max(0, Math.min(1, p));
  return r[0] * Math.pow(r[1] / r[0], q);
}
function gainOf(level) { const l = Math.max(0, Math.min(1, level)); return 0.02 + l * l * 0.55; }

function buildLayer(c, spec) {
  const g = c.createGain(); g.gain.value = 0;
  const L = { spec, g, stops: [], nodes: [g] };
  const f = freqOf(spec.kind, spec.pitch);
  if (spec.kind === 'hiss') {
    const src = c.createBufferSource(); src.buffer = noiseBuf(c); src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 0.7 + (spec.bright ?? .3) * 3.5;
    src.connect(bp); bp.connect(g); src.start(); L.filt = bp; L.stops.push(src); L.nodes.push(src, bp);
  } else if (spec.kind === 'buzz') {
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700 + (spec.bright ?? .3) * 2600;
    o.connect(lp); lp.connect(g); o.start(); L.osc = o; L.lp = lp; L.stops.push(o); L.nodes.push(o, lp);
  } else {
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    o.connect(g); o.start(); L.osc = o; L.stops.push(o); L.nodes.push(o);
    const br = spec.bright ?? 0;
    if (br > .15) {
      const h = c.createOscillator(); h.type = 'sine'; h.frequency.value = Math.min(f * 3, 14000);
      const hg = c.createGain(); hg.gain.value = br * .16;
      h.connect(hg); hg.connect(g); h.start(); L.h = h; L.hg = hg; L.stops.push(h); L.nodes.push(h, hg);
    }
  }
  g.connect(master);
  const t = c.currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gainOf(spec.level), t + .05);
  return L;
}

// Tearing every node down on stop, rather than only calling stop() on the sources, is what makes an
// orphaned tone impossible: after this returns there is nothing connected to the output.
function teardown() {
  if (!ctx) return;
  const t = ctx.currentTime;
  layers.forEach(L => {
    try { L.g.gain.cancelScheduledValues(t); L.g.gain.linearRampToValueAtTime(0, t + .05); } catch (e) {}
    L.stops.forEach(n => { try { n.stop(t + .08); } catch (e) {} });
    setTimeout(() => { L.nodes.forEach(n => { try { n.disconnect(); } catch (e) {} }); }, 140);
  });
  layers = [];
  curKey = null;
}
export function stop() { gen++; teardown(); }

// Last resort: rebuild the output graph so anything still connected is orphaned from the speakers.
export function panic() {
  gen++;
  teardown();
  if (!ctx) return;
  try { if (panner) panner.disconnect(); master.disconnect(); } catch (e) {}
  buildGraph(ctx);
}

export function play(key, specs) {
  const c = ac(); if (!c) return false;
  stop();
  const mine = ++gen;
  if (mine !== gen) return false;
  curKey = key;
  layers = specs.map(s => buildLayer(c, s));
  return true;
}
export function update(specs) {
  if (!ctx || !layers.length) return;
  const rebuild = specs.length !== layers.length || specs.some((s, i) => s.kind !== layers[i].spec.kind);
  if (rebuild) { const k = curKey; play(k, specs); return; }
  const t = ctx.currentTime;
  specs.forEach((s, i) => {
    const L = layers[i];
    const f = freqOf(s.kind, s.pitch);
    if (L.osc) { try { L.osc.frequency.setTargetAtTime(f, t, .015); } catch (e) { L.osc.frequency.value = f; } }
    if (L.h) { try { L.h.frequency.setTargetAtTime(Math.min(f * 3, 14000), t, .015); } catch (e) {} }
    if (L.filt) { try { L.filt.frequency.setTargetAtTime(f, t, .015); } catch (e) {} }
    if (L.lp) { try { L.lp.frequency.setTargetAtTime(700 + (s.bright ?? .3) * 2600, t, .02); } catch (e) {} }
    if (L.hg) { try { L.hg.gain.setTargetAtTime((s.bright ?? 0) * .16, t, .02); } catch (e) {} }
    try { L.g.gain.setTargetAtTime(gainOf(s.level), t, .02); } catch (e) { L.g.gain.value = gainOf(s.level); }
    L.spec = s;
  });
}
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; }
export function setEar(e) {
  ear = EARPAN[e] === undefined ? 'both' : e;
  if (panner) { try { panner.pan.setTargetAtTime(EARPAN[ear], ctx.currentTime, .02); } catch (x) { panner.pan.value = EARPAN[ear]; } }
}
export function earIsRouted() { return !!panner; }
export function playingKey() { return curKey; }
