import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import type { Compilation } from "../dist/build/compile.js";
import { compileCatalogue } from "../dist/build/compile.js";
import { loadConfig } from "../dist/config/load.js";
import { compareReview } from "../dist/changes/compare.js";
import { RepositoryGitClient, type GitClient } from "../dist/changes/git.js";
import {
  normalizeReviewPair,
  normalizeSingleDocument,
} from "../dist/changes/ignore.js";
import type { ManifestScreen, ManifestV3 } from "../dist/registry/types.js";
import { createFixture, removeFixture } from "./helpers/fixture.js";

test("review ignore normalizes paired regions and retains malformed content", () => {
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
    () => git.mergeBase("origin/main", "HEAD"),
    /find merge base of origin\/main and HEAD.*not a repository/,
  );
});

test("comparison classifies added, removed, and unchanged routes", async (context) => {
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
  const result = await compareReview(
    compilation,
    config,
    fakeGit(gitFiles),
    "HEAD",
  );
  assert.equal(
    result.screens.find((screen) => screen.id === "home")?.state,
    "added",
  );
  assert.equal(
    result.screens.find((screen) => screen.id === "old-screen")?.state,
    "removed",
  );
  assert.equal(
    result.screens.find((screen) => screen.id === "details")?.state,
    "unchanged",
  );
});

test("dark views compare and classify against a pre-dark base", async (context) => {
  const fixture = await createFixture(undefined, {
    extraConfig: 'colorSchemes: ["light", "dark"],',
  });
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const rawCompilation = await compileCatalogue(config);
  const compilation = withHomeIgnoredRegions(rawCompilation, "after");
  const baseCompilation = withHomeIgnoredRegions(rawCompilation, "before");
  const baseManifest = withoutDarkFragments(baseCompilation.manifest);

  const result = await compareReview(
    compilation,
    config,
    fakeGit(filesForCompilation(baseManifest, baseCompilation)),
    "HEAD",
  );

  const home = result.screens.find((screen) => screen.id === "home");
  assert.ok(home);
  assert.deepEqual(
    home.views.map(({ colorScheme, ignoredIds, state, viewport }) => ({
      colorScheme,
      ignoredIds,
      state,
      viewport,
    })),
    [
      {
        colorScheme: "light",
        ignoredIds: ["nav"],
        state: "ignored-only",
        viewport: "mobile",
      },
      {
        colorScheme: "dark",
        ignoredIds: [],
        state: "added",
        viewport: "mobile",
      },
      {
        colorScheme: "light",
        ignoredIds: ["nav"],
        state: "ignored-only",
        viewport: "desktop",
      },
      {
        colorScheme: "dark",
        ignoredIds: [],
        state: "added",
        viewport: "desktop",
      },
    ],
  );
  assert.deepEqual(result.ignoredImpact, [
    { colorScheme: "light", count: 1, id: "nav", viewport: "mobile" },
    { colorScheme: "light", count: 1, id: "nav", viewport: "desktop" },
  ]);
});

test("removing dark classifies dark views removed", async (context) => {
  const fixture = await createFixture(undefined, {
    extraConfig: 'colorSchemes: ["light", "dark"],',
  });
  context.after(() => removeFixture(fixture));
  const darkConfig = await loadConfig(fixture.root);
  const darkCompilation = await compileCatalogue(darkConfig);
  await fs.promises.writeFile(
    fixture.configPath,
    `import { defineConfig } from "mokabook";
export default defineConfig({
  entriesDir: "entries",
  mockupsDir: "mockups",
  repoRoot: ".",
  changes: { sharedImpact: ["notes.md"] }
});
`,
  );
  const lightConfig = await loadConfig(fixture.root);
  const lightCompilation = await compileCatalogue(lightConfig);

  const result = await compareReview(
    lightCompilation,
    lightConfig,
    fakeGit(filesForCompilation(darkCompilation.manifest, darkCompilation)),
    "HEAD",
  );

  const home = result.screens.find((screen) => screen.id === "home");
  assert.ok(home);
  assert.deepEqual(
    home.views.map(({ colorScheme, state, viewport }) => ({
      colorScheme,
      state,
      viewport,
    })),
    [
      { colorScheme: "light", state: "unchanged", viewport: "mobile" },
      { colorScheme: "dark", state: "removed", viewport: "mobile" },
      { colorScheme: "light", state: "unchanged", viewport: "desktop" },
      { colorScheme: "dark", state: "removed", viewport: "desktop" },
    ],
  );
});

