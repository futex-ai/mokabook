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
  type Element,
} from "./helpers/design_catalogue.js";
import { repositoryRoot } from "./helpers/fixture.js";

const VIEWPORTS = ["mobile", "desktop"] as const;

const HEADER_LINKS = ["Docs", "Changelog", "Sign in", "Get started →"];

const FOOTER_LINKS = [
  "Home",
  "Docs",
  "Changelog",
  "Sign in",
  "Get started",
  "Terms",
  "Privacy",
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

const RELEASES = [
  ["0.9.0", "2026-09-15", "mokly-ai/mokly/compare/v0.8.0...v0.9.0"],
  ["0.8.0", "2026-09-11", "futex-ai/mokabook/compare/v0.7.1...v0.8.0"],
  ["0.7.1", "2026-09-11", "futex-ai/mokabook/compare/v0.7.0...v0.7.1"],
] as const;

function label(node: Element): string {
  return textContent(node).replace(/\s+/g, " ").trim();
}

function classes(node: Element): string[] {
  return (attribute(node, "class") ?? "").split(/\s+/).filter(Boolean);
}

function children(node: Element): Element[] {
  return node.childNodes.flatMap((child) =>
    "tagName" in child ? [child] : [],
  );
}

for (const viewport of VIEWPORTS) {
  test(`${viewport}: the Minimal chrome keeps four quiet header links`, async () => {
    for (const page of ["home", "docs", "changelog"] as const) {
      const id = `design-site-minimal-${page}`;
      const { document } = await designDocument(id, viewport);
      assert.equal(
        byClass(document, "site-desktop-only").length,
        0,
        `${id}: the spare header hides nothing`,
      );
      const header = byClass(document, "mn-header")[0];
      assert.ok(header, id);
      const headerLinks = elements(
        header,
        (node) => node.tagName === "a",
      ).slice(1);
      assert.deepEqual(headerLinks.map(label), HEADER_LINKS, id);
      assert.equal(
        byClass(document, "site-search").length,
        page === "docs" ? 1 : 0,
        `${id}: the search control belongs to the documentation`,
      );
      const footer = byClass(document, "mn-footer")[0];
      assert.ok(footer, id);
      assert.deepEqual(
        elements(footer, (node) => node.tagName === "a")
          .slice(1)
          .map(label),
        FOOTER_LINKS,
        id,
      );
      assert.equal(byClass(document, "site-brand").length, 2, id);
    }
  });

  test(`${viewport}: the Minimal home stacks the hero over a wide stage`, async () => {
    const { document } = await designDocument(
      "design-site-minimal-home",
      viewport,
    );
    const main = elements(document, (node) => node.tagName === "main")[0];
    assert.ok(main);
    assert.deepEqual(
      children(main).map((node) => classes(node).join(" ")),
      [
        "mn-hero",
        "mn-stage",
        "mn-section mn-features",
        "mn-section mn-closing",
      ],
    );
    const hero = byClass(main, "mn-hero")[0];
    assert.ok(hero);
    assert.deepEqual(
      children(hero).map((node) => node.tagName),
      ["p", "h1", "p", "div", "p"],
    );
    assert.equal(byClass(hero, "site-actions").length, 1);
    const features = byClass(main, "mn-feature");
    assert.equal(features.length, 3);
    for (const feature of features) {
      assert.equal(byClass(feature, "mn-feature-number").length, 1);
      assert.equal(
        elements(feature, (node) => node.tagName === "h3").length,
        1,
      );
    }
    const steps = byClass(main, "mn-steps")[0];
    assert.ok(steps);
    assert.equal(steps.tagName, "ol");
    assert.equal(byClass(steps, "mn-step").length, 3);
    assert.equal(byClass(main, "site-actions").length, 2);
  });

  test(`${viewport}: the Minimal docs replace the sidebar with a trail`, async () => {
    const { document } = await designDocument(
      "design-site-minimal-docs",
      viewport,
    );
    for (const absent of ["site-docs-sidebar", "site-docs-disclosure"])
      assert.equal(byClass(document, absent).length, 0, absent);
    const crumbs = byClass(document, "mn-crumbs")[0];
    assert.ok(crumbs);
    assert.deepEqual(children(crumbs).map(label), [
      "Docs",
      "/",
      "Getting started",
      "/",
      "Install",
    ]);
    const current = byClass(document, "mn-crumb-current")[0];
    assert.ok(current);
    assert.equal(attribute(current, "aria-current"), "page");
    const sections = byClass(document, "mn-section-link");
    assert.deepEqual(sections.map(label), DOCS_SECTIONS);
    const marked = sections.filter(
      (node) => attribute(node, "aria-current") === "true",
    );
    assert.deepEqual(marked.map(label), ["Getting started"]);
    assert.equal(marked[0]?.tagName, "a");
    const onpage = byClass(document, "mn-onpage");
    assert.equal(onpage.length, 1);
    const parent = onpage[0]?.parentNode;
    assert.ok(parent && "tagName" in parent);
    assert.equal(
      parent.tagName,
      viewport === "desktop" ? "div" : "main",
      "the rail floats beside the column on desktop only",
    );
    if (viewport === "desktop")
      assert.ok(classes(parent).includes("mn-docs-grid"));
    const copy = byClass(document, "site-code-copy")[0];
    assert.ok(copy);
    assert.equal(label(copy), "Copy");
    const code = byClass(document, "site-code")[0];
    assert.ok(code);
    assert.match(
      label(code),
      /npm install --save-dev @mokly\/mokly react react-dom/,
    );
    assert.equal(byClass(document, "site-pager").length, 1);
  });

  test(`${viewport}: the Minimal changelog lists three real releases`, async () => {
    const { document, html } = await designDocument(
      "design-site-minimal-changelog",
      viewport,
    );
    const releases = byClass(document, "mn-release");
    assert.equal(releases.length, RELEASES.length);
    releases.forEach((release, index) => {
      const entry = RELEASES[index];
      assert.ok(entry);
      const [version, date, compare] = entry;
      const heads = elements(release, (node) => node.tagName === "h2");
      assert.equal(heads.length, 1);
      assert.equal(label(heads[0]!), `Mokly CLI ${version}`);
      const times = elements(release, (node) => node.tagName === "time");
      assert.equal(times.length, 1);
      assert.equal(attribute(times[0]!, "datetime"), date);
      assert.ok(
        elements(release, (node) => node.tagName === "a").some((node) =>
          (attribute(node, "href") ?? "").endsWith(compare),
        ),
        version,
      );
    });
    assert.doesNotMatch(html, /site-release-meta/);
  });
}

test("the Minimal stylesheet centers on the baseline sheet", async () => {
  const stylesheet = await fs.readFile(
    path.join(repositoryRoot, "examples/basic/generated/site-minimal.css"),
    "utf8",
  );
  assert.match(stylesheet, /@import "\.\/site\.css";/);
  assert.match(stylesheet, /\.mn-section::before/);
  assert.match(
    stylesheet,
    /\.mn-docs-grid > \.mn-onpage \{[^}]*grid-column: 3/,
  );
  assert.match(stylesheet, /\.mn-hero \{[^}]*text-align: center/);
});
