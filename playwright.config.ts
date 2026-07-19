import { defineConfig } from "@playwright/test";

const port = 4517;

/** Browser regression configuration for the served Mokabook shell. */
export default defineConfig({
  forbidOnly: true,
  fullyParallel: false,
  projects: [
    {
      name: "chromium",
      use: {
        channel: process.env["PLAYWRIGHT_CHANNEL"] ?? "chrome",
      },
    },
  ],
  reporter: [["list"]],
  retries: 0,
  testDir: "tests/browser",
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
  },
  webServer: {
    command: `node dist/cli/bin.js serve --config examples/basic/mokabook.config.ts --port ${port} --no-watch`,
    reuseExistingServer: false,
    url: `http://127.0.0.1:${port}/`,
  },
  workers: 1,
});
