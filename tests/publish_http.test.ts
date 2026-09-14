import assert from "node:assert/strict";
import test from "node:test";

import { uploadCatalogue } from "../dist/publish/http.js";
import { resolvePublishOptions } from "../dist/publish/options.js";

const options = {
  endpoint: "https://example.com/upload",
  token: "private-token",
};

test("publish options prefer explicit credentials and reject unsafe HTTP inputs", () => {
  assert.deepEqual(
    resolvePublishOptions(options, {
      MOKLY_ENDPOINT: "https://other.test",
      MOKLY_TOKEN: "other",
    }),
    options,
  );
  assert.deepEqual(
    resolvePublishOptions(
      {},
      { MOKLY_ENDPOINT: options.endpoint, MOKLY_TOKEN: options.token },
    ),
    options,
  );
  for (const endpoint of [
    "",
    "./upload",
    "ftp://example.com",
    "https://user:secret@example.com",
    "https://example.com/#secret",
  ])
    assert.throws(
      () => resolvePublishOptions({ ...options, endpoint }, {}),
      /cli-invalid/,
    );
  for (const token of ["", "a\nb", "a b", "a:b"])
    assert.throws(
      () => resolvePublishOptions({ ...options, token }, {}),
      /cli-invalid/,
    );
});

test("HTTP boundary sends exact bytes with bearer auth and refuses redirects", async () => {
  const body = Buffer.from("compressed archive");
  let calls = 0;
  const request: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(url, options.endpoint);
    assert.equal(init?.method, "POST");
    assert.equal(init?.redirect, "manual");
    assert.equal(init?.body, body);
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("Authorization"), "Bearer private-token");
    assert.equal(headers.get("Content-Type"), "application/gzip");
    assert.equal(headers.get("Content-Length"), String(body.length));
    assert.ok(init?.signal);
    return new Response(null, { status: 204 });
  };
  await uploadCatalogue(options, body, request);
  assert.equal(calls, 1);
});

for (const [status, code] of [
  [400, "upload-invalid-bundle"],
  [422, "upload-invalid-bundle"],
  [401, "upload-unauthorized"],
  [403, "upload-unauthorized"],
  [413, "upload-too-large"],
  [426, "upload-unsupported-version"],
  [302, "upload-failed"],
  [429, "upload-failed"],
  [500, "upload-failed"],
] as const) {
  test(`HTTP ${status} has a stable ${code} category without leaking the response`, async () => {
    let cancelled = false;
    let calls = 0;
    const request: typeof fetch = async () => {
      calls++;
      return new Response(
        new ReadableStream({
          cancel() {
            cancelled = true;
          },
        }),
        {
          status,
          headers: { Location: "https://private-token.invalid" },
        },
      );
    };
    await assert.rejects(
      uploadCatalogue(options, Buffer.from("body"), request),
      (error: unknown) => {
        assert.equal((error as { code: string }).code, code);
        assert.doesNotMatch(String(error), /private-token/);
        return true;
      },
    );
    assert.equal(calls, 1);
    assert.equal(cancelled, true);
  });
}

test("network errors and aborts remain typed and never retain transport secrets", async () => {
  await assert.rejects(
    uploadCatalogue(options, Buffer.from("body"), async () => {
      throw new Error("private-token");
    }),
    (error: unknown) => {
      assert.equal((error as { code: string }).code, "upload-failed");
      assert.doesNotMatch(String(error), /private-token/);
      assert.equal((error as Error).cause, undefined);
      return true;
    },
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    uploadCatalogue(
      options,
      Buffer.from("body"),
      async () => {
        assert.fail("an aborted publish must not start a request");
      },
      controller.signal,
    ),
    /upload-failed/,
  );
});
