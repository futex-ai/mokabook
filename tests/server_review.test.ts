import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { compileCatalogue } from "../dist/build/compile.js";
import { writeCompilation } from "../dist/build/transaction.js";
import { loadConfig } from "../dist/config/load.js";
import { startCatalogueServer } from "../dist/server/http.js";
import type { ServedReview } from "../dist/server/review_routes.js";
import { serve } from "../dist/server/serve.js";
import {
  createFixture,
  removeFixture,
  validEntrySource,
  type TestFixture,
} from "./helpers/fixture.js";

const execFileAsync = promisify(execFile);

async function git(root: string, args: readonly string[]): Promise<void> {
  await execFileAsync("git", args, { cwd: root });
}

function countingReview(
  outDir: string,
): ServedReview & { generations: number } {
  return {
    base: "origin/main",
    async generate(): Promise<void> {
      this.generations += 1;
      await fs.promises.mkdir(outDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(outDir, "index.html"),
        `<h1>Generation ${this.generations}</h1>`,
      );
    },
    generations: 0,
    outDir,
  };
}

async function startedFixtureServer(
  fixture: TestFixture,
  review?: ServedReview,
) {
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  return startCatalogueServer(config, {
    base: "origin/main",
    port: 0,
    ...(review ? { review } : {}),
  });
}

test("served review generates lazily, recomputes on refresh, and stays safe", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const review = countingReview(path.join(fixture.root, ".review"));
  const server = await startedFixtureServer(fixture, review);
  context.after(() => server.close());

  const redirect = await fetch(`${server.url}/review`, { redirect: "manual" });
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), "/review/index.html");

  const first = await fetch(`${server.url}/review/index.html`);
  assert.equal(first.status, 200);
  assert.match(first.headers.get("content-type") ?? "", /text\/html/);
  assert.match(await first.text(), /Generation 1/);
  assert.match(
    await (await fetch(`${server.url}/review/index.html`)).text(),
    /Generation 1/,
  );
  assert.equal(review.generations, 1);

  const refreshed = await fetch(`${server.url}/review/index.html?refresh=1`);
  assert.match(await refreshed.text(), /Generation 2/);
  assert.equal(review.generations, 2);

  const head = await fetch(`${server.url}/review/index.html`, {
    method: "HEAD",
  });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");

  assert.equal(
    (await fetch(`${server.url}/review/%2e%2e/package.json`)).status,
    404,
  );
  assert.equal((await fetch(`${server.url}/review/missing.css`)).status, 404);
});

test("published updates invalidate the served review artifact", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const review = countingReview(path.join(fixture.root, ".review"));
  const server = await startedFixtureServer(fixture, review);
  context.after(() => server.close());

  assert.match(
    await (await fetch(`${server.url}/review/index.html`)).text(),
    /Generation 1/,
  );

  server.publishUpdate();

  const regenerated = await Promise.all([
    fetch(`${server.url}/review/index.html`).then((response) =>
      response.text(),
    ),
    fetch(`${server.url}/review/index.html`).then((response) =>
      response.text(),
    ),
  ]);
  for (const html of regenerated) assert.match(html, /Generation 2/);
  assert.equal(review.generations, 2);
});

test("a failed review generation answers a retryable page and then recovers", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const outDir = path.join(fixture.root, ".review");
  let shouldFail = true;
  const review: ServedReview = {
    base: "origin/main",
    async generate(): Promise<void> {
      if (shouldFail) throw new Error("base ref is unavailable");
      await fs.promises.mkdir(outDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(outDir, "index.html"),
        "<h1>Recovered</h1>",
      );
    },
    outDir,
  };
  const server = await startedFixtureServer(fixture, review);
  context.after(() => server.close());

  const failed = await fetch(`${server.url}/review/index.html`);
  assert.equal(failed.status, 500);
  const failedHtml = await failed.text();
  assert.match(failedHtml, /Review comparison failed/);
  assert.match(failedHtml, /Comparing this branch with <strong>origin\/main/);
  assert.match(failedHtml, /base ref is unavailable/);
  assert.match(failedHtml, /\/review\/index\.html\?refresh=1/);

  shouldFail = false;
  const recovered = await fetch(`${server.url}/review/index.html`);
  assert.equal(recovered.status, 200);
  assert.match(await recovered.text(), /Recovered/);
});

test("a server without a review provider keeps the launcher view", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const server = await startedFixtureServer(fixture);
  context.after(() => server.close());

  const launcher = await fetch(`${server.url}/review`);
  assert.equal(launcher.status, 200);
  assert.match(await launcher.text(), /mokabook review --base origin\/main/);
  assert.equal((await fetch(`${server.url}/review/index.html`)).status, 404);
});

test("no-watch serve exposes the Git comparison with compare pages", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  await git(fixture.root, ["init", "-q"]);
  await git(fixture.root, ["config", "user.name", "Mokabook Test"]);
  await git(fixture.root, ["config", "user.email", "mokabook@example.invalid"]);
  await git(fixture.root, ["add", "."]);
  await git(fixture.root, ["commit", "-qm", "test: base catalogue"]);
  await fs.promises.writeFile(
    fixture.entryPath,
    validEntrySource({ firstTitle: "Updated Home" }),
  );

  const running = await serve(config, { base: "HEAD", port: 0, watch: false });
  context.after(() => running.close());

  const index = await fetch(`${running.url}/review/index.html`);
  assert.equal(index.status, 200);
  const indexHtml = await index.text();
  assert.match(indexHtml, /Mokabook review/);
  assert.match(indexHtml, /Updated Home/);
  assert.match(indexHtml, /href="\/">Browse<\/a>/);
  assert.match(indexHtml, /Recompute the comparison/);
  const compareHref = indexHtml.match(/href="(comparisons\/[^"]+)"/)?.[1];
  assert.ok(compareHref);

  const compareUrl = `${running.url}/review/${compareHref}`;
  const compare = await fetch(compareUrl);
  assert.equal(compare.status, 200);
  const compareHtml = await compare.text();
  assert.match(compareHtml, /data-mode="side"/);
  assert.match(compareHtml, /data-mode="overlay"/);
  assert.match(compareHtml, /data-mode="difference"/);
  assert.match(compareHtml, /Before — HEAD/);
  assert.match(compareHtml, /After — this branch/);
  assert.match(compareHtml, /href="\/">Browse<\/a>/);
  assert.match(compareHtml, /\/__mokabook\/client\/browser\.js/);

  const paneSrc = compareHtml.match(/<iframe[^>]*src="([^"]+)"/)?.[1];
  assert.ok(paneSrc);
  const pane = await fetch(new URL(paneSrc, compareUrl));
  assert.equal(pane.status, 200);
  assert.match(await pane.text(), /Home/);
});
