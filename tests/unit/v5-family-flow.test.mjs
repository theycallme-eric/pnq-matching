import test from "node:test";
import assert from "node:assert/strict";
import * as fam from "../../src/family-flow.js";
import * as shell from "../../src/app-shell.js";

// The exact sound-family data embedded in the V5 prototype (FAMS/FAMORDER in
// "PNQ Matching V5 - Mobile Test Prototype"). The module must equal this
// verbatim: no families, labels, bridge relationships or specs beyond it.
const V5_FAMS = {
  hiss: { name: "Hissing or rushing", short: "hiss", desc: "Airy, like static, steam, or rushing air.", ex: { kind: "hiss", pitch: .55, level: .42, bright: .35, behavior: "steady" }, chars: [
    { label: "Like radio static", sub: "Smooth and even", spec: { kind: "hiss", pitch: .5, level: .42, bright: .3, behavior: "steady" } },
    { label: "Like rushing air or water", sub: "Broad, and it moves", spec: { kind: "hiss", pitch: .3, level: .42, bright: .15, behavior: "waver" } },
    { label: "Like a radiator hissing", sub: "High and thin", spec: { kind: "hiss", pitch: .68, level: .42, bright: .5, behavior: "steady" } },
    { label: "Like wind or ocean waves", sub: "Low and broad", spec: { kind: "hiss", pitch: .2, level: .42, bright: .1, behavior: "waver" } },
    { label: "Like a swarm of bees", sub: "Dense and vibrating", bridge: 1, spec: { kind: "hiss", pitch: .38, level: .42, bright: .7, behavior: "steady" } },
    { label: "Like crackling", sub: "Grainy, uneven", bridge: 1, spec: { kind: "hiss", pitch: .55, level: .42, bright: .9, behavior: "gap" } }] },
  buzz: { name: "Buzzing or humming", short: "buzzing", desc: "Rough and low, like an appliance or electrical hum.", ex: { kind: "buzz", pitch: .35, level: .42, bright: .35, behavior: "steady" }, chars: [
    { label: "Like a refrigerator hum", sub: "Low and steady", spec: { kind: "buzz", pitch: .18, level: .42, bright: .12, behavior: "steady" } },
    { label: "Like a fluorescent light", sub: "Coarse, electrical", spec: { kind: "buzz", pitch: .45, level: .42, bright: .8, behavior: "steady" } },
    { label: "Like a distant car", sub: "Droning, slightly wavering", spec: { kind: "buzz", pitch: .28, level: .42, bright: .3, behavior: "waver" } },
    { label: "Like a swarm of bees", sub: "Dense and vibrating", bridge: 1, spec: { kind: "buzz", pitch: .6, level: .42, bright: .85, behavior: "steady" } },
    { label: "Like an old TV screen", sub: "A high electrical whine", bridge: 1, spec: { kind: "buzz", pitch: .85, level: .42, bright: .6, behavior: "steady" } },
    { label: "Like cicadas", sub: "A dense, pulsing swarm", bridge: 1, spec: { kind: "hiss", pitch: .72, level: .42, bright: .75, behavior: "pulse" } }] },
  tone: { name: "A tone", short: "tone", desc: "Clear and steady, like a whistle or a single note.", caution: "People often say “ringing” for tinnitus in general, whatever they actually hear. If none of these sound right, the other groups are worth a listen.", ex: { kind: "tone", pitch: .62, level: .42, bright: .2, behavior: "steady" }, chars: [
    { label: "Like a whistle", sub: "Clear and steady", spec: { kind: "tone", pitch: .66, level: .42, bright: .18, behavior: "steady" } },
    { label: "Like a hearing test tone", sub: "Smooth, a single note", spec: { kind: "tone", pitch: .6, level: .42, bright: .06, behavior: "steady" } },
    { label: "Like a dog whistle", sub: "Very high and thin", spec: { kind: "tone", pitch: .88, level: .42, bright: .3, behavior: "steady" } },
    { label: "Like a dial tone", sub: "Even, middle of the range", spec: { kind: "tone", pitch: .38, level: .42, bright: .12, behavior: "steady" } },
    { label: "Like an old TV screen", sub: "A narrow high whine", bridge: 1, spec: { kind: "tone", pitch: .72, level: .42, bright: .45, behavior: "steady" } },
    { label: "Like cicadas", sub: "A high, focused whine", bridge: 1, spec: { kind: "tone", pitch: .78, level: .42, bright: .55, behavior: "waver" } }] },
  click: { name: "Clicking or chirping", short: "clicking", desc: "Short sounds that repeat or come and go.", ex: { kind: "click", pitch: .5, level: .42, rate: .5, behavior: "steady" }, chars: [
    { label: "Like crickets", sub: "Chirping, repeating", spec: { kind: "click", pitch: .72, level: .42, rate: .7, behavior: "steady" } },
    { label: "Like a smoke alarm chirp", sub: "Short, well spaced", spec: { kind: "click", pitch: .8, level: .42, rate: .12, behavior: "gap" } },
    { label: "Like Morse code", sub: "Irregular, comes and goes", spec: { kind: "click", pitch: .5, level: .42, rate: .45, behavior: "gap" } },
    { label: "Like a hard drive", sub: "Fast and even", spec: { kind: "click", pitch: .35, level: .42, rate: .9, behavior: "steady" } },
    { label: "Like cicadas", sub: "Fast repeating events", bridge: 1, spec: { kind: "click", pitch: .7, level: .42, rate: .95, behavior: "steady" } },
    { label: "Like crackling", sub: "Grainy, uneven", bridge: 1, spec: { kind: "click", pitch: .55, level: .42, rate: .8, behavior: "gap" } }] },
  hard: { name: "Hard to describe", short: "sound", desc: "A mix, or something else. We'll find it by listening.", ex: null, chars: [
    { label: "Sound 1", spec: { kind: "tone", pitch: .7, level: .42, bright: .15, behavior: "steady" } },
    { label: "Sound 2", spec: { kind: "hiss", pitch: .5, level: .42, bright: .3, behavior: "steady" } },
    { label: "Sound 3", spec: { kind: "buzz", pitch: .3, level: .42, bright: .4, behavior: "steady" } },
    { label: "Sound 4", spec: { kind: "click", pitch: .55, level: .42, rate: .5, behavior: "steady" } },
    { label: "Sound 5", spec: { kind: "tone", pitch: .45, level: .42, bright: .2, behavior: "waver" } },
    { label: "Sound 6", spec: { kind: "hiss", pitch: .78, level: .42, bright: .7, behavior: "pulse" } }] }
};

