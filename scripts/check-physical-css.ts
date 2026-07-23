import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SCAN_ROOTS = ["packages", "apps"].map((p) => join(ROOT, p));

const BANNED = [
  { pattern: /(?:^|[^-\w])(margin|padding|border)-(left|right)\b/, use: "-inline-start / -inline-end" },
  { pattern: /(?:^|[^-\w])(left|right)\s*:/, use: "inset-inline-start / inset-inline-end" },
  { pattern: /\btext-align\s*:\s*(left|right)\b/, use: "text-align: start / end" },
  { pattern: /\bfloat\s*:\s*(left|right)\b/, use: "float: inline-start / inline-end" },
  { pattern: /\bclear\s*:\s*(left|right)\b/, use: "clear: inline-start / inline-end" },
  { pattern: /\bborder-(top|bottom)-(left|right)-radius\b/, use: "border-start-start-radius etc." },
];

const IGNORE_DIRS = new Set(["node_modules", "dist", ".git", "build"]);
const IGNORE_FILE_RE = /(reset|normalize)\.css$/i;

type Violation = { file: string; line: number; text: string; use: string };
const violations: Violation[] = [];

function walk(dir: string): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (IGNORE_DIRS.has(name)) { continue; }
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (name.endsWith(".css") && !IGNORE_FILE_RE.test(name)) {
      scan(full);
    }
  }
}

function scan(file: string): void {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, "");
    if (stripped.trim().startsWith("//")) { continue; }
    for (const rule of BANNED) {
      if (rule.pattern.test(stripped)) {
        violations.push({
          file: relative(ROOT, file),
          line: i + 1,
          text: raw.trim(),
          use: rule.use,
        });
      }
    }
  }
}

for (const r of SCAN_ROOTS) { walk(r); }

if (violations.length === 0) {
  console.log("check-physical-css: OK — no banned properties");
  process.exit(0);
}

console.error(`check-physical-css: ${violations.length} violation(s)\n`);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}`);
  console.error(`    ${v.text}`);
  console.error(`    → use ${v.use}\n`);
}
console.error(
  "Physical CSS properties break right-to-left layouts. Use logical properties.",
);
console.error(
  "Reference: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values",
);
process.exit(1);
