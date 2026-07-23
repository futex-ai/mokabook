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

test("config rejects an output root symlink outside repoRoot", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const outside = `${fixture.root}-outside-output`;
  context.after(() =>
    fs.promises.rm(outside, { force: true, recursive: true }),
  );
  await fs.promises.mkdir(outside);
  await fs.promises.rm(fixture.mockupsDir, { recursive: true });
  await fs.promises.symlink(outside, fixture.mockupsDir);

  await assert.rejects(
    () => loadConfig(fixture.root),
    /mockupsDir resolves outside repoRoot through a symlink/,
  );
});

test("config rejects Review output through an external symlink", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const outside = `${fixture.root}-outside-review`;
  context.after(() =>
    fs.promises.rm(outside, { force: true, recursive: true }),
  );
  await fs.promises.mkdir(outside);
  await fs.promises.symlink(outside, path.join(fixture.root, "review-link"));
  await fs.promises.writeFile(
    fixture.configPath,
    'export default { entriesDir: "entries", mockupsDir: "mockups", repoRoot: ".", review: { outDir: "review-link/artifact" } };\n',
  );

  await assert.rejects(
    () => loadConfig(fixture.root),
    /review.outDir resolves outside repoRoot through a symlink/,
  );
});

test("config rejects ambiguous trusted template variables", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const invalidRules = [
    {
      expected: /must contain valid variable names/,
      rules: [{ match: "emails/reset.html", variables: ["{{reset_url}}"] }],
    },
    {
      expected: /must not contain duplicates/,
      rules: [
        { match: "emails/reset.html", variables: ["reset_url", "reset_url"] },
      ],
    },
    {
      expected: /duplicate trusted template-variable match/,
      rules: [
        { match: "emails/reset.html", variables: ["reset_url"] },
        { match: "emails/reset.html", variables: ["verify_url"] },
      ],
    },
  ];

  for (const { expected, rules } of invalidRules) {
    await fs.promises.writeFile(
      fixture.configPath,
      `export default { entriesDir: "entries", linkValidation: { trustedTemplateVariables: ${JSON.stringify(rules)} }, mockupsDir: "mockups", repoRoot: "." };\n`,
    );
    await assert.rejects(() => loadConfig(fixture.root), expected);
  }
});
