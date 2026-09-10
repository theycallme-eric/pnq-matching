/*
 * PNQ Sound Matching - app shell state machine (REQ-001, REQ-011, REQ-020).
 *
 * Pure module, no DOM access: screens, per-concept stages, fresh-state
 * factories, the sessionStorage persistence shape, chrome measurement and
 * the navigation reducers, ported from the V5 mobile test prototype.
 *
 * Every reducer that changes screen or stage returns playKey: null - the
 * renderer pairs that with the engine's hard stop so no sound outlives the
 * screen that started it.
 */

// `launch` and `home` remain the renderer-facing ids for the splash and option
// selector. Keeping those stable lets the protected option flows stay wholly
// independent of the surrounding patient-app journey.
export const SCREENS = ["launch", "privacy", "account", "dashboard", "ear", "setup", "edu", "home", "flow", "conclusion"];
export const CONCEPT_IDS = ["n", "r", "d", "f", "a", "l", "t"];

// Participants only ever see Option 1/2/3. The internal ids stay out of the UI.
export const OPTORDER = ["n", "r", "d"];
export const OPTLABEL = { n: "Option 1", r: "Option 2", d: "Option 3" };
export const OPTFIRST = { n: "vol", r: "dir", d: "field" };

// The selector is normally reached only after the ear journey has led through
// these two shared gates. Keep the availability rule in the state module so
// every participant control applies the same prerequisite check.
export function optionSelectionReady(s) {
  return s.setupSeen === true && s.eduSeen === true;
}

export const STAGES = {
  n: [["intro", "Prepare"], ["edu", "What to listen for"], ["vol", "Volume"], ["p1", "Pitch · coarse"], ["p2", "Pitch · medium"], ["p3", "Pitch · fine"], ["conf", "Confidence"], ["done", "Complete"]],
  d: [["intro", "Prepare"], ["edu", "What to listen for"], ["field", "Broad field"], ["zoom", "Closer look"], ["conf", "Confidence"], ["done", "Complete"]],
  f: [["intro", "Prepare"], ["edu", "What to listen for"], ["family", "Sound families"], ["char", "Character"], ["tune", "Pitch and loudness"], ["layer", "More sounds"], ["conf", "Confidence"], ["done", "Complete"]],
  r: [["intro", "Prepare"], ["edu", "What to listen for"], ["dir", "Directional"], ["comp", "A/B comparisons"], ["conf", "Confidence"], ["done", "Complete"]],
  a: [["intro", "Prepare"], ["listen", "Adaptive loop"], ["chal", "Final check"], ["conf", "Confidence"], ["done", "Complete"]],
  t: [["field", "Broad field"], ["zoom", "Closer look"], ["behave", "How it behaves"], ["recap", "What you heard"]],
  l: [["ret", "Welcome back"], ["check", "Check-in"], ["prior", "Today vs. before"], ["refine", "Refine today"], ["reopen", "Fresh search"], ["conf", "Confidence"], ["done", "Complete"]]
};

// First working stage of a flow: past the shared intro/edu (and the
// longitudinal welcome-back), whether or not the concept is a hub option.
export function firstWorkingStage(c) {
  return OPTFIRST[c] || STAGES[c].map((z) => z[0]).find((id) => id !== "intro" && id !== "edu" && id !== "ret");
}

export function stageLabel(c, stage) {
  const row = (STAGES[c] || []).find((z) => z[0] === stage);
  return row ? row[1] : "";
}

/* ---------- fresh per-concept working state ---------- */
// Opening or restarting an option reseeds from these, so a participant never
// inherits a previous run's position. Values are the V5 prototype's exactly.

