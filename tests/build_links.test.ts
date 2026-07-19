import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { compileCatalogue } from "../dist/build/compile.js";
import { loadConfig } from "../dist/config/load.js";
import {
  createFixture,
  removeFixture,
  validEntrySource,
} from "./helpers/fixture.js";

test("id-link rewriting changes only complete href attributes", async (context) => {
  const fixture = await createFixture(
    validEntrySource({
      body: `<p>Literal mock:missing-screen and mock:details</p><div data-route="mock:details">Metadata</div><a href="mock:details">Details</a>`,
    }),
  );
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);

  const compilation = await compileCatalogue(config);
  const mobile = compilation.outputs.get("screens/home.mobile.html") ?? "";

  assert.match(mobile, /Literal mock:missing-screen and mock:details/);
  assert.match(mobile, /data-route="mock:details"/);
  assert.match(mobile, /href="\.\/details\.mobile\.html"/);
});

test("id-link rewriting uses parsed encoded href values", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  await fs.promises.writeFile(
    path.join(fixture.root, "renderer.ts"),
    `export default function render() {
  return '<!doctype html><html><body><a href="mock&#58;details">Details</a></body></html>';
}
`,
  );
  await fs.promises.writeFile(
    fixture.configPath,
    `export default { entriesDir: "entries", mockupsDir: "mockups", renderer: "renderer.ts", repoRoot: "." };
`,
  );
  const config = await loadConfig(fixture.root);

  const compilation = await compileCatalogue(config);
  const mobile = compilation.outputs.get("screens/home.mobile.html") ?? "";

  assert.match(mobile, /href="\.\/details\.mobile\.html"/);
  assert.doesNotMatch(mobile, /mock&#58;details/);
});

test("link validation fails closed for non-portable targets", async (context) => {
  const fixture = await createFixture(
    validEntrySource({
      body: `<a href="details.mobile.html#absent">Broken anchor</a>`,
    }),
  );
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  await assert.rejects(() => compileCatalogue(config), /missing target anchor/);
  await fs.promises.writeFile(
    fixture.entryPath,
    validEntrySource({ body: `<a href="../../../outside.html">Escape</a>` }),
  );
  await assert.rejects(() => compileCatalogue(config), /escapes mockupsDir/);
  await fs.promises.writeFile(
    fixture.entryPath,
    validEntrySource({ body: `<a href="missing.html">Missing</a>` }),
  );
  await assert.rejects(() => compileCatalogue(config), /missing target/);
  await fs.promises.writeFile(
    fixture.entryPath,
    validEntrySource({
      body: `<a href="./details.html">Logical route only</a>`,
    }),
  );
  await assert.rejects(() => compileCatalogue(config), /missing target/);
  await fs.promises.writeFile(
    fixture.entryPath,
    validEntrySource({
      body: `<a href="/screens/details.mobile.html">Root absolute</a>`,
    }),
  );
  await assert.rejects(() => compileCatalogue(config), /root-absolute link/);
});
