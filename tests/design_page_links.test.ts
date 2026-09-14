import assert from "node:assert/strict";
import test from "node:test";

import {
  attribute,
  byClass,
  designDocument,
  elements,
  textContent,
} from "./helpers/design_catalogue.js";

for (const viewport of ["mobile", "desktop"] as const) {
  test(`${viewport}: page designs retain their own inspector, drawer, and document links`, async () => {
    const pairs = [
      ["design-page-view", "design-page-details"],
      ["design-page-details", "design-page-view"],
    ] as const;
    for (const [id, target] of pairs) {
      const { document } = await designDocument(id, viewport);
      assert.equal(
        attribute(
          byClass(document, "ce-inspector-link")[0]!,
          "data-mokly-link",
        ),
        target,
      );
      const welcome = elements(
        document,
        (node) =>
          node.tagName === "a" && textContent(node).trim() === "Open Welcome",
      );
      assert.equal(
        attribute(welcome[0]!, "data-mokly-link"),
        "design-browse-screen",
      );
      assert.equal(byClass(document, "mbk-cmp-toolbar").length, 0);
    }
    const { document } = await designDocument(
      "design-page-navigation",
      viewport,
    );
    const pageRow = byClass(document, "mbk-nav-row").find(
      (node) => textContent(node).trim() === "Getting started",
    );
    assert.ok(pageRow);
    assert.equal(attribute(pageRow, "data-mokly-link"), "design-page-view");
    if (viewport === "mobile") {
      const current = await designDocument("design-page-view", viewport);
      assert.equal(
        attribute(
          byClass(current.document, "mbk-menu-btn")[0]!,
          "data-mokly-link",
        ),
        "design-page-navigation",
      );
      assert.equal(
        attribute(byClass(document, "mbk-menu-btn")[0]!, "data-mokly-link"),
        "design-page-view",
      );
    }
  });

  test(`${viewport}: publication designs preserve their capability and supported comparison destinations`, async () => {
    const current = await designDocument(
      "design-publication-catalogue",
      viewport,
    );
    assert.equal(byClass(current.document, "mbk-nav-filter").length, 0);
    assert.equal(byClass(current.document, "mbk-cmp-toolbar").length, 0);
    const changes = await designDocument(
      "design-publication-changes",
      viewport,
    );
    assert.equal(
      byClass(changes.document, "mbk-nav-filter").length,
      viewport === "desktop" ? 1 : 0,
    );
    assert.equal(byClass(changes.document, "mbk-cmp-toolbar").length, 1);
    const overlay = elements(
      changes.document,
      (node) => node.tagName === "a" && textContent(node).trim() === "Overlay",
    );
    assert.equal(
      attribute(overlay[0]!, "data-mokly-link"),
      "design-changes-overlay",
    );
  });
}
