import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { compileCatalogue } from "../dist/build/compile.js";
import { writeCompilation } from "../dist/build/transaction.js";
import { loadConfig } from "../dist/config/load.js";
import { compareReview } from "../dist/changes/compare.js";
import {
  NodeGitCommandRunner,
  RepositoryGitClient,
} from "../dist/changes/git.js";
import type { ManifestScreen } from "../dist/registry/types.js";
import {
  createFixture,
  removeFixture,
  validEntrySource,
} from "./helpers/fixture.js";

const execFileAsync = promisify(execFile);

test("comparison reads the Git base without a checkout", async (context) => {
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
  const compilation = await compileCatalogue(config);
  await writeCompilation(compilation, config);
  const result = await compareReview(
    compilation,
    config,
    new RepositoryGitClient(new NodeGitCommandRunner(fixture.root)),
    "HEAD",
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
  assert.equal(result.schemaVersion, 2);
  assert.match(result.baseCommit, /^[a-f0-9]{40}$/);
});

test("comparison reports descendants of directory dependencies", async (context) => {
  const fixture = await createFixture(
    validEntrySource().replace(
      'dependencies: ["notes.md"]',
      'dependencies: ["src/components"]',
    ),
  );
  context.after(() => removeFixture(fixture));
  const component = path.join(fixture.root, "src/components/Button.tsx");
  await fs.promises.mkdir(path.dirname(component), { recursive: true });
  await fs.promises.writeFile(component, "export const label = 'Before';\n");
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  await git(fixture.root, ["init", "-q"]);
  await git(fixture.root, ["config", "user.name", "Mokabook Test"]);
  await git(fixture.root, ["config", "user.email", "mokabook@example.invalid"]);
  await git(fixture.root, ["add", "."]);
  await git(fixture.root, ["commit", "-qm", "test: base directory dependency"]);
  await fs.promises.writeFile(component, "export const label = 'After';\n");

  const compilation = await compileCatalogue(config);
  const result = await compareReview(
    compilation,
    config,
    new RepositoryGitClient(new NodeGitCommandRunner(fixture.root)),
    "HEAD",
  );

  assert.ok(
    result.screens.every((screen) =>
      screen.sharedImpact.includes("src/components/Button.tsx"),
    ),
  );
});

test("comparison batches dark base fragments through RepositoryGitClient", async (context) => {
  const fixture = await createFixture(undefined, {
    extraConfig: 'colorSchemes: ["light", "dark"],',
  });
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const compilation = await compileCatalogue(config);
  await writeCompilation(compilation, config);
  await git(fixture.root, ["init", "-q"]);
  await git(fixture.root, ["config", "user.name", "Mokabook Test"]);
  await git(fixture.root, ["config", "user.email", "mokabook@example.invalid"]);
  await git(fixture.root, ["add", "."]);
  await git(fixture.root, ["commit", "-qm", "test: dark base catalogue"]);
  const calls: string[][] = [];
  const client = new RepositoryGitClient({
    run: async (arguments_) => {
      calls.push([...arguments_]);
      return gitOutput(fixture.root, arguments_);
    },
    runBytesWithInput: async (arguments_, input) => {
      calls.push([...arguments_]);
      return gitBytesWithInput(fixture.root, arguments_, input);
    },
  });

  await compareReview(compilation, config, client, "HEAD");

  const screens = compilation.manifest.entries.filter(
    (entry): entry is ManifestScreen => entry.kind === "screen",
  );
  const expected = screens.flatMap((screen) => {
    assert.ok(screen.darkFragments);
    return [
      `mockups/${screen.fragments.mobile}`,
      `mockups/${screen.darkFragments.mobile}`,
      `mockups/${screen.fragments.desktop}`,
      `mockups/${screen.darkFragments.desktop}`,
    ];
  });
  const batchedPathspecs = calls
    .filter((arguments_) => arguments_[0] === "ls-tree")
    .filter((arguments_) => arguments_[1] === "-zl")
    .flatMap((arguments_) => {
      const separator = arguments_.indexOf("--");
      assert.notEqual(separator, -1);
      return arguments_
        .slice(separator + 1)
        .map((pathspec) => pathspec.slice(":(literal)".length));
    });

  assert.deepEqual(
    batchedPathspecs.filter((pathspec) => expected.includes(pathspec)).sort(),
    expected.sort(),
  );
});

async function git(cwd: string, arguments_: readonly string[]): Promise<void> {
  await execFileAsync("git", [...arguments_], { cwd });
}

async function gitOutput(
  cwd: string,
  arguments_: readonly string[],
): Promise<string> {
  return (await execFileAsync("git", [...arguments_], { cwd })).stdout;
}

async function gitBytesWithInput(
  cwd: string,
  arguments_: readonly string[],
  input: Uint8Array,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    let inputError: Error | undefined;
    const child = execFile(
      "git",
      [...arguments_],
      { cwd, encoding: "buffer" },
      (error, stdout) => {
        if (error) reject(error);
        else if (inputError) reject(inputError);
        else resolve(Buffer.from(stdout));
      },
    );
    child.stdin?.on("error", (error) => {
      inputError = error;
    });
    child.stdin?.end(Buffer.from(input));
  });
}
