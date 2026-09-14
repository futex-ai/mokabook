import assert from "node:assert/strict";
import test from "node:test";

import { settledRenderCapability } from "./helpers/component_controls_state.js";

const capability = { token: "test-token", generation: "test-generation" };

function shell(status?: string, usageComplete = true): string {
  const state = status ? `data-changes-status="${status}"` : "";
  return `<body data-mokly-update-version="4" ${state}><script data-workspace-data="">${JSON.stringify({ renderCapability: capability, usageComplete })}</script></body>`;
}

test("completed usage does not settle controls while Changes is pending", () => {
  assert.equal(settledRenderCapability(shell("pending")), undefined);
});

for (const status of ["ready", "unavailable"]) {
  test(`controls settle on the published ${status} Changes version`, () => {
    assert.deepEqual(settledRenderCapability(shell(status)), {
      ...capability,
      version: "4",
    });
  });
}

test("missing Changes status cannot supply a settled controls baseline", () => {
  assert.equal(settledRenderCapability(shell()), undefined);
});

test("partial usage cannot supply a settled controls baseline", () => {
  assert.equal(settledRenderCapability(shell("unavailable", false)), undefined);
});

test("settled controls require both authority and a published version", () => {
  const ready = shell("ready");
  assert.equal(
    settledRenderCapability(ready.replace('data-workspace-data=""', "")),
    undefined,
  );
  assert.equal(
    settledRenderCapability(ready.replace('data-mokly-update-version="4"', "")),
    undefined,
  );
  assert.equal(
    settledRenderCapability(ready.replace(JSON.stringify(capability), "null")),
    undefined,
  );
});