export function freshN() { return { pitch: .5, level: .4, center: .5, lo: .34, hi: .66, extra: 0, widened: 0, note: "", conf: null, closeEnough: false }; }
export function freshF() { return { editing: 1, s1: null, s2: null, fam: null, charIdx: null, work: null, note: "", conf: null }; }
export function freshR() { return { phase: "vol", level: .4, lstep: .18, center: .5, pstep: .2, spread: .28, volOk: 0, pitchOk: 0, dirRounds: 0, dirBase: 0, round: 1, uncertain: 0, msg: "", note: "", conf: null, stop: null }; }
export function freshD() { return { x: .5, y: .5, cx: .5, cy: .5, level: 0, heard: false, zoomed: false, note: "", conf: null }; }
export function freshA() { return { kind: "tone", kIdx: 0, est: .5, unc: .5, cand: .5, phase: "pitch", level: .45, lstep: .22, closes: 0, lcloses: 0, suggest: false, responded: false, msg: "Press play, then tell us how the sound compares to yours.", note: "", conf: null, stop: null }; }
export function freshT() { return { x: .5, y: .38, heard: false, labels: false, cx: .5, cy: .38, span: .34, behavior: null, note: "" }; }
export function freshL() { return { hasPrior: true, prior: { kind: "tone", pitch: .68, level: .42 }, transparent: false, checkin: null, picked: null, pitch: .68, level: .42, note: "", conf: null }; }

const FRESH = { n: freshN, r: freshR, d: freshD, f: freshF, a: freshA, l: freshL, t: freshT };
export function freshFor(cid) { return FRESH[cid](); }

export function initialState() {
  return {
    screen: "launch", concept: "n",
    stages: { n: "vol", f: "intro", r: "dir", d: "field", a: "listen", l: "ret", t: "field" },
    // ear starts unset: the Setup · Ear screen requires an explicit choice
    // before Continue unlocks (REQ-003). The engine treats unset as "both".
    showTech: false, muted: false, ear: "", playKey: null, framed: true, devScale: 1,
    hp: false, vol: 36, menuOpen: false, jumpOpen: false, menuStopped: false, optDone: {}, optOrder: [],
    setupWarn: false, earWarn: false,
    // Only the completion booleans below are persisted. onboardingInput is a
    // deliberately generic, local-only draft for the simulated account shell.
    onboardingSeen: false, earSeen: false, onboardingInput: "",
    eduSeen: false, setupSeen: false, heardStage: {}, prKey: null, prHeardA: false, prHeardB: false,
    n: freshN(), f: freshF(), r: freshR(), d: freshD(), a: freshA(), l: freshL(), t: freshT()
  };
}

/* ---------- sessionStorage persistence ---------- */
// Session-scoped, no identifiers: completion gates plus neutral option
// progress only. Raw ear/device values, onboarding drafts, confidence details,
// per-option answers and audio state never enter the stored object.

export const STORAGE_KEY = "pnq-mtp-v1";
export const PERSIST_KEYS = ["onboardingSeen", "earSeen", "setupSeen", "eduSeen", "optDone", "optOrder"];

function neutralOptionDone(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const result = {};
  for (const cid of OPTORDER) {
    // Boolean true is the current marker. Strings are accepted only to safely
    // migrate the previous confidence-valued storage shape.
    if (source[cid] === true || typeof source[cid] === "string" && source[cid].length > 0) result[cid] = true;
  }
  return result;
}

function completionOrder(value, done) {
  if (!Array.isArray(value)) return [];
  const unique = [];
  for (const cid of value) {
    if (OPTORDER.includes(cid) && done[cid] === true && !unique.includes(cid)) unique.push(cid);
  }
  return unique;
}

export function persistShape(s) {
  const optDone = neutralOptionDone(s.optDone);
  return {
    onboardingSeen: s.onboardingSeen === true,
    earSeen: s.earSeen === true,
    setupSeen: s.setupSeen === true,
    eduSeen: s.eduSeen === true,
    optDone,
    optOrder: completionOrder(s.optOrder, optDone)
  };
}

