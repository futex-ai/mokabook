import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { loadConfig } from "../dist/config/load.js";
import {
  isPublicStaticFile,
  listPublicStaticFiles,
  readPublicStaticFile,
} from "../dist/config/public_files.js";
import { createFixture, removeFixture } from "./helpers/fixture.js";

test("public file resolution rejects file and directory symlinks", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const assets = path.join(fixture.mockupsDir, "assets");
  const publicFile = path.join(assets, "public.txt");
  const linkedFile = path.join(fixture.mockupsDir, "linked.txt");
  const linkedDirectory = path.join(fixture.mockupsDir, "linked");
  await fs.promises.mkdir(assets);
  await fs.promises.writeFile(publicFile, "public\n");
  await fs.promises.symlink("assets/public.txt", linkedFile);
  await fs.promises.symlink("assets", linkedDirectory);
  const config = await loadConfig(fixture.root);

  assert.equal(isPublicStaticFile(publicFile, config), true);
  assert.equal(isPublicStaticFile(linkedFile, config), false);
  assert.equal(
    isPublicStaticFile(path.join(linkedDirectory, "public.txt"), config),
    false,
  );
  assert.equal(readPublicStaticFile(linkedFile, config), undefined);
  assert.deepEqual(
    listPublicStaticFiles(config).map((file) => file.route),
    ["assets/public.txt"],
  );
});
