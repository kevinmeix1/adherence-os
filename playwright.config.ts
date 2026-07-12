import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.APP_URL ?? "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "test-results/browser",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "line",
  expect: { timeout: 5_000 },
  use: {
    baseURL,
    actionTimeout: 5_000,
    navigationTimeout: 15_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } }
    }
  ],
  webServer: process.env.APP_URL
    ? undefined
    : {
        command: "pnpm exec next start -p 3100",
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000
      }
});
