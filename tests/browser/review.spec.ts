import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  createFixture,
  removeFixture,
  repositoryRoot,
  validEntrySource,
  type TestFixture,
} from "../helpers/fixture.js";

const run = promisify(execFile);
const cli = path.join(repositoryRoot, "dist/cli/bin.js");

let fixture: TestFixture;
let outDir: string;

async function git(cwd: string, ...args: string[]): Promise<void> {
  await run("git", args, { cwd });
}

test.beforeAll(async () => {
  fixture = await createFixture();
  await run("node", [cli, "build", "--config", fixture.configPath]);
  await git(fixture.root, "init", "--initial-branch=main");
  await git(fixture.root, "config", "user.email", "fixture@example.test");
  await git(fixture.root, "config", "user.name", "Fixture");
  await git(fixture.root, "add", "-A");
  await git(fixture.root, "commit", "-m", "base");
  await fs.promises.writeFile(
    fixture.entryPath,
    validEntrySource({ firstTitle: "Home Revised" }),
  );
  await run("node", [cli, "build", "--config", fixture.configPath]);
  await run("node", [
    cli,
    "review",
    "--config",
    fixture.configPath,
    "--base",
    "main",
  ]);
  outDir = path.join(fixture.root, ".review");
});

test.afterAll(async () => {
  if (fixture) await removeFixture(fixture);
});

test("the review index groups changed screens", async ({ page }) => {
  await page.goto(pathToFileURL(path.join(outDir, "index.html")).href);
  await expect(page.locator("h1")).toHaveText("Mokabook review");
  await expect(page.locator(".mb-baseline")).toContainText("main");
  await expect(page.getByRole("heading", { name: "Changed" })).toBeVisible();
  await expect(page.locator(".mb-chg-dot--changed").first()).toBeVisible();
});

test("impact-only screens stay linked from the review index", async ({
  page,
}) => {
  const impacted = await createFixture();
  try {
    await run("node", [cli, "build", "--config", impacted.configPath]);
    await git(impacted.root, "init", "--initial-branch=main");
    await git(impacted.root, "config", "user.email", "fixture@example.test");
    await git(impacted.root, "config", "user.name", "Fixture");
    await git(impacted.root, "add", "-A");
    await git(impacted.root, "commit", "-m", "base");
    await fs.promises.writeFile(
      path.join(impacted.root, "notes.md"),
      "# Updated fixture notes\n",
    );
    await run("node", [
      cli,
      "review",
      "--config",
      impacted.configPath,
      "--base",
      "main",
    ]);
    const impactedOut = path.join(impacted.root, ".review");

    await page.goto(pathToFileURL(path.join(impactedOut, "index.html")).href);
    await expect(page.getByRole("heading", { name: "Impacted" })).toBeVisible();
    await expect(page.getByText("No visual changes")).toHaveCount(0);
    await expect(page.locator(".mb-chg-dot--impacted").first()).toBeVisible();
    await page.locator('a:has-text("desktop")').first().click();
    await expect(
      page.getByRole("heading", { name: "Impact evidence" }),
    ).toBeVisible();
    await expect(page.getByText("notes.md", { exact: true })).toBeVisible();
  } finally {
    await removeFixture(impacted);
  }
});

test("approved impact mockups show the impacted group", async ({ page }) => {
  for (const viewport of ["mobile", "desktop"]) {
    const mockup = path.join(
      repositoryRoot,
      "examples/basic/generated/design/review/impact",
      `shared-impact.${viewport}.html`,
    );
    await page.goto(pathToFileURL(mockup).href);
    await expect(
      page.locator(".mbk-chg-grouphead", { hasText: "Impacted" }).first(),
    ).toBeVisible();
    expect(await page.locator(".mbk-chg-dot.impacted").count()).toBeGreaterThan(
      0,
    );
    await expect(
      page.getByText(/2 impacted against origin\/main/),
    ).toBeVisible();
  }
});

test("compare pages switch modes and viewports", async ({ page }) => {
  await page.goto(pathToFileURL(path.join(outDir, "index.html")).href);
  await page.locator('a:has-text("desktop")').first().click();
  await expect(page.locator(".mb-panes")).toHaveAttribute(
    "data-compare-mode",
    "side",
  );
  await expect(page.locator(".mb-pane--before iframe")).toHaveAttribute(
    "sandbox",
    "",
  );
  await page.click('[data-mode="overlay"]');
  await expect(page.locator(".mb-panes")).toHaveAttribute(
    "data-compare-mode",
    "overlay",
  );
  await page.click('[data-mode="difference"]');
  await expect(page.locator(".mb-panes")).toHaveAttribute(
    "data-compare-mode",
    "difference",
  );
  await page.click('a.mb-viewswitch-option:has-text("Mobile")');
  await expect(
    page.locator('span.mb-viewswitch-option[aria-current="page"]'),
  ).toHaveText("Mobile");
});
