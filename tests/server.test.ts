import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import { Agent, request } from "node:http";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { compileCatalogue } from "../dist/build/compile.js";
import { writeCompilation } from "../dist/build/transaction.js";
import { loadConfig } from "../dist/config/load.js";
import { startCatalogueServer } from "../dist/server/http.js";
import {
  createFixture,
  removeFixture,
  repositoryRoot,
  validEntrySource,
} from "./helpers/fixture.js";

const execute = promisify(execFile);

test("server validates before bind and supports safe no-watch routes on port zero", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await assert.rejects(
    () => startCatalogueServer(config, { base: "origin/main", port: 0 }),
    /could not read.*mokabook-manifest/,
  );
  await writeCompilation(await compileCatalogue(config), config);
  const server = await startCatalogueServer(config, {
    base: "origin/main",
    port: 0,
  });
  context.after(() => server.close());
  assert.ok(server.port > 0);
  const home = await fetch(`${server.url}/`);
  assert.equal(home.status, 200);
  const homeHtml = await home.text();
  assert.match(homeHtml, /data-mokabook-shell/);
  assert.match(homeHtml, /aria-label="Catalogue"/);
  assert.match(homeHtml, /Browse the mockup catalogue/);
  const shellCss = await fetch(`${server.url}/__mokabook/shell.css`);
  assert.equal(shellCss.status, 200);
  assert.match(await shellCss.text(), /--mokabook-accent/);
  const redirect = await fetch(`${server.url}/id/home`, { redirect: "manual" });
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), "/view/screens/home.html");
  assert.equal(
    (await fetch(`${server.url}/view/screens/home.html`)).status,
    200,
  );
  assert.equal(
    (await fetch(`${server.url}/static/screens/home.mobile.html`)).status,
    200,
  );
  assert.equal(
    (await fetch(`${server.url}/static/entries/fixture.mockup.tsx`)).status,
    404,
  );
  const events = await fetch(`${server.url}/__mokabook/events`);
  const eventReader = events.body?.getReader();
  assert.ok(eventReader);
  assert.match(await readEvent(eventReader), /event: ready\ndata: 1/);
  server.publishUpdate(2);
  assert.match(await readEvent(eventReader), /event: update\ndata: 2/);
  await eventReader.cancel();
  assert.equal(
    (await fetch(`${server.url}/static/%252e%252e/package.json`)).status,
    404,
  );
  assert.equal((await fetch(`${server.url}/view/unknown.html`)).status, 404);
});

test("occupied ports fail without disturbing the existing server", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  const first = await startCatalogueServer(config, {
    base: "origin/main",
    port: 0,
  });
  context.after(() => first.close());
  await assert.rejects(
    () =>
      startCatalogueServer(config, { base: "origin/main", port: first.port }),
    /could not bind port/,
  );
  assert.equal((await fetch(first.url)).status, 200);
});

test("event-stream HEAD releases a keep-alive connection", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  const server = await startCatalogueServer(config, {
    base: "origin/main",
    port: 0,
  });
  context.after(() => server.close());
  const agent = new Agent({ keepAlive: true, maxSockets: 1 });
  context.after(() => agent.destroy());

  const head = await nodeRequest(
    `${server.url}/__mokabook/events`,
    "HEAD",
    agent,
  );
  assert.equal(head.status, 200);
  assert.equal(head.body, "");
  const home = await nodeRequest(`${server.url}/`, "GET", agent);
  assert.equal(home.status, 200);
  assert.match(home.body, /data-mokabook-shell/);
});

test("malformed manifest routes fail before server readiness", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  const manifestPath = path.join(fixture.mockupsDir, "mokabook-manifest.json");
  const manifest = JSON.parse(
    await fs.promises.readFile(manifestPath, "utf8"),
  ) as {
    entries: Array<{ fragments?: { mobile: string } }>;
  };
  const screen = manifest.entries.find((entry) => entry.fragments);
  if (screen?.fragments) screen.fragments.mobile = "../outside.html";
  await fs.promises.writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
  await assert.rejects(
    () => startCatalogueServer(config, { base: "origin/main", port: 0 }),
    /unsafe route/,
  );
});

test("manifest relationships retain their required entry kinds", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  const manifestPath = path.join(fixture.mockupsDir, "mokabook-manifest.json");
  const manifest = JSON.parse(
    await fs.promises.readFile(manifestPath, "utf8"),
  ) as {
    entries: Array<{
      id: string;
      kind: string;
      steps?: Array<{ screenId: string }>;
      useCaseIds?: string[];
    }>;
  };
  const useCase = manifest.entries.find((entry) => entry.kind === "use-case");
  assert.ok(useCase?.steps?.[0]);
  useCase.steps = [{ screenId: "fixture" }];
  for (const entry of manifest.entries) {
    if (entry.kind === "screen") entry.useCaseIds = [];
  }
  await fs.promises.writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
  await assert.rejects(
    () => startCatalogueServer(config, { base: "origin/main", port: 0 }),
    /step target is not a screen/,
  );
});

test("CLI no-watch lifecycle becomes ready and exits cleanly on SIGTERM", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const child = spawn(
    process.execPath,
    [
      path.join(repositoryRoot, "dist/cli/bin.js"),
      "serve",
      "--config",
      fixture.configPath,
      "--port",
      "0",
      "--no-watch",
    ],
    { cwd: fixture.root, stdio: ["ignore", "pipe", "pipe"] },
  );
  context.after(() => {
    if (!child.killed) child.kill("SIGTERM");
  });
  const url = await outputUrl(child.stdout);
  assert.equal((await fetch(url)).status, 200);
  child.kill("SIGTERM");
  const code = await new Promise<number | null>((resolve) =>
    child.once("exit", resolve),
  );
  assert.equal(code, 0);
  assert.equal(
    fs.existsSync(path.join(fixture.mockupsDir, "mokabook-manifest.json")),
    true,
  );
});