test("family data equals V5's embedded placeholder data with no additions", () => {
  assert.deepEqual(fam.FAMORDER, ["hiss", "buzz", "tone", "click", "hard"]);
  assert.deepEqual(Object.keys(fam.FAMS), Object.keys(V5_FAMS));
  assert.deepEqual(fam.FAMS, V5_FAMS);
  // Only "Hard to describe" lacks an example row; only "A tone" has a caution.
  assert.equal(fam.FAMS.hard.ex, null);
  assert.deepEqual(
    Object.keys(fam.FAMS).filter((k) => "caution" in fam.FAMS[k]),
    ["tone"]
  );
  assert.deepEqual(fam.BEH_UI, ["Steady", "Comes and goes", "Pulsing"]);
  assert.deepEqual(fam.BEH_MAP, { "Steady": "steady", "Comes and goes": "gap", "Pulsing": "pulse" });
  assert.deepEqual(fam.BEH_LBL, { steady: "Steady", gap: "Comes and goes", pulse: "Pulsing", waver: "Steady" });
  assert.deepEqual(fam.HARD_SPEC, { kind: "hiss", pitch: .5, level: .4, bright: .3, behavior: "steady" });
});

test("bridge examples repeat across families under the same label, exactly as V5 encodes them", () => {
  const bridged = {};
  for (const key of fam.FAMORDER) {
    for (const ch of fam.FAMS[key].chars) {
      if (ch.bridge) (bridged[ch.label] = bridged[ch.label] || []).push(key);
    }
  }
  assert.deepEqual(bridged, {
    "Like a swarm of bees": ["hiss", "buzz"],
    "Like crackling": ["hiss", "click"],
    "Like an old TV screen": ["buzz", "tone"],
    "Like cicadas": ["buzz", "tone", "click"]
  });
});

