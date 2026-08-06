import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  createFixture,
  removeFixture,
  repositoryRoot,
  validEntrySource,
  type TestFixture,
} from "../helpers/fixture.js";

const cli = path.join(repositoryRoot, "dist/cli/bin.js");

let fixture: TestFixture;
let child: ChildProcess;
let url: string;

test.beforeAll(async () => {
  fixture = await createFixture(validEntrySource(), {
    extraConfig: `colorSchemes: ["light", "dark"],`,
  });
  child = spawn(
    "node",
    [cli, "serve", "--config", fixture.configPath, "--port", "0"],
    {
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  url = await new Promise<string>((resolve, reject) => {
    let buffered = "";
    const timer = setTimeout(
      () => reject(new Error(`serve did not start: ${buffered}`)),
      30_000,
    );
    child.stdout?.on("data", (chunk: Buffer) => {
      buffered += chunk.toString();
      const match = buffered.match(/Mokabook listening at (http:\/\/[^\s]+)/);
      if (match?.[1]) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    child.on("exit", (code) =>
      reject(new Error(`serve exited early with ${code}: ${buffered}`)),
    );
  });
});

test.afterAll(async () => {
  if (child && child.exitCode === null) child.kill("SIGTERM");
  if (fixture) await removeFixture(fixture);
});

test("watched serve rebuilds and reloads after an authored change", async ({
  page,
}) => {
  await page.goto(`${url}/view/screens/home.html`);
  await expect(page.locator("#mb-main h2")).toHaveText("Home");
  await page.fill("[data-mokabook-search]", "home");
  await page.click('[data-viewport-option="mobile"]');
  await page.click(
    '.mbk-topbar [data-mokabook-schemeswitch] [data-color-scheme-option="dark"]',
  );
  await expect(page.locator(".mbk-frame-mobile iframe")).toHaveAttribute(
    "src",
    /screens\/home\.mobile\.dark\.html$/,
  );
  await page.locator("[data-mokabook-details] summary").click();
  await expect(page.locator("[data-mokabook-details]")).not.toHaveAttribute(
    "open",
    "",
  );
  await page.setViewportSize({ height: 900, width: 420 });
  await page.click("[data-mokabook-menu]");
  await fs.promises.writeFile(
    fixture.entryPath,
    validEntrySource({ firstTitle: "Home Reloaded" }),
  );
  await expect(page.locator("#mb-main h2")).toHaveText("Home Reloaded", {
    timeout: 45_000,
  });
  await expect(page.locator("[data-mokabook-search]")).toHaveValue("home");
  await expect(page.locator(".mbk-frame-mobile")).toBeVisible();
  await expect(page.locator(".mbk-frame-desktop")).toBeHidden();
  await expect(page.locator("body")).toHaveAttribute(
    "data-mokabook-color-scheme",
    "dark",
  );
  await expect(page.locator(".mbk-frame-mobile iframe")).toHaveAttribute(
    "src",
    /screens\/home\.mobile\.dark\.html$/,
  );
  await expect(
    page.locator(
      '.mbk-screen-head [data-mokabook-schemeswitch] [data-color-scheme-option="dark"]',
    ),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-mokabook-details]")).not.toHaveAttribute(
    "open",
    "",
  );
  await expect(page.locator("[data-mokabook-shell]")).toHaveAttribute(
    "data-drawer",
    "open",
  );
});

test("watched serve shuts down cleanly", async () => {
  const exited = new Promise<number | null>((resolve) => {
    child.on("exit", (code) => resolve(code));
  });
  child.kill("SIGTERM");
  expect(await exited).toBe(0);
  await expect(async () => {
    await fetch(`${url}/`);
  }).rejects.toThrow();
});
