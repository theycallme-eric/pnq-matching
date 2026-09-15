import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ds = join(root, "_ds", "pnq-health-design-system-deabceb2-e79d-43e7-b9c1-b8c64c847b65");
const colorsSource = readFileSync(join(ds, "tokens", "colors.css"), "utf8");
const elevationSource = readFileSync(join(ds, "tokens", "elevation.css"), "utf8");
const buttonSource = readFileSync(join(ds, "_ds_bundle.js"), "utf8");
const baseSource = readFileSync(join(ds, "tokens", "base.css"), "utf8");
const appSource = readFileSync(join(root, "src", "app.js"), "utf8");
const shellSource = readFileSync(join(root, "index.html"), "utf8");

const tokens = new Map(
  [...colorsSource.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)]
    .map((match) => [match[1], match[2].trim()])
);

const elevationTokens = new Map(
  [...elevationSource.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)]
    .map((match) => [match[1], match[2].trim()])
);

function parseShadowToken(name) {
  assert.ok(elevationTokens.has(name), `${name} is defined centrally`);
  const value = elevationTokens.get(name);
  const match = value.match(
    /^(-?[\d.]+)(?:px)?\s+(-?[\d.]+)px\s+([\d.]+)px\s+rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/
  );
  assert.ok(match, `${name} keeps the documented single-shadow structure`);
  return {
    value,
    x: Number(match[1]),
    y: Number(match[2]),
    blur: Number(match[3]),
    rgb: match.slice(4, 7).map(Number),
    alpha: Number(match[7])
  };
}

function resolveToken(name, seen = new Set()) {
  assert.ok(tokens.has(name), `${name} is defined centrally`);
  assert.ok(!seen.has(name), `${name} does not contain a circular reference`);
  seen.add(name);
  const value = tokens.get(name);
  const reference = value.match(/^var\((--[a-z0-9-]+)\)$/i);
  return reference ? resolveToken(reference[1], seen) : value;
}

function hexToRgb(value) {
  assert.match(value, /^#[0-9a-f]{6}$/i, `${value} is a six-digit color`);
  return [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16));
}

function luminance(value) {
  const channels = hexToRgb(value).map((channel) => {
    const normalized = channel / 255;
    return normalized <= .04045
      ? normalized / 12.92
      : ((normalized + .055) / 1.055) ** 2.4;
  });
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
}

function contrast(first, second) {
  const values = [luminance(resolveToken(first)), luminance(resolveToken(second))]
    .sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}

function expectContrast(foreground, background, minimum, description) {
  const ratio = contrast(foreground, background);
  assert.ok(ratio >= minimum, `${description}: ${ratio.toFixed(2)}:1 is at least ${minimum}:1`);
}

test("enabled Button semantic tokens meet label contrast in every interactive state", () => {
  const stateMatrix = {
    primary: {
      foreground: "--button-action-label",
      normal: ["--button-primary-start", "--button-primary-end"],
      hover: ["--button-primary-hover-start", "--button-primary-hover-end"],
      active: ["--button-primary-active-start", "--button-primary-active-end"],
      focus: ["--button-primary-start", "--button-primary-end"]
    },
    solid: {
      foreground: "--button-action-label",
      normal: ["--button-solid-background"],
      hover: ["--button-solid-hover-background"],
      active: ["--button-solid-active-background"],
      focus: ["--button-solid-background"]
    },
    outline: {
      foreground: "--button-outline-label",
      normal: ["--button-outline-background"],
      hover: ["--button-outline-hover-background"],
      active: ["--button-outline-active-background"],
      focus: ["--button-outline-background"]
    },
    ghost: {
      foreground: "--button-ghost-label",
      normal: ["--interface-app", "--interface-card"],
      hover: ["--button-ghost-hover-background"],
      active: ["--button-ghost-active-background"],
      focus: ["--interface-app", "--interface-card"]
    }
  };

  for (const [variant, definition] of Object.entries(stateMatrix)) {
    for (const [state, backgrounds] of Object.entries(definition)) {
      if (state === "foreground") continue;
      for (const background of backgrounds) {
        expectContrast(definition.foreground, background, 4.5, `${variant} ${state} label`);
      }
    }
  }
});

test("Button boundary, focus, and disabled semantic tokens preserve contrast and identity", () => {
  for (const background of ["--button-outline-background", "--button-outline-hover-background", "--button-outline-active-background"]) {
    expectContrast("--button-outline-border", background, 3, "outline boundary");
  }
  for (const background of ["--interface-app", "--interface-card"]) {
    expectContrast("--button-focus-indicator", background, 3, "light-surface focus indicator");
  }
  expectContrast("--button-focus-indicator-on-dark", "--interface-dark", 3, "dark-surface focus indicator");

  for (const background of ["--button-disabled-primary-start", "--button-disabled-primary-end", "--button-disabled-solid-background"]) {
    expectContrast("--button-disabled-label", background, 4.5, "disabled filled label");
  }
  expectContrast("--button-disabled-outline-label", "--button-disabled-outline-background", 4.5, "disabled outline label");
  for (const background of ["--interface-app", "--interface-card"]) {
    expectContrast("--button-disabled-ghost-label", background, 4.5, "disabled ghost label");
  }

  assert.match(buttonSource, /case "outline":[\s\S]*?disabled[\s\S]*?--button-disabled-outline-border/, "disabled outline has its own boundary treatment");
  assert.match(buttonSource, /case "ghost":[\s\S]*?disabled[\s\S]*?--button-disabled-ghost-label/, "disabled ghost has its own transparent treatment");
  assert.match(buttonSource, /"data-pnq-button"/, "the shared component exposes its semantic styling hook");
  assert.match(buttonSource, /"aria-disabled": disabled \|\| undefined/, "disabled Buttons expose their unavailable state programmatically");
  assert.match(baseSource, /\[data-pnq-button\][\s\S]*?:hover/, "shared hover states live in the design system");
  assert.match(baseSource, /\[data-pnq-button\][\s\S]*?:active/, "shared active states live in the design system");
  assert.match(baseSource, /\[data-pnq-button\]:focus-visible/, "shared focus-visible treatment lives in the design system");
});

