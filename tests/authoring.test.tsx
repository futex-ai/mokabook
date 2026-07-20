import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ReviewIgnore,
  ReviewIgnoreScope,
  reviewMaterialKey,
} from "../dist/index.js";
import { serializeReviewSentinels } from "../dist/renderer/sentinels.js";

test("ReviewIgnore serializes to inert paired comments", () => {
  const key = reviewMaterialKey({ current: "home" });
  const html = serializeReviewSentinels(
    renderToStaticMarkup(
      <ReviewIgnore id="shared-nav" materialKey={key}>
        <nav>Navigation</nav>
      </ReviewIgnore>,
    ),
  );
  assert.match(html, /<!--mokabook-review-ignore:start:shared-nav-->/);
  assert.match(html, /<!--mokabook-review-ignore:end:shared-nav-->/);
  assert.match(html, /<!--mokabook-review-material:shared-nav:[a-f0-9]{64}-->/);
});

test("ReviewIgnoreScope can render children with no marker contract", () => {
  const html = renderToStaticMarkup(
    <ReviewIgnoreScope enabled={false}>
      <ReviewIgnore id="shared-nav">
        <nav>Navigation</nav>
      </ReviewIgnore>
    </ReviewIgnoreScope>,
  );
  assert.equal(html, "<nav>Navigation</nav>");
});

test("review material keys reject cyclic or non-finite state", () => {
  const cyclic: { self?: object } = {};
  cyclic.self = cyclic;
  assert.throws(() => reviewMaterialKey(cyclic), /cyclic/);
  assert.throws(() => reviewMaterialKey({ value: Number.NaN }), /finite/);
});