test(
  "watched CLI rebuilds, restarts on one stable port, and cleans up its child",
  { timeout: 60_000 },
  async (context) => {
    const fixture = await createFixture();
    context.after(() => removeFixture(fixture));
    const child = spawn(
      process.execPath,
      [
        path.join(repositoryRoot, "dist/cli/bin.js"),
        "--config",
        fixture.configPath,
        "--port",
        "0",
      ],
      { cwd: fixture.root, stdio: ["ignore", "pipe", "pipe"] },
    );
    context.after(() => {
      if (!child.killed) child.kill("SIGTERM");
    });
    const stderr = captureOutput(child.stderr);
    const url = await outputUrl(child.stdout);
    const firstPort = new URL(url).port;
    await git(fixture.root, "init", "--initial-branch=main");
    await git(fixture.root, "config", "user.email", "fixture@example.test");
    await git(fixture.root, "config", "user.name", "Fixture");
    await git(fixture.root, "add", "-A");
    await git(fixture.root, "commit", "-m", "base");
    await git(fixture.root, "branch", "config-reloaded");
    await fs.promises.writeFile(
      fixture.entryPath,
      validEntrySource({ firstTitle: "Watched Home" }),
    );
    const generated = path.join(
      fixture.mockupsDir,
      "screens/home.desktop.html",
    );
    await waitFor(async () =>
      (await fs.promises.readFile(generated, "utf8")).includes("Watched Home"),
    );
    assert.equal(new URL(url).port, firstPort);
    await waitFor(async () => (await fetch(url)).status === 200);
    await fs.promises.writeFile(
      fixture.entryPath,
      validEntrySource({
        body: `<a href="mock:missing-screen">Broken</a>`,
        firstTitle: "Broken Home",
      }),
    );
    await waitFor(async () => stderr().includes("unknown id: missing-screen"));
    assert.match(await fs.promises.readFile(generated, "utf8"), /Watched Home/);
    assert.equal((await fetch(url)).status, 200);
    await fs.promises.writeFile(
      fixture.entryPath,
      validEntrySource({ firstTitle: "Recovered Home" }),
    );
    await waitFor(async () =>
      (await fs.promises.readFile(generated, "utf8")).includes(
        "Recovered Home",
      ),
    );
    await waitFor(async () => (await fetch(url)).status === 200);
    await fs.promises.writeFile(
      fixture.configPath,
      `export default { entriesDir: "entries", mockupsDir: "mockups", repoRoot: ".", review: { base: "config-reloaded", outDir: ".review" } };\n`,
    );
    await waitFor(async () => {
      const response = await fetch(`${url}/review/index.html?refresh=1`);
      if (response.status !== 200) return false;
      const review = await fetch(`${url}/review/review.json`);
      if (review.status !== 200) return false;
      return (
        ((await review.json()) as { baseRef?: unknown }).baseRef ===
        "config-reloaded"
      );
    });
    const review = await fetch(`${url}/review/review.json`);
    assert.equal(review.status, 200);
    assert.equal(
      ((await review.json()) as { baseRef?: unknown }).baseRef,
      "config-reloaded",
    );
    assert.equal(new URL(url).port, firstPort);
    child.kill("SIGTERM");
    assert.equal(
      await new Promise<number | null>((resolve) =>
        child.once("exit", resolve),
      ),
      0,
    );
    await assert.rejects(() => fetch(url));
  },
);

function captureOutput(stream: NodeJS.ReadableStream): () => string {
  let output = "";
  stream.on("data", (chunk: Buffer) => {
    output += chunk.toString("utf8");
  });
  return () => output;
}

async function git(cwd: string, ...arguments_: string[]): Promise<void> {
  await execute("git", arguments_, { cwd });
}

async function readEvent(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<string> {
  const decoder = new TextDecoder();
  let output = "";
  while (!output.includes("\n\n")) {
    const chunk = await reader.read();
    if (chunk.done) throw new Error("event stream ended before an event");
    output += decoder.decode(chunk.value, { stream: true });
  }
  return output;
}

function outputUrl(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(
      () => reject(new Error(`CLI readiness timed out: ${output}`)),
      15_000,
    );
    stream.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
      const match = output.match(
        /Mokabook listening at (http:\/\/127\.0\.0\.1:\d+)/,
      );
      if (match?.[1]) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
  });
}

async function waitFor(predicate: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    try {
      if (await predicate()) return;
    } catch {
      // The watched child may be between close and readiness on its stable port.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("watched condition did not become true");
}

function nodeRequest(
  url: string,
  method: "GET" | "HEAD",
  agent: Agent,
): Promise<{ body: string; status: number | undefined }> {
  return new Promise((resolve, reject) => {
    const request_ = request(url, { agent, method }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk: string) => {
        body += chunk;
      });
      response.once("end", () =>
        resolve({ body, status: response.statusCode }),
      );
    });
    request_.setTimeout(2_000, () =>
      request_.destroy(new Error(`${method} ${url} timed out`)),
    );
    request_.once("error", reject);
    request_.end();
  });
}
