import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scanText, lintProject, ALLOWED_LITERALS } from "../../scripts/lint-tokens.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DS_DIR = "_ds/pnq-health-design-system-deabceb2-e79d-43e7-b9c1-b8c64c847b65";

const TOKEN_SHEETS = [
  "tokens/fonts.css",
  "tokens/colors.css",
  "tokens/typography.css",
  "tokens/spacing.css",
  "tokens/radius.css",
  "tokens/elevation.css",
  "tokens/motion.css",
  "tokens/base.css"
];

test("index.html loads every design-system token stylesheet, styles.css and the component bundle before first paint", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const headEnd = html.indexOf("</head>");
  assert.ok(headEnd > 0, "index.html has a <head>");
  const head = html.slice(0, headEnd);
  for (const sheet of TOKEN_SHEETS) {
    assert.ok(
      head.includes(`${DS_DIR}/${sheet}`),
      `head links ${sheet} before first paint`
    );
  }
  assert.ok(head.includes(`${DS_DIR}/styles.css`), "head links styles.css");
  assert.ok(head.includes(`${DS_DIR}/_ds_bundle.js`), "head loads the component bundle");
  // The component bundle renders with React; the runtime must load first.
  const react = head.indexOf("react.production.min.js");
  const bundle = head.indexOf("_ds_bundle.js");
  assert.ok(react !== -1 && react < bundle, "React runtime loads before the component bundle");
});

test("vendored design-system bundle files exist and styles.css imports all eight token sheets", () => {
  const styles = readFileSync(join(root, DS_DIR, "styles.css"), "utf8");
  for (const sheet of TOKEN_SHEETS) {
    assert.ok(styles.includes(`@import url("${sheet}")`), `styles.css imports ${sheet}`);
    assert.ok(readFileSync(join(root, DS_DIR, sheet), "utf8").length > 0, `${sheet} is vendored`);
  }
  const bundle = readFileSync(join(root, DS_DIR, "_ds_bundle.js"), "utf8");
  assert.ok(bundle.includes('"namespace":"PNQHealthDesignSystem_deabce"'), "component bundle namespace present");
  for (const c of ["Button", "SelectRow", "SegmentedControl", "TuningSlider", "PlayToggle", "Card", "InlineAlert", "StatusBar", "HomeIndicator"]) {
    assert.ok(bundle.includes(`__ds_ns.${c} = `), `component bundle exports ${c}`);
  }
});

test("waveform mark SVGs are present, unmodified prototype assets", () => {
  const navy = readFileSync(join(root, "assets/waveform-mark-navy.svg"), "utf8");
  const blue = readFileSync(join(root, "assets/waveform-mark.svg"), "utf8");
  const wave = 'd="M2 24 C14 6 22 6 32 20 C42 34 50 34 60 18 C70 2 80 2 90 18 C98 31 108 30 116 18"';
  assert.equal(Buffer.byteLength(navy), 390, "navy mark byte length unchanged");
  assert.equal(Buffer.byteLength(blue), 393, "blue mark byte length unchanged");
  assert.ok(navy.includes(wave) && navy.includes('stroke="#16263f"'), "navy mark geometry and stroke intact");
  assert.ok(blue.includes(wave) && blue.includes('stroke="#2e9fe0"'), "blue mark geometry and stroke intact");
});

test("launch screen renders the blue welcome mark from the bundled asset", () => {
  const app = readFileSync(join(root, "src/app.js"), "utf8");
  assert.ok(app.includes("assets/waveform-mark.svg"), "launch uses the blue mark asset on navy");
  assert.ok(app.includes('width: "118px"') && app.includes('height: "40px"'), "welcome mark sized 118x40");
});

test("token lint flags hard-coded palette values and allows tokens plus documented exceptions", () => {
  assert.ok(scanText("color: #123456;").length === 1, "new hex literal is flagged");
  assert.ok(scanText("color: rgb(1, 2, 3);").length === 1, "rgb() literal is flagged");
  assert.ok(scanText("color: var(--text-body);").length === 0, "token reference passes");
  assert.ok(ALLOWED_LITERALS.has("#e9e7e2"), "documented thumbnail background is an allowed exception");
  assert.ok(scanText("background: #e9e7e2;").length === 0, "documented exception passes");
});

test("app-owned styles pass the token lint", () => {
  const { violations } = lintProject();
  assert.deepEqual(violations, []);
});
