/*
 * PNQ Sound Matching - app shell renderer (REQ-001, REQ-020).
 * State machine, persistence and navigation logic live in ./app-shell.js;
 * this module renders the screens with PNQ Health Design System components.
 * All colors, type, spacing and radii come from the design system's
 * CSS custom properties (var(--*)); no new literal palette values.
 */
import * as shell from "./app-shell.js";
import * as gating from "./gating.js";
import * as fam from "./family-flow.js";

const DS = window.PNQHealthDesignSystem_deabce;
const e = React.createElement;

// Onboarding examples: loudness holds pitch constant and pitch holds loudness
// constant, so neither word gets defined by the other.
const EDU = [
  { cap: "PITCH", title: "How high or low a sound is", body: "Both of these are the same loudness. Only the pitch changes.",
    items: [["A lower sound", { kind: "tone", pitch: .22, level: .42, bright: .1, behavior: "steady" }],
            ["A higher sound", { kind: "tone", pitch: .78, level: .42, bright: .2, behavior: "steady" }]] },
  { cap: "LOUDNESS", title: "How loud a sound is", body: "Both of these are the same pitch. Only the loudness changes.",
    items: [["Quieter", { kind: "tone", pitch: .5, level: .26, bright: .14, behavior: "steady" }],
            ["Louder", { kind: "tone", pitch: .5, level: .62, bright: .14, behavior: "steady" }]] }
];

const DVOL = { min: .12, max: .68 };
const dSpec = (d) => ({ kind: "tone", pitch: d.x, level: DVOL.max - d.y * (DVOL.max - DVOL.min), bright: .3, behavior: "steady" });

function mainSpecs(st) {
  const c = st.concept;
  if (c === "n") return [{ kind: "tone", pitch: st.n.pitch, level: st.n.level, bright: .3, behavior: "steady" }];
  if (c === "r") return [{ kind: "tone", pitch: st.r.center, level: st.r.level, bright: .3, behavior: "steady" }];
  if (c === "d") return [dSpec(st.d)];
  if (c === "f") return fam.mainSpecs(st.f, st.stages.f);
  if (c === "l") return [{ kind: st.l.prior.kind, pitch: st.l.pitch, level: st.l.level, bright: .25, behavior: "steady" }];
  return [{ kind: "tone", pitch: .5, level: .42, bright: .2, behavior: "steady" }];
}

