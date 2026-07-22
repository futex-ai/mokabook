import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
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

async function read(root: string, relative: string): Promise<string> {
  return await fs.promises.readFile(path.join(root, relative), "utf8");
}
