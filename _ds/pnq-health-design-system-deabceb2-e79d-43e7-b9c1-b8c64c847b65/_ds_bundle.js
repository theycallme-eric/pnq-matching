/* @ds-bundle: {"format":4,"namespace":"PNQHealthDesignSystem_deabce","components":[{"name":"NavBar","sourcePath":"components/chrome/NavBar.jsx"},{"name":"PhoneFrame","sourcePath":"components/chrome/PhoneFrame.jsx"},{"name":"StatusBar","sourcePath":"components/chrome/StatusBar.jsx"},{"name":"HomeIndicator","sourcePath":"components/chrome/StatusBar.jsx"},{"name":"StepProgress","sourcePath":"components/chrome/StepProgress.jsx"},{"name":"LevelSlider","sourcePath":"components/controls/LevelSlider.jsx"},{"name":"PlayToggle","sourcePath":"components/controls/PlayToggle.jsx"},{"name":"RangeSlider","sourcePath":"components/controls/RangeSlider.jsx"},{"name":"SegmentedControl","sourcePath":"components/controls/SegmentedControl.jsx"},{"name":"TuningSlider","sourcePath":"components/controls/TuningSlider.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"CardDivider","sourcePath":"components/core/Card.jsx"},{"name":"Checkbox","sourcePath":"components/core/Checkbox.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconTile","sourcePath":"components/core/IconTile.jsx"},{"name":"SectionLabel","sourcePath":"components/core/SectionLabel.jsx"},{"name":"StatusPill","sourcePath":"components/core/StatusPill.jsx"},{"name":"TextField","sourcePath":"components/core/TextField.jsx"},{"name":"ChoiceCard","sourcePath":"components/patterns/ChoiceCard.jsx"},{"name":"HeroActionCard","sourcePath":"components/patterns/HeroActionCard.jsx"},{"name":"InlineAlert","sourcePath":"components/patterns/InlineAlert.jsx"},{"name":"ListRow","sourcePath":"components/patterns/ListRow.jsx"},{"name":"SelectRow","sourcePath":"components/patterns/SelectRow.jsx"},{"name":"SessionOrb","sourcePath":"components/patterns/SessionOrb.jsx"},{"name":"SessionTimer","sourcePath":"components/patterns/SessionOrb.jsx"}],"sourceHashes":{"components/chrome/NavBar.jsx":"21c55f34f682","components/chrome/PhoneFrame.jsx":"3bde4296ce42","components/chrome/StatusBar.jsx":"18082b041a67","components/chrome/StepProgress.jsx":"6d859c3b60ff","components/controls/LevelSlider.jsx":"f1ad615263c6","components/controls/PlayToggle.jsx":"c6c48a072dec","components/controls/RangeSlider.jsx":"7cba84f517d3","components/controls/SegmentedControl.jsx":"8f6b176c34e9","components/controls/TuningSlider.jsx":"a72b7403d19d","components/core/Badge.jsx":"9b3262b90cc4","components/core/Button.jsx":"e2084ae8acc2","components/core/Card.jsx":"fbf21bf88c46","components/core/Checkbox.jsx":"28e33ade3194","components/core/Icon.jsx":"da6db0695535","components/core/IconTile.jsx":"8d17e4eca526","components/core/SectionLabel.jsx":"85916a9c1692","components/core/StatusPill.jsx":"090b4c186dd6","components/core/TextField.jsx":"63d4c699e35e","components/patterns/ChoiceCard.jsx":"c4314c02b483","components/patterns/HeroActionCard.jsx":"bcf34dbf719e","components/patterns/InlineAlert.jsx":"3cda583a7a22","components/patterns/ListRow.jsx":"8d40860c27eb","components/patterns/SelectRow.jsx":"205f2b1dbf70","components/patterns/SessionOrb.jsx":"71cb0a6403e9","ui_kits/patient_app/App.jsx":"509bfd259861","ui_kits/patient_app/DashboardScreen.jsx":"ab15d9524861","ui_kits/patient_app/OnboardingScreens.jsx":"d67dde862070","ui_kits/patient_app/TreatmentScreens.jsx":"6fe8f57ad099"},"inlinedExternals":[],"unexposedExports":[{"name":"iconNames","sourcePath":"components/core/Icon.jsx"}]} */

(() => {

const __ds_ns = (window.PNQHealthDesignSystem_deabce = window.PNQHealthDesignSystem_deabce || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/chrome/NavBar.jsx
try { (() => {
function NavBar({
  onBack,
  label = "Back",
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: "var(--h-nav-bar)",
      background: "var(--navy-800)",
      display: "flex",
      alignItems: "center",
      padding: "0 14px",
      color: "var(--white)",
      flex: "none",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onBack,
    style: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      cursor: "pointer",
      padding: "6px 8px"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--white)",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M15 6l-6 6 6 6"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-regular) var(--fs-label) var(--font-text)"
    }
  }, label)));
}
Object.assign(__ds_scope, { NavBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/NavBar.jsx", error: String((e && e.message) || e) }); }

// components/chrome/PhoneFrame.jsx
try { (() => {
function PhoneFrame({
  children,
  background = "var(--interface-app)",
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: "416px",
      padding: "13px",
      background: "var(--navy-900)",
      borderRadius: "var(--radius-device)",
      boxShadow: "var(--shadow-device), inset 0 0 0 2px var(--navy-400)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: "var(--radius-device-screen)",
      overflow: "hidden",
      background: "#000"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "var(--viewport-w)",
      height: "var(--viewport-h)",
      background,
      fontFamily: "var(--font-text)",
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      color: "var(--gray-900)"
    }
  }, children)));
}
Object.assign(__ds_scope, { PhoneFrame });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/PhoneFrame.jsx", error: String((e && e.message) || e) }); }

// components/chrome/StatusBar.jsx
try { (() => {
function StatusBar({
  time = "9:41",
  onDark = true,
  background = "transparent",
  style
}) {
  const tint = onDark ? "var(--white)" : "var(--navy-800)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: "var(--h-status-bar)",
      background,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 22px",
      color: tint,
      flex: "none",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-semibold) var(--fs-body) var(--font-text)"
    }
  }, time), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: "7px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: "2px",
      height: "11px"
    }
  }, [4, 6, 8, 11].map(h => /*#__PURE__*/React.createElement("div", {
    key: h,
    style: {
      width: "3px",
      height: h + "px",
      background: tint,
      borderRadius: "1px"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "2px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "23px",
      height: "12px",
      border: `1.5px solid ${tint}`,
      borderRadius: "3px",
      padding: "1.5px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: "100%",
      background: tint,
      borderRadius: "1px"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "2px",
      height: "5px",
      background: tint,
      borderRadius: "0 2px 2px 0"
    }
  }))));
}
function HomeIndicator({
  onDark = false,
  background = "transparent",
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      padding: "8px 0",
      background,
      flex: "none",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "134px",
      height: "5px",
      background: onDark ? "var(--white)" : "var(--navy-800)",
      borderRadius: "3px",
      opacity: onDark ? 0.85 : 0.85
    }
  }));
}
Object.assign(__ds_scope, { StatusBar, HomeIndicator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/StatusBar.jsx", error: String((e && e.message) || e) }); }

// components/chrome/StepProgress.jsx
try { (() => {
function StepProgress({
  step = 1,
  total = 4,
  onStepClick,
  style
}) {
  const cur = Number(step) || 1;
  const count = Number(total) || 4;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--navy-800)",
      padding: "18px 22px 14px",
      flex: "none",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: "7px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-step)",
      letterSpacing: "var(--tracking-step)",
      color: "var(--text-on-dark-faint)"
    }
  }, "STEP ", cur, " OF ", count)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "6px"
    }
  }, Array.from({
    length: count
  }, (_, i) => {
    const done = i + 1 <= cur;
    const canGo = i + 1 < cur && !!onStepClick;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      onClick: canGo ? () => onStepClick(i + 1) : undefined,
      style: {
        flex: 1,
        padding: "7px 0",
        cursor: canGo ? "pointer" : "default"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: "4px",
        borderRadius: "var(--radius-track)",
        background: done ? "var(--action-primary)" : "rgba(255,255,255,.14)"
      }
    }));
  })));
}
Object.assign(__ds_scope, { StepProgress });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/StepProgress.jsx", error: String((e && e.message) || e) }); }

