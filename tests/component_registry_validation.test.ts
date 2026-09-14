import assert from "node:assert/strict";
import test from "node:test";

import { compileCatalogue } from "../dist/build/compile.js";
import { loadConfig } from "../dist/config/load.js";
import { componentEntrySource } from "./helpers/component_fixture.js";
import { createFixture, removeFixture } from "./helpers/fixture.js";

for (const [name, extra, exports, diagnostic] of [
  [
    "forged variants",
    "const forged = { ...action.entry, variants: {} };",
    "forged, pane.entry,",
    /saved variant/,
  ],
  [
    "mutated variants",
    "action.entry.variants = undefined;",
    undefined,
    /saved variant/,
  ],
  [
    "mutated controls",
    'action.entry.controls = { unknown: { kind: "text" } };',
    undefined,
    /control/,
  ],
  [
    "mutated render",
    "action.entry.render = null;",
    undefined,
    /render must be a function/,
  ],
  [
    "mutated props",
    "action.entry.variants[0].props = { label: 42 };",
    undefined,
    /label/,
  ],
] as const) {
  test(`registry validates ${name} before rendering`, async (t) => {
    const fixture = await createFixture(
      componentEntrySource({ extra, ...(exports ? { exports } : {}) }),
    );
    t.after(() => removeFixture(fixture));
    await assert.rejects(
      compileCatalogue(await loadConfig(fixture.root)),
      (error: Error) => {
        assert.notEqual(error.name, "TypeError");
        assert.match(error.message, /component/i);
        assert.match(error.message, diagnostic);
        return true;
      },
    );
  });
}
