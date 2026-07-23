import { defineConfig, devices } from "@playwright/test";

const PORT = 4174;

export default defineConfig({
  testDir: "./packages",
  testMatch: "**/*.spec.ts",
  snapshotPathTemplate:
    "{testDir}/{testFileDir}/__snapshots__/{arg}{-projectName}{-platform}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Retry up to 3 times everywhere — RTL visual snapshots are
  // intermittently flaky under parallel-test CPU load. Local
  // `bun run build` now chains verify, so a genuine flake would
  // block the whole build. This is the retry ceiling we've observed
  // needed to make the flake statistically invisible.
  retries: 3,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `bun tests/server.ts`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT) },
  },
});
