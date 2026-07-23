import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { repositoryRoot } from "./helpers/fixture.js";

const execute = promisify(execFile);

test("preview build snapshots a static Browse catalogue", async (context) => {
  const contextDir = path.join(repositoryRoot, ".context");
  await fs.promises.mkdir(contextDir, { recursive: true });
  const output = await fs.promises.mkdtemp(
    path.join(contextDir, "preview-test-"),
  );
  await fs.promises.rm(output, { recursive: true });
  context.after(() => fs.promises.rm(output, { force: true, recursive: true }));

  await execute(
    process.execPath,
    ["scripts/preview/build.mjs", "--out", output],
    { cwd: repositoryRoot },
  );
  await execute(
    process.execPath,
    ["scripts/preview/build.mjs", "--out", output],
    { cwd: repositoryRoot },
  );

  const index = await read(output, "index.html");
  assert.match(index, /<title>Mokabook<\/title>/);
  assert.match(index, /\/__mokabook\/client\/browse\.js/);
  assert.doesNotMatch(index, /\/__mokabook\/client\/browser\.js/);
  assert.match(index, /href="\/view\/screens\/welcome"/);
  assert.doesNotMatch(index, /href="\/view\/screens\/welcome\.html"/);
  const welcome = await read(output, "view/screens/welcome.html");
  assert.match(welcome, /Welcome · Mokabook/);
  assert.match(welcome, /src="\/static\/screens\/welcome\.desktop"/);
  assert.doesNotMatch(
    welcome,
    /src="\/static\/screens\/welcome\.desktop\.html"/,
  );
  assert.match(
    await read(output, "static/screens/welcome.desktop.html"),
    /Welcome to Mokabook/,
  );
  assert.match(await read(output, "__mokabook/shell.css"), /--mbk-/);
  assert.ok(
    (
      await fs.promises.stat(
        path.join(output, "__mokabook/fonts/InterVariable.woff2"),
      )
    ).size > 0,
  );
  assert.match(await read(output, "404.html"), /Screen not found/);
  const review = await read(output, "review/index.html");
  assert.doesNotMatch(review, /Refresh comparison/);
  const comparisons = (
    await relativeFiles(output, "review/comparisons")
  ).filter((candidate) => candidate.endsWith("/index.html"));
  assert.ok(comparisons.length > 0);
  const comparisonPath = comparisons[0];
  assert.ok(comparisonPath);
  const comparison = await read(output, comparisonPath);
  assert.match(comparison, /data-mode="side"/);
  const snapshotLinks = [...comparison.matchAll(/<iframe[^>]+src="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((candidate): candidate is string => candidate !== undefined);
  assert.ok(snapshotLinks.length > 0);
  for (const link of snapshotLinks) {
    const target = path.posix.normalize(
      path.posix.join(
        path.posix.dirname(comparisonPath),
        decodeURIComponent(link),
      ),
    );
    assert.match(await read(output, target), /<!doctype html>/i);
  }
  assert.equal(
    await read(output, "_headers"),
    "/static/*\n  Content-Security-Policy: sandbox\n\n/review/snapshots/*\n  Content-Security-Policy: sandbox\n",
  );
  assert.match(
    await read(output, "_redirects"),
    /\/id\/example-welcome \/view\/screens\/welcome 302/,
  );
  assert.equal(
    await read(output, ".mokabook-preview-artifact"),
    "schemaVersion=1\n",
  );
});

test("preview build refuses to replace an unowned directory", async (context) => {
  const contextDir = path.join(repositoryRoot, ".context");
  await fs.promises.mkdir(contextDir, { recursive: true });
  const output = await fs.promises.mkdtemp(
    path.join(contextDir, "preview-unowned-"),
  );
  await fs.promises.writeFile(path.join(output, "keep.txt"), "owned by user\n");
  context.after(() => fs.promises.rm(output, { force: true, recursive: true }));

  await assert.rejects(
    execute(process.execPath, ["scripts/preview/build.mjs", "--out", output], {
      cwd: repositoryRoot,
    }),
    /refusing to replace unowned preview directory/,
  );
  assert.equal(await read(output, "keep.txt"), "owned by user\n");
});

test("preview replacement requires an exact regular ownership marker", async (context) => {
  const contextDir = path.join(repositoryRoot, ".context");
  await fs.promises.mkdir(contextDir, { recursive: true });
  const cases = ["directory", "symlink", "wrong-content"] as const;

  for (const markerKind of cases) {
    const output = await fs.promises.mkdtemp(
      path.join(contextDir, `preview-${markerKind}-`),
    );
    context.after(() =>
      fs.promises.rm(output, { force: true, recursive: true }),
    );
    await fs.promises.writeFile(
      path.join(output, "keep.txt"),
      "owned by user\n",
    );
    const marker = path.join(output, ".mokabook-preview-artifact");
    if (markerKind === "directory") {
      await fs.promises.mkdir(marker);
    } else if (markerKind === "symlink") {
      await fs.promises.writeFile(
        path.join(output, "marker-target"),
        "schemaVersion=1\n",
      );
      await fs.promises.symlink("marker-target", marker);
    } else {
      await fs.promises.writeFile(marker, "owned-by-someone-else\n");
    }

    await assert.rejects(
      execute(
        process.execPath,
        ["scripts/preview/build.mjs", "--out", output],
        {
          cwd: repositoryRoot,
        },
      ),
      /refusing to replace unowned preview directory/,
    );
    assert.equal(await read(output, "keep.txt"), "owned by user\n");
  }
});

test("preview rechecks ownership immediately before installation", async (context) => {
  const contextDir = path.join(repositoryRoot, ".context");
  await fs.promises.mkdir(contextDir, { recursive: true });
  const parent = await fs.promises.mkdtemp(
    path.join(contextDir, "preview-appearing-"),
  );
  const output = path.join(parent, "artifact");
  context.after(() => fs.promises.rm(parent, { force: true, recursive: true }));

  const building = execute(
    process.execPath,
    ["scripts/preview/build.mjs", "--out", output],
    { cwd: repositoryRoot },
  );
  await waitForPreviewStage(parent);
  await fs.promises.mkdir(output);
  await fs.promises.writeFile(path.join(output, "keep.txt"), "owned by user\n");

  await assert.rejects(
    building,
    /refusing to replace unowned preview directory/,
  );
  assert.equal(await read(output, "keep.txt"), "owned by user\n");
});

test("preview build rejects an external symlink parent", async (context) => {
  const contextDir = path.join(repositoryRoot, ".context");
  await fs.promises.mkdir(contextDir, { recursive: true });
  const outside = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "mokabook-preview-outside-"),
  );
  const output = path.join(outside, "artifact");
  await fs.promises.mkdir(output);
  await fs.promises.writeFile(path.join(output, "keep.txt"), "outside\n");
  const link = await fs.promises.mkdtemp(
    path.join(contextDir, "preview-parent-link-"),
  );
  await fs.promises.rm(link, { recursive: true });
  await fs.promises.symlink(outside, link, "dir");
  context.after(async () => {
    await fs.promises.rm(link, { force: true, recursive: true });
    await fs.promises.rm(outside, { force: true, recursive: true });
  });

  await assert.rejects(
    execute(
      process.execPath,
      ["scripts/preview/build.mjs", "--out", path.join(link, "artifact")],
      { cwd: repositoryRoot },
    ),
    /preview output resolves outside .*\.context through a symlink/,
  );
  assert.equal(await read(output, "keep.txt"), "outside\n");
});

