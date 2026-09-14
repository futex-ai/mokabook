import assert from "node:assert/strict";

import * as api from "@mokly/mokly";

const expected = [
  "MockLink",
  "ReviewIgnore",
  "ReviewIgnoreScope",
  "collection",
  "defineCollection",
  "defineComponent",
  "defineConfig",
  "definePage",
  "defineRoot",
  "defineScreen",
  "defineUseCase",
  "mockLink",
  "page",
  "reviewMaterialKey",
  "screen",
];

assert.deepEqual(Object.keys(api).sort(), expected);
assert.equal(api.mockLink("packed-home"), "mock:packed-home");
assert.equal(
  api.mockLink("packed-home", "packed-section"),
  "mock:packed-home#packed-section",
);
assert.throws(() => api.mockLink("packed-home#packed-section"), /kebab-case/);
