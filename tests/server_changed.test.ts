import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import test from "node:test";
import { promisify } from "node:util";

import { compileCatalogue } from "../dist/build/compile.js";
import { writeCompilation } from "../dist/build/transaction.js";
import { loadConfig } from "../dist/config/load.js";
import { compareReview } from "../dist/review/compare.js";
import {
  NodeGitCommandRunner,
  RepositoryGitClient,
  type GitClient,
} from "../dist/review/git.js";
import {
  changedManifestRoutes,
  computeChangedRoutes,
} from "../dist/server/changed.js";
import {
  createFixture,
  removeFixture,
  validEntrySource,
} from "./helpers/fixture.js";

const execFileAsync = promisify(execFile);

test("changed routes match source, dependency, and fragment paths", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const compilation = await compileCatalogue(config);
  await writeCompilation(compilation, config);
  assert.deepEqual(
    changedManifestRoutes(compilation.manifest, compilation.manifest, config, [
      "entries/fixture.mockup.tsx",
    ]),
    [],
  );
  assert.deepEqual(
    changedManifestRoutes(compilation.manifest, compilation.manifest, config, [
      "notes.md",
    ]),
    ["screens/details.html", "screens/home.html", "user-flows/tour.html"],
  );
  assert.deepEqual(
    changedManifestRoutes(compilation.manifest, compilation.manifest, config, [
      "mockups/screens/home.mobile.html",
    ]),
    ["screens/home.html", "user-flows/tour.html"],
  );
  assert.deepEqual(
    changedManifestRoutes(compilation.manifest, compilation.manifest, config, [
      "unrelated.txt",
    ]),
    [],
  );
});

test("manifest entry changes are attributed to their route", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const manifest = (await compileCatalogue(config)).manifest;
  const baseManifest = structuredClone(manifest);
  const baseHome = baseManifest.entries.find((entry) => entry.id === "home");
  if (!baseHome) throw new Error("fixture base home missing");
  baseHome.title = "Previous home";

  assert.deepEqual(
    changedManifestRoutes(manifest, baseManifest, config, [
      "entries/fixture.mockup.tsx",
      "mockups/mokabook-manifest.json",
    ]),
    ["screens/home.html", "user-flows/tour.html"],
  );
});

test("compatibility nav paths do not mark routes as changed", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const manifest = (await compileCatalogue(config)).manifest;
  const baseManifest = structuredClone(manifest);
  for (const entry of baseManifest.entries) {
    if (entry.kind !== "collection") entry.navPath = ["Historical label"];
  }

  assert.deepEqual(
    changedManifestRoutes(manifest, baseManifest, config, []),
    [],
  );
});

test("changed screens propagate to use cases authored separately", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const manifest = structuredClone((await compileCatalogue(config)).manifest);
  const home = manifest.entries.find((entry) => entry.id === "home");
  const tour = manifest.entries.find((entry) => entry.id === "tour");
  if (!home || home.kind !== "screen" || !tour || tour.kind !== "use-case") {
    throw new Error("fixture entries missing");
  }
  home.sourcePath = "entries/home.mockup.tsx";
  home.dependencies = [home.sourcePath];
  tour.sourcePath = "entries/tour.mockup.tsx";
  tour.dependencies = [tour.sourcePath];

  assert.deepEqual(
    changedManifestRoutes(manifest, manifest, config, [
      `mockups/${home.fragments.mobile}`,
    ]),
    ["screens/home.html", "user-flows/tour.html"],
  );
});

test("shared entry changes do not mark unchanged sibling screens", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const manifest = (await compileCatalogue(config)).manifest;
  const home = manifest.entries.find((entry) => entry.id === "home");
  if (!home || home.kind !== "screen") throw new Error("fixture home missing");

  assert.deepEqual(
    changedManifestRoutes(manifest, manifest, config, [
      home.sourcePath,
      `mockups/${home.fragments.mobile}`,
    ]),
    ["screens/home.html", "user-flows/tour.html"],
  );
});

