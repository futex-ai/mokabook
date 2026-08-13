import assert from "node:assert/strict";
import test from "node:test";

import { compileCatalogue } from "../dist/build/compile.js";
import { loadConfig } from "../dist/config/load.js";
import { compareReview } from "../dist/changes/compare.js";
import { RepositoryGitClient, type GitClient } from "../dist/changes/git.js";
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

test("comparison batches base viewport reads", async (context) => {
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
    mergeBase: async () => "a".repeat(40),
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
  assert.deepEqual(calls[0], [
    "ls-tree",
    "-zl",
    "--full-tree",
    "a".repeat(40),
    "--",
    ":(literal)mockups/linked.html",
    ":(literal)mockups/missing.html",
    ":(literal)mockups/regular.html",
  ]);
});

test("Git bounds tree metadata to exact pathspec batches", async () => {
  const paths = Array.from(
    { length: 600 },
    (_, index) =>
      `mockups/screens/screen-${String(index).padStart(4, "0")}.html`,
  );
  const calls: string[][] = [];
  const client = new RepositoryGitClient({
    run: async (arguments_) => {
      calls.push([...arguments_]);
      return "";
    },
    runBytesWithInput: async () => {
      throw new Error("missing files must not read blobs");
    },
  });

  const files = await client.readFiles("a".repeat(40), paths);

  assert.equal(files.size, paths.length);
  assert.ok(calls.length > 1);
  const pathspecs = calls.flatMap((arguments_) => {
    assert.equal(arguments_[0], "ls-tree");
    assert.equal(arguments_[1], "-zl");
    const separator = arguments_.indexOf("--");
    assert.notEqual(separator, -1);
    return arguments_.slice(separator + 1);
  });
  assert.deepEqual(
    pathspecs,
    paths.map((repoPath) => `:(literal)${repoPath}`),
  );
});

test("Git rejects a blob too large for a bounded batch", async () => {
  const objectId = "d".repeat(40);
  let contentReads = 0;
  const client = new RepositoryGitClient({
    run: async () =>
      `100644 blob ${objectId} ${48 * 1024 * 1024 + 1}\tmockups/huge.html\0`,
    runBytesWithInput: async () => {
      contentReads += 1;
      return Buffer.alloc(0);
    },
  });

  await assert.rejects(
    client.readFiles("a".repeat(40), ["mockups/huge.html"]),
    /too large.*bounded Git batch/i,
  );
  assert.equal(contentReads, 0);
});

test("Git bounds zero-byte blob batches by object count", async () => {
  const paths = Array.from(
    { length: 4_100 },
    (_, index) => `mockups/empty-${String(index).padStart(4, "0")}.html`,
  );
  const objects = new Map(
    paths.map((repoPath, index) => [
      repoPath,
      index.toString(16).padStart(40, "0"),
    ]),
  );
  const contentBatchSizes: number[] = [];
  const client = new RepositoryGitClient({
    run: async (arguments_) => {
      const separator = arguments_.indexOf("--");
      return arguments_
        .slice(separator + 1)
        .map((pathspec) => {
          const repoPath = pathspec.slice(":(literal)".length);
          return `100644 blob ${objects.get(repoPath)} 0\t${repoPath}\0`;
        })
        .join("");
    },
    runBytesWithInput: async (_arguments, input) => {
      const objectIds = Buffer.from(input).toString("utf8").trim().split("\n");
      contentBatchSizes.push(objectIds.length);
      return Buffer.concat(
        objectIds.map((objectId) =>
          Buffer.from(`${objectId} blob 0\n\n`, "utf8"),
        ),
      );
    },
  });

  const files = await client.readFiles("a".repeat(40), paths);

  assert.equal(files.size, paths.length);
  assert.ok(contentBatchSizes.length > 1);
  assert.ok(Math.max(...contentBatchSizes) < paths.length);
});

function requiredFile(
  files: ReadonlyMap<string, string>,
  route: string,
): string {
  const value = files.get(route);
  if (value === undefined) throw new Error(`missing fake Git path ${route}`);
  return value;
}
