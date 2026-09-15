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

const PAGES = ["home", "docs", "changelog"] as const;

const RAILS = {
  changelog: "Releases",
  docs: "Breadcrumb",
  home: "Sections",
};

const FOOTER_GROUPS = [
  ["Site", ["Home", "Docs", "Changelog"]],
  ["Account", ["Sign in", "Get started"]],
  ["Legal", ["Terms", "Privacy"]],
] as const;

const EARLIER_RELEASES = [
  ["Mokly CLI 0.8.0", "2026-09-11"],
  ["Mokly CLI 0.7.1", "2026-09-11"],
] as const;

function label(node: Parameters<typeof textContent>[0]): string {
  return textContent(node).replace(/\s+/g, " ").trim();
}

function id(page: (typeof PAGES)[number]): string {
  return `design-site-editorial-${page}`;
}

for (const viewport of ["mobile", "desktop"] as const) {
  for (const page of PAGES) {
    test(`${viewport}: the ${page} is set under the ruled masthead`, async () => {
      const { document } = await designDocument(id(page), viewport);
      const masthead = byClass(document, "ed-masthead")[0];
      assert.ok(masthead, "the masthead frames every editorial page");
      assert.equal(masthead.tagName, "header");
      const brand = byClass(masthead, "site-brand")[0];
      assert.ok(brand);
      assert.equal(attribute(brand, "aria-label"), "Mokly home");
      const main = elements(
        masthead,
        (node) => attribute(node, "aria-label") === "Main",
      )[0];
      assert.ok(main, "the masthead line carries the main navigation");
      assert.deepEqual(
        elements(main, (node) => node.tagName === "a").map(label),
        ["Docs", "Changelog", "Sign in", "Get started →"],
      );
      const rail = elements(
        masthead,
        (node) => attribute(node, "aria-label") === RAILS[page],
      )[0];
      assert.ok(rail, `the ${page} rail follows the masthead line`);
      assert.ok(
        byClass(masthead, "ed-rail")[0],
        "the rail sits in its own row",
      );
      assert.equal(
        byClass(masthead, "site-search").length,
        page === "docs" ? 1 : 0,
        "only the documentation rail carries search",
      );
    });

    test(`${viewport}: the ${page} footer groups the seven destinations`, async () => {
      const { document } = await designDocument(id(page), viewport);
      const groups = byClass(document, "ed-footer-group");
      assert.equal(groups.length, 3);
      assert.deepEqual(
        groups.map((group) => [
          label(byClass(group, "ed-rubric")[0]!),
          elements(group, (node) => node.tagName === "a").map(label),
        ]),
        FOOTER_GROUPS.map(([title, links]) => [title, [...links]]),
      );
    });
  }

  test(`${viewport}: the home sets the features as a ruled table of contents`, async () => {
    const { document } = await designDocument(id("home"), viewport);
    const rows = byClass(document, "ed-toc-row");
    assert.equal(rows.length, 3);
    assert.deepEqual(
      rows.map((row) => [
        attribute(row, "id"),
        label(byClass(row, "ed-toc-number")[0]!),
        label(byClass(row, "ed-rubric")[0]!),
        label(elements(row, (node) => node.tagName === "h3")[0]!),
      ]),
      [
        ["browse", "01", "BROWSE", "See every branch as screens."],
        ["review", "02", "REVIEW", "Comment on the screen itself."],
        ["edit", "03", "EDIT", "Ask for the change beside the screen."],
      ],
    );
    assert.deepEqual(
      byClass(document, "ed-rail-link").map((link) => attribute(link, "href")),
      ["#browse", "#review", "#edit", "#foundation"],
    );
    const display = byClass(document, "ed-display")[0];
    assert.ok(display, "the hero heading is the oversized display line");
    assert.equal(display.tagName, "h1");
    assert.equal(
      label(display),
      "Design in your repository.Decide in the pull request.",
    );
    assert.equal(byClass(document, "ed-steps").length, 1);
  });

  test(`${viewport}: the documentation leads with a pull quote`, async () => {
    const { document } = await designDocument(id("docs"), viewport);
    const root = byClass(document, "ed-root")[0];
    assert.ok(root);
    assert.match(
      attribute(root, "class") ?? "",
      /ed-root--docs/,
      "the documentation page widens the measure",
    );
    const quote = byClass(document, "ed-pullquote")[0];
    assert.ok(quote);
    assert.equal(
      label(quote),
      "Add Mokly to the repository that holds your components.",
    );
    const onPage = byClass(document, "ed-onpage")[0];
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
      byClass(document, "site-docs-sidebar").length,
      viewport === "desktop" ? 1 : 0,
    );
    assert.equal(
      elements(document, (node) => node.tagName === "details").length,
      viewport === "desktop" ? 0 : 1,
    );
    assert.deepEqual(byClass(document, "ed-pager-item").map(label), [
      "← PreviousGetting started",
      "Next →Configure",
    ]);
    assert.equal(
      label(byClass(document, "site-code-copy")[0]!),
      "Copy",
      "the install command keeps its copy control",
    );
  });

  test(`${viewport}: the changelog rules version and date beside the notes`, async () => {
    const { document, html } = await designDocument(id("changelog"), viewport);
    const entry = byClass(document, "ed-entry")[0];
    assert.ok(entry);
    const meta = byClass(entry, "ed-entry-meta")[0];
    assert.ok(meta, "the ruled left column carries the version and the date");
    assert.equal(label(byClass(meta, "site-badge")[0]!), "Mokly CLI 0.9.0");
    const time = elements(meta, (node) => node.tagName === "time")[0];
    assert.ok(time);
    assert.equal(attribute(time, "datetime"), "2026-09-15");
    assert.deepEqual(byClass(entry, "ed-rubric").map(label), [
      "Breaking changes",
      "Features",
    ]);
    assert.match(
      html,
      /https:\/\/github\.com\/mokly-ai\/mokly\/compare\/v0\.8\.0\.\.\.v0\.9\.0/,
    );
    const rows = byClass(document, "ed-index-row");
    assert.deepEqual(
      rows.map((row) => [
        label(byClass(row, "ed-index-link")[0]!).replace(" ↗", ""),
        attribute(
          elements(row, (node) => node.tagName === "time")[0]!,
          "datetime",
        ),
      ]),
      EARLIER_RELEASES.map((release) => [...release]),
    );
  });
}

test("the editorial stylesheet extends the shared layout with its own rules", async () => {
  const stylesheet = await fs.readFile(
    path.join(repositoryRoot, "examples/basic/generated/site-editorial.css"),
    "utf8",
  );
  assert.match(stylesheet, /@import "\.\/site\.css";/);
  for (const property of ["--ed-rule", "--ed-rule-strong", "--ed-measure"])
    assert.match(stylesheet, new RegExp(`${property}:`), property);
  assert.match(
    stylesheet,
    /--ed-rule-strong: 2px solid var\(--site-folio-line-strong\);/,
  );
  assert.doesNotMatch(stylesheet, /box-shadow/);
});