test("preview build rejects an external output symlink", async (context) => {
  const contextDir = path.join(repositoryRoot, ".context");
  await fs.promises.mkdir(contextDir, { recursive: true });
  const outside = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "mokabook-preview-target-"),
  );
  await fs.promises.writeFile(path.join(outside, "keep.txt"), "outside\n");
  const output = await fs.promises.mkdtemp(
    path.join(contextDir, "preview-output-link-"),
  );
  await fs.promises.rm(output, { recursive: true });
  await fs.promises.symlink(outside, output, "dir");
  context.after(async () => {
    await fs.promises.rm(output, { force: true, recursive: true });
    await fs.promises.rm(outside, { force: true, recursive: true });
  });

  await assert.rejects(
    execute(process.execPath, ["scripts/preview/build.mjs", "--out", output], {
      cwd: repositoryRoot,
    }),
    /preview output resolves outside .*\.context through a symlink/,
  );
  assert.equal(await read(outside, "keep.txt"), "outside\n");
});

async function read(root: string, relative: string): Promise<string> {
  return await fs.promises.readFile(path.join(root, relative), "utf8");
}

async function relativeFiles(
  root: string,
  relative: string,
): Promise<string[]> {
  const directory = path.join(root, relative);
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const child = path.posix.join(relative, entry.name);
      return entry.isDirectory() ? relativeFiles(root, child) : [child];
    }),
  );
  return nested.flat().sort();
}

async function waitForPreviewStage(parent: string): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const entries = await fs.promises.readdir(parent);
    if (entries.some((entry) => entry.startsWith(".mokabook-preview-stage-"))) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("preview staging did not start");
}
