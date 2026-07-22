import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync, brotliCompressSync } from "node:zlib";

const PACKAGES = ["core", "components", "react"];
const ROOT = new URL("..", import.meta.url).pathname;

const fmt = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(2)} KB`);
const pad = (s: string, w: number) => s + " ".repeat(Math.max(0, w - s.length));

console.log(pad("file", 46) + pad("raw", 12) + pad("gzip", 12) + "brotli");
console.log("-".repeat(78));

let totalRaw = 0,
  totalGz = 0,
  totalBr = 0;

for (const pkg of PACKAGES) {
  const dir = join(ROOT, "packages", pkg, "dist");
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".js"));
  } catch {
    console.log(`(${pkg}: no dist — run \`bun run build\` first)`);
    continue;
  }

  for (const f of files.sort()) {
    const path = join(dir, f);
    const raw = statSync(path).size;
    const bytes = await Bun.file(path).bytes();
    const buf = Buffer.from(bytes);
    const gz = gzipSync(buf, { level: 9 }).length;
    const br = brotliCompressSync(buf).length;
    totalRaw += raw;
    totalGz += gz;
    totalBr += br;
    console.log(
      pad(`@mind-matrix/lucid-${pkg}/${f}`, 46) +
        pad(fmt(raw), 12) +
        pad(fmt(gz), 12) +
        fmt(br),
    );
  }
}

console.log("-".repeat(78));
console.log(
  pad("TOTAL", 46) +
    pad(fmt(totalRaw), 12) +
    pad(fmt(totalGz), 12) +
    fmt(totalBr),
);
