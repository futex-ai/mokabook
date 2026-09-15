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

const HOME = "design-site-product-home";
const DOCS = "design-site-product-docs";
const CHANGELOG = "design-site-product-changelog";

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

const SIGN_IN = "https://app.mokly.ai/sign-in";
const SIGN_UP = "https://app.mokly.ai/sign-up";

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

const MODULE_LABELS = ["BROWSE", "REVIEW", "EDIT"];

const STEPS = [
  "Shape the next screen.",
  "Publish the branch.",
  "Build from a shared decision.",
];

const COMPARE_LINKS = [
  "https://github.com/mokly-ai/mokly/compare/v0.8.0...v0.9.0",
  "https://github.com/futex-ai/mokabook/compare/v0.7.1...v0.8.0",
  "https://github.com/futex-ai/mokabook/compare/v0.7.0...v0.7.1",
];

function label(node: Parameters<typeof textContent>[0]): string {
  return textContent(node).replace(/\s+/g, " ").trim();
}

for (const viewport of ["mobile", "desktop"] as const) {
  test(`${viewport}: the application band carries the header, the utility bar and the version`, async () => {
    for (const id of [HOME, DOCS, CHANGELOG]) {
      const { document } = await designDocument(id, viewport);
      const band = byClass(document, "pd-band")[0];
      assert.ok(band, `${id}: missing the application band`);
      const header = byClass(band, "site-header")[0];
      assert.ok(header, id);
      const headerLinks = elements(
        header,
        (node) => node.tagName === "a",
      ).slice(1);
      assert.deepEqual(headerLinks.map(label), HEADER_LINKS, id);
      assert.equal(attribute(headerLinks[2]!, "href"), SIGN_IN, id);
      assert.equal(attribute(headerLinks[3]!, "href"), SIGN_UP, id);
      const utility = byClass(band, "pd-utility")[0];
      assert.ok(utility, `${id}: the utility bar sits inside the band`);
      const version = byClass(document, "pd-version")[0];
      assert.ok(version, id);
      assert.match(textContent(version), /0\.9\.0$/, id);
    }
  });

  test(`${viewport}: the footer groups the seven destinations into columns`, async () => {
    for (const id of [HOME, DOCS, CHANGELOG]) {
      const { document } = await designDocument(id, viewport);
      const footer = byClass(document, "pd-footer")[0];
      assert.ok(footer, id);
      const groups = byClass(footer, "pd-footer-group");
      assert.equal(groups.length, 3, `${id}: three footer columns`);
      assert.deepEqual(
        groups.map((group) => label(byClass(group, "pd-footer-heading")[0]!)),
        ["Product", "Account", "Legal"],
        id,
      );
      const nav = byClass(footer, "pd-footer-nav")[0];
      assert.ok(nav);
      assert.deepEqual(
        elements(nav, (node) => node.tagName === "a").map(label),
        FOOTER_LINKS,
        id,
      );
    }
  });

  test(`${viewport}: the home frames the catalogue shell around the Welcome screen`, async () => {
    const { document } = await designDocument(HOME, viewport);
    const frame = byClass(document, "pd-frame")[0];
    assert.ok(frame, "the home renders the catalogue frame");
    assert.equal(
      label(byClass(frame, "pd-frame-head")[0]!),
      "Pull request #71Ready for review",
    );
    assert.equal(byClass(frame, "site-badge-dot").length, 1);
    assert.equal(label(byClass(frame, "pd-frame-foot")[0]!), "ScreenWelcome");

    const topBar = byClass(frame, "pd-topbar")[0];
    assert.ok(topBar, "the frame shows the shell's top bar");
    assert.match(label(topBar), /Search catalogue/);
    assert.equal(byClass(topBar, "pd-topbar-mark").length, 1);
    assert.equal(
      byClass(topBar, "pd-topbar-menu").length,
      viewport === "mobile" ? 1 : 0,
      "the menu control belongs to the mobile shell",
    );

    const head = byClass(frame, "pd-screen-head")[0];
    assert.ok(head);
    assert.equal(
      label(byClass(head, "pd-crumbs")[0]!),
      "Catalogue home›Example›Screens",
    );
    assert.equal(label(byClass(head, "pd-screen-title")[0]!), "Welcome");
    assert.equal(label(byClass(head, "pd-idchip")[0]!), "#welcome");

    const stage = byClass(frame, "pd-stage")[0];
    assert.ok(stage);
    assert.equal(label(byClass(stage, "pd-stage-label")[0]!), "Desktop");
    const shot = byClass(stage, "site-shot")[0];
    assert.ok(shot, "the stage holds the Welcome screen in a browser frame");
    assert.equal(
      label(byClass(shot, "site-shot-address")[0]!),
      "example.test/welcome",
    );
    assert.match(label(shot), /Welcome to Mokly/);
  });

  test(`${viewport}: the home navigation depicts the Pages and Components sections`, async () => {
    const { document } = await designDocument(HOME, viewport);
    const tree = byClass(document, "pd-tree")[0];
    if (viewport === "mobile") {
      assert.equal(tree, undefined, "the mobile shell hides the tree");
      return;
    }
    assert.ok(tree);
    assert.deepEqual(byClass(tree, "pd-tree-section-head").map(label), [
      "Pages",
      "Components",
    ]);
    assert.deepEqual(byClass(tree, "pd-filter-option").map(label), [
      "All",
      "Changes3",
    ]);
    assert.equal(
      label(byClass(tree, "pd-filter-option--current")[0]!),
      "All",
      "All is the quiet filled current filter",
    );
    const current = byClass(tree, "pd-row--current");
    assert.equal(current.length, 1);
    assert.equal(label(current[0]!), "Welcome");
    const depths = byClass(tree, "pd-row").map((row) =>
      attribute(row, "data-pd-depth"),
    );
    assert.deepEqual([...new Set(depths)].sort(), ["0", "1", "2"]);
  });

  test(`${viewport}: the home modules pair the feature copy with a shell detail`, async () => {
    const { document } = await designDocument(HOME, viewport);
    const modules = byClass(document, "pd-module");
    assert.equal(modules.length, 3);
    assert.deepEqual(
      modules.map((module) => attribute(module, "id")),
      ["browse", "review", "edit"],
    );
    assert.deepEqual(
      modules.map((module) => label(byClass(module, "site-feature-label")[0]!)),
      MODULE_LABELS,
    );
    for (const module of modules)
      assert.equal(
        byClass(module, "pd-detail").length,
        1,
        "every module frames one shell detail",
      );
    const [browse, review, edit] = modules;
    assert.match(label(byClass(browse!, "pd-filter")[0]!), /All\s*Changes\s*3/);
    assert.equal(byClass(review!, "pd-pin").length, 2);
    assert.match(label(byClass(review!, "pd-comment")[0]!), /Comment/);
    assert.match(label(byClass(review!, "pd-comment-approve")[0]!), /Approve/);
    assert.match(label(byClass(edit!, "pd-agent")[0]!), /Agent session/);
    assert.match(label(byClass(edit!, "pd-agent-input")[0]!), /Describe/);
    const steps = byClass(document, "pd-step");
    assert.deepEqual(
      steps.map((step) =>
        label(elements(step, (node) => node.tagName === "h3")[0]!),
      ),
      STEPS,
    );
    assert.equal(byClass(document, "site-actions").length, 2);
  });

  test(`${viewport}: the utility bar links the page's own sections`, async () => {
    const { document } = await designDocument(HOME, viewport);
    const sections = byClass(document, "pd-sections")[0];
    assert.ok(sections);
    const links = elements(sections, (node) => node.tagName === "a");
    assert.deepEqual(
      links.map((link) => attribute(link, "href")),
      ["#browse", "#review", "#edit", "#foundation"],
    );
    assert.match(
      attribute(links[3]!, "class") ?? "",
      /site-desktop-only/,
      "the closing link stays out of the mobile bar",
    );
  });

  test(`${viewport}: the documentation tree uses disclosures and a filled current page`, async () => {
    const { document } = await designDocument(DOCS, viewport);
    const sections = elements(document, (node) =>
      (attribute(node, "class") ?? "").split(/\s+/).includes("pd-doc-section"),
    );
    assert.equal(sections.length, DOCS_SECTIONS.length);
    assert.deepEqual(
      sections.map((section) =>
        label(byClass(section, "pd-doc-section-head")[0]!),
      ),
      DOCS_SECTIONS,
    );
    assert.deepEqual(
      sections.map((section) => attribute(section, "open") !== undefined),
      DOCS_SECTIONS.map((title) => title === "Getting started"),
      "only the current section is open",
    );
    assert.equal(
      byClass(document, "pd-tree-chevron").length,
      DOCS_SECTIONS.length,
    );
    const current = byClass(document, "pd-doc-link--current");
    assert.equal(current.length, 1);
    assert.equal(label(current[0]!), "Install");
    assert.equal(attribute(current[0]!, "aria-current"), "page");
    assert.equal(
      byClass(document, "pd-doc-tree").length,
      viewport === "desktop" ? 1 : 0,
    );
    assert.equal(
      byClass(document, "pd-doc-disclosure").length,
      viewport === "desktop" ? 0 : 1,
    );
  });

  test(`${viewport}: the documentation page keeps the search, code panel and rails`, async () => {
    const { document } = await designDocument(DOCS, viewport);
    const search = byClass(document, "site-search")[0];
    assert.ok(search);
    assert.match(label(search), /Search docs/);
    assert.equal(
      byClass(byClass(document, "pd-utility")[0]!, "site-search").length,
      1,
      "the search control lives in the utility bar",
    );
    const copy = byClass(document, "site-code-copy");
    assert.equal(copy.length, 1);
    assert.equal(label(copy[0]!), "Copy");
    assert.match(
      label(byClass(document, "site-code-body")[0]!),
      /npm install --save-dev @mokly\/mokly react react-dom/,
    );
    const onPage = byClass(document, "pd-onpage");
    assert.equal(onPage.length, 1);
    assert.deepEqual(
      elements(onPage[0]!, (node) => node.tagName === "a").map((node) =>
        attribute(node, "href"),
      ),
      [
        "#install-the-package",
        "#add-the-configuration",
        "#author-your-first-screen",
      ],
    );
    assert.equal(
      byClass(document, "pd-docs-rail").length,
      viewport === "desktop" ? 1 : 0,
    );
    assert.equal(
      label(byClass(document, "pd-pager")[0]!),
      "PreviousGetting startedNextConfigure",
    );
  });

  test(`${viewport}: the changelog reads as an indexed Changes list`, async () => {
    const { document, html } = await designDocument(CHANGELOG, viewport);
    const index = byClass(document, "pd-release-index")[0];
    assert.ok(index, "the changelog carries a release index");
    assert.deepEqual(byClass(index, "pd-release-index-version").map(label), [
      "0.9.0",
      "0.8.0",
      "0.7.1",
    ]);
    assert.deepEqual(
      elements(index, (node) => node.tagName === "a").map((node) =>
        attribute(node, "href"),
      ),
      ["#release-0-9-0", "#release-0-8-0", "#release-0-7-1"],
    );
    const releases = byClass(document, "pd-release");
    assert.equal(releases.length, 3);
    assert.deepEqual(
      releases.map((release) =>
        label(byClass(release, "site-badge--neutral")[0]!),
      ),
      ["Mokly CLI 0.9.0", "Mokly CLI 0.8.0", "Mokly CLI 0.7.1"],
    );
    assert.deepEqual(
      releases.map((release) =>
        attribute(
          elements(release, (node) => node.tagName === "time")[0]!,
          "datetime",
        ),
      ),
      ["2026-09-15", "2026-09-11", "2026-09-11"],
    );
    assert.deepEqual(
      releases.map((release) =>
        attribute(byClass(release, "pd-release-link")[0]!, "href"),
      ),
      COMPARE_LINKS,
    );
    assert.deepEqual(
      byClass(releases[0]!, "pd-release-group-head").map(label),
      ["Breaking changes", "Features", "Bug fixes"],
    );
    assert.deepEqual(
      byClass(releases[1]!, "pd-release-group-head").map(label),
      ["Features", "Bug fixes", "Performance"],
    );
    assert.match(html, /Split catalogue navigation into sections/);
    assert.match(html, /Start large catalogues with on-demand previews/);
  });
}

