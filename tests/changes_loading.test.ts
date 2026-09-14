import assert from "node:assert/strict";
import test from "node:test";

import { compileCatalogue } from "../dist/build/compile.js";
import { loadConfig } from "../dist/config/load.js";
import { startCatalogueServer } from "../dist/server/http.js";
import { createFixture, removeFixture } from "./helpers/fixture.js";

test("live navigation keeps its filters while Changes is pending, ready or unavailable", async (t) => {
  const fixture = await createFixture();
  t.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const compilation = await compileCatalogue(config);
  const server = await startCatalogueServer(config, {
    base: "main",
    port: 0,
    manifest: compilation.manifest,
    changesStatus: "pending",
  });
  t.after(() => server.close());
  const read = async () => (await fetch(server.url)).text();
  const pending = await read();
  assert.match(pending, /data-filter="all"/);
  assert.match(pending, /data-filter="changed"/);
  assert.match(pending, /data-changes-status="pending"/);
  assert.match(pending, /Checking for changes/);
  assert.doesNotMatch(pending, /mbk-nav-filter-count">0</);

  server.publishUpdate({ changedRoutes: [], changesStatus: "ready" });
  const empty = await read();
  assert.match(empty, /data-changes-status="ready"/);
  assert.match(empty, /mbk-nav-filter-count">0</);

  server.publishUpdate({ changedRoutes: null, changesStatus: "pending" });
  assert.match(await read(), /data-changes-status="pending"/);
  server.publishUpdate({ changesStatus: "unavailable" });
  const unavailable = await read();
  assert.match(unavailable, /data-filter="changed"/);
  assert.match(unavailable, /data-changes-status="unavailable"/);
  assert.match(unavailable, /Changes are unavailable/);
  assert.doesNotMatch(unavailable, /mbk-nav-spinner/);
});

test("static capture omits live Changes states but retains supplied evidence", async (t) => {
  const fixture = await createFixture();
  t.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const compilation = await compileCatalogue(config);
  const server = await startCatalogueServer(config, {
    base: "main",
    port: 0,
    manifest: compilation.manifest,
    liveChanges: false,
  });
  t.after(() => server.close());
  const read = async () => (await fetch(server.url)).text();
  assert.doesNotMatch(await read(), /data-mokly-filter|data-nav-status/);
  server.publishUpdate({ changesStatus: "pending" });
  assert.doesNotMatch(await read(), /data-mokly-filter|data-nav-status/);
  server.publishUpdate({ changedRoutes: [] });
  const classified = await read();
  assert.match(classified, /data-changes-status="ready"/);
  assert.match(classified, /mbk-nav-filter-count">0</);
});