test("family stage: continue requires a selection, escapes patch or reroute as V5 does", () => {
  const f = shell.freshF();
  assert.deepEqual(fam.famContinue(f), { pat: { note: "Choose the closest kind, or “None of these fit.”" } });
  assert.deepEqual(fam.famContinue({ ...f, fam: "hiss" }), { go: ["char", { charIdx: null }] });
  assert.deepEqual(fam.noneFit(), { go: ["char", { fam: "hard", charIdx: null }] });
  assert.deepEqual(fam.famNoHear(), { pat: { note: "That’s okay. We made the examples a little easier to hear. Check your headphones are snug." } });
});

test("character stage: selection copies the chosen spec into the working sound", () => {
  const f = { ...shell.freshF(), fam: "buzz" };
  assert.deepEqual(fam.charContinue(f), { pat: { note: "Play a few and pick the closest. It doesn’t have to be exact." } });

  const r = fam.charContinue({ ...f, charIdx: 1 });
  assert.equal(r.go[0], "tune");
  assert.deepEqual(r.go[1].work, { fam: "buzz", charIdx: 1, spec: { kind: "buzz", pitch: .45, level: .42, bright: .8, behavior: "steady" } });
  // A copy, never a reference into the embedded data.
  assert.notEqual(r.go[1].work.spec, fam.FAMS.buzz.chars[1].spec);

  assert.deepEqual(fam.charGhost(f), { go: ["family", { note: "Try another kind, or choose “Hard to describe.” Both are normal." }] });
  const hard = fam.charGhost({ ...shell.freshF(), fam: "hard" });
  assert.deepEqual(hard, { go: ["tune", {
    work: { fam: "hard", charIdx: -1, spec: { kind: "hiss", pitch: .5, level: .4, bright: .3, behavior: "steady" } },
    note: "That’s okay. We’ll keep the search wide and shape the sound directly."
  }] });
  assert.notEqual(hard.go[1].work.spec, fam.HARD_SPEC);
});

test("famContext: the tuned sound's family wins over the list selection", () => {
  const f = { ...shell.freshF(), fam: "hiss", work: { fam: "tone", charIdx: 0, spec: { ...fam.FAMS.tone.chars[0].spec } } };
  const ctx = fam.famContext(f);
  assert.equal(ctx.famKey, "tone");
  assert.equal(ctx.famDef, fam.FAMS.tone);
  assert.equal(ctx.isHard, false);
  assert.deepEqual(ctx.tuneSpec, fam.FAMS.tone.chars[0].spec);
  assert.equal(fam.famContext({ ...shell.freshF(), fam: "hard" }).isHard, true);
});

test("tune stage: saving lands in the right slot, cannot-hear bumps level toward .85", () => {
  const work = { fam: "hiss", charIdx: 0, spec: { ...fam.FAMS.hiss.chars[0].spec } };
  assert.deepEqual(fam.tuneDone({ ...shell.freshF(), work }), { go: ["layer", { s1: work, work: null }] });
  assert.deepEqual(fam.tuneDone({ ...shell.freshF(), editing: 2, work }), { go: ["layer", { s2: work, work: null }] });

  const bumped = fam.tuneNoHear({ ...shell.freshF(), work });
  assert.equal(bumped.pat.work.spec.level, .42 + .12);
  assert.equal(bumped.pat.note, "That’s okay. We made it a little easier to hear. Press play and try again.");
  const capped = fam.tuneNoHear({ ...shell.freshF(), work: { ...work, spec: { ...work.spec, level: .8 } } });
  assert.equal(capped.pat.work.spec.level, .85);
});

test("layer stage: optional second sound, removal, and completion into shared confidence", () => {
  assert.deepEqual(fam.addSound(), { go: ["family", { editing: 2, fam: null, charIdx: null, note: "Matching sound 2 now. Same steps, and sound 1 is saved." }] });
  assert.deepEqual(fam.removeSecond(), { pat: { s2: null, editing: 1 } });
  assert.deepEqual(fam.layerDone(), { go: ["conf"] });
});

