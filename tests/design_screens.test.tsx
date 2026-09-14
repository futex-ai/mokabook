import assert from "node:assert/strict";
import { test } from "node:test";

import {
  attribute,
  byClass,
  designDocument,
  elements,
  textContent,
} from "./helpers/design_catalogue.js";

const additions = [
  ["design-browse-details-screen", "design/browse/views/details-screen.html"],
  ["design-browse-tag-picker", "design/browse/states/tags/picker.html"],
  ["design-browse-tag-forms", "design/browse/states/tags/forms.html"],
  ["design-browse-tag-onboarding", "design/browse/states/tags/onboarding.html"],
  [
    "design-browse-tag-onboarding-picker",
    "design/browse/states/tags/onboarding-picker.html",
  ],
] as const;

for (const viewport of ["mobile", "desktop"] as const) {
  test(`${viewport}: catalogue navigation separates pages and components`, async () => {
    const { document } = await designDocument(
      viewport === "mobile" ? "design-browse-navigation" : "design-browse-home",
      viewport,
    );
    const sections = byClass(document, "mbk-nav-section");
    assert.deepEqual(
      sections.map((section) => attribute(section, "data-nav-section")),
      ["pages", "components"],
    );
    assert.ok(sections.every((section) => attribute(section, "open") === ""));
    const pages = textContent(sections[0] ?? document);
    const components = textContent(sections[1] ?? document);
    assert.match(pages, /Welcome/);
    assert.match(pages, /Example tour/);
    assert.doesNotMatch(pages, /Action|Toolbar/);
    assert.match(components, /Action/);
    assert.match(components, /Toolbar/);
    assert.doesNotMatch(components, /Welcome|Example tour/);
  });

  test(`${viewport}: all five owning destinations render as light-only designs`, async () => {
    for (const [id, route] of additions) {
      const { entry, document } = await designDocument(id, viewport);
      assert.equal(entry.route, route);
      assert.equal(entry.darkFragments, undefined);
      assert.equal(byClass(document, "mbk-shell").length, 1);
      assert.equal(
        byClass(
          document,
          viewport === "mobile" ? "phone-frame" : "browser-frame",
        ).length,
        1,
      );
    }
  });

  test(`${viewport}: tag states agree on query, picker, selection, and visible rows`, async () => {
    for (const [id, tag, picker] of [
      ["design-browse-tag-picker", undefined, true],
      ["design-browse-tag-filter", "forms", true],
      ["design-browse-tag-forms", "forms", false],
      ["design-browse-tag-onboarding", "onboarding", false],
      ["design-browse-tag-onboarding-picker", "onboarding", true],
    ] as const) {
      const { document } = await designDocument(id, viewport);
      const query = byClass(document, "mbk-search-value").map(textContent);
      assert.deepEqual(query, tag ? [`tag:${tag}`] : [], id);
      assert.equal(
        byClass(document, "mbk-tag-picker").length,
        Number(picker),
        id,
      );
      for (const chip of byClass(document, "mbk-chip").filter(
        (node) => byClass(node, "active").length,
      )) {
        assert.equal(textContent(chip).trim(), tag, id);
      }
      if (viewport === "desktop" && tag) {
        const rows = byClass(document, "mbk-nav-row").map((row) =>
          textContent(row).trim(),
        );
        assert.ok(rows.includes("Welcome"), id);
        assert.equal(rows.includes("Details"), tag === "forms", id);
        assert.ok(!rows.includes("Example tour"), id);
      }
    }
  });

  test(`${viewport}: light endpoints expose the paired scheme control`, async () => {
    for (const id of [
      "design-browse-screen",
      "design-browse-details-screen",
      "design-review-changed",
    ]) {
      const { document } = await designDocument(id, viewport);
      assert.equal(
        elements(
          document,
          (node) => attribute(node, "aria-label") === "Switch to dark mode",
        ).length,
        1,
        id,
      );
    }
  });
}

test("inspector metadata belongs to its depicted subject", async () => {
  const detailPage = await designDocument("design-review-added", "desktop");
  const detailBody = byClass(detailPage.document, "mbk-details-body")[0];
  assert.ok(detailBody);
  const details = textContent(detailBody);
  assert.match(details, /screens\/details\.html/);
  assert.doesNotMatch(
    details,
    /screens\/welcome\.html|landing screen|onboarding/,
  );
  assert.match(details, /Example tour/);
  const removedPage = await designDocument("design-review-removed", "desktop");
  const removedBody = byClass(removedPage.document, "mbk-details-body")[0];
  assert.ok(removedBody);
  const removed = textContent(removedBody);
  assert.doesNotMatch(
    removed,
    /screens\/welcome\.html|Example tour|onboarding/,
  );
  assert.match(removed, /Farewell/);
});
