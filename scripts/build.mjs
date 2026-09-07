/*
 * Build: assemble the static bundle in dist/.
 * The app is client-only; the build copies the app shell, the vendored
 * PNQ Health Design System bundle, the brand assets (verbatim), and the
 * React runtime the component bundle renders with.
 */
import { cpSync, mkdirSync, rmSync, existsSync, copyFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const DS_DIR = "_ds/pnq-health-design-system-deabceb2-e79d-43e7-b9c1-b8c64c847b65";

// This is a copy-based build, so validate source syntax before replacing the
// last known-good dist bundle. Browser tests remain the behavioral gate.
for (const file of readdirSync(join(root, "src"))) {
  if (file.endsWith(".js")) execFileSync(process.execPath, ["--check", join(root, "src", file)], { stdio: "inherit" });
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "vendor"), { recursive: true });

// App shell and source.
copyFileSync(join(root, "index.html"), join(dist, "index.html"));
cpSync(join(root, "src"), join(dist, "src"), { recursive: true });

// Brand waveform marks, byte-for-byte.
cpSync(join(root, "assets"), join(dist, "assets"), { recursive: true });

// Vendored design-system bundle: tokens, styles.css, component bundle.
cpSync(join(root, DS_DIR), join(dist, DS_DIR), { recursive: true });

// React runtime used by the design-system component bundle.
copyFileSync(
  join(root, "node_modules/react/umd/react.production.min.js"),
  join(dist, "vendor/react.production.min.js")
);
copyFileSync(
  join(root, "node_modules/react-dom/umd/react-dom.production.min.js"),
  join(dist, "vendor/react-dom.production.min.js")
);

// Sanity-check that everything index.html references made it into dist.
const required = [
  "index.html",
  "src/app.js",
  "assets/waveform-mark.svg",
  "assets/waveform-mark-navy.svg",
  "vendor/react.production.min.js",
  "vendor/react-dom.production.min.js",
  `${DS_DIR}/styles.css`,
  `${DS_DIR}/_ds_bundle.js`,
  `${DS_DIR}/tokens/fonts.css`,
  `${DS_DIR}/tokens/colors.css`,
  `${DS_DIR}/tokens/typography.css`,
  `${DS_DIR}/tokens/spacing.css`,
  `${DS_DIR}/tokens/radius.css`,
  `${DS_DIR}/tokens/elevation.css`,
  `${DS_DIR}/tokens/motion.css`,
  `${DS_DIR}/tokens/base.css`
];
const missing = required.filter((f) => !existsSync(join(dist, f)));
if (missing.length > 0) {
  console.error("Build incomplete; missing from dist/:");
  for (const f of missing) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`Built static bundle in dist/ (${required.length} required files verified).`);