test("Button palette and disabled semantics are centralized outside the app shell", () => {
  assert.doesNotMatch(shellSource, /\[data-pnq-variant=/, "index.html has no variant color override");
  assert.doesNotMatch(shellSource, /\[data-pnq-disabled=/, "index.html has no disabled color override");
  assert.doesNotMatch(appSource, /Button\(props\)[\s\S]*?data-pnq-variant/, "the app does not wrap Button to patch its semantic styles");
});

test("shared action shadows repeatably reduce production blur and alpha by at least half", () => {
  const productionBaselines = {
    "--shadow-action": { y: 10, blur: 22, rgb: [31, 127, 196], alpha: .4 },
    "--shadow-action-tall": { y: 12, blur: 26, rgb: [31, 127, 196], alpha: .42 },
    "--shadow-action-hero": { y: 16, blur: 34, rgb: [31, 127, 196], alpha: .4 },
    "--shadow-action-sm": { y: 4, blur: 12, rgb: [90, 169, 226], alpha: .4 },
    "--shadow-action-xs": { y: 4, blur: 12, rgb: [47, 124, 192], alpha: .34 }
  };

  for (const [name, baseline] of Object.entries(productionBaselines)) {
    const current = parseShadowToken(name);
    assert.equal(current.x, 0, `${name} remains vertically directed`);
    assert.deepEqual(current.rgb, baseline.rgb, `${name} retains its approved hue`);
    assert.ok(current.y <= baseline.y / 2, `${name} vertical offset is at most half its production baseline`);
    assert.ok(current.blur <= baseline.blur / 2, `${name} blur is at most half its production baseline`);
    assert.ok(current.alpha <= baseline.alpha / 2, `${name} alpha is at most half its production baseline`);
  }
});

test("primary, solid, hero, tall, small, and extra-small controls use the action-shadow family", () => {
  assert.match(buttonSource, /case "primary":[\s\S]*?boxShadow: "var\(--shadow-action\)"/, "primary uses the base action shadow");
  assert.match(buttonSource, /case "solid":[\s\S]*?boxShadow: "var\(--shadow-action-sm\)"/, "solid uses the restrained small action shadow");
  assert.match(buttonSource, /function HeroActionCard[\s\S]*?boxShadow: "var\(--shadow-action-hero\)"/, "hero actions use the hero action shadow");
  assert.match(buttonSource, /function WelcomeScreen[\s\S]*?size: "lg"[\s\S]*?boxShadow: "var\(--shadow-action-tall\)"/, "tall actions use the tall action shadow");
  assert.match(buttonSource, /variant: "solid",\s*size: "sm"/, "small shared action controls retain the solid action family");
  assert.match(buttonSource, /size: "xs"[\s\S]*?boxShadow: "var\(--shadow-action-xs\)"/, "extra-small actions use the extra-small action shadow");
  assert.match(appSource, /variant: "primary", size: "sm"[\s\S]*?Return to matching options/, "the completion CTA resolves through the shared primary action treatment");
});

test("unrelated elevation definitions remain unchanged", () => {
  const approvedUnrelatedShadows = {
    "--shadow-card": "0 4px 16px rgba(22, 38, 63, 0.06)",
    "--shadow-card-sm": "0 2px 12px rgba(20, 30, 55, 0.05)",
    "--shadow-thumb": "0 2px 6px rgba(20, 30, 55, 0.2)",
    "--shadow-thumb-dark": "0 2px 6px rgba(0, 0, 0, 0.4)",
    "--shadow-segment": "0 2px 6px rgba(47, 124, 192, 0.32)",
    "--shadow-play-idle": "0 2px 8px rgba(47, 124, 192, 0.12)",
    "--shadow-play-active": "0 4px 14px rgba(47, 124, 192, 0.4)",
    "--shadow-orb": "0 10px 30px rgba(47, 124, 192, 0.5)",
    "--shadow-device": "0 18px 50px rgba(20, 30, 55, 0.28)",
    "--ring-thumb-active": "0 0 0 4px rgba(47, 124, 192, 0.18), 0 2px 6px rgba(20, 30, 55, 0.22)"
  };

  for (const [name, value] of Object.entries(approvedUnrelatedShadows)) {
    assert.equal(elevationTokens.get(name), value, `${name} is outside TASK-002 scope`);
  }
});
