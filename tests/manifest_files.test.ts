import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { compileCatalogue } from "../dist/build/compile.js";
import { loadConfig } from "../dist/config/load.js";
import type { ResolvedConfig } from "../dist/config/types.js";
import {
  MANIFEST_NAME,
  parseManifest,
  readManifest,
} from "../dist/registry/manifest.js";
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