// Restore always chooses a safe shell location and starts from initialState(),
// which guarantees fresh option answers and silence. The small legacy branch
// recognizes the prior setup/progress shape without carrying its raw values
// forward; the next persistence pass rewrites it to the allowlist above.
export function restoreSession(raw) {
  if (!raw) return null;
  let v;
  try { v = JSON.parse(raw); } catch (e) { return null; }
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;

  const hasOnboardingFlag = Object.prototype.hasOwnProperty.call(v, "onboardingSeen");
  const legacyProgress = !hasOnboardingFlag && (
    v.setupSeen === true || v.eduSeen === true ||
    Array.isArray(v.optOrder) && v.optOrder.length > 0 ||
    v.optDone && typeof v.optDone === "object" && Object.keys(v.optDone).length > 0
  );
  const onboardingSeen = v.onboardingSeen === true || legacyProgress;
  if (!onboardingSeen) return initialState();

  const optDone = neutralOptionDone(v.optDone);
  const optOrder = completionOrder(v.optOrder, optDone);
  const restored = {
    ...initialState(),
    onboardingSeen: true,
    earSeen: v.earSeen === true,
    setupSeen: v.setupSeen === true,
    eduSeen: v.eduSeen === true,
    optDone,
    optOrder
  };
  // A current incomplete session resumes at its next required gate instead of
  // exposing the selector early. Legacy progress predates the surrounding
  // onboarding shell and keeps its established safe selector migration.
  const laterProgress = restored.setupSeen || restored.eduSeen || Object.keys(optDone).length > 0 || optOrder.length > 0;
  let screen = "dashboard";
  if (legacyProgress) screen = "home";
  else if (!restored.earSeen && laterProgress) screen = "ear";
  else if (restored.earSeen && !restored.setupSeen) screen = "setup";
  else if (restored.earSeen && restored.setupSeen && !restored.eduSeen) screen = "edu";
  else if (restored.earSeen && restored.setupSeen && restored.eduSeen) screen = "home";
  return { ...restored, screen, playKey: null };
}

/* ---------- chrome measurement (REQ-020) ---------- */
// One shell, two shapes: >=620px wide renders the framed 390x844 device scaled
// to fit; narrower renders bare fullscreen. Presentation only - no state loss.

export function measure(w, h) {
  const framed = w >= 620;
  const fit = Math.min((w - 44) / 390, (h - 44) / 844, 1);
  return { framed, devScale: framed ? Math.max(.4, Math.round(fit * 1000) / 1000) : 1 };
}

/* ---------- screen labels ---------- */
// Every screen root carries a stable data-screen-label. Existing V5 flow
// labels stay unchanged while the surrounding patient-app shell is extended.

const FLOW_LABELS = {
  n: { intro: "Narrowing · Prepare", edu: "Shared · What to listen for", vol: "Narrowing · Refinement pass", p1: "Narrowing · Refinement pass", p2: "Narrowing · Refinement pass", p3: "Narrowing · Refinement pass", conf: "Shared · Confidence", done: "Shared · Match complete" },
  d: { intro: "Field · Prepare", edu: "Shared · What to listen for", field: "Field · Pitch and volume", zoom: "Field · Pitch and volume", conf: "Shared · Confidence", done: "Shared · Match complete" },
  f: { intro: "Families · Prepare", edu: "Shared · What to listen for", family: "Families · Sound families", char: "Families · Character", tune: "Families · Pitch and loudness", layer: "Families · More sounds", conf: "Shared · Confidence", done: "Shared · Match complete" },
  r: { intro: "Comparison · Prepare", edu: "Shared · What to listen for", dir: "Shared · Listen and respond", comp: "Shared · Two-sound comparison", conf: "Shared · Confidence", done: "Shared · Match complete" },
  a: { intro: "Adaptive · Prepare", listen: "Shared · Listen and respond", chal: "Shared · Two-sound comparison", conf: "Shared · Confidence", done: "Shared · Match complete" },
  t: { field: "Education · Sound exploration", zoom: "Education · Sound exploration", behave: "Education · Sound exploration", recap: "Education · Sound exploration" },
  l: { ret: "Longitudinal · Welcome back", check: "Longitudinal · Check-in", prior: "Shared · Two-sound comparison", refine: "Longitudinal · Refine today", reopen: "Longitudinal · Fresh search", conf: "Shared · Confidence", done: "Shared · Match complete" }
};