const font = {
  label: "700 10.5px var(--font-ui)",
  heading: (px) => "700 " + px + "px/1.14 var(--font-ui)",
  body: "400 14.5px/1.5 var(--font-text)"
};

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = shell.initialState();
    this.aud = null;
    this.skipNextPersist = false;
  }

  componentDidMount() {
    // Audio engine (REQ-017): the app's only playback path - never add a second.
    this.audP = import("./audio-engine.js").then((m) => {
      this.aud = m;
      window.__pnqAudioEngine = m;
      m.setMuted(this.state.muted);
      m.setEar(this.state.ear === "Left ear" ? "left" : this.state.ear === "Right ear" ? "right" : "both");
      return m;
    }).catch(() => null);
    try {
      const restored = shell.restoreSession(sessionStorage.getItem(shell.STORAGE_KEY));
      if (restored) this.setState(restored);
    } catch (err) {}
    this.measure = () => {
      this.setState(shell.measure(window.innerWidth, window.innerHeight));
    };
    this.measure();
    window.addEventListener("resize", this.measure);
    window.__pnqAppState = () => this.state;
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.measure);
    if (this.aud) this.aud.stop();
  }

  componentDidUpdate() {
    if (this.skipNextPersist) {
      this.skipNextPersist = false;
      try { sessionStorage.removeItem(shell.STORAGE_KEY); } catch (err) {}
    } else {
      try {
        sessionStorage.setItem(shell.STORAGE_KEY, JSON.stringify(shell.persistShape(this.state)));
      } catch (err) {}
    }
    // React state is the single source of truth for playback: playKey null
    // means silence, even if a voice somehow outlived its screen.
    if (this.state.playKey === null) this.withAudio((a) => { if (a.playingKey() !== null) a.stop(); });
  }

  withAudio(f) { if (this.aud) f(this.aud); else if (this.audP) this.audP.then((m) => { if (m) { this.aud = m; f(m); } }); }

  // Every screen change goes through here. panic() rebuilds the output graph,
  // so a tone can never outlive the screen that started it.
  hardStop() {
    this.withAudio((a) => { if (a.panic) a.panic(); else a.stop(); });
    if (this.state.playKey !== null) this.setState({ playKey: null });
  }

  stopAudio() { this.withAudio((a) => a.stop()); if (this.state.playKey !== null) this.setState({ playKey: null }); }

  toggleKey(key, specs) {
    if (this.state.playKey === key) { this.stopAudio(); return; }
    if (this.state.playKey !== null) this.withAudio((a) => a.stop());
    this.withAudio((a) => a.play(key, specs));
    // Starting the stage's main voice is what unlocks its primary CTA (REQ-018).
    if (key === "main") this.setState((s) => ({ playKey: key, ...gating.markHeardState(s) }));
    else this.setState({ playKey: key });
  }

  // A/B pair gating (REQ-018): playing one side records it for the current
  // pair; a new pair key re-locks both choices until both sides are heard.
  prHeard(which, key) { this.setState((s) => gating.prHeardState(s, which, key)); }

  prReady(key) { return gating.prReady(this.state, key); }

  // In-place concept patch. If the main voice is sounding, the change is
  // heard live (tuning sliders adjust the tone while it plays).
  pat(c, obj) {
    this.setState((s) => ({ [c]: { ...s[c], ...obj } }), () => {
      if (this.state.playKey === "main") this.withAudio((a) => a.update(mainSpecs(this.state)));
    });
  }

  // Apply a pure family-flow transition ({ pat } or { go: [stage, obj] }).
  fAct(r) { if (r.pat) this.pat("f", r.pat); else this.go("f", r.go[0], r.go[1]); }

  goScreen(screen, extra) {
    this.hardStop();
    this.setState((s) => shell.goScreenState(s, screen, extra));
  }

  openOption(cid, stage, seed) {
    this.hardStop();
    this.setState((s) => shell.openOptionState(s, cid, stage, seed));
  }

  jump(c, stage, conceptState) {
    this.hardStop();
    this.setState((s) => shell.jumpState(s, c, stage, conceptState));
  }

  go(c, stage, obj) {
    this.hardStop();
    this.setState((s) => shell.stageState(s, c, stage, obj));
  }

  resetAll() {
    this.skipNextPersist = true;
    this.hardStop();
    try { sessionStorage.removeItem(shell.STORAGE_KEY); } catch (err) {}
    this.setState((s) => shell.resetAllState(s));
  }

  setEar(label) {
    const key = label === "Left ear" ? "left" : label === "Right ear" ? "right" : "both";
    this.setState({ ear: label, earWarn: false });
    this.withAudio((a) => a.setEar && a.setEar(key));
  }

  onBack() {
    const t = shell.backTarget(this.state);
    if (t.kind === "screen") return this.goScreen(t.screen);
    if (t.kind === "zoomOut") {
      return this.go("d", t.stage, {
        level: t.level,
        note: t.level === 0 ? "Back to the whole range. Your marker is where you left it." : "Back out one step. Your marker is where you left it."
      });
    }
    return this.go(this.state.concept, t.stage);
  }

  /* ---------- shared bits ---------- */

  bottomButton(label, onClick, opts) {
    return e("div", { style: { flex: "none", padding: "8px 22px 0", background: (opts && opts.bg) || "var(--gray-50)" } },
      e(DS.Button, { variant: "primary", size: "md", disabled: !!(opts && opts.disabled), onDark: !!(opts && opts.onDark), onClick }, label),
      e("div", { style: { height: "9px" } }));
  }

  playRow(label, key, specs) {
    const playing = this.state.playKey === key;
    return e("button", {
      key, onClick: () => this.toggleKey(key, specs),
      style: {
        display: "flex", alignItems: "center", gap: "13px", width: "100%", minHeight: "56px",
        padding: "12px 16px", borderRadius: "14px", cursor: "pointer",
        border: "1.5px solid " + (playing ? "var(--interface-selected-border)" : "var(--gray-200)"),
        background: playing ? "var(--interface-selected)" : "var(--white)", textAlign: "left"
      }
    },
      e("span", { style: { flex: 1, font: "600 15px var(--font-ui)", color: "var(--text-heading)" } }, label),
      e("span", { style: { font: "700 12px var(--font-ui)", color: playing ? "var(--control-accent)" : "var(--text-muted)" } }, playing ? "Stop" : "Play"));
  }

  /* ---------- screens ---------- */

  renderLaunch() {
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "30px 24px 10px" } },
        e("img", { src: "assets/waveform-mark-navy.svg", alt: "", style: { width: "34px", height: "34px" } }),
        e("div", { style: { font: font.label, letterSpacing: ".16em", color: "var(--text-label)", marginTop: "20px" } }, "PNQ SOUND MATCHING"),
        e("div", { style: { font: "700 28px/1.1 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.02em", marginTop: "10px" } }, "Let's find the sound you hear"),
        e("div", { style: { font: "400 15px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "12px" } },
          "You'll listen through headphones and adjust a tone until it comes close to the sound you hear in your tinnitus."),
        e("div", { style: { display: "flex", flexDirection: "column", gap: "11px", marginTop: "22px" } },
          ["There are no right or wrong answers. Only you can hear your tinnitus.",
            "You can stop the sound at any time, and take a break whenever you need one.",
            "If you cannot hear something, say so. That is useful, not a failure."].map((t, i) =>
            e("div", { key: i, style: { display: "flex", gap: "11px", alignItems: "flex-start" } },
              e("span", { style: { flex: "none", width: "7px", height: "7px", borderRadius: "50%", background: "var(--blue-400)", marginTop: "7px" } }),
              e("span", { style: { font: "400 14.5px/1.45 var(--font-text)", color: "var(--text-body)" } }, t))))),
      this.bottomButton("Get started", () => this.goScreen("ear"))
    ];
  }

  renderEar() {
    const st = this.state;
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "18px 22px 10px" } },
        e("div", { style: { font: "700 23px/1.16 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em" } }, "Which ear would you like to work with?"),
        e("div", { style: { font: "400 14px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "8px" } },
          "Sound plays only in the ear you choose. If you hear it in both, pick the side where it is strongest, or choose both ears."),
        e("div", { style: { display: "flex", flexDirection: "column", gap: "9px", marginTop: "18px" } },
          ["Left ear", "Right ear", "Both ears"].map((label) =>
            e(DS.SelectRow, { key: label, label, selected: st.ear === label, onClick: () => this.setEar(label) }))),
        st.earWarn ? e("div", { style: { marginTop: "14px" } }, e(DS.InlineAlert, { tone: "error" }, "Choose an ear to continue.")) : null),
      this.bottomButton("Continue", () => st.ear ? this.goScreen("setup") : this.setState({ earWarn: true }), { disabled: !st.ear })
    ];
  }

  // Status dot inside the setup pills: green/red disc with a check/close glyph.
  setupDot(ok, px) {
    return e("span", { style: { flex: "none", display: "flex", alignItems: "center", justifyContent: "center", width: px + "px", height: px + "px", borderRadius: "50%", background: ok ? "var(--green-400)" : "var(--red-400)" } },
      e(DS.Icon, { name: ok ? "check" : "close", size: 11, color: "var(--navy-900)", strokeWidth: 3.4 }));
  }

  renderSetup() {
    const st = this.state;
    const ready = st.vol >= 100;
    const onVolSlide = (ev) => this.setState({ vol: Math.round(parseFloat(ev.target.value)), setupWarn: false });
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "22px 22px 10px" } },
        e("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" } },
          e(DS.Icon, { name: "headphones", size: 54, color: "var(--magenta-500)" }),
          e("div", { style: { font: font.heading(26), color: "var(--white)", letterSpacing: "-.015em", marginTop: "14px" } }, "Let's get set up"),
          e("div", { style: { font: "400 14.5px/1.45 var(--font-text)", color: "var(--on-dark-60)", marginTop: "7px" } }, "A quick check before you begin.")),
        e("div", { style: { marginTop: "20px", background: "var(--interface-dark-raised)", border: "1px solid var(--interface-dark-border)", borderRadius: "16px", padding: "18px 16px" } },
          e("button", {
            onClick: () => this.setState((x) => ({ hp: !x.hp, setupWarn: false })),
            style: { display: "flex", alignItems: "center", gap: "13px", width: "100%", minHeight: "44px", border: "none", background: "transparent", padding: 0, cursor: "pointer", textAlign: "left" }
          },
            e(DS.Icon, { name: "headphones", size: 26, color: "var(--magenta-500)" }),
            e("span", { style: { flex: 1 } },
              e("span", { style: { display: "block", font: "700 16px var(--font-ui)", color: "var(--white)" } }, "Headphones"),
              e("span", { style: { display: "block", font: "400 12.5px/1.35 var(--font-text)", color: "var(--on-dark-50)", marginTop: "2px" } },
                st.hp ? "Your headphones are ready" : "Plug in headphones or earphones")),
            e("span", {
              style: { flex: "none", display: "inline-flex", alignItems: "center", gap: "6px", background: st.hp ? "var(--status-success-tint-dark)" : "var(--status-danger-tint)", borderRadius: "999px", padding: "6px 11px 6px 8px" }
            },
              this.setupDot(st.hp, 16),
              e("span", { style: { font: "700 12px var(--font-ui)", color: st.hp ? "var(--status-success-text)" : "var(--status-danger-text)" } }, st.hp ? "Connected" : "Not detected"))),
          e("div", { style: { height: "1px", background: "var(--interface-dark-border)", margin: "16px 0" } }),
          e("div", { style: { display: "flex", alignItems: "center", gap: "13px" } },
            e(DS.Icon, { name: "volume", size: 26, color: "var(--magenta-500)" }),
            e("span", { style: { flex: 1 } },
              e("span", { style: { display: "block", font: "700 16px var(--font-ui)", color: "var(--white)" } }, "Device Volume"),
              e("span", { style: { display: "block", font: "400 12.5px/1.35 var(--font-text)", color: "var(--on-dark-50)", marginTop: "2px" } }, "Turn it all the way up")),
            e("span", { style: { flex: "none", font: "700 21px var(--font-ui)", color: ready ? "var(--status-success-text)" : "var(--status-danger-text)", fontVariantNumeric: "tabular-nums" } },
              st.vol + "%", ready ? null : e("span", { style: { font: "500 13px var(--font-ui)", color: "var(--on-dark-50)" } }, " / 100%"))),
          e("div", { style: { marginTop: "14px", border: "1px solid " + (ready ? "var(--status-success-border-dark)" : "var(--status-danger-border-dark)"), borderRadius: "12px", padding: "12px 13px 14px", background: ready ? "var(--status-success-tint-dark)" : "var(--status-danger-tint)" } },
            e("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
              this.setupDot(ready, 17),
              e("span", { style: { font: "700 13px var(--font-ui)", color: ready ? "var(--status-success-text)" : "var(--status-danger-text)" } },
                ready ? "Ready" : "100% required to continue")),
            e("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginTop: "11px" } },
              e(DS.Icon, { name: "volumeLow", size: 17, color: "var(--on-dark-50)" }),
              e("div", { style: { position: "relative", flex: 1, height: "40px", display: "flex", alignItems: "center" } },
                e("div", { style: { position: "absolute", left: 0, right: 0, height: "5px", borderRadius: "999px", background: "var(--interface-dark-border)" } }),
                e("div", { style: { position: "absolute", left: 0, height: "5px", borderRadius: "999px", background: ready ? "var(--green-400)" : "var(--red-400)", width: st.vol + "%" } }),
                e("div", { style: { position: "absolute", left: st.vol + "%", width: "26px", height: "26px", marginLeft: "-13px", borderRadius: "50%", background: "var(--white)", boxShadow: "var(--shadow-thumb-dark)" } }),
                e("input", {
                  type: "range", min: 0, max: 100, step: 1, value: st.vol, "aria-label": "Device volume",
                  onInput: onVolSlide, onChange: onVolSlide,
                  style: { position: "absolute", left: "-13px", right: "-13px", width: "calc(100% + 26px)", height: "40px", margin: 0, opacity: 0, cursor: "pointer", WebkitAppearance: "none", appearance: "none", background: "transparent" }
                })),
              e(DS.Icon, { name: "volume", size: 17, color: "var(--on-dark-50)" })))),
        e("div", { style: { font: "400 13.5px/1.5 var(--font-text)", color: "var(--on-dark-50)", textAlign: "center", marginTop: "18px" } },
          "You'll hear one or more sounds and compare them to the tinnitus you hear.")),
      e("div", { key: "f", style: { flex: "none", padding: "8px 22px 0", background: "var(--navy-900)" } },
        e(DS.Button, {
          variant: "primary", size: "md", onDark: true, disabled: !(st.hp && ready),
          onClick: () => (st.hp && st.vol >= 100) ? this.goScreen("home", { setupSeen: true }) : this.setState({ setupWarn: true })
        }, "Continue"),
        e("div", { style: { height: "9px" } }))
    ];
  }

  // One hub row, prototype markup: title with optional one-line subtitle,
  // check "Done" pill, chevron. Locked rows keep aria-disabled plus the
  // non-interactive styling but stay in the layout so nothing shifts.
  homeRow(row) {
    const locked = !!row.locked;
    return e("button", {
      key: row.key, onClick: row.open, "aria-disabled": locked ? "true" : undefined,
      style: {
        display: "flex", alignItems: "center", gap: "13px", width: "100%", minHeight: "72px", padding: "16px 16px",
        borderRadius: "16px", border: "1.5px solid var(--gray-200)",
        background: locked ? "var(--gray-100)" : "var(--white)",
        boxShadow: locked ? "none" : "var(--shadow-card-sm)",
        cursor: locked ? "not-allowed" : "pointer", textAlign: "left"
      }
    },
      e("span", { style: { flex: 1 } },
        e("span", { style: { display: "block", font: "700 17px var(--font-ui)", color: locked ? "var(--gray-400)" : "var(--text-heading)" } }, row.label),
        row.subShow ? e("span", { style: { display: "block", font: "400 13px/1.4 var(--font-text)", color: "var(--text-muted)", marginTop: "3px" } }, row.sub) : null),
      row.done ? e("span", { style: { flex: "none", display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--gray-100)", borderRadius: "999px", padding: "5px 10px 5px 7px" } },
        e(DS.Icon, { name: "check", size: 13, color: "var(--gray-600)", strokeWidth: 3.2 }),
        e("span", { style: { font: "600 11.5px var(--font-ui)", color: "var(--gray-600)" } }, "Done")) : null,
      e(DS.Icon, { name: "chevronRight", size: 20, color: "var(--gray-400)" }));
  }

  renderHome() {
    const st = this.state;
    const ready = st.setupSeen && st.eduSeen;
    const setupRows = [
      { key: "setup", label: "Headphones and volume", sub: "", subShow: false, done: st.setupSeen, open: () => this.goScreen("setup") },
      { key: "edu", label: "What to listen for", sub: "", subShow: false, done: st.eduSeen, open: () => this.goScreen("edu") }
    ];
    // The three options stay locked until both setupSeen and eduSeen are true,
    // so every participant gets identical priming. The open handler re-checks
    // live state: aria-disabled does not block clicks by itself.
    const optionRows = shell.OPTORDER.map((cid) => ({
      key: cid, label: shell.OPTLABEL[cid], sub: "", subShow: false,
      done: !!st.optDone[cid], locked: !ready,
      open: () => {
        const x = this.state;
        if (!(x.setupSeen && x.eduSeen)) return;
        this.openOption(cid);
      }
    }));
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "18px 22px 10px" } },
        e(DS.SectionLabel, null, "SOUND PLAYS IN"),
        e("div", { style: { marginTop: "11px" } },
          e(DS.SegmentedControl, {
            options: ["Left", "Right", "Both"],
            value: { "Left ear": "Left", "Right ear": "Right", "Both ears": "Both" }[st.ear] || "Both",
            onChange: (v) => this.setEar({ Left: "Left ear", Right: "Right ear", Both: "Both ears" }[v] || "Both ears")
          })),
        e("div", { style: { marginTop: "26px" } }, e(DS.SectionLabel, null, "GETTING SET UP")),
        e("div", { style: { display: "flex", flexDirection: "column", gap: "11px", marginTop: "11px" } },
          setupRows.map((row) => this.homeRow(row))),
        e("div", { style: { marginTop: "26px" } }, e(DS.SectionLabel, null, "MATCHING")),
        e("div", { style: { display: "flex", flexDirection: "column", gap: "11px", marginTop: "11px" } },
          optionRows.map((row) => this.homeRow(row)))),
      e("div", { key: "f", style: { flex: "none", padding: "8px 22px 0", background: "var(--gray-50)" } }, e("div", { style: { height: "9px" } }))
    ];
  }

  // One shared education step (REQ-006): example play buttons per the V5
  // prototype's edu cards. Rendered by the top-level screen and the in-flow
  // step alike; only the completion handler differs.
  eduExample(label, key, spec) {
    const playing = this.state.playKey === key;
    return e("button", {
      key, onClick: () => this.toggleKey(key, [spec]),
      style: {
        flex: 1, display: "flex", alignItems: "center", gap: "9px", padding: "11px 12px",
        borderRadius: "14px", cursor: "pointer",
        background: playing ? "var(--interface-selected)" : "var(--white)",
        border: "1.5px solid " + (playing ? "var(--interface-selected-border)" : "var(--gray-200)")
      }
    },
      e("span", { style: { flex: "none", width: "34px", height: "34px", borderRadius: "50%", border: "1.5px solid var(--blue-border)", background: playing ? "var(--control-accent)" : "var(--white)", display: "flex", alignItems: "center", justifyContent: "center" } },
        playing
          ? e("span", { style: { display: "flex", gap: "3px" } },
            e("span", { style: { width: "3px", height: "11px", background: "var(--white)", borderRadius: "1px" } }),
            e("span", { style: { width: "3px", height: "11px", background: "var(--white)", borderRadius: "1px" } }))
          : e("span", { style: { display: "block", width: 0, height: 0, borderLeft: "9px solid var(--control-accent)", borderTop: "6px solid transparent", borderBottom: "6px solid transparent", marginLeft: "3px" } })),
      e("span", { style: { font: "600 13.5px/1.25 var(--font-ui)", color: "var(--text-heading)", textAlign: "left" } }, label));
  }

  renderEdu(onDone) {
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "14px 22px 10px" } },
        e("div", { style: { font: "700 23px/1.16 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em" } }, "What to listen for"),
        e("div", { style: { font: "400 14px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "7px" } },
          "Two things change while you match. Play these so you know what we mean before you start."),
        EDU.map((g) =>
          e("div", { key: g.cap, style: { marginTop: "16px" } },
            e(DS.Card, { variant: "section" },
              e("div", { style: { font: font.label, letterSpacing: ".16em", color: "var(--text-label)" } }, g.cap),
              e("div", { style: { font: "600 15px/1.3 var(--font-ui)", color: "var(--text-heading)", marginTop: "7px" } }, g.title),
              e("div", { style: { font: "400 13.5px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "5px" } }, g.body),
              e("div", { style: { display: "flex", gap: "8px", marginTop: "13px" } },
                g.items.map(([label, spec], i) => this.eduExample(label, "edu-" + g.cap + i, spec))))))),
      e("div", { key: "f", style: { flex: "none", padding: "8px 22px 0", background: "var(--gray-50)" } },
        e(DS.Button, { variant: "primary", size: "sm", onClick: onDone }, "I'm ready to start"),
        e("div", { style: { height: "9px" } }))
    ];
  }

  /* ---------- preserved V5 Sound-Family Guided flow (REQ-010) ---------- */

  // Blue contextual note box used across the family stages' footers.
  fNote(text) {
    return e("div", { style: { background: "var(--blue-50)", border: "1px solid var(--blue-200)", borderRadius: "12px", padding: "11px 14px", font: "400 13.5px/1.5 var(--font-text)", color: "var(--gray-700)", marginBottom: "1px" } }, text);
  }

  // 40px round preview button: independent of the row's select handler.
  fPlayBtn(pk, specs) {
    const playing = this.state.playKey === pk;
    return e("button", {
      "aria-label": playing ? "Stop example" : "Play example",
      onClick: (ev) => { ev.stopPropagation(); this.toggleKey(pk, specs); },
      style: { flex: "none", width: "40px", height: "40px", borderRadius: "50%", border: "1.5px solid var(--blue-border)", background: playing ? "var(--control-accent)" : "var(--white)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }
    },
      playing
        ? e("span", { style: { display: "flex", gap: "3px" } },
          e("span", { style: { width: "4px", height: "13px", background: "var(--white)", borderRadius: "1px" } }),
          e("span", { style: { width: "4px", height: "13px", background: "var(--white)", borderRadius: "1px" } }))
        : e("span", { style: { display: "block", width: 0, height: 0, borderLeft: "11px solid var(--control-accent)", borderTop: "7px solid transparent", borderBottom: "7px solid transparent", marginLeft: "3px" } }));
  }

  fTick(sel) {
    return e("span", { style: { flex: "none", width: "22px", height: "22px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: sel ? "var(--control-accent)" : "var(--white)", border: "1.5px solid " + (sel ? "var(--control-accent)" : "var(--gray-300)") } },
      sel ? e(DS.Icon, { name: "checkThin", size: 12, color: "var(--white)", strokeWidth: 3.4 }) : null);
  }

  fFooter(children) {
    return e("div", { key: "f", style: { flex: "none", padding: "8px 22px 0", background: "var(--gray-50)", display: "flex", flexDirection: "column", gap: "9px" } }, children);
  }

  fLink(label, onClick) {
    return e("button", { onClick, style: { display: "block", width: "100%", border: "none", background: "transparent", color: "var(--text-muted)", font: "500 13px var(--font-ui)", padding: "4px 0 9px", minHeight: "44px", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" } }, label);
  }

  renderFIntro() {
    const st = this.state;
    const rows = [["headphones", "Listen to a few kinds of sounds"], ["check", "Choose whatever feels closest"], ["equalizer", "Then we'll shape it to match yours"]];
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "26px 24px 10px" } },
        e("div", { style: { display: "inline-flex", background: "var(--gray-100)", borderRadius: "999px", padding: "4px 10px", font: "700 10px var(--font-ui)", letterSpacing: ".16em", color: "var(--text-label)" } }, (st.ear || "Both ears").toUpperCase()),
        e("div", { style: { font: "700 26px/1.14 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em", marginTop: "12px" } }, "What does it sound like?"),
        e("div", { style: { font: "400 15px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "10px" } },
          "Everyone's tinnitus is different. You'll listen to a few kinds of sounds and pick whatever feels closest. There are no wrong answers, and you can change your mind at any point."),
        e("div", { style: { marginTop: "22px" } },
          e(DS.Card, { variant: "section" },
            e("div", { style: { display: "flex", flexDirection: "column", gap: "15px" } },
              rows.map(([icon, t]) =>
                e("div", { key: icon, style: { display: "flex", alignItems: "center", gap: "13px" } },
                  e(DS.IconTile, { size: "sm", tone: "blue" }, e(DS.Icon, { name: icon, size: 20 })),
                  e("div", { style: { font: "500 14px/1.35 var(--font-ui)", color: "var(--gray-800)" } }, t))))))),
      this.fFooter([
        e(DS.Button, { key: "go", variant: "primary", size: "md", onClick: () => this.go("f", st.eduSeen ? "family" : "edu") }, "Start listening"),
        st.eduSeen ? e(React.Fragment, { key: "edu" }, this.fLink("Remind me what to listen for", () => this.go("f", "edu"))) : null
      ])
    ];
  }

  renderFamily() {
    const st = this.state, f = st.f;
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "10px 18px 10px" } },
        e("div", { style: { font: "700 23px/1.16 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em" } }, "Which kind is closest?"),
        e("div", { style: { font: "400 14px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "7px" } }, "Play each one. Pick the closest. It doesn't have to be exact, and you can change it later."),
        e("div", { style: { display: "flex", flexDirection: "column", gap: "9px", marginTop: "14px" } },
          fam.FAMORDER.map((key) => {
            const d = fam.FAMS[key], sel = f.fam === key;
            return e("div", {
              key, onClick: () => this.pat("f", { fam: key }),
              style: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 13px", borderRadius: "14px", cursor: "pointer", background: sel ? "var(--interface-selected)" : "var(--white)", border: "1.5px solid " + (sel ? "var(--interface-selected-border)" : "var(--gray-200)") }
            },
              d.ex ? this.fPlayBtn("fam-" + key, [d.ex]) : null,
              e("div", { style: { flex: 1, minWidth: 0 } },
                e("div", { style: { font: "600 14.5px/1.25 var(--font-ui)", color: "var(--text-heading)" } }, d.name),
                e("div", { style: { font: "400 12.5px/1.4 var(--font-text)", color: "var(--text-secondary)", marginTop: "2px" } }, d.desc)),
              this.fTick(sel));
          })),
        e("div", { style: { font: "400 12.5px/1.5 var(--font-text)", color: "var(--text-muted)", marginTop: "12px" } }, "Hear more than one thing? Start with the strongest sound, and you can add another later.")),
      this.fFooter([
        f.note ? e(React.Fragment, { key: "n" }, this.fNote(f.note)) : null,
        e(DS.Button, { key: "c", variant: "primary", size: "sm", disabled: !f.fam, onClick: () => this.fAct(fam.famContinue(this.state.f)) }, "Continue"),
        e(DS.Button, { key: "g", variant: "ghost", onClick: () => this.fAct(fam.noneFit()) }, "None of these fit"),
        e(React.Fragment, { key: "l" }, this.fLink("I can't hear these examples", () => this.fAct(fam.famNoHear())))
      ])
    ];
  }

  renderFChar() {
    const st = this.state, f = st.f;
    const { famDef, isHard } = fam.famContext(f);
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "10px 18px 10px" } },
        e("div", { style: { font: "700 23px/1.16 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em" } }, isHard ? "Just listen" : "Which is closest?"),
        e("div", { style: { font: "400 14px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "7px", minHeight: "63px" } },
          isHard ? "Words can get in the way. Play these and pick whichever is closest to yours. No labels needed."
            : (famDef ? "All of these are " + famDef.short + " sounds with a different character." : "")),
        !isHard && famDef && famDef.caution
          ? e("div", { style: { background: "var(--gray-50)", border: "1px solid var(--gray-200)", borderRadius: "12px", padding: "11px 14px", font: "400 13.5px/1.5 var(--font-text)", color: "var(--gray-700)", marginTop: "12px" } }, famDef.caution)
          : null,
        e("div", { style: { display: "flex", flexDirection: "column", gap: "9px", marginTop: "14px" } },
          (famDef ? famDef.chars : []).map((ch, i) => {
            const sel = f.charIdx === i;
            return e("div", {
              key: i, onClick: () => this.pat("f", { charIdx: i }),
              style: { display: "flex", alignItems: "center", gap: "12px", padding: "11px 13px", borderRadius: "14px", cursor: "pointer", background: sel ? "var(--interface-selected)" : "var(--white)", border: "1.5px solid " + (sel ? "var(--interface-selected-border)" : "var(--gray-200)") }
            },
              this.fPlayBtn("char-" + i, [ch.spec]),
              e("div", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" } },
                e("div", { style: { font: "600 14.5px/1.3 var(--font-ui)", color: "var(--text-heading)" } }, ch.label),
                ch.sub ? e("div", { style: { font: "400 12.5px/1.35 var(--font-text)", color: "var(--text-body)" } }, ch.sub) : null),
              this.fTick(sel));
          }))),
      this.fFooter([
        f.note ? e(React.Fragment, { key: "n" }, this.fNote(f.note)) : null,
        e(DS.Button, { key: "c", variant: "primary", size: "sm", disabled: f.charIdx == null, onClick: () => this.fAct(fam.charContinue(this.state.f)) }, "Continue"),
        e(DS.Button, { key: "g", variant: "ghost", onClick: () => this.fAct(fam.charGhost(this.state.f)) }, isHard ? "Still not close" : "None of these are close")
      ])
    ];
  }

  renderFTune() {
    const st = this.state, f = st.f;
    const { tuneSpec } = fam.famContext(f);
    const setSpec = (patch) => this.pat("f", { work: { ...f.work, spec: { ...tuneSpec, ...patch } } });
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "10px 20px 10px" } },
        e("div", { style: { font: "700 10px var(--font-ui)", letterSpacing: ".16em", color: "var(--text-label)" } }, f.editing === 2 ? "SOUND 2" : "YOUR SOUND"),
        e("div", { style: { font: "700 23px/1.16 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em", marginTop: "6px" } }, "Bring it closer"),
        e("div", { style: { font: "400 14px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "7px" } }, "Adjust until it sounds like yours. Press play to hear your changes as you make them."),
        e("div", { style: { marginTop: "14px" } },
          e(DS.Card, { variant: "section" },
            e(DS.PlayToggle, { playing: st.playKey === "main", onToggle: () => this.toggleKey("main", mainSpecs(this.state)) }),
            e("div", { style: { marginTop: "18px" } },
              e(DS.TuningSlider, { label: "Pitch", value: tuneSpec.pitch, onChange: (v) => setSpec({ pitch: v }), precision: "Medium" })),
            st.showTech ? e("div", { "data-technical-values": true, style: { textAlign: "right", font: "500 12px var(--font-ui)", color: "var(--text-muted)", marginTop: "5px" } }, shell.techOf(tuneSpec)) : null,
            e("div", { style: { marginTop: "16px" } },
              e(DS.TuningSlider, { label: "Loudness", value: tuneSpec.level, onChange: (v) => setSpec({ level: v }) })),
            e("div", { style: { marginTop: "18px" } },
              e(DS.SectionLabel, { description: "How does the sound behave over time?" }, "BEHAVIOR"),
              e("div", { style: { marginTop: "9px" } },
                e(DS.SegmentedControl, { options: fam.BEH_UI, value: fam.BEH_LBL[tuneSpec.behavior] || "Steady", onChange: (v) => setSpec({ behavior: fam.BEH_MAP[v] }) })))))),
      this.fFooter([
        f.note ? e(React.Fragment, { key: "n" }, this.fNote(f.note)) : null,
        e(DS.Button, { key: "c", variant: "primary", size: "sm", onClick: () => this.fAct(fam.tuneDone(this.state.f)) }, "This matches"),
        e(DS.Button, { key: "g", variant: "ghost", onClick: () => this.go("f", "char") }, "Back to the sounds"),
        e(React.Fragment, { key: "l" }, this.fLink("I can't hear this sound", () => this.fAct(fam.tuneNoHear(this.state.f))))
      ])
    ];
  }

  renderFLayer() {
    const st = this.state, f = st.f;
    const sounds = fam.layerSounds(f);
    const hasTwo = !!f.s1 && !!f.s2;
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "10px 20px 10px" } },
        e("div", { style: { font: "700 23px/1.16 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em" } }, "Is there another sound?"),
        e("div", { style: { font: "400 14px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "7px" } }, "Many people hear more than one sound at once. If you do, add it. Your match can include both."),
        e("div", { style: { marginTop: "16px" } },
          e(DS.Card, { variant: "list" },
            sounds.map((sd, i) =>
              e("div", { key: i, style: { display: "flex", alignItems: "center", gap: "13px", padding: "14px 18px", borderTop: i === 0 ? "none" : "1px solid var(--gray-100)" } },
                this.fPlayBtn("ly" + i, [sd.spec]),
                e("div", { style: { flex: 1, minWidth: 0 } },
                  e("div", { style: { font: "600 14.5px/1.25 var(--font-ui)", color: "var(--text-heading)" } }, "Sound " + (i + 1) + ": " + (fam.FAMS[sd.fam] ? fam.FAMS[sd.fam].name.toLowerCase() : "sound")),
                  e("div", { style: { font: "400 12.5px/1.4 var(--font-text)", color: "var(--text-secondary)", marginTop: "2px" } }, shell.describe(sd.spec))))))),
        hasTwo ? e("div", { style: { marginTop: "14px" } },
          e(DS.PlayToggle, {
            playing: st.playKey === "together",
            label: st.playKey === "together" ? "Stop" : "Play them together",
            onToggle: () => this.toggleKey("together", fam.layerSounds(this.state.f).map((x) => x.spec))
          })) : null),
      this.fFooter([
        f.note ? e(React.Fragment, { key: "n" }, this.fNote(f.note)) : null,
        ...(hasTwo
          ? [e(DS.Button, { key: "d2", variant: "primary", size: "sm", onClick: () => this.fAct(fam.layerDone()) }, "Done, this matches"),
            e(DS.Button, { key: "r2", variant: "ghost", onClick: () => this.fAct(fam.removeSecond()) }, "Remove sound 2")]
          : [e(DS.Button, { key: "a1", variant: "outline", size: "sm", onClick: () => this.fAct(fam.addSound()) }, "Add another sound"),
            e("div", { key: "sp", style: { height: "8px" } }),
            e(DS.Button, { key: "d1", variant: "primary", size: "sm", onClick: () => this.fAct(fam.layerDone()) }, "Just this one sound")])
      ])
    ];
  }

  renderFlow() {
    const st = this.state, c = st.concept, s = st.stages[c];
    if (c === "f" && s === "intro") return this.renderFIntro();
    if (c === "f" && s === "family") return this.renderFamily();
    if (c === "f" && s === "char") return this.renderFChar();
    if (c === "f" && s === "tune") return this.renderFTune();
    if (c === "f" && s === "layer") return this.renderFLayer();
    if (s === "intro" || s === "ret") {
      const first = shell.OPTFIRST[c] || shell.STAGES[c].map((z) => z[0]).find((id) => id !== "intro" && id !== "edu" && id !== "ret");
      return [
        e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "26px 24px 10px" } },
          e("div", { style: { font: font.label, letterSpacing: ".16em", color: "var(--text-label)" } }, (shell.OPTLABEL[c] || "PREPARE").toUpperCase()),
          e("div", { style: { font: "700 26px/1.14 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em", marginTop: "10px" } }, "Prepare"),
          e("div", { style: { font: font.body, color: "var(--text-body)", marginTop: "12px" } },
            "You'll listen and adjust until the sound comes close to what you hear. There are no wrong answers.")),
        e("div", { key: "f", style: { flex: "none", padding: "8px 22px 0", background: "var(--gray-50)", display: "flex", flexDirection: "column", gap: "9px" } },
          e(DS.Button, { variant: "primary", size: "md", onClick: () => this.go(c, st.eduSeen ? first : "edu") }, "Begin"),
          st.eduSeen
            ? e("button", {
              onClick: () => this.go(c, "edu"),
              style: { display: "block", width: "100%", border: "none", background: "transparent", color: "var(--text-muted)", font: "500 13px var(--font-ui)", padding: "4px 0 9px", minHeight: "44px", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }
            }, "Remind me what to listen for")
            : e("div", { style: { height: "9px" } }))
      ];
    }
    if (s === "edu") {
      // The shared education step, not a per-option copy (REQ-006): completing
      // it here also sets eduSeen, then continues into the option.
      return this.renderEdu(() => { this.setState({ eduSeen: true }); this.go(c, shell.firstWorkingStage(c)); });
    }
    if (s === "conf") {
      const conf = st[c].conf;
      const intro = shell.confIntro(st);
      const notClose = conf === "Not close yet";
      const choose = (label) => this.setState((x) => ({ [c]: { ...x[c], conf: label } }));
      const finish = () => {
        const x = this.state, live = x[x.concept] && x[x.concept].conf;
        if (live) this.go(x.concept, "done", { conf: live });
      };
      const keepRefining = () => {
        const x = this.state;
        const target = shell.keepRefiningTarget(x);
        this.go(x.concept, target.stage, target.obj);
      };
      return [
        e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "10px 20px 10px" } },
          e("div", { style: { font: "700 23px/1.16 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em" } }, "How close is this sound to the underlying tone you hear?"),
          e("div", { style: { font: "400 14px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "7px" } }, "Play it one more time, then choose what's true for you. This records your judgment. It isn't a score."),
          intro ? e("div", { style: { background: "var(--blue-50)", border: "1px solid var(--blue-200)", borderRadius: "12px", padding: "11px 14px", font: "400 13.5px/1.5 var(--font-text)", color: "var(--gray-700)", marginTop: "12px" } }, intro) : null,
          e("div", { style: { marginTop: "14px" } },
            e(DS.Card, { variant: "section" },
              e(DS.SectionLabel, null, "YOUR MATCHED SOUND"),
              e("div", { style: { marginTop: "11px" } },
                e(DS.PlayToggle, { playing: st.playKey === "main", onToggle: () => this.toggleKey("main", mainSpecs(this.state)) })))),
          e("div", { style: { display: "flex", flexDirection: "column", gap: "9px", marginTop: "14px" } },
            ["Very close", "Fairly close", "Not close yet"].map((label) =>
              e(DS.SelectRow, { key: label, label, selected: conf === label, onClick: () => choose(label) }))),
          notClose ? e("div", { style: { background: "var(--blue-50)", border: "1px solid var(--blue-200)", borderRadius: "12px", padding: "11px 14px", font: "400 13.5px/1.5 var(--font-text)", color: "var(--gray-700)", marginTop: "2px" } }, "That's useful to know. We can keep refining, or finish now and match again another day.") : null),
        e("div", { key: "f", style: { flex: "none", padding: "8px 22px 0", background: "var(--gray-50)", display: "flex", flexDirection: "column", gap: "9px" } },
          notClose
            ? e(DS.Button, { variant: "primary", size: "sm", onClick: keepRefining }, "Keep refining")
            : e(DS.Button, { variant: "primary", size: "sm", disabled: !conf, onClick: finish }, "Finish matching"),
          e("div", { style: { minHeight: "52px", display: "flex", flexDirection: "column" } },
            notClose ? e(DS.Button, { variant: "outline", size: "sm", onClick: finish }, "Finish anyway") : null))
      ];
    }
    if (s === "done") {
      const done = shell.doneData(st, mainSpecs(st));
      return [
        e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "26px 22px 10px" } },
          e("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" } },
            e(DS.IconTile, { size: "xl", tone: "success" }, e(DS.Icon, { name: "check", size: 30 })),
            e("div", { style: { font: font.heading(26), color: "var(--text-heading)", letterSpacing: "-.015em", marginTop: "16px" } }, done.title),
            done.body ? e("div", { style: { font: "400 14.5px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "9px", minHeight: "66px" } }, done.body) : null),
          e("div", { style: { marginTop: "20px" } },
            e(DS.Card, { variant: "list" },
              done.rows.map((row) => e("div", { key: row.label, style: { padding: "13px 18px", borderTop: row.bt } },
                e("div", { style: { font: "700 10px var(--font-ui)", letterSpacing: ".14em", color: "var(--text-label)" } }, row.label),
                e("div", { style: { font: "500 14.5px/1.35 var(--font-ui)", color: "var(--text-heading)", marginTop: "3px" } }, row.sub))))),
          st.showTech ? e("div", { "data-technical-values": true, style: { textAlign: "center", font: "500 12px var(--font-ui)", color: "var(--text-muted)", marginTop: "12px" } }, done.tech) : null),
        e("div", { key: "f", style: { flex: "none", padding: "8px 22px 0", background: "var(--gray-50)", display: "flex", flexDirection: "column", gap: "9px" } },
          e("div", { style: { background: "var(--blue-50)", border: "1px solid var(--blue-200)", borderRadius: "12px", padding: "11px 14px", font: "400 13.5px/1.5 var(--font-text)", color: "var(--gray-700)", marginBottom: "1px" } }, "This exploration ends at matching. Treatment isn't part of this prototype."),
          e(DS.Button, { variant: "primary", size: "sm", onClick: () => { this.hardStop(); this.setState((x) => shell.completeOptionState(x)); } }, "Return to matching options"),
          e("div", { style: { height: "9px" } }))
      ];
    }
    // Generic working stage: real interactions land with each concept's own
    // task; the shell renders the stage frame, playback and stage advance.
    const list = shell.STAGES[c].map((z) => z[0]);
    const next = list[list.indexOf(s) + 1];
    // heardHere gates the stage's primary CTA (REQ-018): it sits in the same
    // spot at the same size and only goes gray until the sound has played.
    const heard = gating.heardHere(st);
    const advance = (f) => () => { if (gating.heardHere(this.state)) f(); };
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "22px 22px 10px" } },
        e("div", { style: { font: "700 23px/1.16 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em" } }, shell.stageLabel(c, s)),
        e("div", { style: { font: "400 14px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "8px" } },
          "Press play, listen, and compare the sound to the one you hear."),
        e("div", { style: { marginTop: "18px" } }, this.playRow("Play the sound", "main", mainSpecs(st)))),
      next
        ? this.bottomButton("Continue", advance(() => this.go(c, next)), { disabled: !heard })
        : this.bottomButton("Finish", advance(() => this.goScreen("home")), { disabled: !heard })
    ];
  }

  /* ---------- chrome ---------- */

  renderMenu() {
    const st = this.state, c = st.concept;
    const where = st.screen === "flow" ? shell.OPTLABEL[c] || "Preserved flow"
      : { launch: "Start", ear: "Ear", setup: "Headphones and volume", edu: "What to listen for", home: "Matching options" }[st.screen];
    const actions = [
      ...(st.screen !== "home" ? [{ label: "Return to matching options", f: () => this.goScreen("home") }] : []),
      { label: "Reset the prototype", f: () => this.resetAll() }
    ];
    const jumpGroups = [
      ...shell.OPTORDER.map((cid) => ({
        cap: shell.OPTLABEL[cid].toUpperCase(),
        items: shell.jumpStages(cid).map((it) => ({ label: it.label, f: () => this.openOption(cid, it.stage, it.seed) }))
      })),
      // Preserved V5 flow (REQ-010): moderator menu only, never the hub.
      { cap: "SOUND-FAMILY GUIDED (PRESERVED)", items: fam.jumpStages().map((it) => ({
        label: it.label, f: () => this.openOption("f", it.stage, { ...shell.freshF(), ...it.seed })
      })) },
      { cap: "SHARED", items: [
        { label: "Headphone setup", f: () => this.goScreen("setup") },
        { label: "Pitch and volume", f: () => this.goScreen("edu") },
        { label: "Matching options", f: () => this.goScreen("home") },
        { label: "Start screen", f: () => this.goScreen("launch") }
      ] }
    ];
    return e("div", { style: { position: "absolute", inset: 0, zIndex: 30, display: "flex", flexDirection: "column" } },
      e("div", { style: { position: "absolute", inset: 0, background: "var(--navy-900)", opacity: .55 } }),
      e("button", { onClick: () => this.setState({ menuOpen: false, jumpOpen: false }), "aria-label": "Close menu", style: { flex: 1, border: "none", background: "transparent", cursor: "pointer", minHeight: "60px", position: "relative" } }),
      e("div", { style: { flex: "none", maxHeight: "86%", overflowY: "auto", background: "var(--white)", borderRadius: "22px 22px 0 0", padding: "16px 18px 22px", position: "relative" } },
        e("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" } },
          e("div", null,
            e("div", { style: { font: "700 10px var(--font-ui)", letterSpacing: ".16em", color: "var(--text-label)" } }, "SESSION MENU"),
            e("div", { style: { font: "600 15px var(--font-ui)", color: "var(--text-heading)", marginTop: "4px" } }, where)),
          e("button", { onClick: () => this.setState({ menuOpen: false, jumpOpen: false }), "aria-label": "Close", style: { flex: "none", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", cursor: "pointer" } },
            e(DS.Icon, { name: "close", size: 20, color: "var(--gray-600)" }))),
        st.menuStopped ? e("div", { style: { font: "400 12.5px/1.45 var(--font-text)", color: "var(--text-muted)", marginTop: "6px" } }, "Sound stopped.") : null,
        e("div", { style: { display: "flex", flexDirection: "column", gap: "8px", marginTop: "14px" } },
          actions.map((a) =>
            e("button", { key: a.label, onClick: a.f, style: { display: "flex", alignItems: "center", width: "100%", minHeight: "52px", padding: "14px 16px", borderRadius: "13px", border: "1.5px solid var(--gray-200)", background: "var(--white)", cursor: "pointer", textAlign: "left", font: "600 14.5px var(--font-ui)", color: "var(--text-heading)" } }, a.label))),
        e("button", { onClick: () => this.setState((x) => ({ jumpOpen: !x.jumpOpen })), style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", width: "100%", minHeight: "52px", marginTop: "12px", padding: "14px 16px", borderRadius: "13px", border: "1.5px solid var(--gray-300)", background: "var(--gray-50)", cursor: "pointer", textAlign: "left", font: "600 14.5px var(--font-ui)", color: "var(--text-heading)" } },
          "Jump to a different section"),
        st.jumpOpen ? e("div", { style: { marginTop: "12px", display: "flex", flexDirection: "column", gap: "16px" } },
          jumpGroups.map((g) =>
            e("div", { key: g.cap },
              e("div", { style: { font: "700 10px var(--font-ui)", letterSpacing: ".16em", color: "var(--text-label)" } }, g.cap),
              e("div", { style: { display: "flex", flexWrap: "wrap", gap: "7px", marginTop: "9px" } },
                g.items.map((it) =>
                  e("button", { key: it.label, onClick: it.f, style: { minHeight: "44px", padding: "9px 13px", borderRadius: "999px", border: "1.5px solid var(--gray-300)", background: "var(--white)", color: "var(--text-body)", font: "600 12.5px var(--font-ui)", cursor: "pointer" } }, it.label)))))) : null));
  }

  render() {
    const st = this.state, c = st.concept, s = st.stages[c];
    const framed = st.framed, dark = st.screen === "setup";
    const chromeBg = dark ? "var(--navy-900)" : "var(--gray-50)";
    const chromeLine = dark ? "var(--interface-dark-border)" : "var(--gray-200)";
    const chromeFg = dark ? "var(--blue-300)" : "var(--blue-700)";
    const prog = shell.progress(c, s, st);
    const progShow = st.screen === "flow" && prog.show;
    const nav = shell.navShow(st);
    const label = shell.screenLabelOf(st.screen, c, s);

    const body = {
      launch: () => this.renderLaunch(),
      ear: () => this.renderEar(),
      setup: () => this.renderSetup(),
      home: () => this.renderHome(),
      edu: () => this.renderEdu(() => this.goScreen("home", { eduSeen: true })),
      flow: () => this.renderFlow()
    }[st.screen]();

    const screenRoot = e("div", {
      "data-screen": st.screen,
      "data-screen-label": label,
      style: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: dark ? "var(--navy-900)" : undefined }
    }, body);

    return e("div", {
      style: {
        height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
        background: framed ? "#e9e7e2" : "var(--interface-app)", overscrollBehavior: "none"
      }
    },
      e("div", {
        "data-device-frame": framed ? "framed" : "bare",
        style: {
          position: "relative", flex: "none",
          width: framed ? "390px" : "100%", height: framed ? "844px" : "100dvh",
          borderRadius: framed ? "38px" : "0", overflow: "hidden", background: "var(--interface-app)",
          boxShadow: framed ? "var(--shadow-device)" : "none",
          border: framed ? "1px solid var(--gray-200)" : "none",
          display: "flex", flexDirection: "column",
          transform: "scale(" + (st.devScale || 1) + ")", transformOrigin: "center center"
        }
      },
        framed
          ? e(DS.StatusBar, { time: "9:41", onDark: dark })
          : e("div", { style: { flex: "none", height: "env(safe-area-inset-top)", background: chromeBg } }),
        progShow ? e("div", { "data-progress": "", style: { flex: "none", padding: "10px 22px 12px", background: "var(--gray-50)", borderBottom: "1px solid var(--gray-200)" } },
          e("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px" } },
            e("span", { style: { font: font.label, letterSpacing: ".16em", color: "var(--text-label)" } }, prog.lbl),
            e("span", { style: { font: "700 10px var(--font-ui)", letterSpacing: ".14em", color: "var(--blue-700)" } }, prog.phase)),
          e("div", { style: { height: "6px", background: "var(--gray-200)", borderRadius: "3px", overflow: "hidden", marginTop: "8px" } },
            e("div", { style: { height: "100%", background: "var(--control-accent)", borderRadius: "3px", transition: "width 420ms cubic-bezier(.4,0,.2,1)", width: prog.w } }))) : null,
        screenRoot,
        st.menuOpen ? this.renderMenu() : null,
        e("div", { style: { flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: "2px 8px 4px", background: chromeBg, borderTop: "1px solid " + chromeLine } },
          nav
            ? e("button", { onClick: () => this.onBack(), style: { display: "flex", alignItems: "center", gap: "6px", minHeight: "44px", padding: "0 12px 0 8px", border: "none", background: "transparent", color: chromeFg, font: "600 15px var(--font-ui)", cursor: "pointer" } },
              e("span", { style: { display: "block", width: "9px", height: "9px", borderLeft: "2.4px solid " + chromeFg, borderBottom: "2.4px solid " + chromeFg, transform: "rotate(45deg)" } }), "Back")
            : e("span", { style: { display: "block", width: "8px", height: "44px" } }),
          e("button", {
            onClick: () => { const was = this.state.playKey !== null; this.hardStop(); this.setState({ menuOpen: true, menuStopped: was }); },
            "aria-label": "Session menu",
            style: { flex: "none", width: "56px", height: "44px", border: "none", background: "transparent", cursor: "default" }
          })),
        framed
          ? e(DS.HomeIndicator, { onDark: dark })
          : e("div", { style: { flex: "none", height: "env(safe-area-inset-bottom)", background: chromeBg } })));
  }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(e(App));