// components/controls/LevelSlider.jsx
try { (() => {
function LevelSlider({
  value,
  onChange,
  status = "ready",
  style
}) {
  const ok = status === "ready";
  const color = ok ? "var(--status-success-text)" : "var(--status-danger)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: "36px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--on-dark-40)",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M11 5 6 9H2v6h4l5 4z"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      flex: 1,
      height: "36px",
      display: "flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      height: "6px",
      borderRadius: "var(--radius-track-lg)",
      background: "var(--interface-dark-track)",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      height: "6px",
      borderRadius: "var(--radius-track-lg)",
      background: color,
      width: `${value}%`,
      transition: "width var(--dur-color) var(--ease-standard)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "50%",
      left: `${value}%`,
      width: "24px",
      height: "24px",
      marginLeft: "-12px",
      marginTop: "-12px",
      borderRadius: "50%",
      background: "var(--white)",
      boxShadow: "var(--shadow-thumb-dark)",
      transition: "left var(--dur-color) var(--ease-standard)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0",
    max: "100",
    step: "1",
    value: value,
    onInput: e => onChange && onChange(parseInt(e.target.value, 10) || 0),
    onChange: e => onChange && onChange(parseInt(e.target.value, 10) || 0),
    style: {
      position: "absolute",
      left: "-12px",
      right: "-12px",
      width: "calc(100% + 24px)",
      height: "36px",
      margin: 0,
      opacity: 0,
      cursor: "pointer",
      WebkitAppearance: "none",
      appearance: "none",
      background: "transparent"
    }
  })), /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "19",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--on-dark-55)",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M11 5 6 9H2v6h4l5 4z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.07 4.93a10 10 0 0 1 0 14.14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15.54 8.46a5 5 0 0 1 0 7.07"
  })));
}
Object.assign(__ds_scope, { LevelSlider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/LevelSlider.jsx", error: String((e && e.message) || e) }); }

// components/controls/PlayToggle.jsx
try { (() => {
function PlayToggle({
  playing = false,
  onToggle,
  label,
  style
}) {
  const text = label || (playing ? "Stop Sound" : "Start Sound");
  return /*#__PURE__*/React.createElement("div", {
    onClick: onToggle,
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "11px",
      height: "var(--h-button-lg)",
      borderRadius: "var(--radius-input)",
      cursor: "pointer",
      background: playing ? "var(--control-accent)" : "var(--white)",
      border: "var(--border-selected) solid #2f7cc0",
      boxShadow: playing ? "var(--shadow-play-active)" : "var(--shadow-play-idle)",
      transition: "background-color 220ms var(--ease-standard)",
      ...style
    }
  }, playing ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "4px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "5px",
      height: "17px",
      background: "var(--white)",
      borderRadius: "1.5px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "5px",
      height: "17px",
      background: "var(--white)",
      borderRadius: "1.5px"
    }
  })) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: 0,
      height: 0,
      borderLeft: "16px solid #2f7cc0",
      borderTop: "10px solid transparent",
      borderBottom: "10px solid transparent"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-bold) var(--fs-title-sm) var(--font-ui)",
      color: playing ? "var(--white)" : "var(--control-accent)"
    }
  }, text));
}
Object.assign(__ds_scope, { PlayToggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/PlayToggle.jsx", error: String((e && e.message) || e) }); }

// components/controls/RangeSlider.jsx
try { (() => {
const PNQ_RANGE_STEPS = {
  Coarse: 4,
  Medium: 1.5,
  Fine: 0.5
};
const PNQ_RANGE_DENSITY = {
  Coarse: 8,
  Medium: 16,
  Fine: 28
};
const PNQ_RANGE_GAP = 0.03;
function pnqRangeClamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}
function RangeSlider({
  label,
  low,
  high,
  onChange,
  precision = "Coarse",
  lowCaption = "LOWEST",
  highCaption = "HIGHEST",
  style
}) {
  const [active, setActive] = React.useState("low");
  const step = PNQ_RANGE_STEPS[precision] || 4;
  const density = PNQ_RANGE_DENSITY[precision] || 8;
  const ticks = Array.from({
    length: density + 1
  }, (_, i) => i / density * 100);
  const ring = on => on ? "var(--ring-thumb-active)" : "var(--shadow-thumb)";
  const gapPct = PNQ_RANGE_GAP * 100;
  const setLow = v => {
    setActive("low");
    onChange && onChange(pnqRangeClamp(v, 0, high - PNQ_RANGE_GAP), high);
  };
  const setHigh = v => {
    setActive("high");
    onChange && onChange(low, pnqRangeClamp(v, low + PNQ_RANGE_GAP, 1));
  };
  const nudge = dir => {
    const d = step / 100 * dir;
    if (active === "high") setHigh(high + d);else setLow(low + d);
  };
  const thumb = (pos, isActive) => /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "6px",
      left: `${pos * 100}%`,
      width: "28px",
      height: "28px",
      marginLeft: "-14px",
      borderRadius: "50%",
      background: "var(--white)",
      border: "var(--border-selected) solid var(--control-accent)",
      boxShadow: ring(isActive),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      background: isActive ? "var(--control-accent)" : "transparent"
    }
  }));
  const railInput = (value, min, max, onInput, z) => /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: min,
    max: max,
    step: step,
    value: value * 100,
    onInput: e => onInput(parseFloat(e.target.value) / 100),
    onChange: e => onInput(parseFloat(e.target.value) / 100),
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      margin: 0,
      opacity: 0,
      cursor: "pointer",
      pointerEvents: "none",
      zIndex: z,
      WebkitAppearance: "none",
      appearance: "none",
      background: "transparent"
    }
  });
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "8px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-bold) var(--fs-caption) var(--font-ui)",
      color: "var(--text-heading)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "8px"
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => nudge(-1),
    style: {
      width: "40px",
      height: "var(--h-nudge)",
      border: "var(--border-control) solid var(--blue-border)",
      borderRadius: "var(--radius-sm)",
      background: "var(--white)",
      color: "var(--control-accent)",
      font: "var(--weight-semibold) 19px var(--font-ui)",
      lineHeight: 1,
      cursor: "pointer"
    }
  }, "\u2212"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => nudge(1),
    style: {
      width: "40px",
      height: "var(--h-nudge)",
      border: "var(--border-control) solid var(--blue-border)",
      borderRadius: "var(--radius-sm)",
      background: "var(--white)",
      color: "var(--control-accent)",
      font: "var(--weight-semibold) 19px var(--font-ui)",
      lineHeight: 1,
      cursor: "pointer"
    }
  }, "+"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: "40px",
      touchAction: "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      top: "13px",
      height: "14px",
      pointerEvents: "none"
    }
  }, ticks.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: "absolute",
      top: 0,
      width: "2px",
      height: "14px",
      marginLeft: "-1px",
      borderRadius: "1px",
      background: "var(--interface-tick)",
      left: `${t}%`
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      top: "18px",
      height: "4px",
      borderRadius: "var(--radius-track)",
      background: "var(--interface-rail)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "18px",
      left: `${low * 100}%`,
      width: `${(high - low) * 100}%`,
      height: "4px",
      borderRadius: "var(--radius-track)",
      background: "var(--control-accent)",
      pointerEvents: "none"
    }
  }), thumb(low, active === "low"), thumb(high, active === "high"), railInput(low, 0, Math.max(0, high * 100 - gapPct), setLow, active === "low" ? 2 : 1), railInput(high, Math.min(100, low * 100 + gapPct), 100, setHigh, active === "high" ? 2 : 1), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      cursor: "pointer"
    },
    onPointerDown: e => {
      const r = e.currentTarget.getBoundingClientRect();
      const p = pnqRangeClamp((e.clientX - r.left) / r.width, 0, 1);
      if (Math.abs(p - low) <= Math.abs(p - high)) setLow(p);else setHigh(p);
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "3px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-semibold) var(--fs-step) var(--font-ui)",
      letterSpacing: "var(--tracking-caps)",
      color: "var(--gray-500)"
    }
  }, lowCaption), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-semibold) var(--fs-step) var(--font-ui)",
      letterSpacing: "var(--tracking-caps)",
      color: "var(--gray-500)"
    }
  }, highCaption)));
}
Object.assign(__ds_scope, { RangeSlider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/RangeSlider.jsx", error: String((e && e.message) || e) }); }

// components/controls/SegmentedControl.jsx
try { (() => {
function SegmentedControl({
  options,
  value,
  onChange,
  style
}) {
  const count = options.length;
  const index = Math.max(0, options.indexOf(value));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: "var(--h-segment)",
      background: "var(--interface-track)",
      borderRadius: "var(--radius-lg)",
      display: "flex",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "4px",
      left: `calc(${index * 100 / count}% + 4px)`,
      width: `calc(${100 / count}% - 8px)`,
      height: "var(--h-segment-pill)",
      background: "var(--control-accent)",
      borderRadius: "var(--radius-segment-pill)",
      boxShadow: "var(--shadow-segment)",
      transition: "left var(--dur-slide) var(--ease-emphasized)"
    }
  }), options.map(opt => /*#__PURE__*/React.createElement("button", {
    key: opt,
    type: "button",
    onClick: () => onChange && onChange(opt),
    style: {
      flex: 1,
      position: "relative",
      zIndex: 1,
      background: "none",
      border: "none",
      cursor: "pointer",
      font: "var(--weight-bold) var(--fs-caption) var(--font-ui)",
      color: opt === value ? "var(--white)" : "#5b6472",
      transition: "color var(--dur-control) var(--ease-standard)"
    }
  }, opt)));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/controls/TuningSlider.jsx
try { (() => {
const PNQ_TUNING_HALFWIDTH = {
  Coarse: 0.5,
  Medium: 0.16,
  Fine: 0.05
};
function pnqClamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}
function pnqNudgeButton(onClick, glyph, label) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": `${label} ${glyph === "+" ? "up" : "down"}`,
    onClick: onClick,
    style: {
      width: "40px",
      height: "var(--h-nudge)",
      border: "var(--border-control) solid var(--blue-border)",
      borderRadius: "var(--radius-sm)",
      background: "var(--white)",
      color: "var(--control-accent)",
      font: "var(--weight-semibold) 19px var(--font-ui)",
      lineHeight: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer"
    }
  }, glyph);
}
function TuningSlider({
  label,
  value,
  onChange,
  precision = "Coarse",
  style
}) {
  const hw = PNQ_TUNING_HALFWIDTH[precision] || 0.5;
  const [center, setCenter] = React.useState(value);
  const [dragging, setDragging] = React.useState(false);
  const lastPrecision = React.useRef(precision);
  React.useEffect(() => {
    if (lastPrecision.current !== precision) {
      lastPrecision.current = precision;
      setCenter(value);
    }
  }, [precision, value]);
  const w = Math.min(2 * hw, 1);
  const left = pnqClamp(center - hw, 0, 1 - w);
  const pos = pnqClamp((value - left) / w, 0, 1) * 100;
  const trans = dragging ? "none" : "left var(--dur-slider) var(--ease-emphasized), width var(--dur-slider) var(--ease-emphasized)";
  const ticks = [];
  for (let t = 0; t <= 1.00001; t = Math.round((t + 0.04) * 1000) / 1000) {
    const sp = (t - left) / w;
    if (sp > -0.16 && sp < 1.16) ticks.push({
      left: Math.round(sp * 1000) / 10,
      opacity: sp >= -0.002 && sp <= 1.002 ? 1 : 0.22
    });
  }
  const set = p => onChange && onChange(pnqClamp(left + p * w, 0, 1));
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "10px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-bold) var(--fs-caption) var(--font-ui)",
      color: "var(--text-heading)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "8px"
    }
  }, pnqNudgeButton(() => onChange && onChange(pnqClamp(value - hw * 0.16, 0, 1)), "\u2212", label), pnqNudgeButton(() => onChange && onChange(pnqClamp(value + hw * 0.16, 0, 1)), "+", label))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: "6px",
      background: "var(--interface-track)",
      borderRadius: "var(--radius-track-lg)",
      marginBottom: "10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: `${left * 100}%`,
      width: `${w * 100}%`,
      background: "var(--control-accent)",
      opacity: 0.16,
      borderRadius: "var(--radius-track-lg)",
      transition: "left var(--dur-slider) var(--ease-emphasized), width var(--dur-slider) var(--ease-emphasized)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "-2px",
      bottom: "-2px",
      left: `${value * 100}%`,
      width: "2px",
      marginLeft: "-1px",
      background: "var(--control-accent)",
      borderRadius: "1px"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: "40px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      top: "13px",
      height: "14px",
      pointerEvents: "none"
    }
  }, ticks.map((tk, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: "absolute",
      top: 0,
      width: "2px",
      height: "14px",
      marginLeft: "-1px",
      borderRadius: "1px",
      background: "var(--interface-tick)",
      left: `${tk.left}%`,
      opacity: tk.opacity,
      transition: "left var(--dur-slider) var(--ease-emphasized), opacity var(--dur-slider) var(--ease-standard)"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      top: "18px",
      height: "4px",
      borderRadius: "var(--radius-track)",
      background: "var(--interface-rail)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      top: "18px",
      height: "4px",
      borderRadius: "var(--radius-track)",
      background: "var(--control-accent)",
      width: `${pos}%`,
      transition: trans,
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "6px",
      left: `${pos}%`,
      width: "28px",
      height: "28px",
      marginLeft: "-14px",
      borderRadius: "50%",
      background: "var(--white)",
      border: "var(--border-selected) solid var(--control-accent)",
      boxShadow: "var(--shadow-thumb)",
      transition: trans,
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "range",
    "aria-label": label,
    min: "0",
    max: "100",
    step: "0.5",
    value: pos,
    onInput: e => {
      setDragging(true);
      set(parseFloat(e.target.value) / 100);
    },
    onChange: e => set(parseFloat(e.target.value) / 100),
    onPointerUp: () => setDragging(false),
    style: {
      position: "absolute",
      left: "-14px",
      right: "-14px",
      top: 0,
      width: "calc(100% + 28px)",
      height: "40px",
      margin: 0,
      opacity: 0,
      cursor: "pointer",
      WebkitAppearance: "none",
      appearance: "none",
      background: "transparent"
    }
  })));
}
Object.assign(__ds_scope, { TuningSlider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/TuningSlider.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
const pnqBadgeVariants = {
  count: {
    minWidth: "24px",
    height: "24px",
    padding: "0 8px",
    borderRadius: "12px",
    background: "var(--status-danger)",
    color: "var(--white)",
    font: "var(--weight-bold) var(--fs-caption) var(--font-ui)"
  },
  due: {
    padding: "4px 11px",
    borderRadius: "12px",
    background: "var(--status-danger-tint)",
    color: "var(--status-danger-text-strong)",
    font: "var(--weight-bold) var(--fs-eyebrow) var(--font-ui)"
  },
  eyebrow: {
    gap: "7px",
    padding: "5px 13px 5px 11px",
    borderRadius: "var(--radius-pill)",
    background: "rgba(127,194,238,.16)",
    border: "1px solid rgba(127,194,238,.28)",
    color: "var(--blue-200)",
    font: "var(--weight-semibold) var(--fs-eyebrow) var(--font-ui)",
    letterSpacing: "0.02em"
  }
};
function Badge({
  children,
  variant = "count",
  icon = null,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "none",
      ...pnqBadgeVariants[variant],
      ...style
    }
  }, icon, /*#__PURE__*/React.createElement("span", null, children));
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const pnqButtonBase = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "9px",
  width: "100%",
  border: "none",
  borderRadius: "var(--radius-button)",
  fontFamily: "var(--font-ui)",
  fontWeight: "var(--weight-semibold)",
  transition: "background-color var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard), color var(--dur-base) var(--ease-standard)"
};
const pnqButtonSizes = {
  lg: {
    height: "var(--h-button-lg)",
    fontSize: "var(--fs-title)"
  },
  md: {
    height: "var(--h-button)",
    fontSize: "var(--fs-title-sm)"
  },
  sm: {
    height: "var(--h-button-md)",
    fontSize: "var(--fs-title-sm)"
  },
  xs: {
    height: "var(--h-button-sm)",
    fontSize: "var(--fs-body)",
    fontWeight: "var(--weight-bold)",
    width: "auto",
    padding: "0 30px",
    minWidth: "152px",
    borderRadius: "var(--radius-lg)"
  }
};
function pnqButtonVariant(variant, disabled, onDark) {
  if (disabled) {
    return onDark ? {
      background: "var(--interface-disabled-dark)",
      color: "var(--on-dark-45)",
      boxShadow: "none",
      cursor: "not-allowed"
    } : {
      background: "var(--interface-disabled)",
      color: "var(--text-disabled)",
      boxShadow: "none",
      cursor: "not-allowed"
    };
  }
  switch (variant) {
    case "primary":
      return {
        background: "var(--gradient-action)",
        color: "var(--white)",
        boxShadow: "var(--shadow-action)",
        cursor: "pointer"
      };
    case "solid":
      return {
        background: "var(--action-primary)",
        color: "var(--white)",
        boxShadow: "var(--shadow-action-sm)",
        cursor: "pointer"
      };
    case "outline":
      return {
        background: onDark ? "rgba(255,255,255,.08)" : "var(--white)",
        color: onDark ? "var(--white)" : "var(--control-accent)",
        border: onDark ? "1.5px solid rgba(255,255,255,.3)" : "var(--border-selected) solid var(--control-accent)",
        boxShadow: "none",
        cursor: "pointer"
      };
    case "ghost":
      return {
        background: "none",
        color: onDark ? "var(--on-dark-70)" : "var(--gray-475)",
        boxShadow: "none",
        cursor: "pointer",
        height: "var(--h-button-ghost)",
        fontSize: "var(--fs-body-sm)"
      };
    default:
      return {};
  }
}
function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  onDark = false,
  trailingIcon = null,
  leadingIcon = null,
  style,
  onClick,
  ...rest
}) {
  const resolved = {
    ...pnqButtonBase,
    ...pnqButtonSizes[size],
    ...pnqButtonVariant(variant, disabled, onDark),
    ...style
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-disabled": disabled || undefined,
    onClick: onClick,
    style: resolved,
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "scale(var(--press-scale))";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "none";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "none";
    }
  }, rest), leadingIcon, /*#__PURE__*/React.createElement("span", null, children), trailingIcon);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  children,
  variant = "section",
  style,
  ...rest
}) {
  const variants = {
    /* White card with a hairline border — groups a set of controls. */
    section: {
      background: "var(--interface-card)",
      border: "var(--border-hairline) solid var(--interface-card-border)",
      borderRadius: "var(--radius-card)",
      boxShadow: "var(--shadow-card-sm)",
      padding: "var(--pad-card)"
    },
    /* Borderless card with a softer, taller shadow — groups list rows. */
    list: {
      background: "var(--interface-card)",
      borderRadius: "var(--radius-card-lg)",
      boxShadow: "var(--shadow-card)",
      overflow: "hidden"
    },
    /* Grouped panel on a navy interface. */
    dark: {
      background: "var(--interface-dark-raised)",
      border: "var(--border-hairline) solid var(--interface-dark-border)",
      borderRadius: "var(--radius-panel)",
      padding: "6px 16px"
    }
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      ...variants[variant],
      ...style
    }
  }, rest), children);
}
function CardDivider({
  inset = "18px",
  onDark = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: "1px",
      background: onDark ? "var(--interface-dark-border)" : "var(--interface-divider)",
      margin: `0 ${inset}`
    }
  });
}
Object.assign(__ds_scope, { Card, CardDivider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Checkbox.jsx
try { (() => {
function Checkbox({
  checked = false,
  onChange,
  label,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onChange,
    style: {
      display: "flex",
      alignItems: "center",
      gap: "13px",
      cursor: "pointer",
      padding: "4px 2px",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "26px",
      height: "26px",
      borderRadius: "var(--radius-sm)",
      flex: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: checked ? "var(--status-success-strong)" : "var(--white)",
      border: `var(--border-control) solid ${checked ? "var(--status-success-strong)" : "#cfd5dd"}`,
      transition: "all var(--dur-fast) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: checked ? "var(--white)" : "transparent",
    strokeWidth: "3.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12.5 10 17.5 19 7"
  }))), label ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-medium) var(--fs-longform) / var(--lh-snug) var(--font-text)",
      color: "var(--gray-800)"
    }
  }, label) : null);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const PNQ_ICON_PATHS = {
  chevronLeft: {
    d: ["M15 6l-6 6 6 6"],
    w: 2.4
  },
  chevronRight: {
    d: ["M9 6l6 6-6 6"],
    w: 2.4
  },
  arrowRight: {
    d: ["M5 12h13M12 6l6 6-6 6"],
    w: 2.6
  },
  check: {
    d: ["M5 12.5 10 17.5 19 7"],
    w: 3.2
  },
  checkThin: {
    d: ["M20 6 9 17l-5-5"],
    w: 2.2
  },
  close: {
    d: ["M6 6 18 18", "M18 6 6 18"],
    w: 3.6
  },
  prescription: {
    d: ["M3 9h18", "M7 14h6", "M7 17h3"],
    rects: [[3, 4, 18, 16, 3]],
    w: 1.8
  },
  user: {
    d: ["M5 21v-1a7 7 0 0 1 14 0v1"],
    circles: [[12, 8, 4]],
    w: 1.9
  },
  mail: {
    d: ["m3 7 9 6 9-6"],
    rects: [[3, 5, 18, 14, 2]],
    w: 1.9
  },
  phone: {
    d: ["M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L20 18v-4h-0", "M15 4h4v4"],
    w: 1.9
  },
  lock: {
    d: ["M8 11V8a4 4 0 0 1 8 0v3"],
    rects: [[4, 11, 16, 9, 2]],
    w: 2
  },
  message: {
    d: ["M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 0 1 4 11.5 8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"],
    w: 1.9
  },
  forms: {
    d: ["M9 3h6a2 2 0 0 1 2 2h1a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1a2 2 0 0 1 2-2z", "M9 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1", "M9 13l1.5 1.5L14 11"],
    w: 1.9
  },
  history: {
    d: ["M4 19V5", "M4 19h16", "M7 16l3.5-4 3 2.5L20 8"],
    w: 1.9
  },
  ear: {
    d: ["M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0", "M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4"],
    w: 1.6
  },
  headphones: {
    d: ["M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"],
    w: 1.9
  },
  volume: {
    d: ["M11 5 6 9H2v6h4l5 4z", "M19.07 4.93a10 10 0 0 1 0 14.14", "M15.54 8.46a5 5 0 0 1 0 7.07"],
    w: 2
  },
  volumeLow: {
    d: ["M11 5 6 9H2v6h4l5 4z"],
    w: 2
  },
  sparkles: {
    d: ["M5 3v4", "M3 5h4", "M6 17v3", "M5 18h2", "M13 4l2.5 6L22 12l-6.5 2L13 20l-2.5-6L4 12l6.5-2L13 4Z"],
    w: 2.2
  }
};