export function screenLabelOf(screen, concept, stage) {
  if (screen === "launch") return "Launch";
  if (screen === "privacy") return "Privacy";
  if (screen === "account") return "Create account";
  if (screen === "dashboard") return "Dashboard";
  if (screen === "ear") return "Setup · Ear";
  if (screen === "setup") return "Setup · Headphones and volume";
  if (screen === "home") return "Matching options";
  if (screen === "edu") return "Shared · What to listen for";
  if (screen === "conclusion") return "Session complete";
  return (FLOW_LABELS[concept] || {})[stage] || "";
}

/* ---------- navigation reducers ---------- */
// Every screen or stage change returns playKey: null; the renderer calls the
// engine's hard stop alongside applying these.

const INITIAL_STAGES = { n: "vol", f: "intro", r: "dir", d: "field", a: "listen", l: "ret", t: "field" };

function freshWorkingState() {
  return {
    stages: { ...INITIAL_STAGES }, heardStage: {}, prKey: null, prHeardA: false, prHeardB: false,
    n: freshN(), f: freshF(), r: freshR(), d: freshD(), a: freshA(), l: freshL(), t: freshT()
  };
}

function clearedNavigationState() {
  return {
    playKey: null, menuOpen: false, jumpOpen: false, menuStopped: false,
    setupWarn: false, earWarn: false, prKey: null, prHeardA: false, prHeardB: false
  };
}

export function goScreenState(s, screen, extra) {
  const legacyOnboarding = s.screen === "launch" && screen === "ear";
  const completedEarGate = s.screen === "ear" && screen === "setup" && !!s.ear;
  return {
    ...s,
    ...(screen === "flow" ? {} : freshWorkingState()),
    onboardingSeen: legacyOnboarding ? true : s.onboardingSeen,
    earSeen: completedEarGate ? true : s.earSeen,
    onboardingInput: screen === "account" ? s.onboardingInput : "",
    ...(extra || {}),
    ...clearedNavigationState(),
    screen
  };
}

// Starts a new moderated session without retaining any prior setup, option, or
// conclusion state. The completed patient-app onboarding remains in place.
export function newSessionState(s) {
  const fresh = initialState();
  return {
    ...fresh,
    framed: s.framed,
    devScale: s.devScale,
    screen: "ear",
    onboardingSeen: true
  };
}

// Straight-through shell journey. Matching flow stage changes and option
// selection remain participant-controlled through their focused reducers.
export function advanceShellState(s) {
  if (s.screen === "launch") return goScreenState(s, "privacy");
  if (s.screen === "privacy") return goScreenState(s, "account");
  if (s.screen === "account") return goScreenState(s, "dashboard", { onboardingSeen: true, onboardingInput: "" });
  if (s.screen === "dashboard") return newSessionState(s);
  if (s.screen === "ear") return goScreenState(s, "setup", { earSeen: !!s.ear });
  if (s.screen === "setup") return goScreenState(s, "edu", { setupSeen: !!s.hp && s.vol >= 100 });
  if (s.screen === "edu") return goScreenState(s, "home", { eduSeen: true });
  return { ...s, ...clearedNavigationState() };
}

export function openOptionState(s, cid, stage, seed) {
  return {
    ...s, ...clearedNavigationState(), screen: "flow", concept: cid, heardStage: {},
    [cid]: seed || freshFor(cid),
    stages: { ...s.stages, [cid]: stage || OPTFIRST[cid] }
  };
}

export function jumpState(s, c, stage, conceptState) {
  return {
    ...s, ...clearedNavigationState(), screen: "flow", concept: c, heardStage: {},
    stages: { ...s.stages, [c]: stage },
    ...(conceptState ? { [c]: conceptState } : {})
  };
}

export function stageState(s, c, stage, obj) {
  return {
    ...s, ...clearedNavigationState(), heardStage: {},
    stages: { ...s.stages, [c]: stage },
    [c]: { ...s[c], note: "", ...(obj || {}) }
  };
}

