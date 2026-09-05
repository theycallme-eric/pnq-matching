/*
 * Unit test runner. With no arguments it runs every tests/unit/*.test.mjs;
 * arguments filter suites by file-name substring (e.g. `npm test -- app-shell`).
 */
import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "tests", "unit");

const filters = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".test.mjs"))
  .filter((f) => filters.length === 0 || filters.some((x) => f.includes(x)))
  .sort()
  .map((f) => join(dir, f));

if (files.length === 0) {
  console.error(`No unit test files match: ${filters.join(", ")}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
process.exit(result.status ?? 1);