test("the Product stylesheet extends the shared layout and owns its chrome", async () => {
  const stylesheet = await fs.readFile(
    path.join(repositoryRoot, "examples/basic/generated/site-product.css"),
    "utf8",
  );
  assert.match(stylesheet, /@import "\.\/site\.css";/);
  for (const selector of [
    ".pd-band",
    ".pd-utility",
    ".pd-frame",
    ".pd-topbar",
    ".pd-tree",
    ".pd-screen-head",
    ".pd-stage",
    ".pd-module",
    ".pd-doc-tree",
    ".pd-release",
    ".pd-footer-nav",
  ])
    assert.ok(
      stylesheet.includes(`${selector} {`),
      `site-product.css defines ${selector}`,
    );
  assert.match(
    stylesheet,
    /\[data-site-viewport="mobile"\] \.pd-module-grid/,
    "the mobile composition collapses the module grid",
  );
});

test("the depicted version is the changelog's latest release", async () => {
  const changelog = await fs.readFile(
    path.join(repositoryRoot, "CHANGELOG.md"),
    "utf8",
  );
  const latest = /^## \[(\d+\.\d+\.\d+)\]/m.exec(changelog)?.[1];
  assert.ok(latest);
  for (const id of [HOME, DOCS, CHANGELOG]) {
    const { document } = await designDocument(id, "desktop");
    assert.match(
      textContent(byClass(document, "pd-version")[0]!),
      new RegExp(`${latest.replace(/\./g, "\\.")}$`),
      id,
    );
  }
});
