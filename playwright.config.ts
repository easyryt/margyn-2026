import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 120000,
  workers: 1,
  expect: { timeout: 15000 },
  outputDir: ".test-data/browser-results",
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    channel: "msedge",
    headless: true,
    actionTimeout: 15000,
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 90000,
  },
});
