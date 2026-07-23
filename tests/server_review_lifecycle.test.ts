import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { compileCatalogue } from "../dist/build/compile.js";
import { writeCompilation } from "../dist/build/transaction.js";
import { loadConfig } from "../dist/config/load.js";
import type { ResolvedConfig } from "../dist/config/types.js";
import { startCatalogueServer } from "../dist/server/http.js";
import type { ReviewGenerator } from "../dist/server/review_artifact.js";
import { createFixture, removeFixture } from "./helpers/fixture.js";

test("publishing an update invalidates the served Review artifact", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  const generator = new CountingReviewGenerator();
  const server = await startCatalogueServer(
    config,
    { base: "main", port: 0 },
    generator,
  );
  context.after(() => server.close());

  assert.match(
    await (await fetch(`${server.url}/review/index.html`)).text(),
    /Review generation 1/,
  );
  server.publishUpdate(2);
  assert.match(
    await (await fetch(`${server.url}/review/index.html`)).text(),
    /Review generation 2/,
  );
  assert.equal(generator.calls, 2);
});

test("stale Review comparisons return to the regenerated summary", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  const generator = new DisappearingComparisonGenerator();
  const server = await startCatalogueServer(
    config,
    { base: "main", port: 0 },
    generator,
  );
  context.after(() => server.close());
  const watchedPath = "/review/comparisons/watched/mobile/index.html";
  const refreshedPath = "/review/comparisons/refreshed/mobile/index.html";

  const watched = await fetch(`${server.url}${watchedPath}`);
  assert.equal(watched.status, 200);
  const watchedBody = await watched.text();
  assert.equal((await fetch(`${server.url}${refreshedPath}`)).status, 200);

  server.publishUpdate(2);
  const afterUpdate = await fetch(`${server.url}${watchedPath}`, {
    redirect: "manual",
  });
  assert.equal(afterUpdate.status, 302);
  assert.equal(afterUpdate.headers.get("location"), "/review/index.html");
  assert.equal(generator.calls, 2);

  const afterRefresh = await fetch(`${server.url}${refreshedPath}?refresh=1`, {
    redirect: "manual",
  });
  assert.equal(afterRefresh.status, 302);
  assert.equal(afterRefresh.headers.get("location"), "/review/index.html");
  assert.equal(generator.calls, 3);
  assert.match(
    watchedBody,
    /href="\/review\/index\.html\?refresh=1">Refresh comparison<\/a>/,
  );
});

test("server close aborts and drains in-flight Review generation", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  const generator = new BlockingReviewGenerator();
  const server = await startCatalogueServer(
    config,
    { base: "main", port: 0 },
    generator,
  );
  context.after(async () => {
    generator.release();
    await server.close().catch(() => undefined);
  });

  const request = fetch(`${server.url}/review/index.html`).catch(
    () => undefined,
  );
  await generator.started;
  const closing = server.close();
  const closedPromptly = await settlesWithin(closing, 250);
  if (!closedPromptly) generator.release();
  await closing;
  await request;

  assert.equal(closedPromptly, true);
  assert.equal(generator.aborted, true);
});

test("cached Review refuses a replacement directory at the same path", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  const server = await startCatalogueServer(
    config,
    { base: "main", port: 0 },
    new CountingReviewGenerator(),
  );
  context.after(() => server.close());
  assert.equal((await fetch(`${server.url}/review/index.html`)).status, 200);

  await fs.promises.rename(
    config.review.outDir,
    `${config.review.outDir}-original`,
  );
  await writeArtifact(config.review.outDir, "replacement content");
  const response = await fetch(`${server.url}/review/index.html`);

  assert.equal(response.status, 404);
  assert.doesNotMatch(await response.text(), /replacement content/);
});

test("cached Review refuses changes to a captured trusted page", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  const server = await startCatalogueServer(
    config,
    { base: "main", port: 0 },
    new CountingReviewGenerator(),
  );
  context.after(() => server.close());
  assert.equal((await fetch(`${server.url}/review/index.html`)).status, 200);

  await fs.promises.writeFile(
    path.join(config.review.outDir, "index.html"),
    "<!doctype html><script>globalThis.injected = true</script>",
  );
  const response = await fetch(`${server.url}/review/index.html`);

  assert.equal(response.status, 404);
  assert.doesNotMatch(await response.text(), /globalThis\.injected/);
});