// Full reset for the moderator between participants: every option, the setup
// steps and the screen return to their first-run state. The caller also clears
// sessionStorage under STORAGE_KEY.
export function resetAllState(s) {
  return initialState();
}

/* ---------- bottom bar: conditional Back ---------- */

export function navShow(s) {
  const inFlow = s.screen === "flow";
  const stage = s.stages[s.concept];
  const noNav = !inFlow || stage === "intro" || stage === "ret";
  return !noNav || s.screen === "ear" || s.screen === "setup" || s.screen === "edu";
}

// Before the session gates are complete, Back only steps to the immediately
// preceding screen; it cannot expose the option selector early. Once matching
// begins, an option's first working stage returns home, deeper stages step back
// one, and on the 2D field a zoom level steps out before a stage does.
export function backTarget(s) {
  if (s.screen === "ear") return { kind: "screen", screen: "dashboard" };
  if (s.screen === "setup") return { kind: "screen", screen: s.setupSeen && s.eduSeen ? "home" : "ear" };
  if (s.screen === "edu") return { kind: "screen", screen: s.eduSeen ? "home" : "setup" };
  if (s.screen !== "flow") return { kind: "screen", screen: "home" };
  const c = s.concept, ss = s.stages[c];
  const lv = (s.d && s.d.level) || 0;
  if (c === "d" && (ss === "field" || ss === "zoom") && lv > 0) {
    return { kind: "zoomOut", stage: lv === 1 ? "field" : "zoom", level: lv - 1 };
  }
  const list = STAGES[c].map((z) => z[0]);
  const first = list.indexOf(OPTFIRST[c]);
  const cur = list.indexOf(ss);
  if (cur <= Math.max(first, 0)) return { kind: "screen", screen: "home" };
  return { kind: "stage", stage: list[cur - 1] };
}

/* ---------- shared confidence + match complete (REQ-014, REQ-015) ---------- */
// Declarative data for the two screens every option funnels into, ported from
// the V5 prototype: technical formatting, patient-facing descriptions, the
// per-concept confidence intro, the keep-refining re-entry point per concept,
// the Match complete summary rows, and the completion reducer.

export const FRQ = { tone: [250, 10000], hiss: [350, 8400], buzz: [55, 440], click: [400, 6400] };
export const KWORD = { tone: "tone", hiss: "hiss", buzz: "buzzing", click: "clicking" };
export const BWORD = { steady: "Steady", pulse: "Pulsing", gap: "Comes and goes", waver: "Wavering" };

export function freqOf(kind, p) {
  const r = FRQ[kind] || FRQ.tone, q = Math.max(0, Math.min(1, p));
  return r[0] * Math.pow(r[1] / r[0], q);
}
export function fmtHz(f) { return f < 1000 ? Math.round(f / 5) * 5 + " Hz" : (f / 1000).toFixed(1) + " kHz"; }
export function fmtDb(l) { return Math.round(18 + Math.max(0, Math.min(1, l)) * 57) + " dB"; }
export function techOf(spec) { return "≈ " + fmtHz(freqOf(spec.kind, spec.pitch)) + " · " + fmtDb(spec.level); }
export function describe(spec) {
  const band = spec.pitch < .34 ? "lower pitch" : spec.pitch < .67 ? "medium pitch" : "high pitch";
  return BWORD[spec.behavior || "steady"] + " " + KWORD[spec.kind] + " · " + band;
}

// Contextual intro on the confidence screen, only where the prototype defines
// one for the concept's state.
export function confIntro(st) {
  const c = st.concept, o = st[c];
  if (c === "n" && o.closeEnough) return "“Close enough” is a real answer. Only you can judge the match.";
  if (c === "a" && o.stop === "patient") return "You chose to stop. That is fine. Only you can judge the match.";
  if (c === "a" && o.stop === "cant") return "You could not tell nearby sounds apart. Usually a sign the match is as close as listening can get.";
  if (c === "a" && o.stop) return "Refining stopped because nearby sounds were no longer getting closer to yours.";
  if (c === "l") return "Judge today’s sound on its own, not by memory of last time.";
  return "";
}

