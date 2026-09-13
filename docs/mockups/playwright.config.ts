import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  outputDir: "../../.context/mockups-test-results",
  forbidOnly: true,
  fullyParallel: true,
  retries: 0,
  workers: 2,
  reporter: "list",
  use: {
    channel: process.env["PLAYWRIGHT_CHANNEL"] ?? "chrome",
    trace: "retain-on-failure",
  },
});