test("cached Review refuses a changed ownership marker", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  const server = await startCatalogueServer(
    config,
    { base: "main", port: 0 },
    new CountingReviewGenerator(),
  );
  context.after(() => server.close());
  assert.equal((await fetch(`${server.url}/review/index.html`)).status, 200);

  await fs.promises.writeFile(
    path.join(config.review.outDir, ".mokabook-review-artifact"),
    "owned-by-someone-else\n",
  );
  const response = await fetch(`${server.url}/review/index.html`);

  assert.equal(response.status, 404);
});

test("cached Review refuses an output symlink moved outside the repository", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const outside = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "mokabook-review-outside-"),
  );
  context.after(() =>
    fs.promises.rm(outside, { force: true, recursive: true }),
  );
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  const server = await startCatalogueServer(
    config,
    { base: "main", port: 0 },
    new CountingReviewGenerator(),
  );
  context.after(() => server.close());
  assert.equal((await fetch(`${server.url}/review/index.html`)).status, 200);

  await writeArtifact(outside, "outside content");
  await fs.promises.rm(config.review.outDir, { force: true, recursive: true });
  await fs.promises.symlink(outside, config.review.outDir, "dir");
  const response = await fetch(`${server.url}/review/index.html`);

  assert.equal(response.status, 404);
  assert.doesNotMatch(await response.text(), /outside content/);
});

class CountingReviewGenerator implements ReviewGenerator {
  calls = 0;

  async generate(
    _config: ResolvedConfig,
    _baseRef: string,
    outDir: string,
    _signal: AbortSignal,
  ): Promise<void> {
    this.calls += 1;
    await writeArtifact(outDir, `Review generation ${this.calls}`);
  }
}

class DisappearingComparisonGenerator implements ReviewGenerator {
  calls = 0;

  async generate(
    _config: ResolvedConfig,
    _baseRef: string,
    outDir: string,
    _signal: AbortSignal,
  ): Promise<void> {
    this.calls += 1;
    await fs.promises.rm(outDir, { force: true, recursive: true });
    await writeArtifact(outDir, `Review generation ${this.calls}`);
    const comparisonIds =
      this.calls === 1
        ? ["watched", "refreshed"]
        : this.calls === 2
          ? ["refreshed"]
          : [];
    for (const id of comparisonIds) {
      const comparison = path.join(
        outDir,
        "comparisons",
        id,
        "mobile",
        "index.html",
      );
      await fs.promises.mkdir(path.dirname(comparison), { recursive: true });
      await fs.promises.writeFile(
        comparison,
        `<!doctype html><body><main class="mb-artifact-main">${id}</main></body>`,
      );
    }
  }
}

class BlockingReviewGenerator implements ReviewGenerator {
  aborted = false;
  readonly started: Promise<void>;
  private releaseGeneration: () => void = () => undefined;
  private signalStarted: () => void = () => undefined;

  constructor() {
    this.started = new Promise((resolve) => {
      this.signalStarted = resolve;
    });
  }

  async generate(
    _config: ResolvedConfig,
    _baseRef: string,
    outDir: string,
    signal: AbortSignal,
  ): Promise<void> {
    this.signalStarted();
    await new Promise<void>((resolve, reject) => {
      this.releaseGeneration = resolve;
      const abort = (): void => {
        this.aborted = true;
        reject(signal.reason);
      };
      if (signal.aborted) abort();
      else signal.addEventListener("abort", abort, { once: true });
    });
    await writeArtifact(outDir, "released generation");
  }

  release(): void {
    this.releaseGeneration();
  }
}

async function writeArtifact(outDir: string, body: string): Promise<void> {
  await fs.promises.mkdir(outDir, { recursive: true });
  await fs.promises.writeFile(
    path.join(outDir, ".mokabook-review-artifact"),
    "schemaVersion=1\n",
  );
  await fs.promises.writeFile(
    path.join(outDir, "index.html"),
    `<!doctype html><body><main class="mb-artifact-main">${body}</main></body>`,
  );
}

function settlesWithin(promise: Promise<void>, milliseconds: number) {
  return Promise.race([
    promise.then(() => true),
    new Promise<false>((resolve) => {
      setTimeout(() => resolve(false), milliseconds);
    }),
  ]);
}
