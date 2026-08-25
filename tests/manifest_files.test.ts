import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { checkCompilation } from "../dist/build/check.js";
import { compileCatalogue } from "../dist/build/compile.js";
import { pendingGeneratedOrphanRoutes } from "../dist/build/ownership.js";
import { writeCompilation } from "../dist/build/transaction.js";
import { loadConfig } from "../dist/config/load.js";
import type { ResolvedConfig } from "../dist/config/types.js";
import {
  createManifest,
  MANIFEST_NAME,
  parseManifest,
  readManifest,
  serializeManifest,
} from "../dist/registry/manifest.js";
import type { ResolvedRegistryEntry } from "../dist/authoring/types.js";
import { createFixture, removeFixture } from "./helpers/fixture.js";

test("filesystem manifest loading falls back to the legacy v2 filename", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = withV2Compatibility(await loadConfig(fixture.root));
  const legacy = toV2Manifest((await compileCatalogue(config)).manifest);
  await fs.promises.writeFile(
    path.join(fixture.mockupsDir, "mockbook-manifest.json"),
    JSON.stringify(legacy),
  );

  assert.equal(readManifest(config).schemaVersion, 3);
});

test("filesystem manifest loading never accepts v2 under the canonical filename", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = withV2Compatibility(await loadConfig(fixture.root));
  const legacy = toV2Manifest((await compileCatalogue(config)).manifest);
  await fs.promises.writeFile(
    path.join(fixture.mockupsDir, MANIFEST_NAME),
    JSON.stringify(legacy),
  );
  await fs.promises.writeFile(
    path.join(fixture.mockupsDir, "mockbook-manifest.json"),
    JSON.stringify(legacy),
  );

  assert.throws(() => readManifest(config), /schema version 3/);
});

test("manifest loading rejects URL-sensitive catalogue routes", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const manifest = structuredClone((await compileCatalogue(config)).manifest);
  const screen = manifest.entries.find((entry) => entry.kind === "screen");
  if (!screen || screen.kind !== "screen") throw new Error("screen missing");
  screen.route = "screens/home?alternate.html";

  assert.throws(() => parseManifest(manifest), /unsafe route/);
});

test("manifest validates darkFragments names and collisions", () => {
  const manifest = manifestWithScreen("a", "a.html");
  const screen = manifest.entries[0];
  if (!screen || screen.kind !== "screen") throw new Error("screen missing");
  screen.darkFragments = {
    desktop: "a.desktop.dark.html",
    mobile: "a.mobile.dark.html",
  };
  assert.doesNotThrow(() => parseManifest(manifest));

  const wrongName = structuredClone(manifest);
  const wrongScreen = wrongName.entries[0];
  if (!wrongScreen || wrongScreen.kind !== "screen") {
    throw new Error("screen missing");
  }
  wrongScreen.darkFragments = {
    desktop: "a.desktop.dark.html",
    mobile: "wrong.mobile.dark.html",
  };
  assert.throws(
    () => parseManifest(wrongName),
    /has invalid or colliding mobile dark fragment/,
  );

  const collision = {
    ...structuredClone(manifest),
    entries: [
      ...manifest.entries,
      manifestWithScreen("b", "a.mobile.dark.html").entries[0]!,
    ],
  };
  assert.throws(
    () => parseManifest(collision),
    /has invalid or colliding mobile dark fragment/,
  );

  const invalidShape = structuredClone(manifest);
  Object.assign(invalidShape.entries[0]!, { darkFragments: [] });
  assert.throws(() => parseManifest(invalidShape), /invalid darkFragments/);
});

test("light-only manifests stay byte-identical", () => {
  const entry = resolvedScreen();
  const expected = serializeManifest({
    entries: [
      {
        dependencies: ["entries/a.mockup.tsx"],
        description: "A screen",
        id: "a",
        kind: "screen",
        navPath: [],
        relatedDocs: [],
        sourcePath: "entries/a.mockup.tsx",
        title: "A",
        fragments: {
          desktop: "a.desktop.html",
          mobile: "a.mobile.html",
        },
        route: "a.html",
        useCaseIds: [],
        viewports: ["mobile", "desktop"],
      },
    ],
    generatedBy: "mokabook",
    legacyPages: [],
    schemaVersion: 3,
  });

  const serialized = serializeManifest(createManifest([entry], [], ["light"]));
  assert.equal(serialized, expected);
  assert.equal(serialized.includes("darkFragments"), false);
});

test("disabling dark orphans committed dark fragments", async (context) => {
  const fixture = await createFixture(undefined, {
    extraConfig: 'colorSchemes: ["light", "dark"],',
  });
  context.after(() => removeFixture(fixture));
  const darkConfig = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(darkConfig), darkConfig);

  await fs.promises.writeFile(
    fixture.configPath,
    'export default { entriesDir: "entries", mockupsDir: "mockups", repoRoot: "." };\n',
  );
  const lightConfig = await loadConfig(fixture.root);
  const lightCompilation = await compileCatalogue(lightConfig);
  const orphans = pendingGeneratedOrphanRoutes(
    lightConfig,
    lightCompilation.outputs.keys(),
  );
  assert.deepEqual(orphans, [
    "screens/details.desktop.dark.html",
    "screens/details.mobile.dark.html",
    "screens/home.desktop.dark.html",
    "screens/home.mobile.dark.html",
  ]);
  assert.throws(
    () => checkCompilation(lightCompilation, lightConfig),
    /orphan generated files[\s\S]*\.dark\.html/,
  );

  await writeCompilation(lightCompilation, lightConfig);
  for (const route of orphans) {
    assert.equal(fs.existsSync(path.join(fixture.mockupsDir, route)), false);
  }
});

function withV2Compatibility(config: ResolvedConfig): ResolvedConfig {
  return { ...config, compatibility: { readManifestV2: true } };
}

function toV2Manifest(manifest: unknown): Record<string, unknown> {
  const legacy: Record<string, unknown> = {
    ...(manifest as Record<string, unknown>),
    schemaVersion: 2,
  };
  delete legacy.generatedBy;
  return legacy;
}

function manifestWithScreen(id: string, route: string) {
  return createManifest([resolvedScreen(id, route)], [], ["light"]);
}

function resolvedScreen(id = "a", route = "a.html"): ResolvedRegistryEntry {
  return {
    __viaDefine: true,
    dependencies: [],
    description: "A screen",
    desktop: null,
    id,
    kind: "screen",
    mobile: null,
    relatedDocs: [],
    route,
    sourcePath: `/repo/entries/${id}.mockup.tsx`,
    sourceRelativePath: `entries/${id}.mockup.tsx`,
    title: id.toUpperCase(),
    useCaseIds: [],
  };
}
