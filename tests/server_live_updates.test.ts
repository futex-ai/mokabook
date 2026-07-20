import assert from "node:assert/strict";
import test from "node:test";

import { compileCatalogue } from "../dist/build/compile.js";
import { writeCompilation } from "../dist/build/transaction.js";
import { loadConfig } from "../dist/config/load.js";
import { startCatalogueServer } from "../dist/server/http.js";
import { createFixture, removeFixture } from "./helpers/fixture.js";

test("every served document loads the browser update client", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  const server = await startCatalogueServer(config, {
    base: "origin/main",
    port: 0,
  });
  context.after(() => server.close());

  for (const route of ["/", "/review", "/view/screens/home.html", "/absent"]) {
    const document = await (await fetch(`${server.url}${route}`)).text();
    assert.match(
      document,
      /<script src="\/__mokabook\/client\/browser\.js" type="module"><\/script>/,
      route,
    );
  }
  const browser = await fetch(`${server.url}/__mokabook/client/browser.js`);
  assert.equal(browser.status, 200);
  assert.match(browser.headers.get("content-type") ?? "", /javascript/);
  assert.match(await browser.text(), /EventSource/);
  assert.equal(
    (await fetch(`${server.url}/__mokabook/client/browse_state.js`)).status,
    200,
  );
  assert.equal(
    (await fetch(`${server.url}/__mokabook/client/live_updates.js`)).status,
    200,
  );
  assert.equal(
    (await fetch(`${server.url}/__mokabook/client/unknown.js`)).status,
    404,
  );
});
