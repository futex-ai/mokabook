import assert from "node:assert/strict";
import fs from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  collection,
  defineRoot,
  mockLink,
  reviewMaterialKey,
  screen,
} from "../dist/index.js";
import { parseArguments } from "../dist/cli/arguments.js";
import { repositoryRoot } from "./helpers/fixture.js";

const execFileAsync = promisify(execFile);

test("public helpers retain stable authoring semantics", () => {
  assert.equal(mockLink("account-home"), "mock:account-home");
  assert.equal(
    mockLink("account-home", "billing-section"),
    "mock:account-home#billing-section",
  );
  for (const invalid of [
    "account-home#billing-section",
    "account-home%23billing-section",
    "mock:account-home",
    "AccountHome",
  ]) {
    assert.throws(() => mockLink(invalid), /expected kebab-case/);
  }
  assert.throws(() => mockLink("account-home", "#billing"), /fragment/);
  assert.throws(() => mockLink("account-home", "billing section"), /fragment/);
  assert.equal(
    reviewMaterialKey({ beta: 2, alpha: 1 }),
    reviewMaterialKey({ alpha: 1, beta: 2 }),
  );
  const definitions = defineRoot({
    children: [
      collection({
        children: [
          screen({
            description: "Nested screen",
            desktop: "desktop",
            id: "nested-screen",
            mobile: "mobile",
            slug: "screen",
            title: "Screen",
          }),
        ],
        description: "Nested collection",
        id: "nested-group",
        segment: "group",
        title: "Group",
      }),
    ],
    navPath: ["Example"],
    path: "screens",
    title: "Root",
  });
  assert.deepEqual(
    definitions.map((entry) => entry.id),
    ["nested-group", "nested-screen"],
  );
  assert.equal(
    definitions[1]?.kind === "screen" ? definitions[1].route : "",
    "screens/group/screen.html",
  );
});

test("public link helpers reject non-string runtime values", () => {
  for (const invalid of [null, true, 42, ["account-home"]]) {
    assert.throws(
      () => mockLink(invalid as never),
      /expected kebab-case/,
      String(invalid),
    );
  }
  for (const invalid of [true, 42, ["billing-section"]]) {
    assert.throws(
      () => mockLink("account-home", invalid as never),
      /fragment/,
      String(invalid),
    );
  }
});

test("CLI defaults to watched serve and rejects misplaced options", () => {
  assert.deepEqual(parseArguments([]), {
    command: "serve",
    help: false,
    version: false,
  });
  assert.equal(
    parseArguments(["serve", "--no-watch", "--port", "0"]).watch,
    false,
  );
  assert.throws(
    () => parseArguments(["build", "--port", "1234"]),
    /belong to serve/,
  );
  assert.throws(
    () => parseArguments(["serve", "--update-version", "2"]),
    /reserved for the watched server child/,
  );
  assert.throws(
    () => parseArguments(["serve", "--strict-port"]),
    /reserved for the watched server child/,
  );
  assert.throws(() => parseArguments(["unknown"]), /unknown command/);
});

test("packed package contains only the declared public surface", async () => {
  const { stdout } = await execFileAsync(
    "npm",
    ["pack", "--dry-run", "--json", "--ignore-scripts"],
    {
      cwd: repositoryRoot,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const report = JSON.parse(stdout) as Array<{
    files: Array<{ path: string }>;
  }>;
  const files = new Set(report[0]?.files.map((file) => file.path));
  assert.ok(files.has("dist/index.js"));
  assert.ok(files.has("dist/index.d.ts"));
  assert.ok(files.has("dist/cli/bin.js"));
  assert.ok(files.has("README.md"));
  assert.equal(
    [...files].some((file) => file.startsWith("tests/")),
    false,
  );
  const bin = await fs.promises.readFile(
    path.join(repositoryRoot, "dist/cli/bin.js"),
    "utf8",
  );
  assert.ok(bin.startsWith("#!/usr/bin/env node"));
});
