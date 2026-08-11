/**
 * Install Lucid's Claude skills into the user's global Claude skills folder.
 *
 *   bun run setup:skills
 *
 * On first run, prompts for the install path (default: ~/.claude/skills on
 * macOS/Linux, %USERPROFILE%\.claude\skills on Windows). The choice is
 * persisted so subsequent runs don't ask again.
 *
 * Currently supports Claude only. If we add other agents (Cursor, etc.)
 * later, this script grows a per-agent copy loop.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";

const ROOT = new URL("..", import.meta.url).pathname;
const SOURCE = join(ROOT, "skills/claude");
const CONFIG_PATH = join(ROOT, ".skills-install.json");

type InstallConfig = { claudeSkillsDir: string };

function defaultSkillsDir(): string {
  // Claude's global skills folder convention:
  //   macOS/Linux/ChromeOS: ~/.claude/skills
  //   Windows:              %USERPROFILE%\.claude\skills
  // homedir() resolves USERPROFILE (Windows) or HOME (Unix) transparently.
  return join(homedir(), ".claude", "skills");
}

function loadConfig(): InstallConfig | null {
  if (!existsSync(CONFIG_PATH)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as InstallConfig;
  } catch {
    return null;
  }
}

function saveConfig(config: InstallConfig): void {
  writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function promptPath(defaultPath: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `Where should Claude skills be installed?\n  [default: ${defaultPath}]\n  path: `,
  );
  rl.close();
  const trimmed = answer.trim();
  return trimmed === "" ? defaultPath : resolve(trimmed.replace(/^~/, homedir()));
}

async function main(): Promise<void> {
  console.log(`[setup:skills] platform: ${platform()}`);

  if (!existsSync(SOURCE)) {
    console.error(`[setup:skills] source missing: ${SOURCE}`);
    process.exit(1);
  }

  const cached = loadConfig();
  let targetRoot: string;
  if (cached?.claudeSkillsDir) {
    console.log(
      `[setup:skills] using cached install path: ${cached.claudeSkillsDir}`,
    );
    console.log(
      `[setup:skills] (delete ${CONFIG_PATH} to be prompted again)`,
    );
    targetRoot = cached.claudeSkillsDir;
  } else {
    targetRoot = await promptPath(defaultSkillsDir());
    saveConfig({ claudeSkillsDir: targetRoot });
    console.log(`[setup:skills] saved path to ${CONFIG_PATH}`);
  }

  mkdirSync(targetRoot, { recursive: true });

  // Copy each skill directory (each direct child of skills/claude/) into
  // targetRoot. `cpSync` with recursive+force replaces existing dirs so
  // re-running the script updates skills in place.
  const { readdirSync, statSync } = await import("node:fs");
  const skillDirs = readdirSync(SOURCE).filter((name) => {
    return statSync(join(SOURCE, name)).isDirectory();
  });

  if (skillDirs.length === 0) {
    console.error(`[setup:skills] no skill directories found in ${SOURCE}`);
    process.exit(1);
  }

  for (const skillName of skillDirs) {
    const src = join(SOURCE, skillName);
    const dest = join(targetRoot, skillName);
    cpSync(src, dest, { recursive: true, force: true });
    console.log(`[setup:skills] installed ${skillName} → ${dest}`);
  }

  console.log(
    `\n[setup:skills] done. Reload Claude Code to pick up the new skill.`,
  );
}

await main();
