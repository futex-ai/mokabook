import assert from "node:assert/strict";
import test from "node:test";

import { compileCatalogue } from "../dist/build/compile.js";
import { loadConfig } from "../dist/config/load.js";
import { renderReviewArtifact } from "../dist/review/artifact.js";
import { compareReview } from "../dist/review/compare.js";
import { RepositoryGitClient, type GitClient } from "../dist/review/git.js";
import { comparisonPagePath } from "../dist/review/paths.js";
import type { ReviewResult } from "../dist/review/types.js";
import type { ManifestScreen } from "../dist/registry/types.js";
import { createFixture, removeFixture } from "./helpers/fixture.js";

interface BatchCapableGitClient extends GitClient {
  readFiles(
    commit: string,
    repoRelativePaths: readonly string[],
  ): Promise<
    ReadonlyMap<
      string,
      { readonly bytes: Uint8Array; readonly kind: "regular" }
    >
  >;
}

test("Review batches base viewport reads", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const compilation = await compileCatalogue(config);
  const screens = compilation.manifest.entries.filter(
    (entry): entry is ManifestScreen => entry.kind === "screen",
  );
  const files = new Map<string, string>([
    ["mockups/mokabook-manifest.json", JSON.stringify(compilation.manifest)],
  ]);
  for (const screen of screens) {
    for (const fragment of Object.values(screen.fragments)) {
      files.set(`mockups/${fragment}`, compilation.outputs.get(fragment) ?? "");
    }
  }
  let batchReads = 0;
  let individualReads = 0;
  let batchedPathCount = 0;
  const git: BatchCapableGitClient = {
    changedPaths: async () => [],
    fileExists: async (_commit, repoPath) => files.has(repoPath),
    fileKind: async (_commit, repoPath) =>
      files.has(repoPath) ? "regular" : "missing",
    readFile: async (_commit, repoPath) => requiredFile(files, repoPath),
    readFileBytes: async (_commit, repoPath) => {
      individualReads += 1;
      return Buffer.from(requiredFile(files, repoPath));
    },
    readFiles: async (_commit, repoRelativePaths) => {
      batchReads += 1;
      batchedPathCount += repoRelativePaths.length;
      return new Map(
        repoRelativePaths.map((repoPath) => [
          repoPath,
          {
            bytes: Buffer.from(requiredFile(files, repoPath)),
            kind: "regular" as const,
          },
        ]),
      );
    },
    resolveRef: async () => "a".repeat(40),
  };

  await compareReview(compilation, config, git, "HEAD");

  assert.equal(batchReads, 1);
  assert.equal(batchedPathCount, screens.length * 2);
  assert.equal(individualReads, 0);
});

test("Git reads regular base files through two batch commands", async () => {
  const regularObject = "b".repeat(40);
  const symlinkObject = "c".repeat(40);
  const regularContent = Buffer.from("content");
  const calls: string[][] = [];
  const client = new RepositoryGitClient({
    run: async (arguments_) => {
      calls.push([...arguments_]);
      return [
        `100644 blob ${regularObject} 7\tmockups/regular.html`,
        `120000 blob ${symlinkObject} 6\tmockups/linked.html`,
        "",
      ].join("\0");
    },
    runBytesWithInput: async (arguments_, input) => {
      calls.push([...arguments_]);
      assert.equal(Buffer.from(input).toString("utf8"), `${regularObject}\n`);
      return Buffer.concat([
        Buffer.from(`${regularObject} blob 7\n`),
        regularContent,
        Buffer.from("\n"),
      ]);
    },
  });

  const files = await client.readFiles("a".repeat(40), [
    "mockups/regular.html",
    "mockups/linked.html",
    "mockups/missing.html",
  ]);

  assert.deepEqual(files.get("mockups/regular.html"), {
    bytes: regularContent,
    kind: "regular",
  });
  assert.deepEqual(files.get("mockups/linked.html"), { kind: "symlink" });
  assert.deepEqual(files.get("mockups/missing.html"), { kind: "missing" });
  assert.deepEqual(
    calls.map(([command]) => command),
    ["ls-tree", "cat-file"],
  );
});

test("Review comparison pages share large navigation markup", () => {
  const screens = Array.from({ length: 40 }, (_, index) => ({
    dependencies: [],
    id: `screen-${index}`,
    route: `screens/screen-${index}.html`,
    sharedImpact: [],
    state: "changed" as const,
    title: `Screen ${index}`,
    viewports: [
      {
        ignoredIds: [],
        state: "changed" as const,
        viewport: "mobile" as const,
      },
    ],
  }));
  const result: ReviewResult = {
    baseCommit: "a".repeat(40),
    baseRef: "origin/main",
    changedPaths: [],
    ignoredImpact: [],
    schemaVersion: 1,
    screens,
    sharedImpact: [],
  };

  const files = renderReviewArtifact({ files: new Map(), result });
  const comparison = files.get(
    comparisonPagePath(screens[0]?.route ?? "", "mobile"),
  );
  const navigation = files.get("review-navigation.js");

  assert.ok(typeof comparison === "string");
  assert.ok(typeof navigation === "string");
  assert.match(comparison, /review-navigation\.js/);
  assert.match(comparison, /Open Review index/);
  assert.doesNotMatch(comparison, /Screen 39/);
  assert.match(navigation, /Screen 39/);
});

function requiredFile(
  files: ReadonlyMap<string, string>,
  route: string,
): string {
  const value = files.get(route);
  if (value === undefined) throw new Error(`missing fake Git path ${route}`);
  return value;
}
