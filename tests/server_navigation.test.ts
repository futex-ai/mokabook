import assert from "node:assert/strict";
import fs from "node:fs";
import { Agent, request } from "node:http";
import path from "node:path";
import test from "node:test";

import { compileCatalogue } from "../dist/build/compile.js";
import { writeCompilation } from "../dist/build/transaction.js";
import { loadConfig } from "../dist/config/load.js";
import { startCatalogueServer } from "../dist/server/http.js";
import { safeDecodePath } from "../dist/server/respond.js";
import {
  createFixture,
  removeFixture,
  type TestFixture,
} from "./helpers/fixture.js";

test("served Browse adapts current HTML without mutating portable files", async (context) => {
  const fixture = await navigationFixture(context);
  const diskPath = path.join(fixture.mockupsDir, "screens/home.mobile.html");
  const disk = await fs.promises.readFile(diskPath, "utf8");
  const server = await startFixtureServer(fixture);
  context.after(() => server.close());

  const response = await fetch(`${server.url}/static/screens/home.mobile.html`);
  const served = await response.text();
  assert.equal(response.status, 200);
  assert.match(served, /data-mokabook-link="details#section"/);
  assert.match(served, /href="\.\/details\.mobile\.html#section"/);
  assert.doesNotMatch(served, /data-mokabook-target="spoof"/);
  assert.equal(await fs.promises.readFile(diskPath, "utf8"), disk);

  await fs.promises.writeFile(
    path.join(fixture.mockupsDir, "unowned.html"),
    '<a data-mokabook-link="details" data-mokabook-target="_top" href="./screens/details.mobile.html">Details</a>',
  );
  const unowned = await (
    await fetch(`${server.url}/static/unowned.html`)
  ).text();
  assert.doesNotMatch(unowned, /data-mokabook-(?:link|target)/);

  await fs.promises.writeFile(
    path.join(fixture.mockupsDir, "unowned.htm"),
    '<a data-mokabook-link="details" href="./screens/details.mobile.html">Details</a>',
  );
  const htm = await fetch(`${server.url}/static/unowned.htm`);
  assert.match(htm.headers.get("content-type") ?? "", /text\/html/);
  assert.doesNotMatch(await htm.text(), /data-mokabook-link/);

  const head = await fetch(`${server.url}/static/screens/home.mobile.html`, {
    method: "HEAD",
  });
  assert.equal(head.status, 200);
  assert.match(head.headers.get("content-type") ?? "", /text\/html/);
  assert.equal(await head.text(), "");

  for (const encodedPath of [
    "/static/screens%2Fhome.mobile.html",
    "/static/screens%5Chome.mobile.html",
  ]) {
    assert.equal((await fetch(`${server.url}${encodedPath}`)).status, 400);
  }
});

test("served fragment queries validate once and reach every applicable frame", async (context) => {
  const fixture = await navigationFixture(context);
  const server = await startFixtureServer(fixture);
  context.after(() => server.close());

  const redirect = await fetch(`${server.url}/id/details?fragment=section`, {
    redirect: "manual",
  });
  assert.equal(redirect.status, 302);
  assert.equal(
    redirect.headers.get("location"),
    "/view/screens/details.html?fragment=section",
  );
  const screen = await (
    await fetch(`${server.url}/view/screens/details.html?fragment=section`)
  ).text();
  assert.match(
    screen,
    /src="\/static\/screens\/details\.mobile\.html#section"/,
  );
  assert.match(
    screen,
    /data-fragment-dark="\/static\/screens\/details\.mobile\.dark\.html#section"/,
  );
  assert.match(
    screen,
    /src="\/static\/screens\/details\.desktop\.html#section"/,
  );
  assert.equal(
    (screen.match(/data-mokabook-fragment-frame=""/g) ?? []).length,
    2,
  );

  const flow = await (
    await fetch(`${server.url}/view/user-flows/tour.html?fragment=section`)
  ).text();
  assert.equal((flow.match(/#section/g) ?? []).length, 3);
  assert.equal(
    (flow.match(/data-mokabook-fragment-frame=""/g) ?? []).length,
    1,
  );

  for (const query of [
    "fragment=section&fragment=section",
    "fragment=%2523section",
    "fragment=1section",
    "fragment=absent",
  ]) {
    assert.equal(
      (await fetch(`${server.url}/view/screens/details.html?${query}`)).status,
      400,
      query,
    );
  }
});

test("HEAD id errors omit bodies on a reused connection", async (context) => {
  const fixture = await navigationFixture(context);
  const server = await startFixtureServer(fixture);
  context.after(() => server.close());
  const agent = new Agent({ keepAlive: true, maxSockets: 1 });
  context.after(() => agent.destroy());

  for (const [route, status] of [
    ["/id/missing", 404],
    ["/id/details?fragment=bad", 400],
  ] as const) {
    const head = await nodeRequest(`${server.url}${route}`, "HEAD", agent);
    assert.equal(head.status, status);
    assert.equal(head.body, "");
  }

  const home = await nodeRequest(`${server.url}/`, "GET", agent);
  assert.equal(home.status, 200);
  assert.match(home.body, /data-mokabook-shell/);
});

test("safe URL paths reject decoded path separators", () => {
  for (const candidate of [
    "screens%2Fhome.mobile.html",
    "screens%2f..%2fpackage.json",
    "screens%5Chome.mobile.html",
    "screens/%5c..%5c/package.json",
    "%5C%5Cserver%5Cshare",
  ]) {
    assert.equal(safeDecodePath(candidate), undefined, candidate);
  }
  assert.equal(
    safeDecodePath("screens/home%20screen.mobile.html"),
    "screens/home screen.mobile.html",
  );
});

test("served Browse fails closed on post-build trusted tampering", async (context) => {
  const fixture = await navigationFixture(context);
  const server = await startFixtureServer(fixture);
  context.after(() => server.close());
  const target = path.join(fixture.mockupsDir, "screens/home.mobile.html");
  const original = await fs.promises.readFile(target, "utf8");
  await fs.promises.writeFile(
    target,
    original.replace("./details.mobile.html", "./home.mobile.html"),
  );

  assert.equal(
    (await fetch(`${server.url}/static/screens/home.mobile.html`)).status,
    500,
  );
});

async function navigationFixture(
  context: test.TestContext,
): Promise<TestFixture> {
  const fixture = await createFixture(navigationSource(), {
    extraConfig: 'colorSchemes: ["light", "dark"],',
  });
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  return fixture;
}

async function startFixtureServer(fixture: TestFixture) {
  return startCatalogueServer(await loadConfig(fixture.root), {
    base: "origin/main",
    port: 0,
  });
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

function navigationSource(): string {
  return `import { defineScreen, defineUseCase } from "mokabook";
import React from "react";
const metadata = { dependencies: [], navPath: ["Fixture"], relatedDocs: [] };
export const mockups = [
  defineScreen({ ...metadata, description: "Home", desktop: <main><a data-mokabook-target="spoof" href="mock:details#section">Details</a></main>, id: "home", mobile: <main><a data-mokabook-target="spoof" href="mock:details#section">Details</a></main>, route: "screens/home.html", title: "Home", useCaseIds: ["tour"] }),
  defineScreen({ ...metadata, description: "Details", desktop: <main id="section">Details</main>, id: "details", mobile: <main id="section">Details</main>, route: "screens/details.html", title: "Details", useCaseIds: ["tour"] }),
  defineUseCase({ ...metadata, description: "Tour", id: "tour", route: "user-flows/tour.html", steps: [{ screenId: "details" }, { screenId: "home" }], title: "Tour" })
];
`;
}
