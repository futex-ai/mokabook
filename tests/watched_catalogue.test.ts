import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";

import {
  changedCount,
  version,
  waitForChangedCount,
  waitForInitialChanges,
  waitForUpdate,
} from "./helpers/watched_catalogue.js";

/** One shell response at a published version, with a completed Changes state. */
function shell(published: number, count?: number): string {
  const filter =
    count === undefined
      ? '<span class="mbk-nav-filter-count">—</span>'
      : `<span class="mbk-nav-filter-count">${count}</span>`;
  const status = count === undefined ? "unavailable" : "ready";
  return `<html><body data-mokly-update-version="${published}" data-changes-status="${status}">${filter}</body></html>`;
}

/** Serve each queued shell response once, repeating the last one after. */
async function publish(
  responses: readonly string[],
): Promise<{ close: () => Promise<void>; url: string }> {
  let served = 0;
  const server = http.createServer((_request, response) => {
    const body = responses[Math.min(served, responses.length - 1)] ?? "";
    served += 1;
    response.writeHead(200, { "content-type": "text/html" });
    response.end(body);
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      }),
    url: `http://127.0.0.1:${address.port}`,
  };
}

for (const count of [0, undefined]) {
  test(`initial readiness waits past pending usage for ${count ?? "unavailable"} Changes`, async () => {
    const pending = shell(2).replace(
      'data-changes-status="unavailable"',
      'data-changes-status="pending"',
    );
    const completed = shell(3, count);
    const running = await publish([pending, pending, completed]);
    try {
      assert.equal(await waitForInitialChanges(running.url), completed);
    } finally {
      await running.close();
    }
  });
}

test("initial readiness accepts an already-published zero without another update", async () => {
  const completed = shell(3, 0);
  const running = await publish([completed]);
  try {
    assert.equal(await waitForInitialChanges(running.url), completed);
  } finally {
    await running.close();
  }
});

test("a settled wait passes over the state between edit operations", async () => {
  const running = await publish([shell(1, 2), shell(2, 0)]);
  try {
    const html = await waitForChangedCount(running.url, 0, 0);
    assert.equal(version(html), 2);
    assert.equal(changedCount(html), 0);
  } finally {
    await running.close();
  }
});

test("a settled wait reaches an edit that makes Changes unavailable", async () => {
  const running = await publish([shell(1, 2), shell(2)]);
  try {
    const html = await waitForChangedCount(running.url, 0);
    assert.equal(version(html), 2);
    assert.equal(changedCount(html), undefined);
    assert.match(html, /data-changes-status="unavailable"/);
  } finally {
    await running.close();
  }
});

test("waiting for any update stops at the first published version", async () => {
  const running = await publish([shell(1, 2), shell(2, 0)]);
  try {
    const html = await waitForUpdate(running.url, 0);
    assert.equal(version(html), 1);
    assert.equal(changedCount(html), 2);
  } finally {
    await running.close();
  }
});
