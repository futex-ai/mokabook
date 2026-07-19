import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { compileCatalogue } from "../dist/build/compile.js";
import { writeCompilation } from "../dist/build/transaction.js";
import { loadConfig } from "../dist/config/load.js";
import { compareReview } from "../dist/review/compare.js";
import {
  NodeGitCommandRunner,
  RepositoryGitClient,
} from "../dist/review/git.js";
import {
  normalizeReviewPair,
  normalizeSingleDocument,
} from "../dist/review/ignore.js";
import { runReview } from "../dist/review/run.js";
import { writeReviewArtifact } from "../dist/review/write.js";
import {
  createFixture,
  removeFixture,
  validEntrySource,
} from "./helpers/fixture.js";

const execFileAsync = promisify(execFile);

test("Review ignore normalizes paired regions and retains malformed content", () => {
  const base =
    "<main><!--mokabook-review-ignore:start:nav--><nav>A</nav><!--mokabook-review-ignore:end:nav--><p>Body</p></main>";
  const head =
    "<main><!--mokabook-review-ignore:start:nav--><nav>B</nav><!--mokabook-review-ignore:end:nav--><p>Body</p></main>";
  const pair = normalizeReviewPair(base, head, "screen.mobile.html");
  assert.equal(pair.base, pair.head);
  assert.deepEqual(pair.ignoredIds, ["nav"]);
  assert.equal(
    normalizeSingleDocument(base, "screen.mobile.html").includes(
      "<nav>A</nav>",
    ),
    true,
  );
  assert.throws(
    () =>
      normalizeReviewPair(
        base,
        head.replace("end:nav", "end:other"),
        "screen.mobile.html",
      ),
    /does not match/,
  );
});

test("Git failures keep typed operation context", async () => {
  const git = new RepositoryGitClient({
    run: async () => {
      throw new Error("not a repository");
    },
  });
  await assert.rejects(
    () => git.resolveRef("origin/main"),
    /resolve origin\/main.*not a repository/,
  );
});

test("Review classifies added, removed, and unchanged routes independently", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const compilation = await compileCatalogue(config);
  const detail = compilation.manifest.entries.find(
    (entry) => entry.kind === "screen" && entry.id === "details",
  );
  const home = compilation.manifest.entries.find(
    (entry) => entry.kind === "screen" && entry.id === "home",
  );
  assert.ok(detail?.kind === "screen" && home?.kind === "screen");
  const old = {
    ...home,
    fragments: {
      desktop: "screens/old.desktop.html",
      mobile: "screens/old.mobile.html",
    },
    id: "old-screen",
    route: "screens/old.html",
    title: "Old screen",
    useCaseIds: [],
  };
  const baseManifest = {
    entries: [{ ...detail, useCaseIds: [] }, old],
    generatedBy: "mokabook" as const,
    legacyPages: [],
    schemaVersion: 3 as const,
  };
  const gitFiles = new Map<string, string>([
    ["mockups/mokabook-manifest.json", `${JSON.stringify(baseManifest)}\n`],
    [
      "mockups/screens/details.mobile.html",
      compilation.outputs.get("screens/details.mobile.html") ?? "",
    ],
    [
      "mockups/screens/details.desktop.html",
      compilation.outputs.get("screens/details.desktop.html") ?? "",
    ],
    ["mockups/screens/old.mobile.html", "<html><body>Old mobile</body></html>"],
    [
      "mockups/screens/old.desktop.html",
      "<html><body>Old desktop</body></html>",
    ],
  ]);
  const artifact = await compareReview(
    compilation,
    config,
    {
      changedPaths: async () => [],
      readFile: async (_commit, repoPath) => {
        const content = gitFiles.get(repoPath);
        if (content === undefined)
          throw new Error(`missing fake Git path ${repoPath}`);
        return content;
      },
      resolveRef: async () => "a".repeat(40),
    },
    "HEAD",
  );
  assert.equal(
    artifact.result.screens.find((screen) => screen.id === "home")?.state,
    "added",
  );
  assert.equal(
    artifact.result.screens.find((screen) => screen.id === "old-screen")?.state,
    "removed",
  );
  assert.equal(
    artifact.result.screens.find((screen) => screen.id === "details")?.state,
    "unchanged",
  );
});

test("Review compares Git base without checkout and writes deterministic artifacts", async (context) => {
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
  await fs.promises.writeFile(
    path.join(fixture.root, "notes.md"),
    "# Updated fixture notes\n",
  );
  await writeCompilation(await compileCatalogue(config), config);
  const result = await runReview(
    config,
    "HEAD",
    config.review.outDir,
    new RepositoryGitClient(new NodeGitCommandRunner(fixture.root)),
  );
  assert.equal(
    result.screens.find((screen) => screen.route === "screens/home.html")
      ?.state,
    "changed",
  );
  assert.deepEqual(result.sharedImpact, ["notes.md"]);
  assert.ok(
    result.screens.every((screen) => screen.sharedImpact.includes("notes.md")),
  );
  const reviewJson = JSON.parse(
    await fs.promises.readFile(
      path.join(config.review.outDir, "review.json"),
      "utf8",
    ),
  ) as { baseCommit: string; schemaVersion: number };
  assert.equal(reviewJson.schemaVersion, 1);
  assert.match(reviewJson.baseCommit, /^[a-f0-9]{40}$/);
  assert.equal(
    fs.existsSync(path.join(config.review.outDir, "index.html")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(config.review.outDir, "summary.md")),
    true,
  );
});

test("Review writer will not replace an unowned directory or repository root", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const out = path.join(fixture.root, "existing");
  await fs.promises.mkdir(out);
  await fs.promises.writeFile(path.join(out, "keep.txt"), "keep\n");
  await assert.rejects(
    () =>
      writeReviewArtifact(new Map([["index.html", "safe"]]), out, fixture.root),
    /unowned Review directory/,
  );
  await assert.rejects(
    () =>
      writeReviewArtifact(
        new Map([["index.html", "safe"]]),
        fixture.root,
        fixture.root,
      ),
    /must be a subdirectory/,
  );
});

async function git(cwd: string, arguments_: readonly string[]): Promise<void> {
  await execFileAsync("git", [...arguments_], { cwd });
}