test("branch comparisons exclude commits made only on the base branch", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  await git(fixture.root, ["init", "-q", "-b", "main"]);
  await git(fixture.root, ["config", "user.name", "Mokabook Test"]);
  await git(fixture.root, ["config", "user.email", "mokabook@example.invalid"]);
  await git(fixture.root, ["add", "."]);
  await git(fixture.root, ["commit", "-qm", "test: common catalogue"]);
  const commonCommit = (await git(fixture.root, ["rev-parse", "HEAD"])).trim();

  await git(fixture.root, ["checkout", "-qb", "feature"]);
  await fs.promises.writeFile(
    fixture.entryPath,
    validEntrySource({ body: "<p>Feature-only home</p>" }),
  );
  await writeCompilation(await compileCatalogue(config), config);
  await git(fixture.root, ["add", "."]);
  await git(fixture.root, ["commit", "-qm", "test: change feature home"]);

  await git(fixture.root, ["checkout", "-q", "main"]);
  await fs.promises.writeFile(
    fixture.entryPath,
    validEntrySource().replaceAll(">Detail<", ">Main-only detail<"),
  );
  await writeCompilation(await compileCatalogue(config), config);
  await git(fixture.root, ["add", "."]);
  await git(fixture.root, ["commit", "-qm", "test: change main details"]);
  await git(fixture.root, ["checkout", "-q", "feature"]);

  const client = new RepositoryGitClient(
    new NodeGitCommandRunner(fixture.root),
  );
  const changed = await computeChangedRoutes(config, "main", client);
  const review = await compareReview(
    await compileCatalogue(config),
    config,
    client,
    "main",
  );

  assert.deepEqual(changed, ["screens/home.html", "user-flows/tour.html"]);
  assert.equal(review.result.baseCommit, commonCommit);
  assert.equal(
    review.result.screens.find((screen) => screen.id === "details")?.state,
    "unchanged",
  );
});

test("changed routes match descendants of directory dependencies", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const manifest = structuredClone((await compileCatalogue(config)).manifest);
  const home = manifest.entries.find((entry) => entry.id === "home");
  if (!home) throw new Error("fixture home entry missing");
  home.dependencies = ["src/components"];

  assert.deepEqual(
    changedManifestRoutes(manifest, manifest, config, [
      "src/components/Button.tsx",
    ]),
    ["screens/home.html", "user-flows/tour.html"],
  );
});

test("changed routes require the config repo root to be the Git top level", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  assert.equal(await computeChangedRoutes(config, "HEAD"), undefined);
});

test("changed-route detection degrades to undefined when Git fails", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const compilation = await compileCatalogue(config);
  await writeCompilation(compilation, config);
  const failing: GitClient = {
    changedPaths: () => Promise.reject(new Error("no repository")),
    fileExists: () => Promise.reject(new Error("no repository")),
    fileKind: () => Promise.reject(new Error("no repository")),
    readFile: () => Promise.reject(new Error("no repository")),
    readFileBytes: () => Promise.reject(new Error("no repository")),
    mergeBase: () => Promise.reject(new Error("no repository")),
  };
  assert.equal(
    await computeChangedRoutes(config, "origin/main", failing),
    undefined,
  );
  const succeeding: GitClient = {
    ...failing,
    changedPaths: () => Promise.resolve(["notes.md"]),
    fileExists: () => Promise.resolve(true),
    readFile: () => Promise.resolve(JSON.stringify(compilation.manifest)),
    mergeBase: () => Promise.resolve("a".repeat(40)),
  };
  assert.deepEqual(
    await computeChangedRoutes(config, "origin/main", succeeding),
    ["screens/details.html", "screens/home.html", "user-flows/tour.html"],
  );
});

async function git(
  cwd: string,
  arguments_: readonly string[],
): Promise<string> {
  return (await execFileAsync("git", [...arguments_], { cwd })).stdout;
}
