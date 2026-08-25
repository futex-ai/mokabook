import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { compileCatalogue } from "../../dist/build/compile.js";
import { writeCompilation } from "../../dist/build/transaction.js";
import { loadConfig } from "../../dist/config/load.js";
import {
  startCatalogueServer,
  type RunningServer,
} from "../../dist/server/http.js";
import type { ServedReview } from "../../dist/server/review_routes.js";
import {
  createFixture,
  removeFixture,
  type TestFixture,
} from "../helpers/fixture.js";

let fixture: TestFixture;
let server: RunningServer;
let shouldFail = true;

test.beforeAll(async () => {
  fixture = await createFixture();
  const outDir = path.join(fixture.root, ".review");
  const review: ServedReview = {
    base: "origin/main",
    async generate(): Promise<void> {
      if (shouldFail) throw new Error("temporary comparison failure");
      await fs.promises.mkdir(outDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(outDir, "index.html"),
        '<!doctype html><html><body><h1>Recovered review</h1><script src="/__mokabook/client/browser.js" type="module"></script></body></html>',
      );
      await fs.promises.writeFile(
        path.join(outDir, ".mokabook-review-artifact"),
        "schemaVersion=1\n",
      );
    },
    outDir,
  };
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  server = await startCatalogueServer(config, {
    base: "origin/main",
    port: 0,
    review,
  });
});

test.afterAll(async () => {
  await server.close();
  await removeFixture(fixture);
});

test("a watched update recovers an open Review failure page", async ({
  page,
}) => {
  const eventStream = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/__mokabook/events" &&
      response.status() === 200,
  );
  const response = await page.goto(`${server.url}/review/index.html`);
  expect(response?.status()).toBe(500);
  await expect(
    page.locator('script[src="/__mokabook/client/browser.js"]'),
  ).toHaveCount(1);
  await eventStream;

  shouldFail = false;
  server.publishUpdate({ version: 2 });

  await expect(page.locator("h1")).toHaveText("Recovered review");
  await expect(page).toHaveURL(
    /\/review\/__generations\/[a-f0-9-]+\/index\.html$/,
  );
});
