import assert from "node:assert/strict";
import { test } from "node:test";

import { Picking } from "../src/viewer/picking.js";

test("idle cancellation does not clear a separately requested highlight", () => {
  let cleared = 0;
  const picking = new Picking(
    () => ({}),
    () => true,
    () => {
      cleared++;
    },
    (error) => error as Error,
  );
  picking.end({ reason: "cancelled" });
  picking.end({ reason: "cancelled" });
  assert.equal(cleared, 0);
});
