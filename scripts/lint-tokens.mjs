/*
 * Design-token adherence lint.
 *
 * Verifies that app-owned styles reference PNQ Health Design System custom
 * properties (var(--*)) instead of introducing new hard-coded palette values
 * (hex, rgb()/rgba(), hsl()/hsla()).
 *
 * Scope: app-owned files only (index.html, src/). The vendored design-system
 * bundle under _ds/ and the verbatim brand SVGs under assets/ are the source
 * of truth and are not scanned.
 *
 * Allowed exceptions are the prototype's documented inline values.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Documented inline exceptions carried over from the prototype:
// - #e9e7e2: the app-thumbnail / canvas background behind the phone frame.
export const ALLOWED_LITERALS = new Set(["#e9e7e2"]);

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/g;

export function scanText(text, file = "<inline>") {
  const violations = [];
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    for (const match of line.matchAll(COLOR_LITERAL)) {
      const literal = match[0].toLowerCase();
      if (literal.startsWith("#") && ALLOWED_LITERALS.has(literal)) continue;
      violations.push({
        file,
        line: i + 1,
        column: match.index + 1,
        literal: match[0],
        text: line.trim()
      });
    }
  });
  return violations;
}

function collectFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectFiles(full, out);
    } else if ([".js", ".mjs", ".css", ".html"].includes(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

export function lintProject() {
  const files = [join(root, "index.html")];
  if (existsSync(join(root, "src"))) collectFiles(join(root, "src"), files);
  const violations = [];
  for (const file of files) {
    violations.push(...scanText(readFileSync(file, "utf8"), relative(root, file)));
  }
  return { files: files.map((f) => relative(root, f)), violations };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { files, violations } = lintProject();
  if (violations.length > 0) {
    console.error("Design-token lint failed. Hard-coded palette values found:");
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}:${v.column}  ${v.literal}  (${v.text})`);
    }
    console.error("Use design-system custom properties (var(--*)) from _ds/ tokens instead.");
    process.exit(1);
  }
  console.log(`Design-token lint passed (${files.length} app files checked).`);
}
