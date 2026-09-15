import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ds = join(root, "_ds", "pnq-health-design-system-deabceb2-e79d-43e7-b9c1-b8c64c847b65");
const colorsSource = readFileSync(join(ds, "tokens", "colors.css"), "utf8");
const buttonSource = readFileSync(join(ds, "_ds_bundle.js"), "utf8");
const baseSource = readFileSync(join(ds, "tokens", "base.css"), "utf8");
const appSource = readFileSync(join(root, "src", "app.js"), "utf8");
const shellSource = readFileSync(join(root, "index.html"), "utf8");

const tokens = new Map(
  [...colorsSource.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)]
    .map((match) => [match[1], match[2].trim()])
);

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
