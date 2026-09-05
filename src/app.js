/*
 * PNQ Sound Matching - app shell.
 * Renders the Launch screen using PNQ Health Design System components.
 * All colors, type, spacing and radii come from the design system's
 * CSS custom properties (var(--*)); no new literal palette values.
 */
(function () {
  "use strict";

  var DS = window.PNQHealthDesignSystem_deabce;
  var e = React.createElement;

  function LaunchScreen() {
    return e(
      "div",
      {
        "data-screen": "launch",
        style: {
          height: "100%",
          maxWidth: "430px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          background: "var(--interface-app)"
        }
      },
      e(DS.StatusBar, { time: "9:41", onDark: false }),
      e(
        "div",
        { style: { flex: 1, overflowY: "auto", padding: "30px 24px 10px" } },
        e("img", {
          src: "assets/waveform-mark-navy.svg",
          alt: "",
          style: { width: "34px", height: "34px" }
        }),
        e(
          "div",
          {
            style: {
              font: "700 10.5px var(--font-ui)",
              letterSpacing: ".16em",
              color: "var(--text-label)",
              marginTop: "20px"
            }
          },
          "PNQ SOUND MATCHING"
        ),
        e(
          "div",
          {
            style: {
              font: "700 28px/1.1 var(--font-ui)",
              color: "var(--text-heading)",
              letterSpacing: "-.02em",
              marginTop: "10px"
            }
          },
          "Let's find the sound you hear"
        ),
        e(
          "div",
          {
            style: {
              font: "400 15px/1.5 var(--font-text)",
              color: "var(--text-body)",
              marginTop: "12px"
            }
          },
          "You'll listen through headphones and adjust a tone until it comes close to the sound you hear in your tinnitus."
        )
      ),
      e(
        "div",
        { style: { flex: "none", padding: "10px 22px 8px" } },
        e(DS.Button, { variant: "primary", disabled: true }, "Continue")
      ),
      e(DS.HomeIndicator, { onDark: false })
    );
  }

  var root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(e(LaunchScreen));

  // Audio engine (REQ-017): an ES module, dynamically imported on mount.
  // This single instance is the app's only playback path - never add a second.
  import("./audio-engine.js").then(function (engine) {
    window.__pnqAudioEngine = engine;
  });
})();
