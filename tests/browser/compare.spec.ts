import { execFile } from "node:child_process";
import fs from "node:fs";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import { compileCatalogue } from "../../dist/build/compile.js";
import { writeCompilation } from "../../dist/build/transaction.js";
import { loadConfig } from "../../dist/config/load.js";
import { computeChangeContext } from "../../dist/server/changed.js";
import { startCatalogueServer } from "../../dist/server/http.js";
import {
  createFixture,
  removeFixture,
  validEntrySource,
  type TestFixture,
} from "../helpers/fixture.js";

const execFileAsync = promisify(execFile);

const compareButton = (mode: string): string =>
  `[data-mokabook-compareswitch] [data-compare-option="${mode}"]`;
const stage = "[data-mokabook-stage]";
const baseFrame = ".mbk-frame-mobile .mbk-frag--base";
const headFrame = ".mbk-frame-mobile iframe[data-fragment-base]";

let fixture: TestFixture;
let server: Awaited<ReturnType<typeof startCatalogueServer>>;

test.beforeAll(async () => {
  fixture = await createFixture();
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  await git(["init", "-q"]);
  await git(["config", "user.name", "Mokabook Test"]);
  await git(["config", "user.email", "mokabook@example.invalid"]);
  await git(["add", "."]);
  await git(["commit", "-qm", "test: base catalogue"]);

  await fs.promises.writeFile(
    fixture.entryPath,
    validEntrySource({
      body: `<p>Updated home copy</p><a href="mock:details">Details</a>`,
    }),
  );
  await writeCompilation(await compileCatalogue(config), config);
  const context = await computeChangeContext(config, "HEAD");
  if (!context) throw new Error("fixture change context did not resolve");
  server = await startCatalogueServer(config, {
    base: "HEAD",
    baseCommit: context.baseCommit,
    baseFragments: context.baseFragments,
    changedRoutes: context.changedRoutes,
    port: 0,
  });
});

test.afterAll(async () => {
  await server?.close();
  if (fixture) await removeFixture(fixture);
});

test("compare modes load base documents on demand", async ({ page }) => {
  const baseRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/__mokabook/base/"))
      baseRequests.push(request.url());
  });
  await page.goto(`${server.url}/view/screens/home.html`);
  await expect(page.locator(compareButton("current"))).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(stage)).toHaveAttribute("data-compare", "current");
  await expect(page.locator(".mbk-frag--base")).toHaveCount(0);
  await expect(page.frameLocator(headFrame).locator("body")).toContainText(
    "Updated home copy",
  );
  expect(baseRequests).toHaveLength(0);

  await page.click(compareButton("base"));
  await expect(page.locator(stage)).toHaveAttribute("data-compare", "base");
  await expect(page.locator(".mbk-frag--base")).toHaveCount(2);
  await expect(page.frameLocator(baseFrame).locator("body")).toContainText(
    "Details",
  );
  await expect(page.frameLocator(baseFrame).locator("body")).not.toContainText(
    "Updated home copy",
  );
  expect(baseRequests.length).toBeGreaterThan(0);

  await page.click(compareButton("overlay"));
  await expect(page.locator(stage)).toHaveAttribute("data-compare", "overlay");
  expect(
    await page
      .locator(headFrame)
      .evaluate((element) => getComputedStyle(element).opacity),
  ).toBe("0.5");

  await page.click(compareButton("difference"));
  await expect(page.locator(stage)).toHaveAttribute(
    "data-compare",
    "difference",
  );
  expect(
    await page
      .locator(headFrame)
      .evaluate((element) => getComputedStyle(element).mixBlendMode),
  ).toBe("difference");

  await page.click(compareButton("current"));
  await expect(page.locator(stage)).toHaveAttribute("data-compare", "current");
  await expect(page.locator(compareButton("current"))).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("a render missing at the branch point shows the placeholder", async ({
  page,
}) => {
  const darkConfigSource = `import { defineConfig } from "mokabook";
export default defineConfig({
  colorSchemes: ["light", "dark"],
  entriesDir: "entries",
  mockupsDir: "mockups",
  repoRoot: ".",
  changes: { sharedImpact: ["notes.md"] }
});
`;
  await fs.promises.writeFile(fixture.configPath, darkConfigSource);
  const darkConfig = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(darkConfig), darkConfig);
  const context = await computeChangeContext(darkConfig, "HEAD");
  if (!context) throw new Error("dark change context did not resolve");
  const darkServer = await startCatalogueServer(darkConfig, {
    base: "HEAD",
    baseCommit: context.baseCommit,
    baseFragments: context.baseFragments,
    changedRoutes: context.changedRoutes,
    port: 0,
  });
  try {
    await page.goto(`${darkServer.url}/view/screens/home.html`);
    await page.click(
      '.mbk-topbar [data-mokabook-schemeswitch] [data-color-scheme-option="dark"]',
    );
    await page.click(compareButton("base"));
    await expect(page.frameLocator(baseFrame).locator("body")).toContainText(
      "No base version",
    );
    expect(
      await page
        .locator(".mbk-frame-mobile iframe[data-fragment-base]")
        .evaluate((element) => getComputedStyle(element).opacity),
    ).toBe("0");
  } finally {
    await darkServer.close();
  }
});

async function git(arguments_: readonly string[]): Promise<void> {
  await execFileAsync("git", [...arguments_], { cwd: fixture.root });
}
