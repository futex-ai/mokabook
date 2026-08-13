import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { compileCatalogue } from "../dist/build/compile.js";
import { writeCompilation } from "../dist/build/transaction.js";
import { loadConfig } from "../dist/config/load.js";
import { startCatalogueServer } from "../dist/server/http.js";
import { createFixture, removeFixture } from "./helpers/fixture.js";

const execFileAsync = promisify(execFile);

async function committedFixture(context: {
  after: (cleanup: () => Promise<void> | void) => void;
}) {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  await fs.promises.writeFile(
    path.join(fixture.mockupsDir, "fixture.css"),
    "body { color: rgb(1, 2, 3); }\n",
  );
  await git(fixture.root, ["init", "-q"]);
  await git(fixture.root, ["config", "user.name", "Mokabook Test"]);
  await git(fixture.root, ["config", "user.email", "mokabook@example.invalid"]);
  await git(fixture.root, ["add", "."]);
  await git(fixture.root, ["commit", "-qm", "test: base catalogue"]);
  const baseCommit = (await git(fixture.root, ["rev-parse", "HEAD"])).trim();
  return { baseCommit, config, fixture };
}

test("base routes serve pinned branch-point documents immutably", async (context) => {
  const { baseCommit, config, fixture } = await committedFixture(context);
  const fragment = path.join(fixture.mockupsDir, "screens/home.desktop.html");
  const committed = await fs.promises.readFile(fragment, "utf8");
  await fs.promises.writeFile(
    fragment,
    committed.replace("</main>", "<p>Worktree only</p></main>"),
  );
  await fs.promises.writeFile(
    path.join(fixture.mockupsDir, "fixture.css"),
    "body { color: rgb(9, 9, 9); }\n",
  );
  const server = await startCatalogueServer(config, {
    base: "HEAD",
    baseCommit,
    port: 0,
  });
  context.after(() => server.close());

  const document = await fetch(
    `${server.url}/__mokabook/base/${baseCommit}/screens/home.desktop.html`,
  );
  assert.equal(document.status, 200);
  assert.equal(
    document.headers.get("cache-control"),
    "public, max-age=31536000, immutable",
  );
  assert.match(document.headers.get("content-type") ?? "", /text\/html/);
  const body = await document.text();
  assert.equal(body, committed);
  assert.equal(body.includes("Worktree only"), false);

  const stylesheet = await fetch(
    `${server.url}/__mokabook/base/${baseCommit}/fixture.css`,
  );
  assert.equal(stylesheet.status, 200);
  assert.match(stylesheet.headers.get("content-type") ?? "", /text\/css/);
  assert.match(await stylesheet.text(), /rgb\(1, 2, 3\)/);
});

test("base routes reject other commits and unsafe paths", async (context) => {
  const { baseCommit, config } = await committedFixture(context);
  const server = await startCatalogueServer(config, {
    base: "HEAD",
    baseCommit,
    port: 0,
  });
  context.after(() => server.close());

  const otherCommit = "f".repeat(40);
  assert.equal(
    (
      await fetch(
        `${server.url}/__mokabook/base/${otherCommit}/screens/home.desktop.html`,
      )
    ).status,
    404,
  );
  assert.equal(
    (await fetch(`${server.url}/__mokabook/base/${baseCommit}/%2e%2e/notes.md`))
      .status,
    404,
  );
  assert.equal(
    (await fetch(`${server.url}/__mokabook/base/${baseCommit}`)).status,
    404,
  );
});

test("a missing base document renders the no-base placeholder", async (context) => {
  const { baseCommit, config } = await committedFixture(context);
  const server = await startCatalogueServer(config, {
    base: "HEAD",
    baseCommit,
    port: 0,
  });
  context.after(() => server.close());

  const placeholder = await fetch(
    `${server.url}/__mokabook/base/${baseCommit}/screens/absent.mobile.html`,
  );
  assert.equal(placeholder.status, 200);
  assert.equal(
    placeholder.headers.get("cache-control"),
    "public, max-age=31536000, immutable",
  );
  assert.match(await placeholder.text(), /No base version/);

  assert.equal(
    (await fetch(`${server.url}/__mokabook/base/${baseCommit}/absent.css`))
      .status,
    404,
  );
});

test("base routes stay inactive without a pinned commit", async (context) => {
  const { baseCommit, config } = await committedFixture(context);
  const server = await startCatalogueServer(config, {
    base: "HEAD",
    port: 0,
  });
  context.after(() => server.close());

  const response = await fetch(
    `${server.url}/__mokabook/base/${baseCommit}/screens/home.desktop.html`,
  );
  assert.equal(response.status, 404);
  assert.match(await response.text(), /Screen not found/);
});

async function git(
  cwd: string,
  arguments_: readonly string[],
): Promise<string> {
  return (await execFileAsync("git", [...arguments_], { cwd })).stdout;
}
