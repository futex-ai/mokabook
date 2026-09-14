import assert from "node:assert/strict";
import test from "node:test";

import { waitForBrowseChanges } from "../scripts/large/browse.mjs";

test("benchmark waits for Changes delivery, not just parent classification", async (t) => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    requests++;
    return new Response(
      requests < 3
        ? '<div data-mokly-filter="" data-changes-status="pending">Changes</div>'
        : '<div data-mokly-filter="" data-changes-status="ready">Changes</div>',
    );
  });
  await waitForBrowseChanges("http://fixture.invalid", 3000);
  assert.equal(requests, 3);
});

test("benchmark stops with an error when Changes calculation is unavailable", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response('<div data-changes-status="unavailable">Changes</div>'),
  );
  await assert.rejects(
    waitForBrowseChanges("http://fixture.invalid", 300),
    /unavailable/,
  );
});

test("benchmark rejects failed Browse requests rather than reporting success", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("Failed", { status: 500 }),
  );
  await assert.rejects(
    waitForBrowseChanges("http://fixture.invalid", 3000),
    /HTTP 500/,
  );
});
