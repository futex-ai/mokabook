import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
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

const execute = promisify(execFile);

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

test(
  "production Review shutdown cancels a blocked Git comparison",
  { timeout: 60_000 },
  async (context) => {
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
      validEntrySource({ firstTitle: "Changed" }),
    );
    await writeCompilation(await compileCatalogue(config), config);
    const wrapperDir = path.join(fixture.root, "git-wrapper");
    const calls = path.join(wrapperDir, "calls");
    const sentinel = path.join(wrapperDir, "diff-started");
    const wrapper = path.join(wrapperDir, "git");
    await fs.promises.mkdir(wrapperDir);
    await fs.promises.writeFile(
      wrapper,
      `#!/bin/sh\nprintf '%s\\n' "$1" >> ${shellQuote(calls)}\nif [ "$1" = "diff" ]; then\n  : > ${shellQuote(sentinel)}\n  exec /bin/sleep 30\nfi\nexec /usr/bin/git "$@"\n`,
    );
    await fs.promises.chmod(wrapper, 0o755);
    const originalPath = process.env.PATH;
    process.env.PATH = `${wrapperDir}${path.delimiter}${originalPath ?? ""}`;
    context.after(() => restorePath(originalPath));
    const server = await startCatalogueServer(config, {
      base: "main",
      port: 0,
    });
    context.after(() => server.close());

    const request = fetch(`${server.url}/review/index.html`).catch(
      () => undefined,
    );
    await waitForPath(sentinel, calls);
    const closing = server.close();

    assert.equal(await settlesWithin(closing, 1_000), true);
    await closing;
    await request;
    restorePath(originalPath);
  },
);

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

async function git(cwd: string, ...arguments_: string[]): Promise<void> {
  await execute("git", arguments_, { cwd });
}

async function waitForPath(candidate: string, calls: string): Promise<void> {
  const deadline = Date.now() + 50_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(candidate)) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  const observed = fs.existsSync(calls)
    ? await fs.promises.readFile(calls, "utf8")
    : "no Git calls";
  throw new Error(`timed out waiting for ${candidate}; observed ${observed}`);
}

function restorePath(original: string | undefined): void {
  if (original === undefined) delete process.env.PATH;
  else process.env.PATH = original;
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}