// Where "Keep refining" re-enters each concept's flow. Every target clears the
// recorded answer so returning to Confidence asks again.
export function keepRefiningTarget(st) {
  const c = st.concept;
  if (c === "n") return { stage: "p3", obj: { conf: null, note: "Take your time. If it still feels off, keep fine-tuning or widen the range." } };
  if (c === "f") return { stage: "tune", obj: { conf: null, work: st.f.s1 ? { ...st.f.s1 } : st.f.work, editing: 1, note: "Adjust anything. Nothing is locked in." } };
  if (c === "r") return { stage: "comp", obj: { conf: null, spread: .18, uncertain: 0, note: "A few more comparisons, then." } };
  if (c === "d") return { stage: "zoom", obj: { conf: null, cx: st.d.x, cy: st.d.y, level: Math.max(1, st.d.level || 0), heard: false, note: "Nothing is locked in. Move the marker as much as you like." } };
  if (c === "a") return { stage: "listen", obj: { conf: null, unc: .32, suggest: false, closes: 0, msg: "Okay. We’ll keep refining." } };
  return { stage: "refine", obj: { conf: null, note: "Adjust anything. Today’s judgment wins." } };
}

// Match complete: title, body, labeled summary rows and the technical readout
// line. `specs` is the concept's final matched sound (mainSpecs in the
// renderer), so the record reflects the participant's final parameters.
export function doneData(st, specs) {
  const c = st.concept, o = st[c], rows = [];
  if (c === "f") {
    const sounds = [o.s1, o.s2].filter(Boolean);
    specs = sounds.map((x) => x.spec);
    if (!sounds.length && o.work) { specs = [o.work.spec]; rows.push({ label: "YOUR MATCHED SOUND", sub: describe(o.work.spec) }); }
    sounds.forEach((sd, i) => rows.push({ label: "SOUND " + (i + 1), sub: describe(sd.spec) }));
  } else if (c === "n" || c === "r" || c === "d") {
    // Nothing here for the patient. "Middle pitch, quiet" is not actionable
    // for them; the values belong in the technical line below instead.
  } else {
    rows.push({ label: "YOUR MATCHED SOUND", sub: describe(specs[0]) });
  }
  rows.push({ label: "EAR", sub: st.ear || "Both ears" });
  if (o.conf) rows.push({ label: "HOW CLOSE IT FEELS", sub: o.conf });
  if (c === "a") rows.push({ label: "HOW IT ENDED", sub: o.stop === "patient" ? "You chose to stop" : "Nearby checks stopped improving" });
  if (c === "r") rows.push({ label: "HOW IT ENDED", sub: o.stop === "floor" ? "The comparisons could not get any closer" : "You chose to finish" });
  if (c === "l") rows.push({ label: "COMPARED WITH LAST TIME", sub: o.picked === "prior" ? "Similar to your previous match" : "A little different, and that is normal" });
  let tech = specs.map((x) => techOf(x)).join("  ·  ");
  if (c === "l") tech += "  ·  previous " + techOf({ kind: o.prior.kind, pitch: o.prior.pitch, level: o.prior.level });
  return {
    rows: rows.map((r2, i) => ({ ...r2, bt: i === 0 ? "none" : "1px solid var(--gray-100)" })),
    title: "That’s this one done",
    body: "",
    tech
  };
}

// Predict the destination of the participant action on Match complete without
// mutating progress. The open option counts once even when it was completed
// before, so duplicate runs can never finish a session early.
export function completionDestination(s) {
  if (!OPTORDER.includes(s.concept)) return "home";
  const optDone = { ...neutralOptionDone(s.optDone), [s.concept]: true };
  return OPTORDER.every((cid) => optDone[cid] === true) ? "conclusion" : "home";
}

