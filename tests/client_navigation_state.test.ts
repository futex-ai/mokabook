import assert from "node:assert/strict";
import test from "node:test";

import { navigationConstraintChanges } from "../dist/client/browse_navigation_state.js";

test("active-row constraint changes clear only controls that hide it", () => {
  assert.deepEqual(
    navigationConstraintChanges({
      changed: false,
      changedOnly: true,
      query: "welcome",
      route: "screens/details.html",
      text: "Details",
    }),
    { clearQuery: true, showAll: true },
  );
  assert.deepEqual(
    navigationConstraintChanges({
      changed: true,
      changedOnly: true,
      query: "details",
      route: "screens/details.html",
      text: "Details",
    }),
    { clearQuery: false, showAll: false },
  );
  assert.deepEqual(
    navigationConstraintChanges({
      changed: false,
      changedOnly: false,
      query: "screens/details",
      route: "screens/details.html",
      text: "Something else",
    }),
    { clearQuery: false, showAll: false },
  );
});
