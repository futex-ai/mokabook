import assert from "node:assert/strict";

import * as api from "mokabook";

const expected = [
  "MockLink",
  "ReviewIgnore",
  "ReviewIgnoreScope",
  "collection",
  "defineCollection",
  "defineConfig",
  "defineRoot",
  "defineScreen",
  "defineUseCase",
  "mockLink",
  "reviewMaterialKey",
  "screen",
];

assert.deepEqual(Object.keys(api).sort(), expected);
assert.equal(api.mockLink("packed-home"), "mock:packed-home");
