import assert from "node:assert/strict";
import test from "node:test";

import { compileCatalogue } from "../dist/build/compile.js";
import { writeCompilation } from "../dist/build/transaction.js";
import { loadConfig } from "../dist/config/load.js";
import { startCatalogueServer } from "../dist/server/http.js";
import { createFixture, removeFixture } from "./helpers/fixture.js";

test("published updates replace or clear changed-route shell state", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  const server = await startCatalogueServer(config, {
    base: "main",
    changedRoutes: ["screens/home.html"],
    port: 0,
  });
  context.after(() => server.close());

  const initial = await (await fetch(server.url)).text();
  assert.match(initial, /class="mbk-nav-filter-count">1</);
  assert.match(
    initial,
    /data-changed="true"[^>]+data-route="screens\/home\.html"/,
  );

  server.publishUpdate({ changedRoutes: [], version: 2 });
  const noChanges = await (await fetch(server.url)).text();
  assert.match(noChanges, /class="mbk-nav-filter-count">0</);
  assert.doesNotMatch(noChanges, /data-changed="true"/);

  server.publishUpdate({
    changedRoutes: ["screens/details.html"],
    version: 2,
  });
  const stale = await (await fetch(server.url)).text();
  assert.match(stale, /class="mbk-nav-filter-count">0</);
  assert.doesNotMatch(stale, /data-changed="true"/);

  server.publishUpdate({ changedRoutes: null, version: 3 });
  const unavailable = await (await fetch(server.url)).text();
  assert.doesNotMatch(unavailable, /data-mokabook-filter/);
});
