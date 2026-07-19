import assert from "node:assert/strict";
import test from "node:test";

import { compileCatalogue } from "../dist/build/compile.js";
import { writeCompilation } from "../dist/build/transaction.js";
import { run } from "../dist/cli/run.js";
import { loadConfig } from "../dist/config/load.js";
import { renderReviewArtifact } from "../dist/review/artifact.js";
import { compareReview } from "../dist/review/compare.js";
import { normalizeReviewPair } from "../dist/review/ignore.js";
import type { ReviewArtifact } from "../dist/review/types.js";
import { createFixture, removeFixture } from "./helpers/fixture.js";

test("CLI Review output cannot overlap generated or authored roots", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);

  for (const out of ["mockups/review", "entries/review"]) {
    await assert.rejects(
      () =>
        run(
          ["review", "--config", fixture.configPath, "--out", out],
          fixture.root,
        ),
      /must not overlap/,
    );
  }
});

test("Review artifact paths are collision-free for distinct valid routes", async (context) => {
  const fixture = await createFixture(collidingRouteSource());
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const compilation = await compileCatalogue(config);
  const baseManifest = JSON.stringify({
    entries: [],
    generatedBy: "mokabook",
    legacyPages: [],
    schemaVersion: 3,
  });
  const artifact = await compareReview(
    compilation,
    config,
    {
      changedPaths: async () => [],
      readFile: async (_commit, repoPath) => {
        if (repoPath.endsWith("mokabook-manifest.json")) return baseManifest;
        throw new Error(`unexpected Git path ${repoPath}`);
      },
      resolveRef: async () => "a".repeat(40),
    },
    "HEAD",
  );
  const afterPaths = artifact.result.screens.flatMap((screen) =>
    screen.viewports.flatMap((viewport) => viewport.afterPath ?? []),
  );

  assert.equal(afterPaths.length, 4);
  assert.equal(new Set(afterPaths).size, 4);
});

test("one-sided material-signal adoption compares real children", () => {
  const key = "a".repeat(64);
  const base = ignored("nav", "<nav>Same</nav>");
  const head = `${ignored("nav", "<nav>Same</nav>")}<!--mokabook-review-material:nav:${key}-->`;

  const normalized = normalizeReviewPair(base, head, "screens/home.html");

  assert.equal(normalized.base, normalized.head);
  assert.deepEqual(normalized.ignoredIds, []);
});

test("different material keys remain part of Review classification", () => {
  const base = `${ignored("nav", "<nav>Same</nav>")}<!--mokabook-review-material:nav:${"a".repeat(64)}-->`;
  const head = `${ignored("nav", "<nav>Same</nav>")}<!--mokabook-review-material:nav:${"b".repeat(64)}-->`;

  const normalized = normalizeReviewPair(base, head, "screens/home.html");

  assert.notEqual(normalized.base, normalized.head);
});

test("Review comparison panes are sandboxed without script permission", () => {
  const artifact: ReviewArtifact = {
    files: new Map([
      ["screens/screens/home/mobile/before.html", "<html></html>"],
      ["screens/screens/home/mobile/after.html", "<html></html>"],
    ]),
    result: {
      baseCommit: "a".repeat(40),
      baseRef: "HEAD",
      changedPaths: [],
      ignoredImpact: [],
      schemaVersion: 1,
      screens: [
        {
          dependencies: [],
          id: "home",
          route: "screens/home.html",
          sharedImpact: [],
          state: "changed",
          title: "Home",
          viewports: [
            {
              afterPath: "screens/screens/home/mobile/after.html",
              beforePath: "screens/screens/home/mobile/before.html",
              ignoredIds: [],
              state: "changed",
              viewport: "mobile",
            },
          ],
        },
      ],
      sharedImpact: [],
    },
  };
  const files = renderReviewArtifact(artifact);
  const comparison = [...files]
    .filter(([name]) => name.endsWith("/index.html"))
    .map(([, content]) => String(content))[0];

  assert.match(comparison ?? "", /<iframe[^>]+sandbox=""/);
  assert.doesNotMatch(comparison ?? "", /allow-scripts/);
});

function collidingRouteSource(): string {
  return `import { defineScreen } from "mokabook";
import React from "react";
const metadata = { dependencies: ["notes.md"], navPath: ["Fixture"], relatedDocs: ["notes.md"], useCaseIds: [] };
export const mockups = [
  defineScreen({ ...metadata, description: "Dot route", desktop: <main>Dot</main>, id: "dot-route", mobile: <main>Dot</main>, route: "screens/a.b.html", title: "Dot" }),
  defineScreen({ ...metadata, description: "Hyphen route", desktop: <main>Hyphen</main>, id: "hyphen-route", mobile: <main>Hyphen</main>, route: "screens/a-b.html", title: "Hyphen" })
];
`;
}

function ignored(id: string, content: string): string {
  return `<!--mokabook-review-ignore:start:${id}-->${content}<!--mokabook-review-ignore:end:${id}-->`;
}