test("ignoredImpact sorts by viewport then scheme then id", async (context) => {
  const fixture = await createFixture(undefined, {
    extraConfig: 'colorSchemes: ["light", "dark"],',
  });
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const compilation = await compileCatalogue(config);
  const baseCompilation = withHomeIgnoredRegions(compilation, "before", [
    "z-nav",
    "a-nav",
  ]);
  const headCompilation = withHomeIgnoredRegions(compilation, "after", [
    "z-nav",
    "a-nav",
  ]);

  const result = await compareReview(
    headCompilation,
    config,
    fakeGit(filesForCompilation(baseCompilation.manifest, baseCompilation)),
    "HEAD",
  );

  assert.deepEqual(result.ignoredImpact, [
    { colorScheme: "light", count: 1, id: "a-nav", viewport: "mobile" },
    { colorScheme: "light", count: 1, id: "z-nav", viewport: "mobile" },
    { colorScheme: "dark", count: 1, id: "a-nav", viewport: "mobile" },
    { colorScheme: "dark", count: 1, id: "z-nav", viewport: "mobile" },
    { colorScheme: "light", count: 1, id: "a-nav", viewport: "desktop" },
    { colorScheme: "light", count: 1, id: "z-nav", viewport: "desktop" },
    { colorScheme: "dark", count: 1, id: "a-nav", viewport: "desktop" },
    { colorScheme: "dark", count: 1, id: "z-nav", viewport: "desktop" },
  ]);
});

function fakeGit(files: ReadonlyMap<string, string>): GitClient {
  return {
    changedPaths: async () => [],
    fileExists: async (_commit, repoPath) => files.has(repoPath),
    fileKind: async (_commit, repoPath) =>
      files.has(repoPath) ? "regular" : "missing",
    readFile: async (_commit, repoPath) => {
      const content = files.get(repoPath);
      if (content === undefined)
        throw new Error(`missing fake Git path ${repoPath}`);
      return content;
    },
    readFileBytes: async (_commit, repoPath) => {
      const content = files.get(repoPath);
      if (content === undefined)
        throw new Error(`missing fake Git path ${repoPath}`);
      return Buffer.from(content);
    },
    mergeBase: async () => "a".repeat(40),
  };
}

function filesForCompilation(
  manifest: ManifestV3,
  compilation: Compilation,
): Map<string, string> {
  const files = new Map<string, string>([
    ["mockups/mokabook-manifest.json", `${JSON.stringify(manifest)}\n`],
  ]);
  for (const [route, content] of compilation.outputs) {
    if (route === "mokabook-manifest.json") continue;
    files.set(`mockups/${route}`, content);
  }
  return files;
}

function withoutDarkFragments(manifest: ManifestV3): ManifestV3 {
  return {
    ...manifest,
    entries: manifest.entries.map((entry) => {
      if (entry.kind !== "screen") return entry;
      const { darkFragments: _darkFragments, ...screen } = entry;
      return screen as ManifestScreen;
    }),
  };
}

function withHomeIgnoredRegions(
  compilation: Compilation,
  label: string,
  ids: readonly string[] = ["nav"],
): Compilation {
  const home = compilation.manifest.entries.find(
    (entry): entry is ManifestScreen =>
      entry.kind === "screen" && entry.id === "home",
  );
  if (!home) throw new Error("missing home screen");
  const outputs = new Map(compilation.outputs);
  for (const fragment of screenFragments(home)) {
    const content = outputs.get(fragment);
    if (content === undefined) throw new Error(`missing output ${fragment}`);
    outputs.set(fragment, insertIgnoredRegions(content, label, ids));
  }
  return { ...compilation, outputs };
}

function screenFragments(screen: ManifestScreen): string[] {
  return [
    ...Object.values(screen.fragments),
    ...Object.values(screen.darkFragments ?? {}),
  ];
}

function insertIgnoredRegions(
  content: string,
  label: string,
  ids: readonly string[],
): string {
  const regions = ids
    .map(
      (id) =>
        `<!--mokabook-review-ignore:start:${id}-->` +
        `<span>${label}-${id}</span>` +
        `<!--mokabook-review-ignore:end:${id}-->`,
    )
    .join("");
  if (!content.includes("</main>")) throw new Error("missing main close tag");
  return content.replace("</main>", `${regions}</main>`);
}
