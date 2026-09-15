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

const HOME_TONES = [
  "folio",
  "surface",
  "muted",
  "folio",
  "muted",
  "folio",
  "muted",
];

const NOUNS = ["Browse", "Review", "Edit"];

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
  {
    compare: "https://github.com/mokly-ai/mokly/compare/v0.8.0...v0.9.0",
    date: "2026-09-15",
    version: "0.9.0",
  },
  {
    compare: "https://github.com/futex-ai/mokabook/compare/v0.7.1...v0.8.0",
    date: "2026-09-11",
    version: "0.8.0",
  },
  {
    compare: "https://github.com/futex-ai/mokabook/compare/v0.7.0...v0.7.1",
    date: "2026-09-11",
    version: "0.7.1",
  },
];

function label(node: Element): string {
  return textContent(node).replace(/\s+/g, " ").trim();
}

function tones(document: Parameters<typeof byClass>[0]): string[] {
  return byClass(document, "bands-band").map((band) => {
    const tone = (attribute(band, "class") ?? "")
      .split(/\s+/)
      .find((name) => name.startsWith("bands-band--"));
    assert.ok(tone, "every band declares its tone");
    return tone.replace("bands-band--", "");
  });
}

for (const viewport of VIEWPORTS) {
  test(`${viewport}: the home alternates canvas, muted and stage bands`, async () => {
    const { document } = await designDocument(
      "design-site-bands-home",
      viewport,
    );
    assert.deepEqual(tones(document), HOME_TONES);
    const stage = byClass(document, "bands-hero-band")[0];
    assert.ok(stage, "the hero band holds the stage");
    assert.match(attribute(stage, "class") ?? "", /bands-band--surface/);
    assert.equal(byClass(stage, "site-stage").length, 1);
    assert.equal(
      label(byClass(stage, "site-stage-head")[0]!),
      "Pull request #71Ready for review",
    );
    assert.equal(label(byClass(stage, "site-stage-foot")[0]!), "Welcome");
  });

  test(`${viewport}: the narrow band navigates to the three feature bands`, async () => {
    const { document } = await designDocument(
      "design-site-bands-home",
      viewport,
    );
    const items = byClass(document, "bands-jump-item");
    assert.equal(items.length, 3);
    assert.deepEqual(
      items.map((item) => textContent(byClass(item, "bands-jump-label")[0]!)),
      NOUNS,
    );
    assert.deepEqual(
      items.map((item) => textContent(byClass(item, "bands-jump-number")[0]!)),
      ["01", "02", "03"],
    );
    for (const item of items) {
      assert.equal(item.tagName, "a");
      const href = attribute(item, "href") ?? "";
      assert.ok(href.startsWith("#"));
      const target = elements(
        document,
        (node) => attribute(node, "id") === href.slice(1),
      )[0];
      assert.ok(target, `${href} addresses a band on the page`);
      assert.match(attribute(target, "class") ?? "", /bands-feature-band/);
    }
  });

  test(`${viewport}: each feature band frames that phase with real labels`, async () => {
    const { document } = await designDocument(
      "design-site-bands-home",
      viewport,
    );
    const figures = byClass(document, "bands-figure");
    assert.equal(figures.length, 3);
    assert.deepEqual(
      figures.map((figure) =>
        textContent(byClass(figure, "bands-figure-title")[0]!),
      ),
      ["Changes", "Welcome", "Agent session"],
    );
    const [browse, review, edit] = figures as [Element, Element, Element];
    assert.deepEqual(byClass(browse, "bands-change-name").map(textContent), [
      "Welcome",
      "Details",
    ]);
    assert.equal(
      byClass(browse, "bands-change").length,
      Number(label(byClass(browse, "site-badge")[0]!).replace(" screens", "")),
    );
    assert.equal(byClass(review, "bands-pin-marker").length, 1);
    assert.equal(
      label(byClass(review, "bands-comment-text")[0]!),
      "Use the shared button component here.",
    );
    assert.equal(byClass(edit, "bands-message").length, 2);
    assert.match(
      label(byClass(edit, "bands-message--agent")[0]!),
      /catalogue\.mockup\.tsx/,
    );
  });

  test(`${viewport}: the closing band joins the three steps on a hairline`, async () => {
    const { document } = await designDocument(
      "design-site-bands-home",
      viewport,
    );
    const stepper = byClass(document, "bands-stepper")[0];
    assert.ok(stepper);
    assert.equal(stepper.tagName, "ol");
    const steps = byClass(stepper, "bands-step");
    assert.equal(steps.length, 3);
    assert.deepEqual(
      steps.map((step) => textContent(byClass(step, "bands-step-title")[0]!)),
      [
        "Shape the next screen.",
        "Publish the branch.",
        "Build from a shared decision.",
      ],
    );
    for (const step of steps) {
      assert.equal(byClass(step, "bands-step-dot").length, 1);
    }
  });

  test(`${viewport}: the documentation page bands its sections over the document`, async () => {
    const { document } = await designDocument(
      "design-site-bands-docs",
      viewport,
    );
    assert.deepEqual(tones(document), ["folio", "muted", "folio"]);
    const tabs = byClass(document, "bands-tab");
    assert.deepEqual(tabs.map(textContent), DOCS_SECTIONS);
    const current = tabs.filter(
      (tab) => attribute(tab, "aria-current") === "page",
    );
    assert.equal(current.length, 1);
    assert.equal(textContent(current[0]!), "Getting started");
    assert.equal(current[0]!.tagName, "a");
    assert.equal(
      attribute(current[0]!, "data-mokly-link"),
      "design-site-bands-docs",
    );
    assert.equal(
      byClass(document, "bands-sidebar").length,
      viewport === "desktop" ? 1 : 0,
    );
    assert.equal(
      elements(document, (node) => node.tagName === "details").length,
      viewport === "desktop" ? 0 : 1,
    );
    assert.equal(byClass(document, "site-search").length, 1);
    const rail = byClass(document, "bands-onpage")[0];
    assert.ok(rail);
    assert.deepEqual(
      elements(rail, (node) => node.tagName === "a").map((node) =>
        attribute(node, "href"),
      ),
      [
        "#install-the-package",
        "#add-the-configuration",
        "#author-your-first-screen",
      ],
    );
    assert.equal(byClass(document, "site-code-copy").length, 1);
    assert.equal(
      label(byClass(document, "site-pager")[0]!),
      "PreviousGetting startedNextConfigure",
    );
  });

  test(`${viewport}: the changelog is a timeline of the real releases`, async () => {
    const { document } = await designDocument(
      "design-site-bands-changelog",
      viewport,
    );
    assert.deepEqual(tones(document), ["folio", "muted", "folio"]);
    const timeline = byClass(document, "bands-timeline")[0];
    assert.ok(timeline);
    assert.equal(timeline.tagName, "ol");
    const releases = byClass(timeline, "bands-release");
    assert.equal(releases.length, RELEASES.length);
    releases.forEach((release, index) => {
      const expected = RELEASES[index]!;
      assert.equal(byClass(release, "bands-release-dot").length, 1);
      assert.equal(
        label(byClass(release, "site-badge")[0]!),
        `Mokly CLI ${expected.version}`,
      );
      const time = elements(release, (node) => node.tagName === "time")[0];
      assert.ok(time);
      assert.equal(attribute(time, "datetime"), expected.date);
      const links = elements(release, (node) => node.tagName === "a");
      assert.equal(links.length, 1);
      assert.equal(attribute(links[0]!, "href"), expected.compare);
    });
    assert.equal(
      byClass(releases[0]!, "bands-release-notes")[0]!.childNodes.length > 1,
      true,
    );
    for (const release of releases.slice(1)) {
      assert.match(attribute(release, "class") ?? "", /bands-release--brief/);
    }
  });

  test(`${viewport}: the chrome stays inside the direction and groups the footer`, async () => {
    for (const [id, marked] of [
      ["design-site-bands-home", ["Home"]],
      [
        "design-site-bands-docs",
        ["Docs", "Getting started", "Install", "Docs"],
      ],
      ["design-site-bands-changelog", ["Changelog", "Changelog"]],
    ] as const) {
      const { document } = await designDocument(id, viewport);
      const header = byClass(document, "bands-header")[0];
      assert.ok(header, id);
      assert.deepEqual(
        elements(header, (node) => node.tagName === "a")
          .slice(1)
          .map(label),
        ["Docs", "Changelog", "Sign in", "Get started →"],
        id,
      );
      const groups = byClass(document, "bands-footer-group");
      assert.equal(groups.length, 3, id);
      assert.deepEqual(
        groups.map((group) =>
          textContent(byClass(group, "bands-footer-group-title")[0]!),
        ),
        ["Site", "Account", "Legal"],
        id,
      );
      assert.deepEqual(
        groups.flatMap((group) =>
          elements(group, (node) => node.tagName === "a").map(label),
        ),
        [
          "Home",
          "Docs",
          "Changelog",
          "Sign in",
          "Get started",
          "Terms",
          "Privacy",
        ],
        id,
      );
      assert.deepEqual(
        elements(document, (node) => attribute(node, "aria-current") === "page")
          .map(label)
          .filter((text) => text.length > 0),
        [...marked],
        id,
      );
      for (const brand of byClass(document, "site-brand")) {
        assert.equal(
          attribute(brand, "data-mokly-link"),
          "design-site-bands-home",
          id,
        );
      }
    }
  });
}

test("the direction stylesheet builds on the shared parts and owns the bands", async () => {
  const stylesheet = await fs.readFile(
    path.join(repositoryRoot, "examples/basic/generated/site-bands.css"),
    "utf8",
  );
  assert.match(stylesheet, /@import "\.\/site\.css";/);
  for (const rule of [
    ".bands-band--folio {\n  background: var(--site-folio);",
    ".bands-band--muted {\n  background: var(--site-folio-muted);",
    ".bands-band--surface {\n  background: var(--site-folio-surface);",
  ]) {
    assert.ok(stylesheet.includes(rule), rule);
  }
});

test("the timeline entries quote the real changelog headings", async () => {
  const changelog = await fs.readFile(
    path.join(repositoryRoot, "CHANGELOG.md"),
    "utf8",
  );
  for (const release of RELEASES) {
    assert.ok(
      changelog.includes(
        `## [${release.version}](${release.compare}) (${release.date})`,
      ),
      `CHANGELOG.md does not record ${release.version}`,
    );
  }
});
