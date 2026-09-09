/*
 * PNQ Sound Matching - app shell renderer (REQ-001, REQ-020).
 * State machine, persistence and navigation logic live in ./app-shell.js;
 * this module renders the screens with PNQ Health Design System components.
 * All colors, type, spacing and radii come from the design system's
 * CSS custom properties (var(--*)); no new literal palette values.
 */
import * as shell from "./app-shell.js";
import * as gating from "./gating.js";
import * as comparison from "./comparison.js";
import * as nar from "./narrowing.js";
import * as fam from "./family-flow.js";
import * as pres from "./preserved.js";
import * as field from "./field.js";

const DS = window.PNQHealthDesignSystem_deabce;
const e = React.createElement;
const DEMO_PRESCRIPTION_ID = "DEMO-RX-4821";

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

function mainSpecs(st) {
  const c = st.concept;
  if (c === "n") return [{ kind: "tone", pitch: st.n.pitch, level: st.n.level, bright: .3, behavior: "steady" }];
  if (c === "r") return [{ kind: "tone", pitch: st.r.center, level: st.r.level, bright: .3, behavior: "steady" }];
  if (c === "d") return [field.dSpec(st.d)];
  if (c === "f") return fam.mainSpecs(st.f, st.stages.f);
  if (c === "a") return [pres.aSpec(st.a, st.stages.a)];
  if (c === "t") return [pres.fieldSpec(st.t)];
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
    this.state = {
      ...shell.initialState(),
      privacyAcknowledged: false,
      accountConfirmation: false
    };
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
      if (restored) this.setState({
        ...restored,
        privacyAcknowledged: false,
        accountConfirmation: false
      });
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

  // Adjustments while the main tone plays carry into it live instead of
  // cutting out and restarting.
  syncMain() { if (this.state.playKey === "main") this.withAudio((a) => a.update(mainSpecs(this.state))); }

  // Apply an Option 2 comparison result: stay on the stage with a patch, or
  // leave it (phase done, spread floor, fallback to directional).
  applyR(res) {
    if (res.kind === "stage") { this.go("r", res.stage, res.obj); return; }
    this.setState((s) => ({ r: { ...s.r, ...res.patch } }), () => this.syncMain());
  }

  rDir(tag) { this.applyR(comparison.dirAnswer(this.state.r, tag)); }

  // Adaptive candidate loop (REQ-011): every response patches estimate,
  // uncertainty, kind and message in place; leaving the loop is always an
  // explicit action (final check, close enough, keep refining).
  aResp(tag) {
    this.setState((s) => ({ a: { ...s.a, ...pres.aResp(s.a, tag) } }), () => {
      if (this.state.playKey === "main") this.withAudio((a) => a.update(mainSpecs(this.state)));
    });
  }

  // In-place concept patch. If the main voice is sounding, the change is
  // heard live (tuning sliders adjust the tone while it plays).
  pat(c, obj) {
    this.setState((s) => ({ [c]: { ...s[c], ...obj } }), () => {
      if (this.state.playKey === "main") this.withAudio((a) => a.update(mainSpecs(this.state)));
      else if (this.state.playKey === "dfield") this.withAudio((a) => a.update([field.dSpec(this.state.d)]));
    });
  }

  // Apply a pure family-flow transition ({ pat } or { go: [stage, obj] }).
  fAct(r) { if (r.pat) this.pat("f", r.pat); else this.go("f", r.go[0], r.go[1]); }

  goScreen(screen, extra) {
    this.hardStop();
    this.setState((s) => shell.goScreenState(s, screen, extra));
  }

  startOnboarding() {
    this.goScreen("privacy", {
      privacyAcknowledged: false,
      accountConfirmation: false,
      onboardingInput: ""
    });
  }

  openAccountEntry() {
    if (!this.state.privacyAcknowledged) return;
    this.goScreen("account", {
      privacyAcknowledged: false,
      accountConfirmation: false,
      onboardingInput: DEMO_PRESCRIPTION_ID
    });
  }

  returnToPrivacy() {
    this.goScreen("privacy", {
      privacyAcknowledged: false,
      accountConfirmation: false,
      onboardingInput: ""
    });
  }

  showAccountConfirmation() {
    if (this.state.onboardingInput.trim().length < 3) return;
    this.goScreen("account", {
      privacyAcknowledged: false,
      accountConfirmation: true,
      onboardingInput: ""
    });
  }

  startNewSession() {
    this.hardStop();
    this.setState((s) => ({
      ...shell.newSessionState(s),
      privacyAcknowledged: false,
      accountConfirmation: false
    }));
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
      return this.go("d", t.stage, { level: t.level, heard: false, note: field.zoomOutNote(t.level + 1) });
    }
    return this.go(this.state.concept, t.stage);
  }

  /* ---------- shared bits ---------- */

  bottomButton(label, onClick, opts) {
    return e("div", { style: { flex: "none", padding: "8px 22px 0", background: (opts && opts.bg) || "var(--gray-50)" } },
      e(DS.Button, { variant: "primary", size: "md", disabled: !!(opts && opts.disabled), onDark: !!(opts && opts.onDark), onClick }, label),
      e("div", { style: { height: "9px" } }));
  }

  selectRowButton(key, label, selected, onClick) {
    return e("button", {
      key,
      type: "button",
      onClick,
      "aria-pressed": selected ? "true" : "false",
      style: {
        display: "block", width: "100%", padding: 0, border: "none", borderRadius: "var(--radius-card)",
        background: "transparent", color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer"
      }
    }, e(DS.SelectRow, { label, selected, style: { pointerEvents: "none" } }));
  }

  // The exported prototype components preserve the intended visuals, but the
  // vendored PlayToggle is a clickable div and SegmentedControl does not expose
  // its selected state. Keep the vendor snapshot untouched and add the missing
  // browser semantics at the app boundary.
  playToggleButton(playing, onToggle, label) {
    const text = label || (playing ? "Stop Sound" : "Start Sound");
    return e("button", {
      type: "button",
      onClick: onToggle,
      "aria-label": text,
      "aria-pressed": playing ? "true" : "false",
      style: {
        display: "block", width: "100%", padding: 0, border: "none",
        borderRadius: "var(--radius-input)", background: "transparent",
        color: "inherit", font: "inherit", cursor: "pointer"
      }
    }, e(DS.PlayToggle, { playing, label: text, style: { pointerEvents: "none" } }));
  }

  segmentedControl(label, options, value, onChange) {
    return e("div", {
      role: "group",
      "aria-label": label,
      ref: (node) => {
        if (!node) return;
        node.querySelectorAll("button").forEach((button) => {
          button.setAttribute("aria-pressed", button.textContent.trim() === value ? "true" : "false");
        });
      }
    }, e(DS.SegmentedControl, { options, value, onChange }));
  }

  playRow(label, key, specs) {
    const playing = this.state.playKey === key;
    return e("button", {
      key, type: "button", onClick: () => this.toggleKey(key, specs),
      "aria-pressed": playing ? "true" : "false",
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
      e("div", {
        key: "b",
        style: {
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: "24px 40px", background: "var(--gradient-navy)"
        }
      },
        e("img", { src: "assets/waveform-mark.svg", alt: "", style: { width: "118px", height: "40px" } }),
        e("div", { "aria-label": "pnq health", style: { marginTop: "26px", font: "700 40px/1 var(--font-ui)", letterSpacing: "-.02em", color: "var(--white)" } },
          e("span", null, "pnq"),
          e("span", { style: { marginLeft: "4px", fontWeight: 500, color: "var(--brand-blue-light)" } }, "health")),
        e("div", { style: { maxWidth: "270px", marginTop: "18px", font: "400 16px/1.55 var(--font-text)", color: "var(--text-on-dark-secondary)" } },
          "A guided sound-matching study experience."),
        e("div", { style: { marginTop: "12px", font: font.label, letterSpacing: ".14em", color: "var(--text-on-dark-muted)" } },
          "Research prototype")),
      e("div", { key: "f", style: { flex: "none", padding: "8px 24px 12px", background: "var(--navy-600)" } },
        e(DS.Button, { variant: "primary", size: "md", onDark: true, onClick: () => this.startOnboarding() }, "Get started"),
        e("div", { style: { marginTop: "14px", textAlign: "center", font: "400 13.5px var(--font-text)", color: "var(--text-on-dark-muted)" } },
          "Prepared for this research session"))
    ];
  }

  onboardingBack(onClick) {
    return e("div", { key: "nav", style: { flex: "none", minHeight: "50px", display: "flex", alignItems: "center", padding: "0 14px", background: "var(--navy-800)" } },
      e("button", {
        type: "button", onClick,
        style: { display: "flex", alignItems: "center", gap: "4px", minHeight: "44px", padding: "0 8px", border: "none", background: "transparent", color: "var(--white)", font: "500 16px var(--font-text)", cursor: "pointer" }
      },
        e(DS.Icon, { name: "chevronLeft", size: 20, color: "var(--white)", strokeWidth: 2.4 }),
        "Back"));
  }

  renderPrivacy() {
    const checked = this.state.privacyAcknowledged;
    return [
      this.onboardingBack(() => this.goScreen("launch", {
        privacyAcknowledged: false,
        accountConfirmation: false,
        onboardingInput: ""
      })),
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "24px 26px 12px", background: "var(--white)" } },
        e("div", { style: { font: "700 28px/1.15 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em" } }, "Privacy for this prototype"),
        e("div", { style: { marginTop: "18px", font: "700 15px var(--font-ui)", color: "var(--text-heading)" } }, "Before you continue"),
        e("p", { style: { margin: "8px 0 0", font: "400 14.5px/1.62 var(--font-text)", color: "var(--text-body)" } },
          "This research prototype does not collect or send personal, health, or treatment information."),
        e("p", { style: { margin: "14px 0 0", font: "400 14.5px/1.62 var(--font-text)", color: "var(--text-body)" } },
          "Your progress stays in this browser for the current study session. This acknowledgment is a prototype step and is not legal consent.")),
      e("div", { key: "f", style: { flex: "none", padding: "14px 24px 8px", background: "var(--white)", borderTop: "1px solid var(--interface-divider)" } },
        e("label", { style: { display: "flex", alignItems: "center", gap: "13px", minHeight: "50px", padding: "2px 2px 14px", cursor: "pointer" } },
          e("input", {
            type: "checkbox", checked,
            onChange: (ev) => this.setState({ privacyAcknowledged: ev.target.checked }),
            style: { flex: "none", width: "26px", height: "26px", margin: 0, accentColor: "var(--status-success-strong)", cursor: "pointer" }
          }),
          e("span", { style: { font: "500 14.5px/1.4 var(--font-text)", color: "var(--gray-800)" } },
            "I understand this is a research prototype and will not enter personal or health information.")),
        e(DS.Button, {
          variant: "primary", size: "md", disabled: !checked,
          onClick: () => { if (this.state.privacyAcknowledged) this.openAccountEntry(); }
        }, "Continue"))
    ];
  }

  renderAccountEntry() {
    const ready = this.state.onboardingInput.trim().length >= 3;
    return [
      this.onboardingBack(() => this.returnToPrivacy()),
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "36px 28px 12px", background: "var(--interface-app)" } },
        e(DS.IconTile, { size: "xl", tone: "blue", style: { marginBottom: "24px" } },
          e(DS.Icon, { name: "prescription", size: 32, color: "var(--brand-blue-deep)" })),
        e("div", { style: { font: "700 30px/1.12 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.018em" } },
          "Enter a simulated", e("br"), "prescription ID"),
        e("div", { style: { marginTop: "14px", font: "400 16px/1.55 var(--font-text)", color: "var(--text-secondary)" } },
          "This fictional ID frames the study experience. It is checked only on this screen and is never looked up."),
        e(DS.TextField, {
          label: "Simulated prescription ID",
          "aria-label": "Simulated prescription ID",
          value: this.state.onboardingInput,
          onChange: (ev) => this.setState({ onboardingInput: ev.target.value }),
          placeholder: DEMO_PRESCRIPTION_ID,
          hint: "Prototype only. Use fictional study values.",
          hintIcon: e(DS.Icon, { name: "lock", size: 16, color: "var(--gray-450)" }),
          style: { marginTop: "30px" }
        })),
      e("div", { key: "f", style: { flex: "none", padding: "8px 24px", background: "var(--interface-app)" } },
        e(DS.Button, {
          variant: "primary", size: "md", disabled: !ready,
          onClick: () => { if (this.state.onboardingInput.trim().length >= 3) this.showAccountConfirmation(); }
        }, "Continue"))
    ];
  }

  renderAccountConfirmation() {
    const rows = [
      ["user", "Fictional study profile", "Avery Example"],
      ["forms", "Prototype participant ID", "DEMO PARTICIPANT 001"]
    ];
    return [
      this.onboardingBack(() => this.goScreen("account", {
        privacyAcknowledged: false,
        accountConfirmation: false,
        onboardingInput: DEMO_PRESCRIPTION_ID
      })),
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "30px 26px 12px", background: "var(--interface-app)" } },
        e("div", { style: { width: "60px", height: "60px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "22px", background: "var(--status-success-tint)" } },
          e(DS.Icon, { name: "checkThin", size: 30, color: "var(--status-success-strong)" })),
        e("div", { style: { font: "700 29px/1.14 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.018em" } }, "Fictional profile ready"),
        e("div", { style: { marginTop: "12px", font: "400 16px/1.55 var(--font-text)", color: "var(--text-secondary)" } },
          "This fixed profile is used only to frame the study."),
        e(DS.Card, { variant: "list", style: { marginTop: "26px" } },
          rows.map(([icon, label, value], i) => e(React.Fragment, { key: label },
            i ? e(DS.CardDivider) : null,
            e("div", { style: { display: "flex", alignItems: "center", gap: "15px", padding: "16px 18px" } },
              e(DS.IconTile, { size: "sm", tone: "blue" },
                e(DS.Icon, { name: icon, size: 20, color: "var(--brand-blue-deep)" })),
              e("div", { style: { flex: 1, minWidth: 0 } },
                e("div", { style: { font: font.label, color: "var(--text-label)", letterSpacing: ".08em", textTransform: "uppercase" } }, label),
                e("div", { style: { marginTop: "3px", font: "600 16px var(--font-ui)", color: "var(--text-heading)" } }, value))))))),
      e("div", { key: "f", style: { flex: "none", padding: "8px 24px", background: "var(--interface-app)" } },
        e(DS.Button, {
          variant: "primary", size: "md",
          onClick: () => this.goScreen("dashboard", {
            onboardingSeen: true,
            onboardingInput: "",
            privacyAcknowledged: false,
            accountConfirmation: false
          })
        }, "Confirm fictional profile"),
        e(DS.Button, {
          variant: "ghost", size: "md",
          onClick: () => this.goScreen("account", {
            privacyAcknowledged: false,
            accountConfirmation: false,
            onboardingInput: DEMO_PRESCRIPTION_ID
          }),
          style: { marginTop: "8px", color: "var(--text-secondary)" }
        }, "Use a different ID"))
    ];
  }

  renderAccount() {
    return this.state.accountConfirmation ? this.renderAccountConfirmation() : this.renderAccountEntry();
  }

  renderDashboard() {
    const context = [
      { icon: "sparkles", label: "Wellness resources", copy: "Ideas for everyday listening comfort" },
      { icon: "headphones", label: "Listening tips", copy: "Simple ways to prepare your space" },
      { icon: "prescription", label: "Help and support", copy: "Guidance for using PNQ Health" }
    ];
    return e("div", { style: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--interface-app)" } },
      e("header", { style: { flex: "none", background: "var(--gradient-navy-dashboard)", color: "var(--text-on-dark)", padding: "18px 24px 28px" } },
        e("div", { style: { display: "flex", alignItems: "center", gap: "9px" } },
          e("img", { src: "assets/waveform-mark.svg", alt: "", style: { width: "28px", height: "28px" } }),
          e("div", { style: { font: "700 17px var(--font-ui)", letterSpacing: "-.015em", color: "var(--text-on-dark)" } }, "pnq health")),
        e("h1", { style: { margin: "22px 0 0", font: "700 29px/1.1 var(--font-ui)", letterSpacing: "-.02em", color: "var(--text-on-dark)" } }, "Welcome to PNQ"),
        e("p", { style: { margin: "8px 0 0", maxWidth: "310px", font: "400 15px/1.4 var(--font-text)", color: "var(--text-on-dark-secondary)" } },
          "Your place for calm, guided listening support.")),
      e("main", { style: { flex: 1, minHeight: 0, overflowY: "auto", padding: "22px 22px 18px" } },
        e("button", {
          type: "button",
          "aria-label": "New Session",
          onClick: () => this.startNewSession(),
          style: {
            display: "block", width: "100%", padding: 0, border: "none",
            borderRadius: "var(--radius-hero)", background: "transparent",
            color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer"
          }
        }, e(DS.HeroActionCard, {
          title: "New Session",
          description: "Begin a new sound-matching session",
          style: { pointerEvents: "none" }
        })),
        e("div", { style: { font: font.label, letterSpacing: ".16em", color: "var(--text-label)", marginTop: "28px", marginBottom: "10px" } }, "EXPLORE PNQ"),
        e("div", { style: { display: "grid", gap: "10px" } },
          context.map((item) =>
            e(DS.Card, {
              key: item.label,
              variant: "section",
              "data-context-tile": "",
              style: { display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", boxShadow: "var(--shadow-card-sm)", cursor: "default", pointerEvents: "none", userSelect: "none" }
            },
              e(DS.IconTile, { size: "md", tone: "neutral" },
                e(DS.Icon, { name: item.icon, size: 21, color: "var(--text-muted)" })),
              e("div", { style: { minWidth: 0 } },
                e("div", { style: { font: "600 15px var(--font-ui)", color: "var(--text-heading)" } }, item.label),
                e("div", { style: { marginTop: "2px", font: "400 12.5px/1.4 var(--font-text)", color: "var(--text-muted)" } }, item.copy)))))));
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
            this.selectRowButton(label, label, st.ear === label, () => this.setEar(label)))),
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
              e("div", { style: { position: "relative", flex: 1, height: "44px", display: "flex", alignItems: "center" } },
                e("div", { style: { position: "absolute", left: 0, right: 0, height: "5px", borderRadius: "999px", background: "var(--interface-dark-border)" } }),
                e("div", { style: { position: "absolute", left: 0, height: "5px", borderRadius: "999px", background: ready ? "var(--green-400)" : "var(--red-400)", width: st.vol + "%" } }),
                e("div", { style: { position: "absolute", left: st.vol + "%", width: "26px", height: "26px", marginLeft: "-13px", borderRadius: "50%", background: "var(--white)", boxShadow: "var(--shadow-thumb-dark)" } }),
                e("input", {
                  type: "range", min: 0, max: 100, step: 1, value: st.vol, "aria-label": "Device volume",
                  onInput: onVolSlide, onChange: onVolSlide,
                  style: { position: "absolute", left: "-13px", right: "-13px", width: "calc(100% + 26px)", height: "44px", margin: 0, opacity: 0, cursor: "pointer", WebkitAppearance: "none", appearance: "none", background: "transparent" }
                })),
              e(DS.Icon, { name: "volume", size: 17, color: "var(--on-dark-50)" })))),
        e("div", { style: { font: "400 13.5px/1.5 var(--font-text)", color: "var(--on-dark-50)", textAlign: "center", marginTop: "18px" } },
          "You'll hear one or more sounds and compare them to the tinnitus you hear.")),
      e("div", { key: "f", style: { flex: "none", padding: "8px 22px 0", background: "var(--navy-900)" } },
        e(DS.Button, {
          variant: "primary", size: "md", onDark: true, disabled: !(st.hp && ready),
          onClick: () => (st.hp && st.vol >= 100) ? this.goScreen("edu", { setupSeen: true }) : this.setState({ setupWarn: true })
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
    // The three options stay locked until the session setup and education are
    // complete. Ordinary navigation reaches this screen only after the ear
    // gate too. The open handler re-checks
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
          this.segmentedControl(
            "Sound plays in",
            ["Left", "Right", "Both"],
            { "Left ear": "Left", "Right ear": "Right", "Both ears": "Both" }[st.ear] || "Both",
            (v) => this.setEar({ Left: "Left ear", Right: "Right ear", Both: "Both ears" }[v] || "Both ears")
          )),
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
      key, type: "button", onClick: () => this.toggleKey(key, [spec]),
      "aria-pressed": playing ? "true" : "false",
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

  // Reassurance / status note used across the comparison screens.
  noteBox(text, marginTop) {
    return e("div", { style: { background: "var(--blue-50)", border: "1px solid var(--blue-200)", borderRadius: "12px", padding: "11px 14px", font: "400 13.5px/1.5 var(--font-text)", color: "var(--gray-700)", marginTop } }, text);
  }

  // Underlined low-key escape link (REQ-016): audibility problems are useful
  // answers, so the way out never looks like an error.
  escapeLink(label, onClick) {
    return e("button", { onClick, style: { border: "none", background: "transparent", color: "var(--text-muted)", font: "500 13px var(--font-ui)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px", minHeight: "44px", padding: "0 10px" } }, label);
  }

  // Narrowing · Prepare (REQ-007): Option 1's own intro copy and icon rows.
  renderNIntro() {
    const st = this.state;
    const rows = [
      ["headphones", "Listen to the sound"],
      ["equalizer", "Set the volume once, then refine the pitch"],
      ["check", "We'll narrow in around your choices"]
    ];
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "26px 24px 10px" } },
        e("div", { style: { display: "inline-flex", background: "var(--gray-100)", borderRadius: "999px", padding: "4px 10px", font: "700 10px var(--font-ui)", letterSpacing: ".16em", color: "var(--text-label)" } }, (st.ear || "Both ears").toUpperCase()),
        e("div", { style: { font: "700 26px/1.14 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em", marginTop: "12px" } }, "Match your tinnitus"),
        e("div", { style: { font: "400 15px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "10px" } },
          "You'll listen to a sound and adjust it until it's close to what you hear. One step for how loud it is, then a few passes on how high or low, each one closer than the last. There are no wrong answers. Choose what feels closest to what you hear."),
        e("div", { style: { marginTop: "22px" } },
          e(DS.Card, { variant: "section" },
            e("div", { style: { display: "flex", flexDirection: "column", gap: "15px" } },
              rows.map(([icon, text]) =>
                e("div", { key: icon, style: { display: "flex", alignItems: "center", gap: "13px" } },
                  e(DS.IconTile, { size: "sm", tone: "blue" }, e(DS.Icon, { name: icon, size: 20 })),
                  e("div", { style: { font: "500 14px/1.35 var(--font-ui)", color: "var(--gray-800)" } }, text))))))),
      e("div", { key: "f", style: { flex: "none", padding: "8px 22px 0", background: "var(--gray-50)", display: "flex", flexDirection: "column", gap: "9px" } },
        e(DS.Button, { variant: "primary", size: "md", onClick: () => this.go("n", st.eduSeen ? "vol" : "edu") }, "Begin matching"),
        st.eduSeen
          ? e("button", {
            onClick: () => this.go("n", "edu"),
            style: { display: "block", width: "100%", border: "none", background: "transparent", color: "var(--text-muted)", font: "500 13px var(--font-ui)", padding: "4px 0 9px", minHeight: "44px", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }
          }, "Remind me what to listen for")
          : e("div", { style: { height: "9px" } }))
    ];
  }

  // Nudge button in the prototype's pitch-pass header: like the design
  // system's, but wearing the pass's hue.
  nNudge(glyph, onClick, hue) {
    return e("button", {
      key: glyph, onClick, "aria-label": glyph === "+" ? "Pitch up" : "Pitch down",
      style: { width: "40px", height: "var(--h-nudge)", border: "1.5px solid var(--blue-border)", borderRadius: "8px", background: "var(--white)", color: hue.solid, font: "600 19px/1 var(--font-ui)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }
    }, glyph);
  }

  // Narrowing · Refinement pass (REQ-007): the volume step, then the pitch
  // passes whose window band tightens around each choice while the tick layer
  // scales and the ticks stay fixed. Step buttons plus the fine slider, with
  // the widen and can't-hear escapes (REQ-016).
  renderPass() {
    const st = this.state, n = st.n, s = st.stages.n;
    const isVol = s === "vol";
    const win = nar.windowOf(s, n);
    const layer = nar.tickLayer(win);
    const hue = nar.HUES[nar.hueIndex(s)];
    const heard = gating.heardHere(st);
    const onSlide = (ev) => this.pat("n", nar.slidePitch(win, parseFloat(ev.target.value)));
    const signOff = () => {
      const x = this.state;
      if (!gating.heardHere(x)) return;
      const res = nar.advance(x.stages.n, x.n);
      this.go("n", res.stage, res.obj);
    };
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "12px 20px 10px" } },
        e("div", { style: { font: "700 23px/1.16 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em" } }, nar.passTitle(s, n)),
        e("div", { style: { font: "400 14px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "7px", minHeight: "63px" } }, nar.passBody(s)),
        e(DS.Card, { variant: "section" },
          this.playToggleButton(st.playKey === "main", () => this.toggleKey("main", mainSpecs(this.state))),
          isVol
            ? e("div", { style: { marginTop: "18px" } },
              e(DS.TuningSlider, { label: "Volume", value: n.level, onChange: (v) => this.pat("n", { level: v }), precision: "Coarse" }),
              e("div", { style: { font: "400 12.5px/1.45 var(--font-text)", color: "var(--text-muted)", marginTop: "9px" } }, nar.VOL_HINT))
            : e("div", { style: { marginTop: "18px" } },
              e("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" } },
                e("span", { style: { font: "700 14px var(--font-ui)", color: "var(--text-heading)" } }, "Pitch"),
                e("div", { style: { display: "flex", gap: "8px" } },
                  this.nNudge("−", () => this.pat("n", nar.stepPitch(this.state.n, win, -1)), hue),
                  this.nNudge("+", () => this.pat("n", nar.stepPitch(this.state.n, win, 1)), hue))),
              e("div", { style: { position: "relative", height: "6px", background: "var(--interface-track)", borderRadius: "999px", marginBottom: "10px" } },
                e("div", { "data-pitch-window": "", style: { position: "absolute", top: 0, bottom: 0, left: (win.edge * 100).toFixed(1) + "%", width: (win.span * 100).toFixed(1) + "%", background: hue.band, borderRadius: "999px", transition: "left 420ms cubic-bezier(.4,0,.2,1),width 420ms cubic-bezier(.4,0,.2,1)" } }),
                e("div", { style: { position: "absolute", top: "-2px", bottom: "-2px", left: (n.pitch * 100).toFixed(1) + "%", width: "2px", marginLeft: "-1px", background: hue.solid, borderRadius: "1px" } })),
              e("div", { style: { position: "relative", height: "40px" } },
                e("div", { style: { position: "absolute", left: 0, right: 0, top: "13px", height: "14px", pointerEvents: "none", overflow: "hidden" } },
                  e("div", { "data-tick-layer": "", style: { position: "absolute", top: 0, height: "14px", left: layer.left, width: layer.width, transition: "left 460ms cubic-bezier(.4,0,.2,1),width 460ms cubic-bezier(.4,0,.2,1)" } },
                    nar.NTICKS.map((p) => e("div", { key: p, "data-tick": "", style: { position: "absolute", top: 0, width: "2px", height: "14px", marginLeft: "-1px", borderRadius: "1px", background: hue.solid, left: p } })))),
                e("div", { style: { position: "absolute", left: 0, right: 0, top: "18px", height: "4px", borderRadius: "999px", background: "var(--interface-rail)", pointerEvents: "none" } }),
                e("div", { style: { position: "absolute", top: "6px", left: (win.pos * 100).toFixed(1) + "%", width: "28px", height: "28px", marginLeft: "-14px", borderRadius: "50%", background: "var(--white)", border: "2px solid " + hue.solid, boxShadow: "var(--shadow-thumb)", pointerEvents: "none" } }),
                e("input", {
                  type: "range", min: 0, max: 100, step: 0.5, value: win.pos * 100, "aria-label": "Pitch",
                  onInput: onSlide, onChange: onSlide,
                  style: { position: "absolute", left: "-14px", right: "-14px", top: 0, width: "calc(100% + 28px)", height: "40px", margin: 0, opacity: 0, cursor: "pointer", WebkitAppearance: "none", appearance: "none", background: "transparent" }
                }))),
          st.showTech ? e("div", { "data-technical-values": true, style: { textAlign: "right", font: "500 12px var(--font-ui)", color: "var(--text-muted)", marginTop: "5px" } }, shell.techOf({ kind: "tone", pitch: n.pitch, level: n.level })) : null),
        // The prototype computes this note but its display block sits dormant
        // in the Field · Prepare markup; escapes must reassure (REQ-016), so
        // it renders here on the pass screen instead.
        n.note ? this.noteBox(n.note, "14px") : null),
      e("div", { key: "f", style: { flex: "none", padding: "8px 22px 0", background: "var(--gray-50)", display: "flex", flexDirection: "column", gap: "9px" } },
        e(DS.Button, { variant: "primary", size: "sm", disabled: !heard, onClick: signOff }, nar.PRIMARY[s]),
        s === "p3" ? e(DS.Button, { variant: "outline", size: "sm", onClick: () => this.pat("n", nar.keepGoing(this.state.n)) }, "Keep fine-tuning") : null,
        e("div", { style: { display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", padding: "2px 0 9px", minHeight: "44px" } },
          isVol ? null : this.escapeLink("Wider range", () => { const w = nar.widen(this.state.n); this.go("n", w.stage, w.obj); }),
          this.escapeLink("Can't hear this", () => this.pat("n", nar.noHear(this.state.n)))))
    ];
  }

  // Comparison · Prepare (REQ-008): Option 2's own intro copy and icon rows.
  renderRIntro() {
    const st = this.state;
    const rows = [
      ["headphones", "Say louder, quieter, higher or lower"],
      ["check", "Then pick the closer of two sounds"],
      ["arrowRight", "Each answer makes the next change smaller"]
    ];
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "26px 24px 10px" } },
        e("div", { style: { display: "inline-flex", background: "var(--gray-100)", borderRadius: "999px", padding: "4px 10px", font: "700 10px var(--font-ui)", letterSpacing: ".16em", color: "var(--text-label)" } }, (st.ear || "Both ears").toUpperCase()),
        e("div", { style: { font: "700 26px/1.14 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em", marginTop: "12px" } }, "Which is closer?"),
        e("div", { style: { font: "400 15px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "10px" } },
          "First you'll hear one sound and tell us whether yours is louder, quieter, higher or lower. Then you'll hear two at a time and pick whichever is closer. There are no settings to figure out, and if neither sounds right, say so and we'll change direction."),
        e("div", { style: { marginTop: "22px" } },
          e(DS.Card, { variant: "section" },
            e("div", { style: { display: "flex", flexDirection: "column", gap: "15px" } },
              rows.map(([icon, text]) =>
                e("div", { key: icon, style: { display: "flex", alignItems: "center", gap: "13px" } },
                  e(DS.IconTile, { size: "sm", tone: "blue" }, e(DS.Icon, { name: icon, size: 20 })),
                  e("div", { style: { font: "500 14px/1.35 var(--font-ui)", color: "var(--gray-800)" } }, text))))))),
      e("div", { key: "f", style: { flex: "none", padding: "8px 22px 0", background: "var(--gray-50)", display: "flex", flexDirection: "column", gap: "9px" } },
        e(DS.Button, { variant: "primary", size: "md", onClick: () => this.go("r", st.eduSeen ? "dir" : "edu") }, "Start comparing"),
        st.eduSeen
          ? e("button", {
            onClick: () => this.go("r", "edu"),
            style: { display: "block", width: "100%", border: "none", background: "transparent", color: "var(--text-muted)", font: "500 13px var(--font-ui)", padding: "4px 0 9px", minHeight: "44px", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }
          }, "Remind me what to listen for")
          : e("div", { style: { height: "9px" } }))
    ];
  }

  // Shared · Listen and respond (REQ-008): the directional phase. Volume
  // first, then pitch; answers stay disabled in place until the sound plays.
  renderListen() {
    const st = this.state, c = st.concept, o = c === "a" ? st.a : st.r;
    const heard = gating.heardHere(st);
    const chips = c === "a"
      ? (o.phase === "pitch"
        ? [["Mine is higher", "higher"], ["Mine is lower", "lower"], ["Not like mine at all", "notmine"]]
        : [["Mine is louder", "louder"], ["Mine is softer", "softer"]])
      : (o.phase === "vol"
        ? [["Mine is louder", "louder"], ["Mine is quieter", "quieter"]]
        : [["Mine is higher", "higher"], ["Mine is lower", "lower"]]);
    const settle = c === "a"
      ? (o.phase === "pitch" ? "This sounds like mine" : "This is as loud as mine")
      : (o.phase === "vol" ? "The volume is set, move on" : "The pitch is set, finish up");
    const answer = (tag) => () => {
      if (!gating.heardHere(this.state)) {
        this.setState((s) => ({ [c]: { ...s[c], msg: "Press play first, then tell us how it compares." } }));
        return;
      }
      if (c === "a") this.aResp(tag);
      else this.rDir(tag);
    };
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "10px 20px 10px" } },
        e("div", { style: { marginTop: "14px" } },
          e(DS.Card, { variant: "section" },
            this.playToggleButton(st.playKey === "main", () => this.toggleKey("main", mainSpecs(this.state))))),
        e("div", { style: { marginTop: "18px" } },
          e(DS.SectionLabel, null, "HOW DOES IT COMPARE?"),
          e("div", { style: { display: "flex", flexDirection: "column", gap: "8px", marginTop: "11px" } },
            chips.map(([label, tag]) =>
              e(DS.Button, { key: label, variant: "outline", size: "sm", disabled: !heard, onClick: answer(tag) }, label))),
          e("div", { style: { display: "flex", flexDirection: "column", gap: "8px", marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--gray-200)" } },
            e(DS.Button, { variant: "primary", size: "sm", disabled: !heard, onClick: answer(c === "a" && o.phase === "pitch" ? "close" : "right") }, settle))),
        o.msg ? this.noteBox(o.msg, "14px") : null),
      e("div", { key: "f", style: { flex: "none", padding: "8px 22px 0", background: "var(--gray-50)", display: "flex", flexDirection: "column", gap: "9px" } },
        c === "a" && o.suggest
          ? this.noteBox("Nothing nearby has beaten this sound for a while. One final check and we're done, or keep refining if you're not sure.")
          : null,
        e("div", { style: { display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", padding: "2px 0 9px", minHeight: "44px" } },
          this.escapeLink("Can't hear this", () => c === "a" ? this.aResp("nohear") : this.rDir("nohear"))),
        c === "a" && o.suggest
          ? e(DS.Button, { variant: "primary", size: "sm", onClick: () => this.go("a", "chal") }, "Do the final check")
          : null,
        c === "a" && o.responded
          ? e(DS.Button, { variant: "ghost", onClick: () => this.go("a", "conf", { stop: "patient" }) }, "This is close enough")
          : null)
    ];
  }

  // One side of the A/B pair: circular play control plus its choice button.
  // The choice stays rendered and gray until both sounds have played, so
  // nothing shifts under a thumb (REQ-018).
  pairCard(which, spec, label, ready, pick, badge) {
    const pk = which === "a" ? "prA" : "prB";
    const playing = this.state.playKey === pk;
    const onPlay = () => { this.prHeard(which, gating.pairKeyOf(this.state)); this.toggleKey(pk, [spec]); };
    const onPick = () => {
      const x = this.state;
      if (!gating.prReady(x, gating.pairKeyOf(x))) return;
      this.stopAudio();
      pick(spec);
    };
    const ring = (delay) => e("span", { style: { position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid var(--blue-300)", animation: "pnqRing 1.8s ease-out infinite" + delay } });
    return e("div", { key: pk, style: { flex: 1, background: "var(--white)", border: "1.5px solid " + (playing ? "var(--control-accent)" : "var(--gray-200)"), borderRadius: "16px", padding: "16px 10px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "9px" } },
      e("div", { style: { position: "relative", width: "58px", height: "58px" } },
        playing ? ring("") : null,
        playing ? ring(" .9s") : null,
        e("button", {
          type: "button", onClick: onPlay,
          "aria-label": (playing ? "Stop" : "Play") + " sound " + (which === "a" ? "1" : "2"),
          "aria-pressed": playing ? "true" : "false",
          style: { position: "absolute", inset: "2px", borderRadius: "50%", border: "2px solid var(--blue-600)", background: playing ? "var(--control-accent)" : "var(--white)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }
        },
          playing
            ? e("span", { style: { display: "flex", gap: "4px" } },
              e("span", { style: { width: "5px", height: "16px", background: "var(--white)", borderRadius: "1.5px" } }),
              e("span", { style: { width: "5px", height: "16px", background: "var(--white)", borderRadius: "1.5px" } }))
            : e("span", { style: { display: "block", width: 0, height: 0, borderLeft: "15px solid var(--blue-600)", borderTop: "9px solid transparent", borderBottom: "9px solid transparent", marginLeft: "4px" } }))),
      e("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" } },
        e("div", { style: { font: "600 15px var(--font-ui)", color: "var(--text-heading)" } }, label),
        badge ? e("span", { style: { font: "700 9px var(--font-ui)", letterSpacing: ".12em", color: "var(--blue-700)", background: "var(--blue-100)", borderRadius: "999px", padding: "3px 8px" } }, "PREVIOUS MATCH") : null),
      e(DS.Button, { variant: "outline", size: "xs", disabled: !ready, onClick: onPick }, "This one"));
  }

  rPick(pitch) { this.applyR(comparison.pick(this.state.r, pitch)); }

  rNeither() {
    const res = comparison.neither(this.state.r);
    if (res.kind === "patch") this.stopAudio();
    this.applyR(res);
  }

  // Shared · Two-sound comparison (REQ-008): forced-choice pairs that halve
  // the spread, with the same-answer stop, the fatigue finisher and the
  // "can't hear" escape (REQ-016).
  renderPair() {
    const st = this.state, c = st.concept;
    let A, B, title, caption, note = "", badgeB = false, pickA, pickB, noHear;
    const secs = [];
    if (c === "r") {
      const r = st.r;
      ({ A, B } = comparison.pairSpecs(r));
      title = "Which one is closer?";
      caption = "Both are near the sound you landed on. Pick whichever is closer to what you hear. They get more alike as you go.";
      note = comparison.compNote(r);
      pickA = (spec) => this.rPick(spec.pitch);
      pickB = (spec) => this.rPick(spec.pitch);
      secs.push({ label: "Neither is close", f: () => this.rNeither() });
      secs.push({ label: "They sound the same", f: () => this.go("r", "conf", { stop: "same" }) });
      if (r.round >= comparison.FATIGUE_ROUND) secs.push({ label: "Finish from my best match", f: () => this.go("r", "conf") });
      noHear = () => this.applyR(comparison.compNoHear(this.state.r));
    } else if (c === "a") {
      ({ A, B } = pres.aChalSpecs(st.a));
      title = "One more check";
      caption = "Before we finish, which is more like what you hear?";
      pickA = () => this.go("a", "conf", { stop: "system" });
      pickB = (spec) => this.go("a", "conf", { stop: "system", est: spec.pitch });
      secs.push({ label: "I can't tell them apart", f: () => this.go("a", "conf", { stop: "cant" }) });
      noHear = () => this.pat("a", { level: Math.min(.85, this.state.a.level + .12) });
    } else {
      ({ A, B } = pres.lPriorSpecs(st.l));
      title = "Which is more like today?";
      caption = st.l.transparent
        ? "One of these is your previous match. Pick what is true today, even if it is the other one."
        : "Listen to both and pick whichever is closer to what you hear right now.";
      badgeB = st.l.transparent;
      pickA = (spec) => this.go("l", "refine", { pitch: spec.pitch, level: spec.level, picked: "nearby" });
      pickB = (spec) => this.go("l", "refine", { pitch: spec.pitch, level: spec.level, picked: "prior" });
      secs.push({ label: "Neither sounds right today", f: () => this.go("l", "reopen", { note: "That's useful. Your hearing today comes first. We'll search fresh." }) });
      noHear = () => this.pat("l", { note: "We made the sounds a little easier to hear. Try again.", prior: { ...this.state.l.prior, level: Math.min(.85, this.state.l.prior.level + .12) } });
      note = st.l.note;
    }
    const ready = this.prReady(gating.pairKeyOf(st));
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "10px 20px 10px" } },
        e("div", { style: { font: "700 23px/1.16 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em" } }, title),
        e("div", { style: { font: "400 14px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "7px", minHeight: "63px" } },
          caption),
        e("div", { style: { font: "500 13px/1.4 var(--font-ui)", color: ready ? "var(--text-muted)" : "var(--text-heading)", marginTop: "2px", minHeight: "18px" } },
          ready ? "" : "Play both sounds before choosing."),
        e("div", { style: { display: "flex", gap: "11px", marginTop: "14px" } },
          this.pairCard("a", A, "Sound 1", ready, pickA, false),
          this.pairCard("b", B, "Sound 2", ready, pickB, badgeB)),
        // The prototype computes this note but its display block sits dormant
        // in the confidence markup; escapes must reassure (REQ-016), so it
        // renders here on the pair screen instead.
        note ? this.noteBox(note, "14px") : null),
      e("div", { key: "f", style: { flex: "none", padding: "8px 22px 0", background: "var(--gray-50)", display: "flex", flexDirection: "column", gap: "9px" } },
        e("div", { style: { display: "flex", gap: "4px", flexWrap: "wrap" } },
          secs.map((sec) =>
            e("div", { key: sec.label, style: { flex: 1, minWidth: "150px" } },
              e(DS.Button, { variant: "ghost", onClick: sec.f }, sec.label)))),
        e("button", {
          onClick: noHear,
          style: { display: "block", width: "100%", border: "none", background: "transparent", color: "var(--text-muted)", font: "500 13px var(--font-ui)", padding: "4px 0 9px", minHeight: "44px", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }
        }, "I can't hear these sounds"))
    ];
  }

  /* ---------- preserved V5 Sound-Family Guided flow (REQ-010) ---------- */

  // Blue contextual note box used across the family stages' footers.
  fNote(text) {
    return e("div", { style: { background: "var(--blue-50)", border: "1px solid var(--blue-200)", borderRadius: "12px", padding: "11px 14px", font: "400 13.5px/1.5 var(--font-text)", color: "var(--gray-700)", marginBottom: "1px" } }, text);
  }

  // 40px round preview button: independent of the row's select handler.
  fPlayBtn(pk, specs, label) {
    const playing = this.state.playKey === pk;
    return e("button", {
      type: "button",
      "aria-label": (playing ? "Stop " : "Play ") + label,
      "aria-pressed": playing ? "true" : "false",
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
              key,
              style: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 13px", borderRadius: "14px", background: sel ? "var(--interface-selected)" : "var(--white)", border: "1.5px solid " + (sel ? "var(--interface-selected-border)" : "var(--gray-200)") }
            },
              d.ex ? this.fPlayBtn("fam-" + key, [d.ex], d.name + " example") : null,
              e("button", {
                type: "button", onClick: () => this.pat("f", { fam: key }), "aria-label": "Select " + d.name,
                "aria-pressed": sel ? "true" : "false",
                style: { flex: 1, minWidth: 0, minHeight: "44px", display: "flex", alignItems: "center", gap: "12px", padding: 0, border: "none", background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer" }
              },
                e("span", { style: { flex: 1, minWidth: 0 } },
                  e("span", { style: { display: "block", font: "600 14.5px/1.25 var(--font-ui)", color: "var(--text-heading)" } }, d.name),
                  e("span", { style: { display: "block", font: "400 12.5px/1.4 var(--font-text)", color: "var(--text-secondary)", marginTop: "2px" } }, d.desc)),
                this.fTick(sel)));
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
              key: i,
              style: { display: "flex", alignItems: "center", gap: "12px", padding: "11px 13px", borderRadius: "14px", background: sel ? "var(--interface-selected)" : "var(--white)", border: "1.5px solid " + (sel ? "var(--interface-selected-border)" : "var(--gray-200)") }
            },
              this.fPlayBtn("char-" + i, [ch.spec], ch.label + " example"),
              e("button", {
                type: "button", onClick: () => this.pat("f", { charIdx: i }), "aria-label": "Select " + ch.label,
                "aria-pressed": sel ? "true" : "false",
                style: { flex: 1, minWidth: 0, minHeight: "44px", display: "flex", alignItems: "center", gap: "12px", padding: 0, border: "none", background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer" }
              },
                e("span", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" } },
                  e("span", { style: { font: "600 14.5px/1.3 var(--font-ui)", color: "var(--text-heading)" } }, ch.label),
                  ch.sub ? e("span", { style: { font: "400 12.5px/1.35 var(--font-text)", color: "var(--text-body)" } }, ch.sub) : null),
                this.fTick(sel)));
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
            this.playToggleButton(st.playKey === "main", () => this.toggleKey("main", mainSpecs(this.state))),
            e("div", { style: { marginTop: "18px" } },
              e(DS.TuningSlider, { label: "Pitch", value: tuneSpec.pitch, onChange: (v) => setSpec({ pitch: v }), precision: "Medium" })),
            st.showTech ? e("div", { "data-technical-values": true, style: { textAlign: "right", font: "500 12px var(--font-ui)", color: "var(--text-muted)", marginTop: "5px" } }, shell.techOf(tuneSpec)) : null,
            e("div", { style: { marginTop: "16px" } },
              e(DS.TuningSlider, { label: "Loudness", value: tuneSpec.level, onChange: (v) => setSpec({ level: v }) })),
            e("div", { style: { marginTop: "18px" } },
              e(DS.SectionLabel, { description: "How does the sound behave over time?" }, "BEHAVIOR"),
              e("div", { style: { marginTop: "9px" } },
                this.segmentedControl("Sound behavior", fam.BEH_UI, fam.BEH_LBL[tuneSpec.behavior] || "Steady", (v) => setSpec({ behavior: fam.BEH_MAP[v] }))))))),
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
                this.fPlayBtn("ly" + i, [sd.spec], "sound " + (i + 1)),
                e("div", { style: { flex: 1, minWidth: 0 } },
                  e("div", { style: { font: "600 14.5px/1.25 var(--font-ui)", color: "var(--text-heading)" } }, "Sound " + (i + 1) + ": " + (fam.FAMS[sd.fam] ? fam.FAMS[sd.fam].name.toLowerCase() : "sound")),
                  e("div", { style: { font: "400 12.5px/1.4 var(--font-text)", color: "var(--text-secondary)", marginTop: "2px" } }, shell.describe(sd.spec))))))),
        hasTwo ? e("div", { style: { marginTop: "14px" } },
          this.playToggleButton(
            st.playKey === "together",
            () => this.toggleKey("together", fam.layerSounds(this.state.f).map((x) => x.spec)),
            st.playKey === "together" ? "Stop" : "Play them together"
          )) : null),
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

  /* ---------- Option 3 - 2D pitch-volume field (REQ-009) ---------- */

  // Pointer drag on the marker (dDown/dMove/dUp). The grab offset keeps the
  // marker from jumping under the thumb, and the window snapshot taken at
  // pointer-down maps local drag coordinates back into the whole space.
  dDown(ev) {
    const puck = ev.currentTarget, pr = puck.getBoundingClientRect();
    this.dEl = puck.parentElement;
    this.dWin = field.dWindow(this.state.d);
    this.dGrab = { dx: ev.clientX - (pr.left + pr.width / 2), dy: ev.clientY - (pr.top + pr.height / 2) };
    try { puck.setPointerCapture(ev.pointerId); } catch (err) {}
  }

  dMove(ev) { if (this.dEl) this.dFieldTo(ev); }

  dUp() { this.dEl = null; this.dGrab = null; }

  // Sound follows the marker while dragging: pitch across, volume up and
  // down, live into the playing voice. Releasing keeps the position.
  dFieldTo(ev) {
    if (!this.dEl) return;
    const r = this.dEl.getBoundingClientRect(), g = this.dGrab || { dx: 0, dy: 0 }, w = this.dWin || { span: 1, x0: 0, y0: 0 };
    const p = field.dragPoint(w, (ev.clientX - g.dx - r.left) / r.width, (ev.clientY - g.dy - r.top) / r.height);
    this.setState((s) => ({ d: { ...s.d, ...p } }), () => {
      if (this.state.playKey === "dfield") this.withAudio((a) => a.update([field.dSpec(this.state.d)]));
    });
  }

  renderDIntro() {
    const st = this.state;
    const rows = [
      ["headphones", "Drag the marker and listen"],
      ["equalizer", "Across for pitch, up and down for volume"],
      ["check", "Then look closely at the area you chose"]
    ];
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "26px 24px 10px" } },
        e("div", { style: { display: "inline-flex", background: "var(--gray-100)", borderRadius: "999px", padding: "4px 10px", font: "700 10px var(--font-ui)", letterSpacing: ".16em", color: "var(--text-label)" } }, (st.ear || "Both ears").toUpperCase()),
        e("div", { style: { font: "700 26px/1.14 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em", marginTop: "12px" } }, "Find your sound by moving"),
        e("div", { style: { font: "400 15px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "10px" } },
          "You'll move one marker around and listen. Moving across changes the pitch, moving up and down changes the volume. Go wherever it sounds closest to what you hear."),
        e("div", { style: { marginTop: "22px" } },
          e(DS.Card, { variant: "section" },
            e("div", { style: { display: "flex", flexDirection: "column", gap: "15px" } },
              rows.map(([icon, text]) =>
                e("div", { key: icon, style: { display: "flex", alignItems: "center", gap: "13px" } },
                  e(DS.IconTile, { size: "sm", tone: "blue" }, e(DS.Icon, { name: icon, size: 20 })),
                  e("div", { style: { font: "500 14px/1.35 var(--font-ui)", color: "var(--gray-800)" } }, text))))))),
      e("div", { key: "f", style: { flex: "none", padding: "8px 22px 0", background: "var(--gray-50)", display: "flex", flexDirection: "column", gap: "9px" } },
        e(DS.Button, { variant: "primary", size: "md", onClick: () => this.go("d", st.eduSeen ? "field" : "edu") }, "Start exploring"),
        st.eduSeen ? this.fLink("Remind me what to listen for", () => this.go("d", "edu")) : e("div", { style: { height: "9px" } }))
    ];
  }

  // Field · Pitch and volume (REQ-009): the broad pass and both zoom levels
  // render the same screen. The field always draws the whole space on one
  // scaled layer, so zooming reads as the decorative grid growing rather
  // than as a new screen.
  renderDField() {
    const st = this.state, d = st.d;
    const v = field.view(d);
    const hue = field.hueOf(v.level), nextHue = field.hueOf(v.level + 1);
    const axis = (label) => e("span", { style: { font: "700 9.5px var(--font-ui)", letterSpacing: ".14em", color: "var(--text-label)", writingMode: "vertical-rl", transform: "rotate(180deg)" } }, label);
    const gridLine = (p, vert) => e("line", {
      key: (vert ? "v" : "h") + p,
      x1: vert ? p : 0, y1: vert ? 0 : p, x2: vert ? p : 100, y2: vert ? 100 : p,
      stroke: field.tint(hue.line, hue.lineA), strokeWidth: 1, vectorEffect: "non-scaling-stroke"
    });
    const advance = () => {
      const res = field.advance(this.state.d);
      if (res.kind === "patch") return this.pat("d", res.patch);
      if (res.kind === "zoom") return this.go("d", "zoom", res.obj);
      return this.go("d", "conf");
    };
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "12px 20px 10px" } },
        e("div", { style: { font: "700 23px/1.16 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em" } }, v.title),
        e("div", { style: { font: "400 14px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "7px", minHeight: "63px" } }, v.body),
        e("div", { style: { marginTop: "12px" } },
          e(DS.Button, {
            variant: "outline", size: "sm",
            onClick: () => {
              if (this.state.playKey !== "dfield") this.pat("d", { heard: true });
              this.toggleKey("dfield", [field.dSpec(this.state.d)]);
            }
          }, st.playKey === "dfield" ? "Stop the sound" : d.heard ? "Play from here" : "Play the sound")),
        e("div", { style: { display: "flex", gap: "9px", marginTop: "12px", alignItems: "stretch" } },
          e("div", { style: { flex: "none", width: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", paddingBottom: "21px" } },
            axis("LOUDER"), axis("QUIETER")),
          e("div", { style: { flex: 1, minWidth: 0 } },
            e("div", { "data-field": "", style: { position: "relative", width: "100%", aspectRatio: "1", borderRadius: "18px", border: "1.5px solid var(--gray-300)", background: "var(--white)", touchAction: "none", overflow: "hidden" } },
              e("div", { "data-field-grid": "", style: { position: "absolute", inset: 0, backgroundImage: field.fieldBg(v.level), pointerEvents: "none", transform: "scale(" + v.scale + ")", transformOrigin: v.origin, transition: "transform 560ms cubic-bezier(.4,0,.2,1),transform-origin 560ms cubic-bezier(.4,0,.2,1)" } },
                e("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "none", style: { position: "absolute", inset: 0, width: "100%", height: "100%" } },
                  field.GRID.map((p) => gridLine(p, true)),
                  field.GRID.map((p) => gridLine(p, false)))),
              v.level > 0 ? e("div", { style: { position: "absolute", inset: 0, border: "1.5px solid " + field.tint(hue.base, 55), borderRadius: "17px", pointerEvents: "none" } }) : null,
              d.heard && v.hasNext ? e("div", {
                "data-field-region": "",
                style: {
                  position: "absolute", left: (v.regionLeft * 100).toFixed(1) + "%", top: (v.regionTop * 100).toFixed(1) + "%",
                  width: (v.regFrac * 100).toFixed(1) + "%", height: (v.regFrac * 100).toFixed(1) + "%",
                  border: "1.5px dashed " + field.tint(nextHue.base, 90), borderRadius: "12px",
                  background: field.tint(nextHue.base, 8), boxShadow: "0 2px 14px " + field.tint(nextHue.base, 18),
                  pointerEvents: "none", transition: "width 540ms cubic-bezier(.4,0,.2,1),height 540ms cubic-bezier(.4,0,.2,1)"
                }
              }) : null,
              e("div", {
                "data-field-marker": "",
                onPointerDown: (ev) => this.dDown(ev), onPointerMove: (ev) => this.dMove(ev), onPointerUp: () => this.dUp(),
                style: {
                  position: "absolute", left: (v.locX * 100).toFixed(1) + "%", top: (v.locY * 100).toFixed(1) + "%",
                  width: "56px", height: "56px", borderRadius: "50%",
                  background: field.tint("var(--blue-500)", 24), border: "2.5px solid var(--control-accent)",
                  transform: "translate(-50%,-50%)", cursor: "grab", touchAction: "none",
                  boxShadow: "0 3px 14px " + field.tint("var(--blue-500)", 42),
                  display: "flex", alignItems: "center", justifyContent: "center"
                }
              },
                e("span", { style: { display: "block", width: "12px", height: "12px", borderRadius: "50%", background: "var(--control-accent)" } }))),
            e("div", { style: { display: "flex", justifyContent: "space-between", marginTop: "8px", font: "700 9.5px var(--font-ui)", letterSpacing: ".14em", color: "var(--text-label)" } },
              e("span", null, "LOWER"), e("span", null, "HIGHER")))),
        st.showTech ? e("div", { "data-technical-values": true, style: { font: "500 12px var(--font-ui)", color: "var(--text-muted)", marginTop: "6px" } }, shell.techOf(field.dSpec(d))) : null,
        // The prototype computes this note but its display block sits stranded
        // in the Families intro markup; escapes must reassure (REQ-016), so it
        // renders here on the field screen instead.
        d.note ? this.noteBox(d.note, "12px") : null),
      e("div", { key: "f", style: { flex: "none", padding: "8px 22px 0", background: "var(--gray-50)", display: "flex", flexDirection: "column", gap: "9px" } },
        // The step-forward action stays in place and goes gray until the sound
        // has been played once, so nobody advances on a marker they have never
        // heard. Confirming the last level is the participant's call (REQ-009).
        e(DS.Button, { variant: "primary", size: "md", disabled: !d.heard, onClick: advance },
          v.hasNext ? "Look closely at this area" : "This sounds like my tinnitus"),
        e("div", { style: { display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", padding: "2px 0 9px", minHeight: "44px" } },
          this.escapeLink("Start over", () => this.jump("d", "field", shell.freshD())),
          this.escapeLink("Can't hear this", () => this.pat("d", field.noHear()))))
    ];
  }

  /* ---------- preserved Adaptive, Longitudinal, and Education flows (REQ-011–013) ---------- */

  renderAIntro() {
    const st = this.state;
    const rows = [
      ["headphones", "Hear one sound at a time"],
      ["message", "Say how it compares to yours"],
      ["sparkles", "We adjust based on your answers"]
    ];
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "26px 24px 10px" } },
        e("div", { style: { display: "inline-flex", background: "var(--gray-100)", borderRadius: "999px", padding: "4px 10px", font: "700 10px var(--font-ui)", letterSpacing: ".16em", color: "var(--text-label)" } }, (st.ear || "Both ears").toUpperCase()),
        e("div", { style: { font: "700 26px/1.14 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em", marginTop: "12px" } }, "Listen and react"),
        e("div", { style: { font: "400 15px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "10px" } },
          "You'll hear one sound at a time. Tell us how it compares to yours, and we'll adjust from your answers. There's no fixed number of steps. It continues only while it's helping, and you can stop whenever it feels close."),
        e("div", { style: { marginTop: "22px" } },
          e(DS.Card, { variant: "section" },
            e("div", { style: { display: "flex", flexDirection: "column", gap: "15px" } },
              rows.map(([icon, text]) => e("div", { key: icon, style: { display: "flex", alignItems: "center", gap: "13px" } },
                e(DS.IconTile, { size: "sm", tone: "blue" }, e(DS.Icon, { name: icon, size: 20 })),
                e("div", { style: { font: "500 14px/1.35 var(--font-ui)", color: "var(--gray-800)" } }, text))))))),
      this.fFooter([
        e(DS.Button, { key: "start", variant: "primary", size: "md", onClick: () => this.go("a", "listen") }, "Start listening")
      ])
    ];
  }

  renderLReturn() {
    const st = this.state, l = st.l;
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "26px 24px 10px" } },
        e("div", { style: { display: "inline-flex", background: "var(--gray-100)", borderRadius: "999px", padding: "4px 10px", font: "700 10px var(--font-ui)", letterSpacing: ".16em", color: "var(--text-label)" } }, (st.ear || "Both ears").toUpperCase()),
        e("div", { style: { font: "700 26px/1.14 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em", marginTop: "12px" } }, "Welcome back"),
        e("div", { style: { font: "400 15px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "10px" } },
          l.hasPrior
            ? "We saved what we learned last time, so today can start closer. Your hearing today comes first. If things sound different, we'll search again."
            : "This looks like your first match, so today starts from a broad search. Next time, we can start closer using what we learn today."),
        l.hasPrior ? e("div", { style: { marginTop: "22px" } },
          e(DS.Card, { variant: "list" },
            e("div", { style: { display: "flex", alignItems: "center", gap: "13px", padding: "15px 18px" } },
              e(DS.IconTile, { size: "md", tone: "blue" }, e(DS.Icon, { name: "history", size: 21 })),
              e("div", { style: { flex: 1 } },
                e("div", { style: { font: "600 14.5px/1.25 var(--font-ui)", color: "var(--text-heading)" } }, "Previous match on file"),
                e("div", { style: { font: "400 12.5px/1.4 var(--font-text)", color: "var(--text-secondary)", marginTop: "2px" } }, "6 days ago · " + (st.ear || "Both ears")))))) : null),
      this.fFooter([
        e(DS.Button, { key: "start", variant: "primary", size: "md", onClick: () => this.go("l", l.hasPrior ? "check" : "reopen") }, l.hasPrior ? "Start today’s matching" : "Start matching"),
        l.hasPrior ? e(DS.Button, { key: "fresh", variant: "ghost", onClick: () => this.go("l", "reopen", { note: "History set aside at your request. Nothing from last time will steer today’s search." }) }, "Start fresh instead") : null
      ])
    ];
  }

  renderLCheck() {
    const l = this.state.l;
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "10px 20px" } },
        e("div", { style: { font: "700 23px/1.16 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em" } }, "Quick check-in"),
        e("div", { style: { font: "400 14px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "7px" } }, "Compared with last time, does your tinnitus feel about the same today?"),
        e("div", { style: { display: "flex", flexDirection: "column", gap: "9px", marginTop: "16px" } },
          ["About the same", "Different today", "Not sure"].map((label) =>
            this.selectRowButton(label, label, l.checkin === label, () => this.pat("l", { checkin: label })))),
        e("div", { style: { font: "400 12.5px/1.5 var(--font-text)", color: "var(--text-muted)", marginTop: "12px" } }, "If it feels different, we'll set last time aside and search fresh. Your hearing today comes first.")),
      this.fFooter([
        e(DS.Button, {
          key: "continue", variant: "primary", size: "sm", disabled: !l.checkin,
          onClick: () => l.checkin === "Different today" ? this.go("l", "reopen", { note: "We’ll search fresh today." }) : this.go("l", "prior")
        }, "Continue")
      ])
    ];
  }

  renderLRefine() {
    const st = this.state, l = st.l;
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "10px 20px" } },
        e("div", { style: { font: "700 10px var(--font-ui)", letterSpacing: ".16em", color: "var(--text-label)" } }, "TODAY'S MATCH"),
        e("div", { style: { font: "700 23px/1.16 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em", marginTop: "6px" } }, "Fine-tune today's match"),
        e("div", { style: { font: "400 14px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "7px" } }, "Starting near what you chose. Small adjustments. Trust what you hear right now, not what you remember."),
        e("div", { style: { marginTop: "14px" } },
          e(DS.Card, { variant: "section" },
            this.playToggleButton(st.playKey === "main", () => this.toggleKey("main", mainSpecs(this.state))),
            e("div", { style: { marginTop: "18px" } }, e(DS.TuningSlider, { label: "Pitch", value: l.pitch, onChange: (v) => this.pat("l", { pitch: v }), precision: "Fine" })),
            st.showTech ? e("div", { "data-technical-values": true, style: { textAlign: "right", font: "500 12px var(--font-ui)", color: "var(--text-muted)", marginTop: "5px" } }, shell.techOf(mainSpecs(st)[0])) : null,
            e("div", { style: { marginTop: "16px" } }, e(DS.TuningSlider, { label: "Loudness", value: l.level, onChange: (v) => this.pat("l", { level: v }) }))))),
      this.fFooter([
        l.note ? e(React.Fragment, { key: "note" }, this.noteBox(l.note)) : null,
        e(DS.Button, { key: "done", variant: "primary", size: "sm", onClick: () => this.go("l", "conf") }, "This matches today"),
        e(DS.Button, { key: "fresh", variant: "ghost", onClick: () => this.go("l", "reopen", { note: "We’ll search fresh today." }) }, "It sounds different today")
      ])
    ];
  }

  renderLReopen() {
    const l = this.state.l;
    const choices = [
      ["Narrowing", "n", "vol", shell.freshN],
      ["Comparison", "r", "dir", shell.freshR],
      ["2D field", "d", "field", shell.freshD],
      ["Families", "f", "family", shell.freshF],
      ["Adaptive", "a", "listen", shell.freshA]
    ];
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "10px 20px" } },
        e("div", { style: { font: "700 23px/1.16 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em" } }, "Let's search fresh today"),
        e("div", { style: { font: "400 14px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "7px" } }, "We've set your history aside. You'll match from the start, the same way as your first session, and it usually takes a few minutes. Nothing about last time limits what you can choose today."),
        e("div", { "data-moderator-only": true, style: { border: "1.5px dashed var(--gray-300)", borderRadius: "14px", padding: "14px 16px", marginTop: "18px" } },
          e("div", { style: { font: "700 9.5px var(--font-ui)", letterSpacing: ".16em", color: "var(--text-label)" } }, "EXPLORATION NOTE · NOT PATIENT UI"),
          e("div", { style: { font: "400 13px/1.5 var(--font-text)", color: "var(--text-secondary)", marginTop: "7px" } }, "Which single-session concept runs underneath a reopened search is intentionally open in the brief. Hand off to one:"),
          e("div", { style: { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "11px" } },
            choices.map(([label, cid, stage, fresh]) => e(DS.Button, { key: label, variant: "outline", size: "xs", onClick: () => this.jump(cid, stage, fresh()) }, label)))),
        l.note ? this.noteBox(l.note, "14px") : null),
      this.fFooter([])
    ];
  }

  tPoint(ev) {
    const rect = this.tEl.getBoundingClientRect();
    const lx = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
    const ly = Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height));
    const w = this.tWin || { x0: 0, y0: 0, span: 1 };
    return { x: w.x0 + lx * w.span, y: w.y0 + ly * w.span };
  }

  tDown(ev) {
    this.tEl = ev.currentTarget;
    this.tWin = pres.fieldWindow(this.state.t, this.state.stages.t);
    try { this.tEl.setPointerCapture(ev.pointerId); } catch (err) {}
    const point = this.tPoint(ev);
    this.setState((s) => ({ t: { ...s.t, ...point, heard: true, labels: true }, playKey: "field" }), () =>
      this.withAudio((a) => a.play("field", [pres.fieldSpec(this.state.t)])));
  }

  tMove(ev) {
    if (!this.tEl) return;
    const point = this.tPoint(ev);
    this.setState((s) => ({ t: { ...s.t, ...point } }), () => {
      if (this.state.playKey === "field") this.withAudio((a) => a.update([pres.fieldSpec(this.state.t)]));
    });
  }

  tUp() {
    if (!this.tEl) return;
    this.tEl = null;
    this.tWin = null;
    this.stopAudio();
  }

  renderTFlow() {
    const st = this.state, t = st.t, stage = st.stages.t;
    const onMap = stage === "field" || stage === "zoom";
    const w = pres.fieldWindow(t, stage);
    const localX = (t.x - w.x0) / w.span;
    const localY = (t.y - w.y0) / w.span;
    const cap = { field: "EDUCATION · SOUND EXPLORATION", zoom: "EDUCATION · A CLOSER LOOK", behave: "EDUCATION · HOW SOUND BEHAVES", recap: "EDUCATION · WHAT YOU HEARD" }[stage];
    const title = { field: "Move around and listen", zoom: "Explore this area", behave: "How can a sound behave?", recap: "That is the sound space" }[stage];
    const body = {
      field: t.heard ? "Drag the marker anywhere. Notice what changes as you move across and up and down. Nothing here is your tinnitus match." : "Press play, then drag the marker around and notice how the sound changes.",
      zoom: "Same idea, smaller area, so small movements matter less. Listen for what changes.",
      behave: "Same sound as before. Only the way it behaves over time changes.",
      recap: "Two things describe a sound in this app: what it is like, and how it behaves. Your tinnitus match comes later, and nothing you did here was saved as it."
    }[stage];
    const playBehavior = (label, patch) => {
      const key = "bh-" + label;
      this.setState((s) => ({ t: { ...s.t, behavior: label }, playKey: key }), () =>
        this.withAudio((a) => a.play(key, [{ ...pres.fieldSpec(this.state.t), ...patch }])));
    };
    const advance = () => {
      if (stage === "field") return this.go("t", "zoom", { cx: t.x, cy: t.y });
      if (stage === "zoom") return this.go("t", "behave", { behavior: null });
      if (stage === "behave") return this.go("t", "recap");
      return this.jump("t", "field", shell.freshT());
    };
    const back = () => {
      if (stage === "zoom") return this.go("t", "field");
      if (stage === "behave") return this.go("t", "zoom");
      return this.jump("t", "field", shell.freshT());
    };
    return [
      e("div", { key: "b", style: { flex: 1, overflowY: "auto", padding: "12px 20px 10px" } },
        e("div", { style: { display: "inline-flex", background: "var(--gray-200)", borderRadius: "999px", padding: "4px 10px", font: "700 9.5px var(--font-ui)", letterSpacing: ".14em", color: "var(--gray-600)" } }, cap),
        e("div", { style: { font: "700 22px/1.16 var(--font-ui)", color: "var(--text-heading)", letterSpacing: "-.015em", marginTop: "11px" } }, title),
        e("div", { style: { font: "400 14px/1.5 var(--font-text)", color: "var(--text-body)", marginTop: "7px", minHeight: "63px" } }, body),
        onMap ? e("div", {
          role: "slider", tabIndex: 0, "aria-label": "Sound exploration field",
          "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(t.x * 100),
          "aria-valuetext": pres.FIELDPITCH(t.x) + " pitch, " + pres.FIELDWORD(t.y),
          "data-field": "", onPointerDown: (ev) => this.tDown(ev), onPointerMove: (ev) => this.tMove(ev), onPointerUp: () => this.tUp(), onPointerCancel: () => this.tUp(),
          style: { marginTop: "14px", position: "relative", width: "100%", aspectRatio: "1", borderRadius: "18px", border: "1.5px solid var(--gray-300)", background: "linear-gradient(180deg,var(--blue-100) 0%,var(--blue-50) 34%,var(--green-50) 58%,var(--purple-100) 100%)", touchAction: "none", overflow: "hidden" }
        },
          stage === "field" && t.heard ? e("div", { style: { position: "absolute", left: Math.max(0, Math.min(1 - t.span, t.x - t.span / 2)) * 100 + "%", top: Math.max(0, Math.min(1 - t.span, t.y - t.span / 2)) * 100 + "%", width: t.span * 100 + "%", height: t.span * 100 + "%", border: "1.5px dashed var(--control-accent)", borderRadius: "12px", background: "var(--blue-50)", pointerEvents: "none" } }) : null,
          e("div", { style: { position: "absolute", left: Math.max(0, Math.min(1, localX)) * 100 + "%", top: Math.max(0, Math.min(1, localY)) * 100 + "%", width: "56px", height: "56px", borderRadius: "50%", background: "var(--blue-100)", border: "2.5px solid var(--control-accent)", transform: "translate(-50%,-50%)", pointerEvents: "none", boxShadow: "var(--shadow-thumb)", display: "flex", alignItems: "center", justifyContent: "center" } },
            e("span", { style: { width: "12px", height: "12px", borderRadius: "50%", background: "var(--control-accent)" } }))) : null,
        onMap && t.labels ? e("div", { style: { font: "500 13.5px/1.45 var(--font-ui)", color: "var(--text-heading)", marginTop: "11px" } }, "Sounds around here may feel " + pres.FIELDWORD(t.y) + ", and " + pres.FIELDPITCH(t.x) + " in pitch.") : null,
        stage === "behave" ? e("div", { style: { display: "flex", flexDirection: "column", gap: "9px", marginTop: "14px" } },
          pres.FIELDBEHAVE.map(([label, sub, patch]) => {
            const selected = t.behavior === label, playing = st.playKey === "bh-" + label;
            return e("button", { type: "button", key: label, onClick: () => playBehavior(label, patch), "aria-pressed": selected ? "true" : "false", style: { display: "flex", alignItems: "center", gap: "12px", width: "100%", minHeight: "62px", padding: "11px 13px", borderRadius: "14px", cursor: "pointer", textAlign: "left", background: selected ? "var(--interface-selected)" : "var(--white)", border: "1.5px solid " + (selected ? "var(--interface-selected-border)" : "var(--gray-200)") } },
              e("span", { style: { flex: "none", width: "40px", height: "40px", borderRadius: "50%", border: "1.5px solid var(--blue-border)", background: playing ? "var(--control-accent)" : "var(--white)", display: "flex", alignItems: "center", justifyContent: "center" } }, playing ? "Ⅱ" : "▶"),
              e("div", { style: { flex: 1 } }, e("div", { style: { font: "600 14.5px/1.3 var(--font-ui)", color: "var(--text-heading)" } }, label), e("div", { style: { font: "400 12.5px/1.35 var(--font-text)", color: "var(--text-body)", marginTop: "2px" } }, sub)));
          })) : null,
        stage === "recap" ? e("div", { style: { marginTop: "14px" } },
          e(DS.Card, { variant: "section" },
            e(DS.SectionLabel, null, "WHAT YOU HEARD"),
            e("div", { style: { display: "flex", flexDirection: "column", gap: "11px", marginTop: "12px" } },
              [
                ["What it is like", "You heard sounds that felt " + pres.FIELDWORD(t.y) + ", around " + pres.FIELDPITCH(t.x) + " in pitch."],
                ["How it behaves", t.behavior ? "You tried " + t.behavior.toLowerCase() + ". A sound can hold steady or change over time, separately from what it is like." : "A sound can hold steady or change over time, separately from what it is like."],
                ["Why this came first", "When matching starts, these are the words the app will use. You have already heard what they mean."]
              ].map(([heading, text]) => e("div", { key: heading }, e("div", { style: { font: "600 14px/1.3 var(--font-ui)", color: "var(--text-heading)" } }, heading), e("div", { style: { font: "400 13px/1.45 var(--font-text)", color: "var(--text-body)", marginTop: "3px" } }, text)))),
            st.showTech ? e("div", { "data-technical-values": true, style: { font: "500 12px var(--font-ui)", color: "var(--text-muted)", marginTop: "12px" } }, shell.techOf(pres.fieldSpec(t, true))) : null)) : null,
        t.note ? this.noteBox(t.note, "14px") : null),
      this.fFooter([
        onMap && !t.heard ? e(DS.Button, { key: "play", variant: "primary", size: "md", onClick: () => { if (this.state.playKey !== "field") this.pat("t", { heard: true, labels: true }); this.toggleKey("field", [pres.fieldSpec(this.state.t)]); } }, st.playKey === "field" ? "Stop the sound" : "Play the sound") : null,
        ((onMap && t.heard) || stage === "behave" || stage === "recap") ? e(DS.Button, { key: "next", variant: "primary", size: "sm", onClick: advance }, stage === "field" ? "Explore this area closely" : stage === "zoom" ? "Next, how a sound behaves" : stage === "behave" ? "I understand" : "Done") : null,
        onMap && t.heard ? e(DS.Button, { key: "replay", variant: "ghost", onClick: () => this.toggleKey("field", [pres.fieldSpec(this.state.t)]) }, st.playKey === "field" ? "Stop the sound" : "Play from here") : null,
        stage !== "field" ? e(DS.Button, { key: "back", variant: "ghost", onClick: back }, stage === "zoom" ? "Back to the whole range" : stage === "behave" ? "Back to the sounds" : "Explore sounds again") : null,
        onMap ? e(React.Fragment, { key: "escape" }, this.fLink("I can't hear this sound", () => this.pat("t", { note: "That is okay, and worth telling us. We made it a little easier to hear. Press play and try again." }))) : null
      ])
    ];
  }

  renderFlow() {
    const st = this.state, c = st.concept, s = st.stages[c];
    if (c === "a" && s === "intro") return this.renderAIntro();
    if ((c === "a" && s === "chal") || (c === "l" && s === "prior")) return this.renderPair();
    if (c === "a" && s === "listen") return this.renderListen();
    if (c === "l" && s === "ret") return this.renderLReturn();
    if (c === "l" && s === "check") return this.renderLCheck();
    if (c === "l" && s === "refine") return this.renderLRefine();
    if (c === "l" && s === "reopen") return this.renderLReopen();
    if (c === "t") return this.renderTFlow();
    if (c === "d" && s === "intro") return this.renderDIntro();
    if (c === "d" && (s === "field" || s === "zoom")) return this.renderDField();
    if (c === "n" && s === "intro") return this.renderNIntro();
    if (c === "n" && (s === "vol" || s === "p1" || s === "p2" || s === "p3")) return this.renderPass();
    if (c === "r" && s === "intro") return this.renderRIntro();
    if (c === "r" && s === "dir") return this.renderListen();
    if (c === "r" && s === "comp") return this.renderPair();
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
                this.playToggleButton(st.playKey === "main", () => this.toggleKey("main", mainSpecs(this.state)))))),
          e("div", { style: { display: "flex", flexDirection: "column", gap: "9px", marginTop: "14px" } },
            ["Very close", "Fairly close", "Not close yet"].map((label) =>
              this.selectRowButton(label, label, conf === label, () => choose(label)))),
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
      { cap: "ADAPTIVE REFINEMENT (PRESERVED)", items: pres.jumpStagesA().map((it) => ({
        label: it.label, f: () => this.openOption("a", it.stage, { ...shell.freshA(), ...it.seed })
      })) },
      { cap: "LONGITUDINAL (PRESERVED)", items: pres.jumpStagesL().map((it) => ({
        label: it.label, f: () => this.openOption("l", it.stage, { ...shell.freshL(), ...it.seed })
      })) },
      { cap: "EDUCATION · SOUND EXPLORATION (PRESERVED)", items: pres.jumpStagesT().map((it) => ({
        label: it.label, f: () => this.openOption("t", it.stage, { ...shell.freshT(), ...it.seed })
      })) },
      { cap: "SHARED", items: [
        { label: "Headphone setup", f: () => this.goScreen("setup") },
        { label: "Pitch and volume", f: () => this.goScreen("edu") },
        { label: "Matching options", f: () => this.goScreen("home") },
        { label: "Start screen", f: () => this.goScreen("launch") }
      ] }
    ];
    return e("div", { "data-moderator-only": true, style: { position: "absolute", inset: 0, zIndex: 30, display: "flex", flexDirection: "column" } },
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
          "Jump to a different section",
          e("span", { style: { flex: "none", display: "block", width: "9px", height: "9px", borderRight: "2.2px solid var(--gray-600)", borderBottom: "2.2px solid var(--gray-600)", transform: "rotate(" + (st.jumpOpen ? "225deg" : "45deg") + ")", transition: "transform 200ms ease" } })),
        st.jumpOpen ? e("div", { style: { marginTop: "12px", display: "flex", flexDirection: "column", gap: "16px" } },
          jumpGroups.map((g) =>
            e("div", { key: g.cap },
              e("div", { style: { font: "700 10px var(--font-ui)", letterSpacing: ".16em", color: "var(--text-label)" } }, g.cap),
              e("div", { style: { display: "flex", flexWrap: "wrap", gap: "7px", marginTop: "9px" } },
                g.items.map((it) =>
                  e("button", { key: it.label, onClick: it.f, style: { minHeight: "44px", padding: "9px 13px", borderRadius: "999px", border: "1.5px solid var(--gray-300)", background: "var(--white)", color: "var(--text-body)", font: "600 12.5px var(--font-ui)", cursor: "pointer" } }, it.label))))),
          e("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", paddingTop: "14px", borderTop: "1px solid var(--gray-200)" } },
            e("span", { style: { font: "500 13px var(--font-ui)", color: "var(--text-muted)" } }, "Technical values (Hz · dB)"),
            e("button", {
              onClick: () => this.setState((x) => ({ showTech: !x.showTech })),
              "aria-label": "Toggle technical values", "aria-pressed": st.showTech ? "true" : "false",
              style: { flex: "none", width: "44px", height: "26px", borderRadius: "13px", border: "none", background: st.showTech ? "var(--blue-500)" : "var(--gray-300)", position: "relative", cursor: "pointer", transition: "background .2s ease" }
            },
              e("span", { style: { position: "absolute", top: "3px", left: st.showTech ? "16px" : "2px", width: "20px", height: "20px", borderRadius: "50%", background: "var(--white)", transition: "left .2s ease" } })))) : null));
  }

  render() {
    const st = this.state, c = st.concept, s = st.stages[c];
    const framed = st.framed, dark = st.screen === "setup";
    const onboardingScreen = ["launch", "privacy", "account", "dashboard"].includes(st.screen);
    const statusOnDark = dark || onboardingScreen;
    const indicatorOnDark = dark || st.screen === "launch";
    const chromeBg = dark ? "var(--navy-900)" : "var(--gray-50)";
    const statusBg = statusOnDark ? "var(--navy-800)" : "var(--gray-50)";
    const chromeLine = dark ? "var(--interface-dark-border)" : "var(--gray-200)";
    const chromeFg = dark ? "var(--blue-300)" : "var(--blue-700)";
    const prog = shell.progress(c, s, st);
    const progShow = st.screen === "flow" && prog.show;
    const nav = shell.navShow(st);
    const label = shell.screenLabelOf(st.screen, c, s);

    const body = {
      launch: () => this.renderLaunch(),
      privacy: () => this.renderPrivacy(),
      account: () => this.renderAccount(),
      dashboard: () => this.renderDashboard(),
      ear: () => this.renderEar(),
      setup: () => this.renderSetup(),
      home: () => this.renderHome(),
      edu: () => this.renderEdu(() => this.goScreen("home", { eduSeen: true })),
      flow: () => this.renderFlow()
    }[st.screen]();

    const screenRoot = e("div", {
      "data-screen": st.screen,
      "data-screen-label": label,
      ...(st.screen === "account" ? { "data-account-step": st.accountConfirmation ? "confirmation" : "entry" } : {}),
      style: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: dark || st.screen === "launch" ? "var(--navy-900)" : undefined }
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
          ? e(DS.StatusBar, { time: "9:41", onDark: statusOnDark, background: statusOnDark ? "var(--navy-800)" : chromeBg })
          : e("div", { style: { flex: "none", height: "env(safe-area-inset-top)", background: chromeBg } }),
        progShow ? e("div", { "data-progress": "", style: { flex: "none", padding: "10px 22px 12px", background: "var(--gray-50)", borderBottom: "1px solid var(--gray-200)" } },
          e("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px" } },
            e("span", { style: { font: font.label, letterSpacing: ".16em", color: "var(--text-label)" } }, prog.lbl),
            e("span", { style: { font: "700 10px var(--font-ui)", letterSpacing: ".14em", color: "var(--blue-700)" } }, prog.phase)),
          e("div", { style: { height: "6px", background: "var(--gray-200)", borderRadius: "3px", overflow: "hidden", marginTop: "8px" } },
            e("div", { style: { height: "100%", background: "var(--control-accent)", borderRadius: "3px", transition: "width 420ms cubic-bezier(.4,0,.2,1)", width: prog.w } }))) : null,
        screenRoot,
        st.menuOpen ? this.renderMenu() : null,
        onboardingScreen ? null : e("div", { style: { flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: "2px 8px 4px", background: chromeBg, borderTop: "1px solid " + chromeLine } },
          nav
            ? e("button", { onClick: () => this.onBack(), style: { display: "flex", alignItems: "center", gap: "6px", minHeight: "44px", padding: "0 12px 0 8px", border: "none", background: "transparent", color: chromeFg, font: "600 15px var(--font-ui)", cursor: "pointer" } },
              e("span", { style: { display: "block", width: "9px", height: "9px", borderLeft: "2.4px solid " + chromeFg, borderBottom: "2.4px solid " + chromeFg, transform: "rotate(45deg)" } }), "Back")
            : e("span", { style: { display: "block", width: "8px", height: "44px" } }),
          st.screen === "dashboard"
            ? e("span", { "aria-hidden": "true", style: { flex: "none", display: "block", width: "56px", height: "44px" } })
            : e("button", {
              onClick: () => { const was = this.state.playKey !== null; this.hardStop(); this.setState({ menuOpen: true, menuStopped: was }); },
              "aria-label": "Session menu",
              style: { flex: "none", width: "56px", height: "44px", border: "none", background: "transparent", cursor: "default" }
            })),
        framed
          ? e(DS.HomeIndicator, { onDark: indicatorOnDark, background: st.screen === "launch" ? "var(--navy-600)" : chromeBg })
          : e("div", { style: { flex: "none", height: "env(safe-area-inset-bottom)", background: chromeBg } })));
  }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(e(App));
