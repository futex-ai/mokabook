import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { compileCatalogue } from "../dist/build/compile.js";
import { loadConfig } from "../dist/config/load.js";
import { compareReview } from "../dist/review/compare.js";
import { NodeGitCommandRunner } from "../dist/review/git.js";
import type { GitClient } from "../dist/review/git.js";
import { runReview } from "../dist/review/run.js";
import { writeReviewArtifact } from "../dist/review/write.js";
import { createFixture, removeFixture } from "./helpers/fixture.js";

test("catalogue compilation honors Review cancellation", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const controller = new AbortController();
  controller.abort(new Error("stop compilation"));

  await assert.rejects(
    compileCatalogue(config, controller.signal),
    /stop compilation/,
  );
});

test("comparison honors cancellation before Git work", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const compilation = await compileCatalogue(config);
  const controller = new AbortController();
  controller.abort(new Error("stop comparison"));

  await assert.rejects(
    compareReview(
      compilation,
      config,
      rejectingGitClient(),
      "HEAD",
      undefined,
      undefined,
      controller.signal,
    ),
    /stop comparison/,
  );
});

test("a pre-aborted Review stops before compilation or Git work", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const controller = new AbortController();
  controller.abort(new Error("stop Review"));

  await assert.rejects(
    runReview(
      config,
      "HEAD",
      config.review.outDir,
      undefined,
      undefined,
      controller.signal,
    ),
    /stop Review/,
  );
  assert.equal(fs.existsSync(config.review.outDir), false);
});

test("the Git subprocess runner cancels an active command", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const controller = new AbortController();
  const started = path.join(fixture.root, "subprocess-started");
  const runner = new NodeGitCommandRunner(
    fixture.root,
    controller.signal,
    process.execPath,
  );
  const running = runner.run([
    "-e",
    'require("node:fs").writeFileSync(process.argv[1], ""); setTimeout(() => {}, 30_000);',
    started,
  ]);
  await waitForPath(started);
  controller.abort();

  await assert.rejects(
    running,
    (error: unknown) => error instanceof Error && error.name === "AbortError",
  );
});

test("an aborted artifact transaction restores the last-good Review", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const marker = [".mokabook-review-artifact", "schemaVersion=1\n"] as const;
  await writeReviewArtifact(
    new Map([marker, ["index.html", "last good\n"]]),
    config.review.outDir,
    config,
  );
  const files = new Map<string, string>([
    marker,
    ["index.html", "replacement\n"],
  ]);
  for (let index = 0; index < 500; index += 1) {
    files.set(`assets/${String(index).padStart(3, "0")}.txt`, "asset\n");
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 0);

  await assert.rejects(
    writeReviewArtifact(files, config.review.outDir, config, controller.signal),
    /aborted/i,
  );
  assert.equal(
    await fs.promises.readFile(
      path.join(config.review.outDir, "index.html"),
      "utf8",
    ),
    "last good\n",
  );
  assert.equal(
    (await fs.promises.readdir(fixture.root)).some((entry) =>
      entry.startsWith(".mokabook-review-"),
    ),
    false,
  );
});

function rejectingGitClient(): GitClient {
  const reject = async (): Promise<never> => {
    throw new Error("Git must not run after cancellation");
  };
  return {
    changedPaths: reject,
    fileExists: reject,
    fileKind: reject,
    readFile: reject,
    readFileBytes: reject,
    resolveRef: reject,
  };
}

async function waitForPath(candidate: string): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(candidate)) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`timed out waiting for ${candidate}`);
}
