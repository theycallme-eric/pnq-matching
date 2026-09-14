import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const readJson = (file) => JSON.parse(readFileSync(join(root, file), "utf8"));

test("integration scope keeps the approved dependency baseline", () => {
  const pkg = readJson("package.json");
  const lockRoot = readJson("package-lock.json").packages[""];

  assert.deepEqual(pkg.dependencies, {
    react: "^18.3.1",
    "react-dom": "^18.3.1"
  });
  assert.deepEqual(pkg.devDependencies, {
    "@playwright/test": "^1.49.1"
  });
  assert.deepEqual(lockRoot.dependencies, pkg.dependencies);
  assert.deepEqual(lockRoot.devDependencies, pkg.devDependencies);
});

test("integration scope remains client-only without a new platform surface", () => {
  const source = readdirSync(join(root, "src"))
    .filter((file) => file.endsWith(".js"))
    .map((file) => readFileSync(join(root, "src", file), "utf8"))
    .join("\n");
  const html = readFileSync(join(root, "index.html"), "utf8");

  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon)\b/, "no service or analytics transport");
  assert.doesNotMatch(source, /\b(?:localStorage|indexedDB|serviceWorker|caches)\b/, "no new persistence or offline system");
  assert.doesNotMatch(source, /\b(?:analytics|telemetry)\b/i, "no analytics collection");
  assert.doesNotMatch(html, /<link\b[^>]*rel=["']manifest["']/i, "no web app manifest");

  for (const file of ["manifest.json", "manifest.webmanifest", "service-worker.js", "service-worker.mjs", "sw.js", "sw.mjs"]) {
    assert.equal(existsSync(join(root, file)), false, `${file} is absent`);
  }
});
