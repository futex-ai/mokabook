import { execFile, spawn, type ChildProcess } from "node:child_process";
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

/**
 * Two-screen catalogue where the first screen renders in both schemes and the
 * second opts out, so one comparison carries a scheme choice and one cannot.
 */
function darkEntrySource(
  options: { firstTitle?: string; secondTitle?: string } = {},
): string {
  const firstTitle = JSON.stringify(options.firstTitle ?? "Home");
  const secondTitle = JSON.stringify(options.secondTitle ?? "Details");
  return `import { defineCollection, defineScreen, defineUseCase } from "mokabook";
import React from "react";
const metadata = { dependencies: ["notes.md"], navPath: ["Fixture"], relatedDocs: ["notes.md"] };
export const mockups = [
  defineCollection({ ...metadata, childIds: ["home", "details"], description: "Fixture collection", id: "fixture", title: "Fixture" }),
  defineScreen({ ...metadata, description: "Home screen", desktop: <main id="home">Home</main>, id: "home", mobile: <main id="home-mobile">Home</main>, route: "screens/home.html", title: ${firstTitle}, useCaseIds: ["tour"] }),
  defineScreen({ ...metadata, colorSchemes: ["light"], description: "Detail screen", desktop: <main id="details">Detail</main>, id: "details", mobile: <main id="details-mobile">Detail</main>, route: "screens/details.html", title: ${secondTitle}, useCaseIds: ["tour"] }),
  defineUseCase({ ...metadata, description: "Fixture journey", id: "tour", route: "user-flows/tour.html", steps: [{ screenId: "home" }, { screenId: "details" }], title: "Tour" })
];
`;
}

/**
 * Resolve the served URL a spawned Mokabook server announces on startup. Both
 * pipes are drained for the process's whole life so a full pipe can never
 * block the child, and the startup timer and exit listener are released once
 * the URL arrives.
 */
function listeningUrl(child: ChildProcess): Promise<string> {
  child.stderr?.resume();
  return new Promise<string>((resolve, reject) => {
    let buffered = "";
    const finish = (settle: () => void): void => {
      clearTimeout(timer);
      child.off("exit", onExit);
      settle();
    };
    const onExit = (code: number | null): void => {
      finish(() =>
        reject(new Error(`serve exited early with ${code}: ${buffered}`)),
      );
    };
    const timer = setTimeout(
      () => finish(() => reject(new Error(`serve did not start: ${buffered}`))),
      30_000,
    );
    child.stdout?.on("data", (chunk: Buffer) => {
      buffered += chunk.toString();
      const url = buffered.match(
        /Mokabook listening at (http:\/\/[^\s]+)/,
      )?.[1];
      if (url) finish(() => resolve(url));
    });
    child.on("exit", onExit);
  });
}

/**
 * Stop a spawned server and resolve only after the process has exited. Serve
 * closes its HTTP server and Review artifacts asynchronously, so a teardown
 * that merely signals the child can leave it running with the worker holding
 * its stdio pipes; SIGKILL bounds a shutdown that stalls.
 */
async function stopServe(child: ChildProcess): Promise<void> {
  const exited = new Promise<void>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) resolve();
    else child.once("exit", () => resolve());
  });
  child.kill("SIGTERM");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<"expired">((resolve) => {
    timer = setTimeout(() => resolve("expired"), 5_000);
  });
  const outcome = await Promise.race([
    exited.then(() => "exited" as const),
    expired,
  ]);
  clearTimeout(timer);
  if (outcome === "expired") {
    child.kill("SIGKILL");
    await exited;
  }
  child.stdout?.destroy();
  child.stderr?.destroy();
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
  await expect(page.locator(".mbk-empty h2")).toHaveText("Mokabook review");
  await expect(page.locator(".mbk-basewatch")).toContainText("main");
  await expect(
    page.locator(".mbk-chg-grouphead", { hasText: "Changed" }).first(),
  ).toBeVisible();
  await expect(page.locator(".mbk-chg-dot.changed").first()).toBeVisible();
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
    await expect(
      page.locator(".mbk-chg-grouphead", { hasText: "Impacted" }).first(),
    ).toBeVisible();
    await expect(page.getByText("No visual changes")).toHaveCount(0);
    await expect(page.locator(".mbk-chg-dot.impacted").first()).toBeVisible();
    await page.locator(".mbk-chg-row").first().click();
    await expect(
      page.getByRole("heading", { name: "Impact evidence" }),
    ).toBeVisible();
    await expect(
      page.getByText("notes.md", { exact: true }).first(),
    ).toBeVisible();
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
  await page.locator(".mbk-chg-row").first().click();
  await expect(page.locator('.mbk-chg-row[aria-current="page"]')).toHaveCount(
    1,
  );
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
  await page.click('.mbk-seg a:has-text("Desktop")');
  await expect(page.locator('.mbk-seg span[aria-current="page"]')).toHaveText(
    "Desktop",
  );
});

