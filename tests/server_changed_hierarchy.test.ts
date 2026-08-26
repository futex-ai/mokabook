import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { compileCatalogue } from "../dist/build/compile.js";
import { loadConfig } from "../dist/config/load.js";
import type { ManifestV3 } from "../dist/registry/types.js";
import { changedManifestRoutes } from "../dist/server/changed.js";
import {
  createFixture,
  removeFixture,
  reparentedEntrySource,
} from "./helpers/fixture.js";

test("collection reparenting marks the moved screen and use case", async (context) => {
  const fixture = await createFixture(reparentedEntrySource("screens"));
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const baseManifest = await compileManifest(config);
  await fs.promises.writeFile(
    fixture.entryPath,
    reparentedEntrySource("archive"),
  );
  const manifest = await compileManifest(config);
  makeNavPathsIdentical(manifest, baseManifest);

  assert.deepEqual(changedManifestRoutes(manifest, baseManifest, config, []), [
    "screens/home.html",
    "user-flows/tour.html",
  ]);
});

test("an ancestor title change marks its routed descendants", async (context) => {
  const fixture = await createFixture(reparentedEntrySource("screens"));
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const baseManifest = await compileManifest(config);
  await fs.promises.writeFile(
    fixture.entryPath,
    reparentedEntrySource("screens", { screensTitle: "Product screens" }),
  );
  const manifest = await compileManifest(config);
  makeNavPathsIdentical(manifest, baseManifest);

  assert.deepEqual(changedManifestRoutes(manifest, baseManifest, config, []), [
    "screens/details.html",
    "screens/home.html",
    "user-flows/tour.html",
  ]);
});

async function compileManifest(
  config: Awaited<ReturnType<typeof loadConfig>>,
): Promise<ManifestV3> {
  return (await compileCatalogue(config)).manifest;
}

function makeNavPathsIdentical(
  manifest: ManifestV3,
  baseManifest: ManifestV3,
): void {
  for (const entry of [...manifest.entries, ...baseManifest.entries]) {
    entry.navPath = ["Historical label"];
  }
}
