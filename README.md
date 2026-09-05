# PNQ Sound Matching

Static, client-only web app for PNQ Health's tinnitus sound-matching research
prototype. No accounts, no server: the build output in `dist/` is a shareable
static bundle.

## Layout

- `index.html`, `src/` — app shell. Loads every design-system token stylesheet,
  `styles.css` and the component bundle before first paint, then renders the
  Launch screen with design-system components.
- `_ds/pnq-health-design-system-deabceb2-e79d-43e7-b9c1-b8c64c847b65/` —
  vendored PNQ Health Design System bundle (token CSS files, `styles.css`,
  `_ds_bundle.js`, readme). Do not edit; all colors, type, spacing and radii
  must come from its CSS custom properties (`var(--*)`).
- `assets/waveform-mark-navy.svg`, `assets/waveform-mark.svg` — brand waveform
  marks, copied verbatim from the prototype. Navy renders on Launch at 34x34;
  the mark also serves as the app thumbnail on the `#e9e7e2` background.
- `scripts/` — build (`dist/` assembly), static server, and the
  design-token lint.
- `tests/unit/` — `node --test` suites. `tests/e2e/` — Playwright suites.

## Commands

Requires Node.js 20+.

- `npm ci` — install dependencies.
- `npm run build` — emit the static bundle to `dist/`.
- `npm run lint` — design-token adherence check: app-owned styles must use
  `var(--*)` design-system properties, not new hard-coded palette values
  (the prototype's documented inline exceptions are allowed).
- `npm test` — unit tests.
- `npm run test:e2e` — Playwright end-to-end tests (installs Chromium, builds,
  serves `dist/`).