test("narrow static review pages expose navigation and the index", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 420 });
  await page.goto(pathToFileURL(path.join(outDir, "index.html")).href);

  const menu = page.getByRole("button", {
    name: "Open changed screens navigation",
  });
  await expect(page.locator(".mbk-nav")).toBeHidden();
  await menu.click();
  await expect(page.locator(".mbk-nav")).toBeVisible();
  await expect(menu).toHaveAttribute("aria-expanded", "true");

  await page.locator(".mbk-chg-row").first().click();
  await expect(page.locator(".mbk-screen-head h2")).toHaveText("Home Revised");
  await expect(page.locator(".mbk-nav")).toBeHidden();
  await page
    .getByRole("button", {
      name: "Open changed screens navigation",
    })
    .click();
  await expect(page.locator(".mbk-nav")).toBeVisible();

  await page.getByRole("link", { exact: true, name: "Review" }).click();
  await expect(page.locator(".mbk-empty h2")).toHaveText("Mokabook review");
});

test.describe("served review of a dark-capable catalogue", () => {
  const homeRow = '[data-mokabook-review-route="screens/home.html"]';
  const detailsRow = '[data-mokabook-review-route="screens/details.html"]';
  const schemeSegment = '.mbk-cmp-toolbar [aria-label="Color scheme"]';
  const viewportSegment = '.mbk-cmp-toolbar [aria-label="Viewport"]';
  let served: TestFixture;
  let child: ChildProcess;
  let url: string;

  test.beforeAll(async () => {
    served = await createFixture(darkEntrySource(), {
      extraConfig: `colorSchemes: ["light", "dark"],`,
    });
    await run("node", [cli, "build", "--config", served.configPath]);
    await git(served.root, "init", "--initial-branch=main");
    await git(served.root, "config", "user.email", "fixture@example.test");
    await git(served.root, "config", "user.name", "Fixture");
    await git(served.root, "add", "-A");
    await git(served.root, "commit", "-m", "base");
    await fs.promises.writeFile(
      served.entryPath,
      darkEntrySource({
        firstTitle: "Home Revised",
        secondTitle: "Details Revised",
      }),
    );
    child = spawn(
      "node",
      [
        cli,
        "serve",
        "--config",
        served.configPath,
        "--base",
        "main",
        "--no-watch",
        "--port",
        "0",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    url = await listeningUrl(child);
  });

  test.afterAll(async () => {
    if (child) await stopServe(child);
    if (served) await removeFixture(served);
  });

  test("a served compare page switches between compared schemes", async ({
    page,
  }) => {
    await page.goto(`${url}/review`);
    await expect(page.locator(".mbk-empty h2")).toHaveText("Mokabook review");
    await page.click(homeRow);
    await expect(page.locator(".mbk-screen-head h2")).toHaveText(
      "Home Revised",
    );

    await expect(
      page.locator('.mbk-cmp-toolbar [aria-label="Comparison mode"]'),
    ).toBeVisible();
    await expect(page.locator(viewportSegment)).toBeVisible();
    const scheme = page.locator(schemeSegment);
    await expect(scheme).toBeVisible();
    await expect(scheme.locator('[aria-current="page"]')).toHaveText("Light");

    await scheme.getByRole("link", { name: "Dark" }).click();
    await expect(page).toHaveURL(/mobile\.dark\/index\.html$/);
    await expect(
      page.locator(`${schemeSegment} [aria-current="page"]`),
    ).toHaveText("Dark");
    await expect(
      page.locator(`${viewportSegment} [aria-current="page"]`),
    ).toHaveText("Mobile");
    await expect(page.locator(".mb-pane--after iframe")).toHaveAttribute(
      "src",
      /home\.mobile\.dark\.html$/,
    );
  });

  test("a light-only screen compares without a scheme choice", async ({
    page,
  }) => {
    await page.goto(`${url}/review`);
    await page.click(detailsRow);
    await expect(page.locator(".mbk-screen-head h2")).toHaveText(
      "Details Revised",
    );
    await expect(page.locator(viewportSegment)).toBeVisible();
    await expect(page.locator(schemeSegment)).toHaveCount(0);
  });

  test("a narrow compare band leads alone and trails as a pair", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto(`${url}/review`);
    await page
      .getByRole("button", { name: "Open changed screens navigation" })
      .click();
    await page.click(detailsRow);
    await expect(page.locator(".mbk-screen-head h2")).toHaveText(
      "Details Revised",
    );

    const band = await page.locator(".mbk-cmp-toolbar").boundingBox();
    const lone = await page.locator(viewportSegment).boundingBox();
    if (!band || !lone) throw new Error("the compare band has no layout");
    expect(lone.x - band.x).toBeLessThan(band.width / 2);

    await page.goto(`${url}/review`);
    await page
      .getByRole("button", { name: "Open changed screens navigation" })
      .click();
    await page.click(homeRow);
    await expect(page.locator(".mbk-screen-head h2")).toHaveText(
      "Home Revised",
    );
    const pairBand = await page.locator(".mbk-cmp-toolbar").boundingBox();
    const paired = await page.locator(viewportSegment).boundingBox();
    const scheme = await page.locator(schemeSegment).boundingBox();
    if (!pairBand || !paired || !scheme)
      throw new Error("the compare band has no layout");
    expect(paired.x - pairBand.x).toBeGreaterThan(lone.x - band.x);
    expect(scheme.x - (paired.x + paired.width)).toBeLessThan(24);
    expect(scheme.x + scheme.width).toBeGreaterThan(
      pairBand.x + pairBand.width - 24,
    );
  });
});
