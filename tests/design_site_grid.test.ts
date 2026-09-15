import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

import {
  attribute,
  byClass,
  designDocument,
  elements,
  textContent,
} from "./helpers/design_catalogue.js";
import { repositoryRoot } from "./helpers/fixture.js";

const FOOTER_GROUPS = ["Site", "Account", "Policies"];

const FOOTER_LINKS = [
  "Home",
  "Docs",
  "Changelog",
  "Sign in",
  "Get started",
  "Terms",
  "Privacy",
];

const HEADER_LINKS = ["Docs", "Changelog", "Sign in", "Get started →"];

const NOUNS = [
  "Screen",
  "Publication",
  "Branch",
  "Pull request",
  "Catalogue",
  "Check",
];

const DOCS_SECTIONS = [
  "Getting started",
  "Authoring",
  "Catalogue",
  "CLI reference",
  "Continuous integration",
  "Mokly Cloud",
  "Reference",
  "Review and edit",
];

const EARLIER = [
  ["Mokly CLI 0.8.0", "2026-09-11"],
  ["Mokly CLI 0.7.1", "2026-09-11"],
];

function label(node: Parameters<typeof textContent>[0]): string {
  return textContent(node).replace(/\s+/g, " ").trim();
}

for (const viewport of ["mobile", "desktop"] as const) {
  test(`${viewport}: the Grid chrome repeats the header nav and the grouped footer`, async () => {
    for (const page of ["home", "docs", "changelog"] as const) {
      const id = `design-site-grid-${page}`;
      const { document } = await designDocument(id, viewport);
      const header = byClass(document, "grid-header")[0];
      assert.ok(header, id);
      assert.deepEqual(
        elements(header, (node) => node.tagName === "a")
          .slice(1)
          .map(label),
        HEADER_LINKS,
        id,
      );
      const footer = byClass(document, "grid-footer")[0];
      assert.ok(footer, id);
      assert.deepEqual(
        byClass(footer, "grid-footer-title").map(label),
        FOOTER_GROUPS,
        id,
      );
      assert.deepEqual(
        elements(footer, (node) => node.tagName === "a")
          .slice(1)
          .map(label),
        FOOTER_LINKS,
        id,
      );
      assert.equal(byClass(document, "grid-crumbs").length, 1, id);
    }
  });

  test(`${viewport}: the Grid home snaps the hero, cards, nouns and steps to the grid`, async () => {
    const { document } = await designDocument(
      "design-site-grid-home",
      viewport,
    );
    const rules = byClass(document, "grid-rules")[0];
    assert.ok(rules, "the hero draws its column rules");
    assert.equal(attribute(rules, "aria-hidden"), "true");
    assert.equal(byClass(document, "grid-hero-copy").length, 1);
    assert.equal(byClass(document, "grid-hero-stage").length, 1);

    const cards = byClass(document, "grid-card");
    assert.equal(cards.length, 3);
    assert.deepEqual(byClass(document, "grid-card-number").map(textContent), [
      "01",
      "02",
      "03",
    ]);
    assert.deepEqual(byClass(document, "grid-card-label").map(textContent), [
      "BROWSE",
      "REVIEW",
      "EDIT",
    ]);
    for (const card of cards) {
      assert.equal(
        elements(
          card,
          (node) => node.tagName === "svg" || node.tagName === "img",
        ).length,
        0,
        "feature cards stay icon-free",
      );
    }

    const definitions = byClass(document, "grid-definition");
    assert.equal(definitions.length, NOUNS.length);
    assert.deepEqual(
      definitions.map((node) =>
        label(elements(node, (child) => child.tagName === "dt")[0]!),
      ),
      NOUNS,
    );
    assert.equal(byClass(document, "grid-steps").length, 1);
    assert.deepEqual(byClass(document, "grid-step-number").map(textContent), [
      "01",
      "02",
      "03",
    ]);
  });

  test(`${viewport}: the Grid documentation frame holds the rail, document and on-this-page`, async () => {
    const { document } = await designDocument(
      "design-site-grid-docs",
      viewport,
    );
    const frame = byClass(document, "grid-docs-frame")[0];
    assert.ok(frame);
    const desktop = viewport === "desktop";
    const rails = byClass(frame, "grid-rail");
    assert.equal(rails.length, desktop ? 1 : 0);
    assert.equal(
      elements(frame, (node) => node.tagName === "details").length,
      desktop ? 0 : 1,
    );
    if (desktop) {
      assert.deepEqual(
        byClass(rails[0]!, "grid-rail-title").map(label),
        DOCS_SECTIONS,
      );
      const current = elements(
        rails[0]!,
        (node) => attribute(node, "aria-current") === "page",
      );
      assert.deepEqual(current.map(label), ["Install"]);
    }
    const code = byClass(frame, "site-code")[0];
    assert.ok(code);
    assert.match(
      label(code),
      /npm install --save-dev @mokly\/mokly react react-dom/,
    );
    assert.equal(label(byClass(code, "site-code-copy")[0]!), "Copy");
    assert.equal(byClass(document, "site-search").length, 1);
    const onPage = byClass(frame, "grid-onpage")[0];
    assert.ok(onPage);
    assert.deepEqual(
      elements(onPage, (node) => node.tagName === "a").map((node) =>
        attribute(node, "href"),
      ),
      [
        "#install-the-package",
        "#add-the-configuration",
        "#author-your-first-screen",
      ],
    );
    assert.equal(
      label(byClass(frame, "site-pager")[0]!),
      "PreviousGetting startedNextConfigure",
    );
  });

  test(`${viewport}: the Grid changelog tables the release and indexes the earlier ones`, async () => {
    const { document, html } = await designDocument(
      "design-site-grid-changelog",
      viewport,
    );
    assert.deepEqual(
      elements(byClass(document, "grid-table-head")[0]!, () => true)
        .slice(1)
        .map(label),
      ["Version", "Date", "Notes", "Release"],
    );
    const row = byClass(document, "grid-table-row")[0];
    assert.ok(row);
    const cells = byClass(row, "grid-cell");
    assert.equal(cells.length, 4);
    assert.equal(label(cells[0]!), "Mokly CLI 0.9.0");
    assert.equal(
      attribute(
        elements(cells[1]!, (node) => node.tagName === "time")[0]!,
        "datetime",
      ),
      "2026-09-15",
    );
    assert.deepEqual(
      elements(cells[2]!, (node) => node.tagName === "h3").map(label),
      ["Breaking changes", "Features"],
    );
    assert.equal(
      attribute(
        elements(cells[3]!, (node) => node.tagName === "a")[0]!,
        "href",
      ),
      "https://github.com/mokly-ai/mokly/compare/v0.8.0...v0.9.0",
    );

    const index = byClass(document, "grid-index-row");
    assert.equal(index.length, EARLIER.length);
    index.forEach((entry, position) => {
      const [version, date] = EARLIER[position]!;
      const entryCells = byClass(entry, "grid-cell");
      assert.equal(entryCells.length, 3, "version, date and compare link only");
      assert.equal(label(entryCells[0]!), version);
      assert.equal(
        attribute(
          elements(entryCells[1]!, (node) => node.tagName === "time")[0]!,
          "datetime",
        ),
        date,
      );
      assert.match(label(entryCells[2]!), /^Compare \d\.\d\.\d to \d\.\d\.\d/);
    });
    assert.match(
      html,
      /https:\/\/github\.com\/futex-ai\/mokabook\/compare\/v0\.7\.1\.\.\.v0\.8\.0/,
    );
    assert.match(
      html,
      /https:\/\/github\.com\/futex-ai\/mokabook\/compare\/v0\.7\.0\.\.\.v0\.7\.1/,
    );
  });
}

test("the Grid stylesheet draws twelve column rules from the hairline token", async () => {
  const stylesheet = await fs.readFile(
    path.join(repositoryRoot, "examples/basic/generated/site-grid.css"),
    "utf8",
  );
  assert.match(stylesheet, /--grid-columns: 12;/);
  assert.match(stylesheet, /repeating-linear-gradient\(/);
  assert.match(stylesheet, /var\(--site-folio-line\) 0 1px/);
});

test("the Grid changelog index matches the real CHANGELOG.md headings", async () => {
  const changelog = await fs.readFile(
    path.join(repositoryRoot, "CHANGELOG.md"),
    "utf8",
  );
  for (const heading of [
    "## [0.8.0](https://github.com/futex-ai/mokabook/compare/v0.7.1...v0.8.0) (2026-09-11)",
    "## [0.7.1](https://github.com/futex-ai/mokabook/compare/v0.7.0...v0.7.1) (2026-09-11)",
  ]) {
    assert.ok(changelog.includes(heading), heading);
  }
});