// Mark the open participant option with a neutral completion marker. The first
// and second distinct options return to the selector; the third reaches the
// stable final conclusion. Confidence remains only in memory and is never
// copied here.
export function completeOptionState(s) {
  const c = s.concept;
  if (!OPTORDER.includes(c)) return goScreenState(s, "home");
  const optDone = { ...neutralOptionDone(s.optDone), [c]: true };
  const priorOrder = completionOrder(s.optOrder, optDone);
  const optOrder = priorOrder.includes(c) ? priorOrder : [...priorOrder, c];
  return {
    ...goScreenState(s, completionDestination(s)),
    optDone,
    optOrder
  };
}

/* ---------- moderator jump targets ---------- */
// Each one seeds a state the destination can actually run from: the V5
// prototype's stage jumps followed by its per-concept scenario presets.

export function jumpStages(cid) {
  const mk = (label, stage, seed) => ({ label, stage, seed: { ...freshFor(cid), ...(seed || {}) } });
  if (cid === "n") return [
    mk("Volume", "vol"),
    mk("Pitch · coarse", "p1", { center: .5 }),
    mk("Pitch · medium", "p2", { center: .5, level: .44 }),
    mk("Pitch · fine", "p3", { center: .5, level: .44 }),
    mk("Confidence", "conf", { pitch: .5, level: .44 }),
    mk("Extended · 5 passes", "p3", { level: .48, pitch: .615, extra: 2, note: "Another pass, narrower again. Keep going for as long as it helps." }),
    mk("“Didn’t hear anything”", "vol", { level: .57, note: "That’s okay. We made the sound a little easier to hear. Press play and try again." }),
    mk("Recovered · widened", "p1", { level: .48, widened: 1, note: "We’ve widened the pitch range again. Take your time. Close is good enough at this stage." }),
    mk("Low confidence", "conf", { pitch: .61, conf: "Not close yet" }),
    mk("High confidence", "conf", { pitch: .61, conf: "Very close" })
  ];
  if (cid === "r") return [
    mk("Directional · volume", "dir"),
    mk("Directional · pitch", "dir", { phase: "pitch", volOk: 1, level: .46 }),
    mk("A/B comparisons", "comp", { phase: "pitch", center: .58, level: .46, spread: .26, round: 2 }),
    mk("A/B · near the floor", "comp", { phase: "pitch", center: .58, level: .46, spread: .075, round: 7 }),
    mk("A/B · long session", "comp", { phase: "pitch", center: .58, level: .46, spread: .1, round: 11 }),
    mk("Confidence", "conf", { center: .58, level: .46 }),
    mk("Steps converging", "dir", { phase: "pitch", volOk: 1, level: .46, center: .62, pstep: .072, dirRounds: 6 }),
    mk("A/B · early", "comp", { phase: "pitch", center: .62, level: .46, spread: .26, round: 2 }),
    mk("A/B · nearly identical", "comp", { phase: "pitch", center: .62, level: .46, spread: .075, round: 7 }),
    mk("“Neither is close”", "comp", { phase: "pitch", center: .5, level: .46, spread: .38, round: 4, uncertain: 1, note: "Neither, then. We have widened out and moved to a different area." }),
    mk("Bounced back to directions", "dir", { phase: "pitch", volOk: 1, level: .46, pstep: .18, dirRounds: 8, msg: "Those were hard to tell apart, so we have gone back to simple directions. Is your sound higher or lower than this?" }),
    mk("Long session · fatigue", "comp", { phase: "pitch", center: .62, level: .46, spread: .1, round: 14 })
  ];
  return [
    mk("Whole field", "field"),
    mk("Closer look", "zoom", { heard: true, level: 1, cx: .5, cy: .5 }),
    mk("Closer look · closest", "zoom", { heard: true, level: 2, cx: .5, cy: .5 }),
    mk("Confidence", "conf", { heard: true, level: 2 }),
    mk("Heard it · exploring", "field", { heard: true, x: .68, y: .44 }),
    mk("Edge of the range", "field", { heard: true, x: .96, y: .06 }),
    mk("“Didn’t hear anything”", "field", { note: "That’s okay, and worth telling us. Try moving the marker higher for a louder sound, or check your headphones." }),
    mk("Low confidence", "conf", { heard: true, x: .68, y: .44, conf: "Not close yet" }),
    mk("High confidence", "conf", { heard: true, x: .68, y: .44, conf: "Very close" })
  ];
}

