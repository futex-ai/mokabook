import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { compileCatalogue } from "../dist/build/compile.js";
import { writeCompilation } from "../dist/build/transaction.js";
import { loadConfig } from "../dist/config/load.js";
import type { ResolvedConfig } from "../dist/config/types.js";
import { startCatalogueServer } from "../dist/server/http.js";
import type { ReviewGenerator } from "../dist/server/review_artifact.js";
import {
  createFixture,
  removeFixture,
  validEntrySource,
} from "./helpers/fixture.js";

const run = promisify(execFile);

test("served Review lazily generates and refreshes the full artifact", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  await git(fixture.root, "init", "--initial-branch=main");
  await git(fixture.root, "config", "user.email", "fixture@example.test");
  await git(fixture.root, "config", "user.name", "Fixture");
  await git(fixture.root, "add", "-A");
  await git(fixture.root, "commit", "-m", "base");
  await fs.promises.writeFile(
    fixture.entryPath,
    validEntrySource({ firstTitle: "Home Revised" }),
  );
  await writeCompilation(await compileCatalogue(config), config);

  const server = await startCatalogueServer(config, {
    base: "main",
    port: 0,
  });
  context.after(() => server.close());
  assert.equal(fs.existsSync(config.review.outDir), false);

  const redirect = await fetch(`${server.url}/review`, { redirect: "manual" });
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), "/review/index.html");
  assert.equal(fs.existsSync(config.review.outDir), false);

  const indexResponse = await fetch(`${server.url}/review/index.html`);
  assert.equal(indexResponse.status, 200);
  const index = await indexResponse.text();
  assert.match(index, /Mokabook review/);
  assert.match(index, /Changed<\/h2>/);
  assert.match(index, /href="\/">Browse<\/a>/);
  assert.match(index, /aria-current="page"[^>]*>Review<\/span>/);
  assert.match(index, /href="\?refresh=1">Refresh comparison<\/a>/);
  assert.match(index, /\/__mokabook\/client\/browser\.js/);
  assert.equal(
    fs.existsSync(path.join(config.review.outDir, ".mokabook-review-artifact")),
    true,
  );
  const snapshot = await fetch(
    `${server.url}/review/snapshots/after/screens/home.mobile.html`,
  );
  assert.equal(snapshot.status, 200);
  assert.equal(snapshot.headers.get("content-security-policy"), "sandbox");
  assert.equal(indexResponse.headers.get("content-security-policy"), null);

  const compareHref = index.match(
    /href="([^"]*comparisons\/[^"]+)"[^>]*>mobile<\/a>/,
  )?.[1];
  assert.ok(compareHref);
  const compareUrl = new URL(compareHref, `${server.url}/review/index.html`);
  const compare = await (await fetch(compareUrl)).text();
  assert.match(compare, /data-mode="side"/);
  assert.match(compare, /data-mode="overlay"/);
  assert.match(compare, /data-mode="difference"/);
  assert.match(compare, /<iframe class="mb-frag" sandbox=""/);

  const reviewJson = path.join(config.review.outDir, "review.json");
  await fs.promises.writeFile(reviewJson, "stale\n");
  assert.equal(
    await (await fetch(`${server.url}/review/review.json`)).text(),
    "stale\n",
  );
  const refreshed = await (
    await fetch(`${server.url}/review/review.json?refresh=1`)
  ).json();
  assert.equal(refreshed.baseRef, "main");

  const head = await fetch(compareUrl, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  assert.equal(
    (await fetch(`${server.url}/review/..%2Fmokabook.config.ts`)).status,
    400,
  );
  assert.equal(
    (await fetch(`${server.url}/review/..%5Cmokabook.config.ts`)).status,
    400,
  );
  await fs.promises.symlink(
    fixture.root,
    path.join(config.review.outDir, "outside"),
    "dir",
  );
  assert.equal(
    (await fetch(`${server.url}/review/outside/mokabook.config.ts`)).status,
    404,
  );
});

async function git(cwd: string, ...args: string[]): Promise<void> {
  await run("git", args, { cwd });
}

test("served Review coalesces first requests and refreshes once requested", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  const generator = new ControlledReviewGenerator();
  const server = await startCatalogueServer(
    config,
    { base: "main", port: 0 },
    generator,
  );
  context.after(() => server.close());

  const first = fetch(`${server.url}/review/index.html`);
  const second = fetch(`${server.url}/review/index.html`);
  await generator.started;
  assert.equal(generator.calls, 1);
  generator.release();
  assert.deepEqual(
    (await Promise.all([first, second])).map((response) => response.status),
    [200, 200],
  );
  assert.equal(generator.calls, 1);

  assert.equal(
    (await fetch(`${server.url}/review/index.html?refresh=1`)).status,
    200,
  );
  assert.equal(generator.calls, 2);
});

test("a Review generation failure leaves Browse available", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  const generator: ReviewGenerator = {
    async generate(): Promise<void> {
      throw new Error("synthetic generation failure");
    },
  };
  const server = await startCatalogueServer(
    config,
    { base: "main", port: 0 },
    generator,
  );
  context.after(() => server.close());

  const review = await fetch(`${server.url}/review/index.html`);
  assert.equal(review.status, 500);
  assert.match(await review.text(), /synthetic generation failure/);
  assert.equal((await fetch(server.url)).status, 200);
});

class ControlledReviewGenerator implements ReviewGenerator {
  calls = 0;
  readonly started: Promise<void>;
  private releaseGeneration: () => void = () => undefined;
  private signalStarted: () => void = () => undefined;
  private readonly waitForRelease: Promise<void>;

  constructor() {
    this.started = new Promise((resolve) => {
      this.signalStarted = resolve;
    });
    this.waitForRelease = new Promise((resolve) => {
      this.releaseGeneration = resolve;
    });
  }

  async generate(
    _config: ResolvedConfig,
    _baseRef: string,
    outDir: string,
    _signal: AbortSignal,
  ): Promise<void> {
    this.calls += 1;
    this.signalStarted();
    await this.waitForRelease;
    await fs.promises.rm(outDir, { force: true, recursive: true });
    await fs.promises.mkdir(outDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(outDir, ".mokabook-review-artifact"),
      "schemaVersion=1\n",
    );
    await fs.promises.writeFile(
      path.join(outDir, "index.html"),
      '<!doctype html><body><main class="mb-artifact-main">Review</main></body>',
    );
  }

  release(): void {
    this.releaseGeneration();
  }
}