/* The tone/ringing glyph is drawn on a wider canvas than the 24-square set. */
const PNQ_WAVE = {
  viewBox: "0 0 40 24",
  d: "M2 12 C7 2, 13 2, 18 12 S29 22, 34 12 S38 6, 38 12"
};
function Icon({
  name,
  size = 22,
  color = "currentColor",
  strokeWidth,
  filled = false,
  style,
  ...rest
}) {
  if (name === "play") {
    return /*#__PURE__*/React.createElement("svg", _extends({
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: color,
      stroke: "none",
      style: style,
      "aria-hidden": "true"
    }, rest), /*#__PURE__*/React.createElement("polygon", {
      points: "6 4 20 12 6 20 6 4"
    }));
  }
  if (name === "wave") {
    return /*#__PURE__*/React.createElement("svg", _extends({
      width: size * 1.6,
      height: size,
      viewBox: PNQ_WAVE.viewBox,
      fill: "none",
      stroke: color,
      strokeWidth: strokeWidth || 2.6,
      strokeLinecap: "round",
      style: style,
      "aria-hidden": "true"
    }, rest), /*#__PURE__*/React.createElement("path", {
      d: PNQ_WAVE.d
    }));
  }
  if (name === "equalizer") {
    const small = size <= 30;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        width: size + "px",
        height: size + "px",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: small ? "1.6px" : "2px",
        padding: small ? "8px 6px" : "11px 9px",
        ...style
      },
      "aria-hidden": "true"
    }, [40, 75, 30, 90, 52].map((h, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        width: small ? "1.8px" : "2.3px",
        height: h + "%",
        background: color,
        borderRadius: "1px"
      }
    })));
  }
  const glyph = PNQ_ICON_PATHS[name];
  if (!glyph) return null;
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: filled ? color : "none",
    stroke: color,
    strokeWidth: strokeWidth || glyph.w,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: style,
    "aria-hidden": "true"
  }, rest), (glyph.rects || []).map((r, i) => /*#__PURE__*/React.createElement("rect", {
    key: "r" + i,
    x: r[0],
    y: r[1],
    width: r[2],
    height: r[3],
    rx: r[4]
  })), (glyph.circles || []).map((c, i) => /*#__PURE__*/React.createElement("circle", {
    key: "c" + i,
    cx: c[0],
    cy: c[1],
    r: c[2]
  })), (glyph.d || []).map((d, i) => /*#__PURE__*/React.createElement("path", {
    key: "p" + i,
    d: d
  })));
}
const iconNames = Object.keys(PNQ_ICON_PATHS).concat(["play", "wave", "equalizer"]);
Object.assign(__ds_scope, { Icon, iconNames });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/IconTile.jsx
try { (() => {
const pnqTileSizes = {
  xl: {
    size: "64px",
    radius: "var(--radius-card-lg)"
  },
  lg: {
    size: "62px",
    radius: "var(--radius-card-lg)"
  },
  md: {
    size: "42px",
    radius: "var(--radius-tile)"
  },
  sm: {
    size: "40px",
    radius: "var(--radius-lg)"
  },
  xs: {
    size: "38px",
    radius: "11px"
  }
};
function IconTile({
  children,
  size = "md",
  tone = "blue",
  style
}) {
  const s = pnqTileSizes[size];
  const tones = {
    blue: "var(--interface-tint)",
    neutral: "var(--gray-75)",
    accent: "var(--control-accent)",
    success: "var(--status-success-tint)",
    translucent: "rgba(255,255,255,.20)",
    none: "transparent"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: s.size,
      height: s.size,
      flex: "none",
      borderRadius: s.radius,
      background: tones[tone],
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background-color var(--dur-base) var(--ease-standard)",
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { IconTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconTile.jsx", error: String((e && e.message) || e) }); }

// components/core/SectionLabel.jsx
try { (() => {
function SectionLabel({
  children,
  description,
  onDark = false,
  rule = false,
  style
}) {
  const label = /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-bold) var(--fs-eyebrow) var(--font-ui)",
      letterSpacing: "var(--tracking-eyebrow)",
      color: onDark ? "var(--text-on-dark-faint)" : "var(--text-heading)",
      textTransform: "uppercase",
      whiteSpace: "nowrap"
    }
  }, children);
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, rule ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "10px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-semibold) 12.5px var(--font-ui)",
      letterSpacing: "0.06em",
      color: "var(--gray-500)",
      textTransform: "uppercase",
      whiteSpace: "nowrap"
    }
  }, children), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: "1px",
      background: "#e2e5ea"
    }
  })) : label, description ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-regular) var(--fs-body-sm) / var(--lh-snug) var(--font-text)",
      color: "var(--gray-500)",
      margin: "5px 0 11px"
    }
  }, description) : null);
}
Object.assign(__ds_scope, { SectionLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SectionLabel.jsx", error: String((e && e.message) || e) }); }

// components/core/StatusPill.jsx
try { (() => {
function StatusPill({
  status = "ready",
  label,
  onDark = true,
  style
}) {
  const ok = status === "ready";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      borderRadius: "var(--radius-pill)",
      padding: "5px 12px 5px 6px",
      background: ok ? onDark ? "var(--status-success-tint-dark)" : "var(--status-success-tint)" : onDark ? "rgba(255,111,94,.18)" : "var(--status-danger-tint)",
      transition: "background-color var(--dur-base) var(--ease-standard)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "18px",
      height: "18px",
      borderRadius: "50%",
      flex: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: ok ? "var(--status-success)" : "var(--status-danger)",
      transition: "background-color var(--dur-base) var(--ease-standard)"
    }
  }, ok ? /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--white)",
    strokeWidth: "3.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12.5 10 17.5 19 7"
  })) : /*#__PURE__*/React.createElement("svg", {
    width: "10",
    height: "10",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--white)",
    strokeWidth: "3.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 6 18 18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-bold) var(--fs-eyebrow) var(--font-ui)",
      color: ok ? onDark ? "var(--status-success-text)" : "var(--status-success-strong)" : onDark ? "var(--status-danger-text)" : "var(--status-danger-text-strong)",
      transition: "color var(--dur-base) var(--ease-standard)"
    }
  }, label));
}
Object.assign(__ds_scope, { StatusPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatusPill.jsx", error: String((e && e.message) || e) }); }

// components/core/TextField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const pnqFieldLabel = {
  display: "block",
  font: "var(--weight-semibold) var(--fs-caption) var(--font-ui)",
  color: "#7a8493",
  letterSpacing: "0.04em",
  textTransform: "uppercase"
};
const pnqFieldInput = {
  width: "100%",
  height: "var(--h-input)",
  marginTop: "10px",
  borderRadius: "var(--radius-input)",
  border: "var(--border-control) solid var(--interface-input-border)",
  background: "var(--interface-card)",
  padding: "0 18px",
  font: "var(--weight-semibold) 19px var(--font-ui)",
  color: "var(--text-heading)",
  letterSpacing: "0.04em",
  boxShadow: "var(--shadow-input)",
  transition: "all var(--dur-fast) var(--ease-standard)",
  outline: "none"
};
const pnqFieldHint = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginTop: "18px",
  font: "var(--weight-regular) 13.5px var(--font-text)",
  color: "#8b94a1"
};
function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  hintIcon,
  style,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, label ? /*#__PURE__*/React.createElement("label", {
    style: pnqFieldLabel
  }, label) : null, /*#__PURE__*/React.createElement("input", _extends({
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    autoComplete: "off",
    spellCheck: "false",
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      ...pnqFieldInput,
      borderColor: focused ? "var(--focus-border)" : "var(--interface-input-border)",
      boxShadow: focused ? "var(--focus-ring)" : "var(--shadow-input)"
    }
  }, rest)), hint ? /*#__PURE__*/React.createElement("div", {
    style: pnqFieldHint
  }, hintIcon, /*#__PURE__*/React.createElement("span", null, hint)) : null);
}
Object.assign(__ds_scope, { TextField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/TextField.jsx", error: String((e && e.message) || e) }); }

// components/patterns/ChoiceCard.jsx
try { (() => {
function ChoiceCard({
  icon,
  title,
  description,
  selected = false,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      cursor: "pointer",
      background: selected ? "var(--interface-selected)" : "var(--white)",
      border: `var(--border-selected) solid ${selected ? "var(--control-accent)" : "var(--interface-card-border)"}`,
      borderRadius: "var(--radius-card)",
      padding: "var(--pad-choice-card)",
      boxShadow: "var(--shadow-choice)",
      transition: "border-color var(--dur-base) var(--ease-standard), background-color var(--dur-base) var(--ease-standard)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "12px"
    }
  }, icon, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-bold) var(--fs-title-sm) var(--font-ui)",
      color: "var(--text-heading)"
    }
  }, title)), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-regular) var(--fs-caption) / 1.42 var(--font-text)",
      color: "var(--text-muted)"
    }
  }, description));
}
Object.assign(__ds_scope, { ChoiceCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/patterns/ChoiceCard.jsx", error: String((e && e.message) || e) }); }

// components/patterns/HeroActionCard.jsx
try { (() => {
function HeroActionCard({
  eyebrow,
  title,
  description,
  playing = false,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      cursor: "pointer",
      position: "relative",
      overflow: "hidden",
      background: "var(--gradient-action)",
      borderRadius: "var(--radius-hero)",
      padding: "26px 22px",
      boxShadow: "var(--shadow-action-hero)",
      transition: "transform var(--dur-instant) var(--ease-standard)",
      ...style
    },
    onMouseDown: e => {
      e.currentTarget.style.transform = "scale(var(--press-scale-card))";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "none";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "none";
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "-46px",
      right: "-30px",
      width: "150px",
      height: "150px",
      borderRadius: "50%",
      background: "rgba(255,255,255,.10)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: "-58px",
      right: "24px",
      width: "108px",
      height: "108px",
      borderRadius: "50%",
      background: "rgba(255,255,255,.06)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: "16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: "62px",
      height: "62px",
      flex: "none"
    }
  }, playing ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      borderRadius: "var(--radius-card-lg)",
      background: "rgba(255,255,255,.5)",
      animation: "pnq-pulse 2.4s ease-out infinite"
    }
  }) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: "62px",
      height: "62px",
      borderRadius: "var(--radius-card-lg)",
      background: "rgba(255,255,255,.20)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backdropFilter: "blur(2px)"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "30",
    height: "30",
    viewBox: "0 0 24 24",
    fill: "var(--white)",
    stroke: "none"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "6 4 20 12 6 20 6 4"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, eyebrow ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-medium) var(--fs-eyebrow) var(--font-ui)",
      color: "var(--blue-150)",
      letterSpacing: "0.05em",
      textTransform: "uppercase"
    }
  }, eyebrow) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-bold) var(--fs-title-lg) / var(--lh-title) var(--font-ui)",
      color: "var(--white)",
      letterSpacing: "var(--tracking-title)",
      marginTop: "3px"
    }
  }, title), description ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-regular) 13.5px / var(--lh-snug) var(--font-text)",
      color: "var(--blue-100)",
      marginTop: "6px"
    }
  }, description) : null)));
}
Object.assign(__ds_scope, { HeroActionCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/patterns/HeroActionCard.jsx", error: String((e && e.message) || e) }); }

// components/patterns/InlineAlert.jsx
try { (() => {
function InlineAlert({
  children,
  visible = true,
  onDark = true,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: visible ? "120px" : "0px",
      opacity: visible ? 1 : 0,
      overflow: "hidden",
      transition: "max-height var(--dur-control) var(--ease-standard), opacity var(--dur-base) var(--ease-standard)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "10px",
      alignItems: "flex-start",
      background: onDark ? "var(--status-danger-tint-dark)" : "var(--status-danger-tint)",
      border: `var(--border-hairline) solid ${onDark ? "var(--status-danger-border-dark)" : "rgba(255,111,94,.4)"}`,
      borderRadius: "var(--radius-tile)",
      padding: "11px 13px",
      marginBottom: "10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "18px",
      height: "18px",
      borderRadius: "50%",
      background: "var(--status-danger)",
      color: "var(--navy-800)",
      font: "var(--weight-bold) var(--fs-eyebrow) var(--font-ui)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "none",
      marginTop: "1px",
      lineHeight: 1
    }
  }, "!"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-medium) var(--fs-caption-sm) / 1.42 var(--font-text)",
      color: onDark ? "var(--status-danger-copy-dark)" : "var(--status-danger-text-strong)"
    }
  }, children)));
}
Object.assign(__ds_scope, { InlineAlert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/patterns/InlineAlert.jsx", error: String((e && e.message) || e) }); }

// components/patterns/ListRow.jsx
try { (() => {
function ListRow({
  icon,
  label,
  sublabel,
  trailing,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      display: "flex",
      alignItems: "center",
      gap: "15px",
      padding: "var(--pad-row)",
      cursor: onClick ? "pointer" : "default",
      ...style
    }
  }, icon, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--type-row-label)",
      color: "var(--text-heading)"
    }
  }, label), sublabel ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-regular) var(--fs-caption) var(--font-text)",
      color: "var(--text-label)",
      marginTop: "2px"
    }
  }, sublabel) : null), trailing, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--text-chevron)",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 6l6 6-6 6"
  })));
}
Object.assign(__ds_scope, { ListRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/patterns/ListRow.jsx", error: String((e && e.message) || e) }); }

// components/patterns/SelectRow.jsx
try { (() => {
function SelectRow({
  icon,
  label,
  selected = false,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "16px",
      background: selected ? "var(--blue-60)" : "var(--white)",
      border: `var(--border-control) solid ${selected ? "var(--brand-blue)" : "var(--gray-115)"}`,
      borderRadius: "var(--radius-card)",
      padding: "21px 18px",
      boxShadow: "var(--shadow-row)",
      transition: "border-color var(--dur-color) var(--ease-standard), background-color var(--dur-color) var(--ease-standard)",
      ...style
    }
  }, icon ? /*#__PURE__*/React.createElement("div", {
    style: {
      width: "54px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      flex: "none"
    }
  }, icon) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      font: "var(--weight-semibold) var(--fs-title) var(--font-ui)",
      color: "var(--text-heading)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "28px",
      height: "28px",
      borderRadius: "50%",
      flex: "none",
      background: selected ? "var(--brand-blue)" : "var(--gray-250)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background-color var(--dur-color) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--white)",
    strokeWidth: "3.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12.5 10 17.5 19 7"
  }))));
}
Object.assign(__ds_scope, { SelectRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/patterns/SelectRow.jsx", error: String((e && e.message) || e) }); }

// components/patterns/SessionOrb.jsx
try { (() => {
function SessionOrb({
  playing = true,
  size = 180,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: size + "px",
      height: size + "px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      ...style
    }
  }, playing ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      width: size + "px",
      height: size + "px",
      borderRadius: "50%",
      border: "2px solid rgba(127,194,238,.5)",
      animation: "pnq-ring-1 2.6s ease-out infinite"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      width: size + "px",
      height: size + "px",
      borderRadius: "50%",
      border: "2px solid rgba(127,194,238,.4)",
      animation: "pnq-ring-2 2.6s ease-out 1.1s infinite"
    }
  })) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "118px",
      height: "118px",
      borderRadius: "50%",
      background: "var(--gradient-orb)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "var(--shadow-orb)",
      animation: playing ? "pnq-breathe 4s ease-in-out infinite" : "none"
    }
  }, playing ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "5px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "6px",
      height: "22px",
      background: "var(--white)",
      borderRadius: "2px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "6px",
      height: "22px",
      background: "var(--white)",
      borderRadius: "2px"
    }
  })) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: 0,
      height: 0,
      borderLeft: "26px solid var(--white)",
      borderTop: "16px solid transparent",
      borderBottom: "16px solid transparent",
      marginLeft: "6px"
    }
  })));
}
function SessionTimer({
  clock,
  caption = "TIME REMAINING",
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-bold) var(--fs-clock) var(--font-ui)",
      letterSpacing: "0.02em",
      fontVariantNumeric: "tabular-nums",
      color: "var(--white)"
    }
  }, clock), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-semibold) var(--fs-eyebrow-sm) var(--font-ui)",
      letterSpacing: "var(--tracking-step)",
      color: "var(--on-dark-45)",
      marginTop: "4px"
    }
  }, caption));
}
Object.assign(__ds_scope, { SessionOrb, SessionTimer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/patterns/SessionOrb.jsx", error: String((e && e.message) || e) }); }

// ui_kits/patient_app/App.jsx
try { (() => {
const {
  PhoneFrame
} = window.PNQHealthDesignSystem_deabce;
function PatientApp() {
  const [screen, setScreen] = React.useState("welcome");
  const [confirmed, setConfirmed] = React.useState(false);
  const [rx, setRx] = React.useState("");
  const [ear, setEar] = React.useState(null);
  const [headphones, setHeadphones] = React.useState(false);
  const [volume, setVolume] = React.useState(80);
  const [warning, setWarning] = React.useState(null);
  const [match, setMatch] = React.useState({
    stage: "choose",
    sound: null,
    playing: false,
    precision: "Coarse",
    character: "Smooth",
    pitch: 0.5,
    loudness: 0.55,
    band: {
      low: 0.32,
      high: 0.6
    }
  });
  const [playing, setPlaying] = React.useState(true);
  const [remaining, setRemaining] = React.useState(15 * 60);
  React.useEffect(() => {
    const t = setInterval(() => {
      if (screen === "treatment" && playing) setRemaining(r => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [screen, playing]);
  const setMatchState = patch => setMatch(m => ({
    ...m,
    ...patch
  }));
  const stepTo = n => setScreen(["ears", "device", "match", "treatment"][n - 1]);
  const deviceWarning = () => {
    if (!headphones && volume < 100) return "Please connect your headphones and turn your device volume all the way up before continuing.";
    if (!headphones) return "Please connect your headphones before continuing.";
    return "Please turn your device volume all the way up before continuing. This helps ensure your treatment is delivered accurately.";
  };
  const background = {
    welcome: "var(--gradient-navy)",
    privacy: "var(--white)",
    prescription: "var(--interface-app)",
    confirm: "var(--interface-app)",
    dashboard: "var(--interface-app)",
    ears: "var(--interface-app)",
    device: "var(--navy-800)",
    match: "var(--interface-app)",
    treatment: "var(--gradient-treatment)"
  }[screen];
  return /*#__PURE__*/React.createElement(PhoneFrame, {
    background: background
  }, screen === "welcome" ? /*#__PURE__*/React.createElement(WelcomeScreen, {
    onStart: () => setScreen("privacy")
  }) : null, screen === "privacy" ? /*#__PURE__*/React.createElement(PrivacyScreen, {
    confirmed: confirmed,
    onToggle: () => setConfirmed(!confirmed),
    onBack: () => setScreen("welcome"),
    onContinue: () => {
      if (confirmed) setScreen("prescription");
    }
  }) : null, screen === "prescription" ? /*#__PURE__*/React.createElement(PrescriptionScreen, {
    value: rx,
    onChange: e => setRx(e.target.value),
    onBack: () => setScreen("privacy"),
    onContinue: () => {
      if (rx.trim().length >= 3) setScreen("confirm");
    }
  }) : null, screen === "confirm" ? /*#__PURE__*/React.createElement(ConfirmScreen, {
    onBack: () => setScreen("prescription"),
    onConfirm: () => setScreen("dashboard")
  }) : null, screen === "dashboard" ? /*#__PURE__*/React.createElement(DashboardScreen, {
    firstSession: true,
    messageCount: 0,
    formsDue: 0,
    onStartSession: () => setScreen("ears")
  }) : null, screen === "ears" ? /*#__PURE__*/React.createElement(SelectEarsScreen, {
    ear: ear,
    onPick: setEar,
    onNext: () => {
      if (ear) setScreen("device");
    },
    onCancel: () => setScreen("dashboard")
  }) : null, screen === "device" ? /*#__PURE__*/React.createElement(DeviceSetupScreen, {
    headphones: headphones,
    volume: volume,
    warning: warning,
    onToggleHeadphones: () => {
      setHeadphones(!headphones);
      setWarning(null);
    },
    onVolume: v => {
      setVolume(v);
      if (v >= 100 && headphones) setWarning(null);
    },
    onContinue: () => {
      if (headphones && volume >= 100) setScreen("match");else setWarning(deviceWarning());
    },
    onCancel: () => setScreen("dashboard"),
    onStepClick: stepTo
  }) : null, screen === "match" ? /*#__PURE__*/React.createElement(MatchScreen, {
    state: match,
    set: setMatchState,
    onContinue: () => setScreen("treatment"),
    onCancel: () => setScreen("dashboard"),
    onStepClick: stepTo
  }) : null, screen === "treatment" ? /*#__PURE__*/React.createElement(TreatmentScreen, {
    playing: playing,
    remaining: remaining,
    onToggle: () => {
      if (remaining === 0) setScreen("dashboard");else setPlaying(!playing);
    },
    onEnd: () => setScreen("dashboard"),
    onStepClick: stepTo
  }) : null);
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(PatientApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/patient_app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/patient_app/DashboardScreen.jsx
try { (() => {
const {
  Badge,
  Card,
  CardDivider,
  IconTile,
  Icon,
  SectionLabel,
  ListRow,
  HeroActionCard,
  StatusBar,
  HomeIndicator
} = window.PNQHealthDesignSystem_deabce;
function DashboardScreen({
  firstSession = true,
  messageCount = 0,
  formsDue = 0,
  onStartSession
}) {
  const rows = [{
    icon: "message",
    label: "Messages",
    sublabel: messageCount ? null : "No messages yet",
    tone: messageCount ? "blue" : "neutral",
    trailing: messageCount ? /*#__PURE__*/React.createElement(Badge, {
      variant: "count"
    }, messageCount) : null
  }, {
    icon: "forms",
    label: "Forms & Assessments",
    sublabel: formsDue ? null : "Complete after your first session",
    tone: formsDue ? "blue" : "neutral",
    trailing: formsDue ? /*#__PURE__*/React.createElement(Badge, {
      variant: "due"
    }, formsDue, " Due") : null
  }, {
    icon: "history",
    label: "Session History",
    sublabel: firstSession ? "Your sessions will appear here" : null,
    tone: firstSession ? "neutral" : "blue",
    trailing: null
  }, {
    icon: "user",
    label: "Profile",
    sublabel: null,
    tone: "blue",
    trailing: null
  }];
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Dashboard",
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--gradient-navy-dashboard)",
      flex: "none",
      color: "var(--white)"
    }
  }, /*#__PURE__*/React.createElement(StatusBar, null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px var(--gutter-screen-wide) 28px"
    }
  }, firstSession ? /*#__PURE__*/React.createElement(Badge, {
    variant: "eyebrow",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "sparkles",
      size: 14,
      color: "var(--brand-blue-light)"
    }),
    style: {
      marginBottom: "14px"
    }
  }, "WELCOME ABOARD") : null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-bold) var(--fs-h1) / var(--lh-display) var(--font-ui)",
      letterSpacing: "var(--tracking-display)"
    }
  }, "Hello, John!"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-regular) var(--fs-body) / var(--lh-snug) var(--font-text)",
      color: "var(--text-on-dark-secondary)",
      marginTop: "9px",
      paddingRight: "8px"
    }
  }, firstSession ? "Your treatment is ready. Let's begin your very first session." : "Welcome back \u2014 let's continue your treatment."))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
      padding: "22px var(--gutter-screen) 6px",
      display: "flex",
      flexDirection: "column",
      background: "var(--interface-app)"
    }
  }, /*#__PURE__*/React.createElement(HeroActionCard, {
    eyebrow: firstSession ? "Start here" : null,
    title: firstSession ? "Start Your First Session" : "Start New Session",
    description: firstSession ? "We'll guide you through every step" : "Begin your next treatment session",
    playing: firstSession,
    onClick: onStartSession
  }), /*#__PURE__*/React.createElement(SectionLabel, {
    rule: true,
    style: {
      margin: "28px 4px 14px"
    }
  }, "When you're ready"), /*#__PURE__*/React.createElement(Card, {
    variant: "list"
  }, rows.map((r, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: r.label
  }, i > 0 ? /*#__PURE__*/React.createElement(CardDivider, null) : null, /*#__PURE__*/React.createElement(ListRow, {
    icon: /*#__PURE__*/React.createElement(IconTile, {
      size: "md",
      tone: r.tone
    }, /*#__PURE__*/React.createElement(Icon, {
      name: r.icon,
      size: 22,
      color: r.tone === "blue" ? "var(--brand-blue-deep)" : "#8a93a1"
    })),
    label: r.label,
    sublabel: r.sublabel,
    trailing: r.trailing,
    onClick: () => {}
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: "14px"
    }
  })), /*#__PURE__*/React.createElement(HomeIndicator, {
    background: "var(--interface-app)"
  }));
}
Object.assign(window, {
  DashboardScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/patient_app/DashboardScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/patient_app/OnboardingScreens.jsx
try { (() => {
const {
  Button,
  TextField,
  Checkbox,
  Card,
  CardDivider,
  IconTile,
  Icon,
  StatusBar,
  HomeIndicator,
  NavBar
} = window.PNQHealthDesignSystem_deabce;
const pnqScroll = {
  flex: 1,
  overflowY: "auto",
  WebkitOverflowScrolling: "touch"
};
const pnqActionArea = {
  flex: "none",
  padding: "8px var(--gutter-screen-wide) 0"
};
function WelcomeScreen({
  onStart
}) {
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Welcome",
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      background: "var(--gradient-navy)"
    }
  }, /*#__PURE__*/React.createElement(StatusBar, null), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "-60px",
      right: "-70px",
      width: "240px",
      height: "240px",
      borderRadius: "50%",
      background: "radial-gradient(circle at 30% 30%,rgba(46,159,224,.30),transparent 70%)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: "120px",
      left: "-90px",
      width: "230px",
      height: "230px",
      borderRadius: "50%",
      background: "radial-gradient(circle at 50% 50%,rgba(46,159,224,.14),transparent 70%)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 40px",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/waveform-mark.svg",
    width: "118",
    height: "40",
    alt: "",
    style: {
      marginBottom: "26px",
      opacity: 0.95
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-bold) var(--fs-display) / 1 var(--font-ui)",
      letterSpacing: "var(--tracking-display)",
      color: "var(--white)"
    }
  }, "pnq", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: "var(--weight-medium)",
      color: "var(--brand-blue-light)",
      marginLeft: "4px"
    }
  }, "health")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-regular) var(--fs-label) / 1.55 var(--font-text)",
      color: "var(--text-on-dark-secondary)",
      textAlign: "center",
      marginTop: "18px",
      maxWidth: "250px"
    }
  }, "Personalized sound therapy for lasting tinnitus relief.")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      padding: "0 var(--gutter-screen-wide)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: onStart,
    style: {
      borderRadius: "var(--radius-card)",
      boxShadow: "var(--shadow-action-tall)"
    }
  }, "Get Started"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      font: "var(--weight-regular) 13.5px var(--font-text)",
      color: "var(--text-on-dark-muted)",
      marginTop: "18px"
    }
  }, "Prescribed by your clinician"), /*#__PURE__*/React.createElement(HomeIndicator, {
    onDark: true,
    style: {
      padding: "14px 0 10px"
    }
  })));
}
function PrivacyScreen({
  confirmed,
  onToggle,
  onBack,
  onContinue
}) {
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Privacy notice",
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      background: "var(--white)"
    }
  }, /*#__PURE__*/React.createElement(StatusBar, {
    background: "var(--navy-800)"
  }), /*#__PURE__*/React.createElement(NavBar, {
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...pnqScroll,
      padding: "24px 26px 8px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-bold) var(--fs-h1-sm) / var(--lh-heading) var(--font-ui)",
      color: "var(--text-heading)",
      letterSpacing: "var(--tracking-heading)"
    }
  }, "Notice of Privacy Practices"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--weight-semibold) var(--fs-caption-sm) / 1.5 var(--font-text)",
      color: "var(--text-secondary)",
      letterSpacing: "0.02em",
      margin: "18px 0 0",
      textTransform: "uppercase"
    }
  }, "This notice describes how medical information about you may be used and disclosed and how you can get access to this information. Please review it carefully."), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-bold) var(--fs-body) var(--font-ui)",
      color: "var(--text-heading)",
      marginTop: "22px"
    }
  }, "1. Our Duties"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-longform)",
      color: "var(--text-body)",
      margin: "8px 0 0"
    }
  }, "pnq health is required by law to maintain the privacy of protected health information (PHI), to provide you with notice of our legal duties and privacy practices, and to notify affected individuals following any breach of unsecured PHI."), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-bold) var(--fs-body) var(--font-ui)",
      color: "var(--text-heading)",
      marginTop: "18px"
    }
  }, "2. How We Use Your Information"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-longform)",
      color: "var(--text-body)",
      margin: "8px 0 0"
    }
  }, "We use your information to deliver and coordinate your treatment, communicate with your clinician, and operate the service. We do not sell your personal health information."), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-longform)",
      color: "var(--text-body)",
      margin: "14px 0 4px"
    }
  }, "You may request access to your records or ask questions at any time through your care team.")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      padding: "14px var(--gutter-screen-wide) 0",
      background: "var(--white)",
      borderTop: "1px solid var(--interface-divider)"
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    checked: confirmed,
    onChange: onToggle,
    label: "I confirm that I have received the Notice of Privacy Practices.",
    style: {
      padding: "4px 2px 16px"
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    disabled: !confirmed,
    onClick: onContinue
  }, "Continue"), /*#__PURE__*/React.createElement(HomeIndicator, {
    style: {
      padding: "12px 0 8px"
    }
  })));
}
function PrescriptionScreen({
  value,
  onChange,
  onBack,
  onContinue
}) {
  const ready = (value || "").trim().length >= 3;
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Prescription ID",
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      background: "var(--interface-app)"
    }
  }, /*#__PURE__*/React.createElement(StatusBar, {
    background: "var(--navy-800)"
  }), /*#__PURE__*/React.createElement(NavBar, {
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...pnqScroll,
      padding: "40px 28px 8px",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement(IconTile, {
    size: "xl",
    tone: "blue",
    style: {
      marginBottom: "24px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "prescription",
    size: 32,
    color: "var(--brand-blue-deep)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-bold) var(--fs-h1) / 1.12 var(--font-ui)",
      color: "var(--text-heading)",
      letterSpacing: "-0.018em"
    }
  }, "Enter your", /*#__PURE__*/React.createElement("br", null), "Prescription ID"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-regular) var(--fs-label) / 1.55 var(--font-text)",
      color: "var(--text-secondary)",
      marginTop: "14px"
    }
  }, "Your clinician gave you this ID when they set up your treatment. Enter it to connect to your record."), /*#__PURE__*/React.createElement(TextField, {
    label: "Prescription ID",
    value: value,
    onChange: onChange,
    placeholder: "e.g. PNQ-4821-LK",
    hint: "Your information is private and secure.",
    hintIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 16,
      color: "var(--gray-450)"
    }),
    style: {
      marginTop: "34px"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: pnqActionArea
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    disabled: !ready,
    onClick: onContinue
  }, "Continue"), /*#__PURE__*/React.createElement(HomeIndicator, {
    style: {
      padding: "12px 0 8px"
    }
  })));
}
function ConfirmScreen({
  onBack,
  onConfirm
}) {
  const rows = [["user", "Name", "John Doe"], ["mail", "Email", "john.doe@email.com"], ["phone", "Phone", "+1 (401) 254-5010"]];
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Confirm identity",
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      background: "var(--interface-app)"
    }
  }, /*#__PURE__*/React.createElement(StatusBar, {
    background: "var(--navy-800)"
  }), /*#__PURE__*/React.createElement(NavBar, {
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...pnqScroll,
      padding: "34px 26px 8px",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "60px",
      height: "60px",
      borderRadius: "50%",
      background: "var(--status-success-tint)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "22px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "checkThin",
    size: 30,
    color: "var(--status-success-strong)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-bold) 29px / 1.14 var(--font-ui)",
      color: "var(--text-heading)",
      letterSpacing: "-0.018em"
    }
  }, "We found your record"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-regular) var(--fs-label) / 1.55 var(--font-text)",
      color: "var(--text-secondary)",
      marginTop: "12px"
    }
  }, "Please confirm this is you before we continue."), /*#__PURE__*/React.createElement(Card, {
    variant: "list",
    style: {
      marginTop: "26px"
    }
  }, rows.map(([icon, label, value], i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: label
  }, i > 0 ? /*#__PURE__*/React.createElement(CardDivider, null) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "15px",
      padding: "16px 18px"
    }
  }, /*#__PURE__*/React.createElement(IconTile, {
    size: "sm",
    tone: "blue"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 20,
    color: "var(--brand-blue-deep)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-medium) var(--fs-eyebrow) var(--font-ui)",
      color: "var(--text-label)",
      letterSpacing: "var(--tracking-label)",
      textTransform: "uppercase"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-semibold) var(--fs-title-sm) var(--font-ui)",
      color: "var(--text-heading)",
      marginTop: "3px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, value))))))), /*#__PURE__*/React.createElement("div", {
    style: pnqActionArea
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: onConfirm
  }, "Yes, that's me"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: onBack,
    style: {
      height: "50px",
      marginTop: "11px",
      fontSize: "var(--fs-label)",
      color: "var(--text-secondary)"
    }
  }, "This isn't me"), /*#__PURE__*/React.createElement(HomeIndicator, {
    style: {
      padding: "8px 0"
    }
  })));
}
Object.assign(window, {
  WelcomeScreen,
  PrivacyScreen,
  PrescriptionScreen,
  ConfirmScreen,
  pnqScroll,
  pnqActionArea
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/patient_app/OnboardingScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/patient_app/TreatmentScreens.jsx
try { (() => {
const {
  Button,
  Card,
  CardDivider,
  IconTile,
  Icon,
  SectionLabel,
  SelectRow,
  ChoiceCard,
  InlineAlert,
  StatusPill,
  SegmentedControl,
  TuningSlider,
  RangeSlider,
  LevelSlider,
  PlayToggle,
  SessionOrb,
  SessionTimer,
  StatusBar,
  HomeIndicator,
  StepProgress
} = window.PNQHealthDesignSystem_deabce;
function SelectEarsScreen({
  ear,
  onPick,
  onNext,
  onCancel
}) {
  const options = [["left", "Left Ear", 1], ["right", "Right Ear", -1], ["both", "Both Ears", 0]];
  const earGlyph = flip => flip === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "2px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ear",
    size: 24,
    strokeWidth: 1.9,
    color: "var(--navy-800)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      transform: "scaleX(-1)",
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ear",
    size: 24,
    strokeWidth: 1.9,
    color: "var(--navy-800)"
  }))) : /*#__PURE__*/React.createElement("div", {
    style: {
      transform: flip === -1 ? "scaleX(-1)" : "none",
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ear",
    size: 41,
    color: "var(--navy-800)"
  }));
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Select ears",
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      background: "var(--interface-app)"
    }
  }, /*#__PURE__*/React.createElement(StatusBar, {
    time: "3:20",
    background: "var(--navy-800)"
  }), /*#__PURE__*/React.createElement(StepProgress, {
    step: 1,
    total: 4
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "30px var(--gutter-screen) 6px",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-bold) var(--fs-h1) / var(--lh-title) var(--font-ui)",
      color: "var(--text-heading)",
      textAlign: "center",
      letterSpacing: "var(--tracking-heading)"
    }
  }, "Select ear(s)"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-regular) 19px / 1.38 var(--font-text)",
      color: "var(--text-body)",
      textAlign: "center",
      margin: "12px 46px 0"
    }
  }, "Which ear(s) would you like to treat?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "17px",
      marginTop: "30px"
    }
  }, options.map(([id, label, flip]) => /*#__PURE__*/React.createElement(SelectRow, {
    key: id,
    icon: earGlyph(flip),
    label: label,
    selected: ear === id,
    onClick: () => onPick(id)
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      padding: "8px var(--gutter-screen) 0",
      background: "var(--interface-app)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "solid",
    size: "sm",
    disabled: !ear,
    onClick: onNext
  }, "Next"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: onCancel,
    style: {
      height: "40px",
      marginTop: "4px"
    }
  }, "Cancel treatment"), /*#__PURE__*/React.createElement(HomeIndicator, {
    style: {
      padding: "6px 0 8px"
    }
  })));
}
function DeviceSetupScreen({
  headphones,
  volume,
  onToggleHeadphones,
  onVolume,
  warning,
  onContinue,
  onCancel,
  onStepClick
}) {
  const volOk = volume >= 100;
  const ready = headphones && volOk;
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Device setup",
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--navy-800)",
      display: "flex",
      flexDirection: "column",
      color: "var(--white)"
    }
  }, /*#__PURE__*/React.createElement(StatusBar, {
    time: "3:21",
    background: "var(--navy-800)"
  }), /*#__PURE__*/React.createElement(StepProgress, {
    step: 2,
    total: 4,
    onStepClick: onStepClick
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "14px var(--gutter-screen) 6px",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      marginTop: "8px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "headphones",
    size: 68,
    strokeWidth: 1.7,
    color: "var(--magenta-500)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-bold) var(--fs-h2) / 1.12 var(--font-ui)",
      color: "var(--white)",
      textAlign: "center",
      letterSpacing: "var(--tracking-title)",
      marginTop: "14px"
    }
  }, "Let's get set up"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-regular) var(--fs-body) / var(--lh-snug) var(--font-text)",
      color: "var(--on-dark-65)",
      textAlign: "center",
      margin: "8px 18px 0"
    }
  }, "A quick check before you begin."), /*#__PURE__*/React.createElement(Card, {
    variant: "dark",
    style: {
      marginTop: "24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onToggleHeadphones,
    style: {
      display: "flex",
      alignItems: "center",
      gap: "14px",
      cursor: "pointer",
      padding: "15px 2px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "34px",
      flex: "none",
      display: "flex",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "headphones",
    size: 28,
    color: "var(--magenta-500)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-bold) var(--fs-label) var(--font-ui)",
      color: "var(--white)"
    }
  }, "Headphones"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-regular) var(--fs-eyebrow) var(--font-text)",
      color: "var(--on-dark-55)",
      marginTop: "2px"
    }
  }, headphones ? "Your headphones are ready" : "Plug in headphones or earphones")), /*#__PURE__*/React.createElement(StatusPill, {
    status: headphones ? "ready" : "blocked",
    label: headphones ? "Connected" : "Not detected"
  })), /*#__PURE__*/React.createElement(CardDivider, {
    inset: "2px",
    onDark: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "15px 2px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "34px",
      flex: "none",
      display: "flex",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "volume",
    size: 28,
    strokeWidth: 1.9,
    color: "var(--magenta-500)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-bold) var(--fs-label) var(--font-ui)",
      color: "var(--white)"
    }
  }, "Device Volume"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-regular) var(--fs-eyebrow) var(--font-text)",
      color: "var(--on-dark-55)",
      marginTop: "2px"
    }
  }, "Turn it all the way up")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: "3px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-black) 24px var(--font-ui)",
      color: volOk ? "var(--status-success-text)" : "var(--status-danger)",
      lineHeight: 1
    }
  }, volume, "%"), volOk ? null : /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-bold) var(--fs-body) var(--font-ui)",
      color: "var(--on-dark-40)",
      lineHeight: 1
    }
  }, "/ 100%"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "13px",
      background: "var(--interface-dark-raised)",
      border: `1px solid ${volOk ? "var(--status-success-border-dark)" : "rgba(255,111,94,.4)"}`,
      borderRadius: "var(--radius-tile)",
      padding: "12px 14px",
      transition: "border-color var(--dur-control) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement(StatusPill, {
    status: volOk ? "ready" : "blocked",
    label: volOk ? "Ready" : "100% required to continue",
    style: {
      background: "transparent",
      padding: "0 0 2px"
    }
  }), /*#__PURE__*/React.createElement(LevelSlider, {
    value: volume,
    onChange: onVolume,
    status: volOk ? "ready" : "blocked",
    style: {
      marginTop: "8px"
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-regular) var(--fs-caption) / 1.5 var(--font-text)",
      color: "var(--on-dark-55)",
      marginTop: "18px",
      textAlign: "center",
      padding: "0 6px"
    }
  }, "You'll hear one or more sounds and compare them to the tinnitus you hear.")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      padding: "8px var(--gutter-screen) 0",
      background: "var(--navy-800)"
    }
  }, /*#__PURE__*/React.createElement(InlineAlert, {
    visible: !!warning
  }, warning), /*#__PURE__*/React.createElement(Button, {
    variant: "solid",
    size: "sm",
    disabled: !ready,
    onDark: true,
    onClick: onContinue
  }, "Continue"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onDark: true,
    onClick: onCancel,
    style: {
      height: "40px",
      marginTop: "4px"
    }
  }, "Cancel treatment"), /*#__PURE__*/React.createElement(HomeIndicator, {
    onDark: true,
    style: {
      padding: "6px 0 8px"
    }
  })));
}
function MatchScreen({
  state,
  set,
  onContinue,
  onCancel,
  onStepClick
}) {
  const {
    stage,
    sound,
    playing,
    precision,
    character,
    pitch,
    loudness,
    band
  } = state;
  const isRinging = sound === "ringing";
  const switcher = /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "6px",
      background: "var(--interface-track-alt)",
      borderRadius: "var(--radius-button)",
      padding: "5px",
      marginBottom: "20px"
    }
  }, [["ringing", "Tone", "wave"], ["static", "Static", "equalizer"]].map(([id, label, glyph]) => {
    const on = sound === id;
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      type: "button",
      onClick: () => set({
        sound: id
      }),
      style: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "9px",
        height: "46px",
        border: "none",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        background: on ? "var(--control-accent)" : "transparent",
        boxShadow: on ? "var(--shadow-segment)" : "none",
        transition: "background-color 280ms var(--ease-standard)"
      }
    }, /*#__PURE__*/React.createElement(IconTile, {
      size: "xs",
      tone: on ? "translucent" : "none",
      style: {
        width: "26px",
        height: "26px",
        borderRadius: "var(--radius-sm)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: glyph,
      size: glyph === "equalizer" ? 26 : 17,
      strokeWidth: 3,
      color: on ? "var(--white)" : "#5b6472"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--weight-bold) var(--fs-body-sm) var(--font-ui)",
        color: on ? "var(--white)" : "#5b6472"
      }
    }, label));
  }));
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Match your tinnitus",
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      background: "var(--interface-app)"
    }
  }, /*#__PURE__*/React.createElement(StatusBar, {
    time: "3:33",
    background: "var(--navy-800)"
  }), /*#__PURE__*/React.createElement(StepProgress, {
    step: 3,
    total: 4,
    onStepClick: onStepClick
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "18px var(--gutter-screen-tight) 6px"
    }
  }, stage === "choose" ? /*#__PURE__*/React.createElement("div", {
    style: {
      paddingBottom: "20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-bold) var(--fs-h3) / 1.16 var(--font-ui)",
      color: "var(--text-heading)",
      textAlign: "center",
      letterSpacing: "var(--tracking-title)"
    }
  }, "What sounds most", /*#__PURE__*/React.createElement("br", null), "like your tinnitus?"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-regular) var(--fs-body-sm) / var(--lh-body) var(--font-text)",
      textAlign: "center",
      color: "var(--text-muted)",
      margin: "11px 22px 0"
    }
  }, "Pick the closest match, then start the sound to compare.")) : null, /*#__PURE__*/React.createElement(PlayToggle, {
    playing: playing,
    onToggle: () => set({
      playing: !playing,
      sound: sound || "ringing"
    }),
    style: {
      marginBottom: "18px"
    }
  }), stage === "choose" ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "12px",
      alignItems: "stretch"
    }
  }, /*#__PURE__*/React.createElement(ChoiceCard, {
    icon: /*#__PURE__*/React.createElement(IconTile, {
      size: "xs",
      tone: isRinging ? "accent" : "none"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "wave",
      size: 23,
      color: isRinging ? "var(--white)" : "#5b6472"
    })),
    title: "Tone",
    description: "A steady ringing, whistle, or pure tone.",
    selected: isRinging,
    onClick: () => set({
      sound: "ringing"
    })
  }), /*#__PURE__*/React.createElement(ChoiceCard, {
    icon: /*#__PURE__*/React.createElement(IconTile, {
      size: "xs",
      tone: sound === "static" ? "accent" : "none"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "equalizer",
      size: 38,
      color: sound === "static" ? "var(--white)" : "#5b6472"
    })),
    title: "Static",
    description: "A sound more like static, hissing, or rushing air.",
    selected: sound === "static",
    onClick: () => set({
      sound: "static"
    })
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      marginTop: "22px"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: sound ? "solid" : "primary",
    size: "xs",
    disabled: !sound,
    onClick: () => {
      if (sound) set({
        stage: "edit"
      });
    },
    trailingIcon: sound ? /*#__PURE__*/React.createElement(Icon, {
      name: "arrowRight",
      size: 17,
      color: "var(--white)"
    }) : null,
    style: sound ? {
      background: "var(--control-accent)",
      boxShadow: "var(--shadow-action-xs)"
    } : undefined
  }, sound ? "Next" : "Select a sound"))) : /*#__PURE__*/React.createElement("div", null, switcher, /*#__PURE__*/React.createElement(Card, {
    variant: "section",
    style: {
      marginBottom: "14px",
      padding: "18px 16px 6px"
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, {
    description: "Start with Coarse, then move to Medium and Fine as your match gets closer."
  }, "MATCHING PRECISION"), /*#__PURE__*/React.createElement(SegmentedControl, {
    options: ["Coarse", "Medium", "Fine"],
    value: precision,
    onChange: v => set({
      precision: v
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: "1px",
      background: "var(--interface-divider)",
      margin: "16px 0"
    }
  }), isRinging ? /*#__PURE__*/React.createElement(TuningSlider, {
    label: "Pitch",
    value: pitch,
    onChange: v => set({
      pitch: v
    }),
    precision: precision
  }) : /*#__PURE__*/React.createElement(RangeSlider, {
    label: "Pitch range",
    low: band.low,
    high: band.high,
    onChange: (low, high) => set({
      band: {
        low,
        high
      }
    }),
    precision: precision
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: "1px",
      background: "var(--interface-divider)",
      margin: "12px 0 14px"
    }
  }), /*#__PURE__*/React.createElement(TuningSlider, {
    label: "Loudness",
    value: loudness,
    onChange: v => set({
      loudness: v
    }),
    precision: precision,
    style: {
      marginBottom: "6px"
    }
  })), isRinging ? /*#__PURE__*/React.createElement(Card, {
    variant: "section",
    style: {
      marginBottom: "14px"
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, {
    style: {
      marginBottom: "11px"
    }
  }, "TONE QUALITY"), /*#__PURE__*/React.createElement(SegmentedControl, {
    options: ["Smooth", "Soft", "Bright", "Harsh"],
    value: character,
    onChange: v => set({
      character: v
    })
  })) : null)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      padding: "10px var(--gutter-screen-tight) 0",
      background: "var(--interface-app)"
    }
  }, stage === "edit" ? /*#__PURE__*/React.createElement(Button, {
    variant: "solid",
    size: "sm",
    onClick: onContinue
  }, "Continue to treatment") : null, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: onCancel,
    style: {
      height: "40px",
      marginTop: "4px"
    }
  }, "Cancel treatment"), /*#__PURE__*/React.createElement(HomeIndicator, {
    style: {
      padding: "6px 0 8px"
    }
  })));
}
function TreatmentScreen({
  playing,
  remaining,
  onToggle,
  onEnd,
  onStepClick
}) {
  const done = remaining === 0;
  const on = playing && !done;
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Receive treatment",
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--gradient-treatment)",
      display: "flex",
      flexDirection: "column",
      color: "var(--white)"
    }
  }, /*#__PURE__*/React.createElement(StatusBar, {
    time: "3:34"
  }), /*#__PURE__*/React.createElement(StepProgress, {
    step: 4,
    total: 4,
    onStepClick: onStepClick,
    style: {
      background: "transparent",
      padding: "18px var(--gutter-screen) 12px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 30px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(SessionOrb, {
    playing: on,
    style: {
      marginBottom: "34px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-bold) 25px / var(--lh-heading) var(--font-ui)",
      letterSpacing: "var(--tracking-title)"
    }
  }, done ? "Session complete" : playing ? "Your treatment is playing" : "Treatment paused"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-regular) var(--fs-body) / 1.5 var(--font-text)",
      color: "var(--text-on-dark-secondary)",
      margin: "12px 14px 0"
    }
  }, done ? "Great work. Your progress has been saved." : "Sit back, relax, and let the sound do its work. Keep your headphones on."), /*#__PURE__*/React.createElement(SessionTimer, {
    clock: done ? "0:00" : mm + ":" + (ss < 10 ? "0" + ss : ss),
    style: {
      marginTop: "30px"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      padding: "8px var(--gutter-screen) 0"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: on ? "outline" : "solid",
    onDark: true,
    onClick: onToggle
  }, done ? "Finish" : playing ? "Pause" : "Resume"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onDark: true,
    onClick: onEnd,
    style: {
      marginTop: "10px",
      fontSize: "var(--fs-body)"
    }
  }, "End session"), /*#__PURE__*/React.createElement(HomeIndicator, {
    onDark: true,
    style: {
      padding: "8px 0"
    }
  })));
}
Object.assign(window, {
  SelectEarsScreen,
  DeviceSetupScreen,
  MatchScreen,
  TreatmentScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/patient_app/TreatmentScreens.jsx", error: String((e && e.message) || e) }); }

__ds_ns.NavBar = __ds_scope.NavBar;

__ds_ns.PhoneFrame = __ds_scope.PhoneFrame;

__ds_ns.StatusBar = __ds_scope.StatusBar;

__ds_ns.HomeIndicator = __ds_scope.HomeIndicator;

__ds_ns.StepProgress = __ds_scope.StepProgress;

__ds_ns.LevelSlider = __ds_scope.LevelSlider;

__ds_ns.PlayToggle = __ds_scope.PlayToggle;

__ds_ns.RangeSlider = __ds_scope.RangeSlider;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.TuningSlider = __ds_scope.TuningSlider;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CardDivider = __ds_scope.CardDivider;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconTile = __ds_scope.IconTile;

__ds_ns.SectionLabel = __ds_scope.SectionLabel;

__ds_ns.StatusPill = __ds_scope.StatusPill;

__ds_ns.TextField = __ds_scope.TextField;

__ds_ns.ChoiceCard = __ds_scope.ChoiceCard;

__ds_ns.HeroActionCard = __ds_scope.HeroActionCard;

__ds_ns.InlineAlert = __ds_scope.InlineAlert;

__ds_ns.ListRow = __ds_scope.ListRow;

__ds_ns.SelectRow = __ds_scope.SelectRow;

__ds_ns.SessionOrb = __ds_scope.SessionOrb;

__ds_ns.SessionTimer = __ds_scope.SessionTimer;

})();