/* ---------- progress header ---------- */
// One progress treatment in the chrome for every in-flow stage that defines
// one: stage label, phase caption, and the animated 6px bar width.

const pct = (v) => Math.round(Math.max(0, Math.min(1, v)) * 100) + "%";

export function progress(c, s, st) {
  const off = { show: false, lbl: "", phase: "", w: "0%", cap: "" };
  const on = (lbl, w, cap, phase) => ({ show: true, lbl, w, cap, phase: phase || "" });
  if (["intro", "ret", "conf", "done", "reopen", "edu", "behave", "recap"].includes(s)) return off;
  if (c === "t" && (s === "field" || s === "zoom")) return off;
  if (c === "n") {
    const n = st.n, pitchTotal = 3 + n.extra;
    if (s === "vol") return on("MATCHING YOUR SOUND", pct(1 / (pitchTotal + 1) * .55), "Volume first. One pass, then the pitch.", "VOLUME");
    const step = { p1: 1, p2: 2, p3: pitchTotal }[s];
    if (!step) return off;
    const cap = {
      p1: "The whole pitch range is open. There are closer passes after this one.",
      p2: "A smaller range around your last choice. One more pass after this.",
      p3: n.extra ? "As close as this gets. Keep going for as long as it helps." : "Only nearby pitches remain. You can keep going if it still feels off."
    }[s];
    return on("MATCHING YOUR SOUND", pct((step + 1) / (pitchTotal + 1)), cap, "PITCH " + step + " OF " + pitchTotal);
  }
  if (c === "d") {
    const m = { field: ["35%", "BROAD"], zoom: ["80%", "CLOSER"] }[s];
    return m ? on("FINDING YOUR SOUND", m[0], "", m[1]) : off;
  }
  if (c === "r") {
    const r = st.r;
    if (s === "dir") {
      const inPhase = Math.max(0, r.dirRounds - (r.dirBase || 0));
      const eased = 1 - Math.pow(.68, inPhase);
      const band = r.phase === "vol" ? [5, 32] : [38, 76];
      const w = Math.round(band[0] + (band[1] - band[0]) * eased) + "%";
      return on("MATCHING YOUR SOUND", w, "", r.phase === "vol" ? "VOLUME" : "PITCH");
    }
    if (s !== "comp") return off;
    const left = Math.max(1, Math.ceil(Math.log(.06 / r.spread) / Math.log(.6)));
    const spent = r.round - 1, total = spent + left;
    return on("COMPARING", pct(.76 + (spent / total) * .22), "Each choice halves the difference between the two sounds.", "PAIR " + r.round + " OF " + total);
  }
  if (c === "f") {
    const m = { family: ["20%", "Choosing a starting description."], char: ["40%", "Narrowing within that description."], tune: ["65%", "Adjusting pitch and loudness."], layer: ["85%", "Adding a second sound, if there is one."] }[s];
    return m ? on("FINDING YOUR SOUND", m[0], m[1]) : off;
  }
  if (c === "a" && s === "chal") return on("GETTING CLOSER", "94%", "Final check suggested by your answers.");
  if (c === "a" && s === "listen") {
    const a = st.a;
    const w = Math.round((a.phase === "loud" ? .78 + a.lcloses * .07 : (1 - a.unc) * .75) * 100) + "%";
    const cap = a.unc > .35 && a.phase === "pitch" ? "Broad. Feeling out the area." : a.phase === "pitch" ? "Focusing. The search is tightening." : "Close. Settling the loudness.";
    return on("GETTING CLOSER", w, cap, a.phase === "pitch" ? "MATCHING PITCH" : "MATCHING LOUDNESS");
  }
  if (c === "l") {
    const m = { checkin: ["30%", "Checking what changed since last time."], refine: ["70%", "Fine-tuning against what you hear today."] }[s];
    return m ? on("TODAY'S MATCH", m[0], m[1]) : off;
  }
  return off;
}
