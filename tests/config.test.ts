import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { discoverConfig, loadConfig } from "../dist/config/load.js";
import { validateRelativeRoute } from "../dist/config/paths.js";
import { createFixture, removeFixture } from "./helpers/fixture.js";

test("config discovery walks upward from nested workspace directories", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const nested = path.join(fixture.root, "packages", "app", "src");
  await fs.promises.mkdir(nested, { recursive: true });
  await fs.promises.writeFile(
    path.join(fixture.root, "package.json"),
    `${JSON.stringify({ private: true, workspaces: ["packages/*"] })}\n`,
  );
  assert.equal(discoverConfig(nested), fixture.configPath);
  const config = await loadConfig(nested);
  assert.equal(config.repoRoot, fixture.root);
  assert.equal(config.entriesDir, fixture.entriesDir);
});

test("route-like config values normalize to platform-independent POSIX paths", () => {
  assert.equal(
    validateRelativeRoute("screens\\home.html", "test route"),
    "screens/home.html",
  );
});

test("explicit config loading is independent of the executing package directory", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const unrelatedCwd = path.join(fixture.root, "npm-cache", "_npx", "hash");
  await fs.promises.mkdir(unrelatedCwd, { recursive: true });
  const config = await loadConfig(
    unrelatedCwd,
    path.relative(unrelatedCwd, fixture.configPath),
  );
  assert.equal(config.mockupsDir, fixture.mockupsDir);
});

test("missing config reports every attempted filename", () => {
  const root = path.join("/", "definitely-missing-mokabook-config");
  assert.throws(() => discoverConfig(root), /mokabook\.config\.ts/);
});

test("config rejects traversal and overlapping roots", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  await fs.promises.writeFile(
    fixture.configPath,
    `export default { entriesDir: "../outside", mockupsDir: "mockups", repoRoot: "." };\n`,
  );
  await assert.rejects(() => loadConfig(fixture.root), /outside repoRoot/);
  await fs.promises.writeFile(
    fixture.configPath,
    `export default { entriesDir: "mockups", mockupsDir: "mockups", repoRoot: "." };\n`,
  );
  await assert.rejects(
    () => loadConfig(fixture.root),
    /must not equal mockupsDir/,
  );
});
