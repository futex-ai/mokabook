import assert from "node:assert/strict";
import test from "node:test";

import {
  isEligibleBrowseLink,
  NavigationSequencer,
} from "../dist/client/browse.js";

const base = {
  download: false,
  modified: false,
  pathname: "/view/screens/welcome.html",
  sameOrigin: true,
  samePageHash: false,
  target: "",
};

test("browse interception accepts only same-origin catalogue routes", () => {
  assert.equal(isEligibleBrowseLink(base), true);
  assert.equal(isEligibleBrowseLink({ ...base, pathname: "/" }), true);
  assert.equal(
    isEligibleBrowseLink({ ...base, pathname: "/id/welcome" }),
    true,
  );
  assert.equal(
    isEligibleBrowseLink({ ...base, pathname: "/static/screens/a.html" }),
    false,
  );
  assert.equal(isEligibleBrowseLink({ ...base, pathname: "/review" }), false);
  assert.equal(isEligibleBrowseLink({ ...base, sameOrigin: false }), false);
  assert.equal(isEligibleBrowseLink({ ...base, download: true }), false);
  assert.equal(isEligibleBrowseLink({ ...base, modified: true }), false);
  assert.equal(isEligibleBrowseLink({ ...base, samePageHash: true }), false);
  assert.equal(isEligibleBrowseLink({ ...base, target: "_blank" }), false);
  assert.equal(isEligibleBrowseLink({ ...base, target: "_self" }), true);
});

test("navigation sequencing is latest-wins", () => {
  const sequencer = new NavigationSequencer();
  const first = sequencer.begin();
  assert.equal(first.isCurrent(), true);
  assert.equal(first.signal.aborted, false);
  const second = sequencer.begin();
  assert.equal(first.isCurrent(), false);
  assert.equal(first.signal.aborted, true);
  assert.equal(second.isCurrent(), true);
  assert.equal(second.signal.aborted, false);
});