test("mainSpecs: the tuned spec while tuning, the saved sound(s) after, and a safe fallback", () => {
  const s1 = { fam: "hiss", charIdx: 0, spec: { ...fam.FAMS.hiss.chars[0].spec } };
  const s2 = { fam: "tone", charIdx: 0, spec: { ...fam.FAMS.tone.chars[0].spec, pitch: .72 } };
  const work = { fam: "buzz", charIdx: 2, spec: { ...fam.FAMS.buzz.chars[2].spec } };

  assert.deepEqual(fam.mainSpecs({ ...shell.freshF(), work }, "tune"), [work.spec]);
  // Both saved sounds play together through the one shared engine call.
  assert.deepEqual(fam.mainSpecs({ ...shell.freshF(), s1, s2 }, "layer"), [s1.spec, s2.spec]);
  assert.deepEqual(fam.mainSpecs({ ...shell.freshF(), s1 }, "conf"), [s1.spec]);
  assert.deepEqual(fam.mainSpecs(shell.freshF(), "family"), [fam.HARD_SPEC]);
  assert.deepEqual(fam.layerSounds({ ...shell.freshF(), s1, s2 }), [s1, s2]);
});

test("shell wiring: V5 stage order, Families screen labels, and no options-hub exposure", () => {
  assert.deepEqual(shell.STAGES.f.map((z) => z[0]), ["intro", "edu", "family", "char", "tune", "layer", "conf", "done"]);
  assert.equal(shell.firstWorkingStage("f"), "family");
  assert.equal(shell.screenLabelOf("flow", "f", "intro"), "Families · Prepare");
  assert.equal(shell.screenLabelOf("flow", "f", "family"), "Families · Sound families");
  assert.equal(shell.screenLabelOf("flow", "f", "char"), "Families · Character");
  assert.equal(shell.screenLabelOf("flow", "f", "tune"), "Families · Pitch and loudness");
  assert.equal(shell.screenLabelOf("flow", "f", "layer"), "Families · More sounds");
  assert.equal(shell.screenLabelOf("flow", "f", "conf"), "Shared · Confidence");
  assert.equal(shell.screenLabelOf("flow", "f", "done"), "Shared · Match complete");
  // Moderator menu only: the participant-facing hub never lists the flow.
  assert.equal(shell.OPTORDER.includes("f"), false);
  assert.equal("f" in shell.OPTLABEL, false);
  assert.deepEqual(shell.freshF(), { editing: 1, s1: null, s2: null, fam: null, charIdx: null, work: null, note: "", conf: null });
});

test("moderator jump targets mirror V5's scenario presets and seed runnable states", () => {
  const jumps = fam.jumpStages();
  assert.deepEqual(jumps.map((j) => j.label), [
    "Prepare", "Families open", "“None of these fit”", "Hard-to-describe path",
    "Tuning one sound", "Two sounds", "One sound", "Couldn’t hear examples"
  ]);
  for (const j of jumps) {
    assert.ok(shell.STAGES.f.some((z) => z[0] === j.stage), j.label + " targets a real stage");
    const seeded = { ...shell.freshF(), ...j.seed };
    if (j.stage === "tune") assert.ok(seeded.work, j.label + " seeds a working sound");
    if (j.stage === "layer") assert.ok(seeded.s1, j.label + " seeds sound 1");
  }
  const two = jumps.find((j) => j.label === "Two sounds").seed;
  assert.deepEqual(two.s2.spec, { ...fam.FAMS.tone.chars[0].spec, pitch: .72 });
});

test("match complete summarizes the family flow's saved sounds", () => {
  const st = {
    ...shell.initialState(), concept: "f", ear: "Both ears",
    f: { ...shell.freshF(),
      s1: { fam: "hiss", charIdx: 0, spec: { ...fam.FAMS.hiss.chars[0].spec } },
      s2: { fam: "tone", charIdx: 0, spec: { ...fam.FAMS.tone.chars[0].spec } },
      conf: "Fairly close" }
  };
  const done = shell.doneData(st, fam.mainSpecs(st.f, "done"));
  assert.deepEqual(done.rows.map((r) => r.label), ["SOUND 1", "SOUND 2", "EAR", "HOW CLOSE IT FEELS"]);
  assert.equal((done.tech.match(/dB/g) || []).length, 2);
});
