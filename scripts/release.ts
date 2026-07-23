/**
 * Publish every workspace package to npm in dependency order.
 *
 * Usage:
 *   bun run release            # publish
 *   bun run release --dry-run  # verify tarballs + versions, don't publish
 *
 * Behavior:
 *   1. Rebuilds packages from source.
 *   2. For each package (in dependency order):
 *      - Reads `name` + `version` from package.json
 *      - Queries npm for existing versions
 *      - Skips if the local version is already published (idempotent retry)
 *      - Otherwise publishes with `--access public`
 *   3. Bails on the first failure (partial releases are hard to reason
 *      about; re-running skips already-published packages and picks up
 *      from the first missing one).
 *
 * Requires you to be logged into npm as a member of the @mind-matrix org.
 *   bunx npm whoami       # check
 *   bunx npm login        # sign in
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;

// Order matters — components + react depend on core.
const PACKAGES = ["core", "components", "react"] as const;

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

type PackageManifest = {
  name: string;
  version: string;
  private?: boolean;
};

function readManifest(pkg: string): PackageManifest {
  const path = join(ROOT, "packages", pkg, "package.json");
  return JSON.parse(readFileSync(path, "utf8"));
}

function alreadyPublished(name: string, version: string): boolean {
  // `npm view <name>@<version> version` prints the version if present,
  // returns non-zero if the version doesn't exist yet.
  const result = spawnSync(
    "bunx",
    ["npm", "view", `${name}@${version}`, "version"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return result.status === 0 && result.stdout.trim() === version;
}

function publish(pkg: string): void {
  const dir = join(ROOT, "packages", pkg);
  const flags = ["publish", "--access", "public"];
  if (dryRun) {
    flags.push("--dry-run");
  }
  console.log(`\n[release] ${dryRun ? "DRY-RUN " : ""}publishing ${pkg}...`);
  const result = spawnSync("bun", flags, {
    cwd: dir,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(
      `\n[release] failed to publish ${pkg} (exit ${result.status}).`,
    );
    console.error(
      `[release] fix the issue and re-run. Already-published packages will be skipped.`,
    );
    process.exit(1);
  }
}

// --- main ---

console.log(`[release] mode: ${dryRun ? "dry-run" : "live"}`);

// Verify npm auth before doing anything heavy.
if (!dryRun) {
  const who = spawnSync("bunx", ["npm", "whoami"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (who.status !== 0) {
    console.error("[release] not logged into npm — run `bunx npm login`.");
    process.exit(1);
  }
  console.log(`[release] npm user: ${who.stdout.trim()}`);
}

// Fresh build.
console.log("\n[release] building packages...");
const build = spawnSync("bun", ["run", "build:packages"], {
  cwd: ROOT,
  stdio: "inherit",
});
if (build.status !== 0) {
  console.error("[release] build failed — aborting.");
  process.exit(1);
}

// Publish loop.
const summary: Array<{ pkg: string; version: string; status: string }> = [];
for (const pkg of PACKAGES) {
  const { name, version, private: isPrivate } = readManifest(pkg);
  if (isPrivate) {
    console.log(`[release] skipping ${name} — marked private`);
    summary.push({ pkg: name, version, status: "skipped (private)" });
    continue;
  }
  if (!dryRun && alreadyPublished(name, version)) {
    console.log(
      `[release] ${name}@${version} is already on npm — skipping`,
    );
    summary.push({ pkg: name, version, status: "already published" });
    continue;
  }
  publish(pkg);
  summary.push({
    pkg: name,
    version,
    status: dryRun ? "dry-run ok" : "published",
  });
}

console.log("\n[release] summary:");
for (const row of summary) {
  console.log(`  ${row.pkg}@${row.version} — ${row.status}`);
}
