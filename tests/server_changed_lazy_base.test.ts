import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { readManifest } from "../dist/registry/manifest.js";
import {
  FileSystemReviewAssetReader,
  GitReviewAssetReader,
} from "../dist/review/assets.js";
import {
  NodeGitCommandRunner,
  RepositoryGitClient,
} from "../dist/review/git.js";
import { classifyChangedContent } from "../dist/server/changed_content.js";
import { ChangedResourceGraph } from "../dist/server/changed_resources.js";
import { cssAttributionFixture } from "./helpers/css_attribution_fixture.js";

for (const resource of ["image.svg", "unused.css", "shared.css"])
  test(`live ${resource} changes read base documents only for CSS consumers`, async (t) => {
    const fixture = await cssAttributionFixture(t, false, {
      prepare: async ({ configPath }) => {
        await fs.writeFile(
          configPath,
          (await fs.readFile(configPath, "utf8")).replace(
            'match: "**/*.html"',
            'match: "screens/home.html"',
          ),
        );
      },
    });
    await fixture.append("\n.auth { color: blue; }", resource);
    const reads: string[] = [];
    class ObservedGit extends RepositoryGitClient {
      override async readFiles(commit: string, paths: readonly string[]) {
        reads.push(...paths);
        return super.readFiles(commit, paths);
      }
    }
    const git = new ObservedGit(new NodeGitCommandRunner(fixture.root));
    const manifest = readManifest(fixture.config);
    await classifyChangedContent(
      manifest,
      manifest,
      fixture.config,
      git,
      await git.mergeBase("main", "HEAD"),
      [`mockups/${resource}`],
    );
    const documents = reads.filter((route) => route.endsWith(".html"));
    assert.deepEqual(
      documents.sort(),
      resource === "shared.css"
        ? [
            "mockups/screens/home.desktop.dark.html",
            "mockups/screens/home.desktop.html",
            "mockups/screens/home.mobile.dark.html",
            "mockups/screens/home.mobile.html",
          ]
        : [],
    );
    if (resource !== "shared.css") assert.deepEqual(reads, []);
  });

test("non-CSS evidence does not traverse a supplied base resource graph", async (t) => {
  const fixture = await cssAttributionFixture(t, false);
  const document = await fs.readFile(
    path.join(fixture.mockupsDir, "screens/home.mobile.html"),
    "utf8",
  );
  const graph = new ChangedResourceGraph(
    new FileSystemReviewAssetReader(fixture.config),
    {
      read: async () => {
        throw new Error("Unexpected base graph traversal");
      },
    },
    new Set(["image.svg"]),
    new Map(),
  );
  assert.deepEqual(
    await graph.compare("screens/home.mobile.html", document, {
      path: "screens/home.mobile.html",
      html: document,
    }),
    {
      reasons: [{ kind: "dependency", path: "image.svg" }],
    },
  );
});

test("deleted stylesheet resources still retain their consumers", async (t) => {
  const fixture = await cssAttributionFixture(t, false);
  await fs.unlink(path.join(fixture.mockupsDir, "shared.css"));
  const manifest = readManifest(fixture.config);
  const git = new RepositoryGitClient(new NodeGitCommandRunner(fixture.root));
  const result = await classifyChangedContent(
    manifest,
    manifest,
    fixture.config,
    git,
    await git.mergeBase("main", "HEAD"),
    ["mockups/shared.css"],
  );
  assert.ok(result.changedPaths.includes("mockups/screens/home.mobile.html"));
  assert.equal(
    result.screens[0]?.views[0]?.reasons?.[0]?.analysis?.status,
    "unresolved",
  );
});

test("moved documents retain changed stylesheets reachable only from their base route", async (t) => {
  const fixture = await cssAttributionFixture(t, false, {
    prepare: async ({ mockupsDir }) => {
      for (const directory of ["old", "new"]) {
        await fs.mkdir(path.join(mockupsDir, directory));
        await fs.writeFile(
          path.join(mockupsDir, directory, "theme.css"),
          ".auth { color: red; }",
        );
      }
    },
  });
  await fixture.append(".auth { padding: 2px; }", "old/theme.css");
  const git = new RepositoryGitClient(new NodeGitCommandRunner(fixture.root));
  const graph = new ChangedResourceGraph(
    new FileSystemReviewAssetReader(fixture.config),
    new GitReviewAssetReader(
      fixture.config,
      git,
      await git.mergeBase("main", "HEAD"),
      "mockups",
    ),
    new Set(["old/theme.css"]),
    new Map(),
  );
  const document =
    '<!doctype html><link rel="stylesheet" href="theme.css"><p class="auth">Sign in</p>';
  const result = await graph.compare("new/view.html", document, {
    path: "old/view.html",
    html: document,
  });
  assert.equal(result.reasons?.[0]?.path, "old/theme.css");
  assert.equal(result.reasons?.[0]?.analysis?.status, "matched");
});
