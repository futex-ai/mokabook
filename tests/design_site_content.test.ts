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

const HERO = [
  "A design tool for teams that ship",
  "Design in your repository.",
  "Decide in the pull request.",
  "Your mockups are React components in Git. Browse every branch as screens, review them with your team, and edit with an agent beside the screen.",
  "Light and dark. Mobile and desktop.",
];

const FEATURES = [
  "See every branch as screens.",
  "Comment on the screen itself.",
  "Ask for the change beside the screen.",
];

const STEPS = [
  "Shape the next screen.",
  "Publish the branch.",
  "Build from a shared decision.",
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

const RELEASE_NOTES = [
  "Install and import @mokly/mokly. The unscoped name is not a package alias; the CLI remains mokly.",
  "Publish catalogues to upload services",
  "Add CSS change attribution",
  "Add derived baseline output",
  "Split catalogue navigation into sections",
];

const COMPARE_LINK =
  "https://github.com/mokly-ai/mokly/compare/v0.8.0...v0.9.0";

const INSTALL_COMMAND = "npm install --save-dev @mokly/mokly react react-dom";

const PULL_REQUEST = "Pull request #71";

function content(node: Parameters<typeof textContent>[0]): string {
  return textContent(node).replace(/\s+/g, " ");
}

for (const viewport of ["mobile", "desktop"] as const) {
  test(`${viewport}: the home screen carries the approved copy and the stage`, async () => {
    const { document } = await designDocument("design-site-home", viewport);
    const text = content(document);
    for (const line of [...HERO, ...FEATURES, ...STEPS]) {
      assert.ok(text.includes(line), `missing home copy: ${line}`);
    }
    assert.deepEqual(byClass(document, "site-feature-label").map(textContent), [
      "BROWSE",
      "REVIEW",
      "EDIT",
    ]);
    assert.equal(
      content(byClass(document, "site-frame-head")[0]!).trim(),
      `${PULL_REQUEST}Ready for review`,
    );
    assert.equal(
      content(byClass(document, "site-frame-foot")[0]!).trim(),
      "ScreenWelcome",
    );
    assert.equal(byClass(document, "site-badge-dot").length, 1);
    assert.equal(byClass(document, "site-actions").length, 2);
  });

  test(`${viewport}: the changelog renders the real 0.9.0 release`, async () => {
    const { document } = await designDocument(
      "design-site-changelog",
      viewport,
    );
    const text = content(document);
    assert.ok(text.includes("Mokly CLI 0.9.0"));
    assert.ok(text.includes("What’s new in Mokly"));
    for (const note of RELEASE_NOTES) {
      assert.ok(text.includes(note), `missing release note: ${note}`);
    }
    const time = elements(document, (node) => node.tagName === "time")[0];
    assert.ok(time);
    assert.equal(attribute(time, "datetime"), "2026-09-15");
    const release = elements(
      document,
      (node) => attribute(node, "href") === COMPARE_LINK,
    );
    assert.equal(release.length, 1);
    assert.match(content(release[0]!), /Read release details/);
  });

  test(`${viewport}: both policies show their placeholder and cross link`, async () => {
    for (const [id, heading, cross, target] of [
      [
        "design-site-terms",
        "Terms are being prepared",
        "Privacy",
        "design-site-privacy",
      ],
      [
        "design-site-privacy",
        "Privacy details are being prepared",
        "Terms",
        "design-site-terms",
      ],
    ] as const) {
      const { document } = await designDocument(id, viewport);
      const empty = byClass(document, "site-policy-empty")[0];
      assert.ok(empty, id);
      assert.equal(
        textContent(elements(empty, (node) => node.tagName === "h2")[0]!),
        heading,
      );
      const link = elements(empty, (node) => node.tagName === "a")[0];
      assert.ok(link, id);
      assert.equal(attribute(link, "data-mokly-link"), target);
      assert.match(content(link), new RegExp(cross));
      assert.equal(content(document).includes("2026"), false, id);
    }
  });

  test(`${viewport}: the docs screen depicts the documented architecture`, async () => {
    const { document } = await designDocument("design-site-docs", viewport);
    const text = content(document);
    for (const section of [...DOCS_SECTIONS, "Changelog"]) {
      assert.ok(text.includes(section), `missing docs section: ${section}`);
    }
    assert.ok(text.includes(INSTALL_COMMAND));
    assert.equal(byClass(document, "site-code-copy").length, 1);
    assert.equal(textContent(byClass(document, "site-code-copy")[0]!), "Copy");
    assert.equal(byClass(document, "site-search").length, 1);
    assert.match(content(byClass(document, "site-search")[0]!), /Search docs/);
    const onPage = byClass(document, "site-onpage")[0];
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
    const pager = byClass(document, "site-pager")[0];
    assert.ok(pager);
    assert.equal(content(pager), "PreviousGetting startedNextConfigure");
    const disclosures = elements(
      document,
      (node) => node.tagName === "details",
    );
    assert.equal(disclosures.length, viewport === "mobile" ? 1 : 0);
    assert.equal(
      byClass(document, "site-docs-side").length,
      viewport === "mobile" ? 0 : 1,
    );
  });
}

test("the stage names a pull request that the changelog records", async () => {
  const changelog = await fs.readFile(
    path.join(repositoryRoot, "CHANGELOG.md"),
    "utf8",
  );
  const number = PULL_REQUEST.replace("Pull request #", "");
  assert.ok(
    changelog.includes(`/issues/${number})`),
    `CHANGELOG.md does not record pull request #${number}`,
  );
  assert.ok(changelog.includes(COMPARE_LINK));
  assert.ok(changelog.includes("(2026-09-15)"));
  const lowered = changelog.toLowerCase();
  for (const note of RELEASE_NOTES) {
    assert.ok(
      lowered.includes(note.toLowerCase()),
      `CHANGELOG.md does not record: ${note}`,
    );
  }
});

test("the site layout stylesheet never contains a literal color", async () => {
  const stylesheet = await fs.readFile(
    path.join(repositoryRoot, "examples/basic/generated/site.css"),
    "utf8",
  );
  assert.doesNotMatch(stylesheet, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(stylesheet, /\b(?:rgba?|hsla?|color-mix|oklch)\(/);
  // currentcolor and transparent are scheme-neutral CSS keywords, used by the
  // documentation tree's fade mask; they carry no Folio value of their own.
  const values = [...stylesheet.matchAll(/^\s*[\w-]+:\s*([^;]+);/gm)].map(
    (match) => match[1] ?? "",
  );
  assert.ok(values.length > 100);
  for (const value of values) {
    assert.doesNotMatch(
      value,
      /(?<![\w-])(?:aqua|black|blue|brown|fuchsia|gold|gray|green|grey|lime|maroon|navy|olive|orange|pink|purple|red|silver|teal|violet|white|yellow)(?![\w-])/i,
      value,
    );
  }
  const tokens = await fs.readFile(
    path.join(repositoryRoot, "examples/basic/generated/site-tokens.css"),
    "utf8",
  );
  for (const property of [
    "--site-folio",
    "--site-folio-ink",
    "--site-accent",
    "--site-on-accent",
    "--site-success-soft",
    "--site-focus",
  ]) {
    assert.match(tokens, new RegExp(`\\n  ${property}: #`));
  }
  assert.match(tokens, /:root\[data-color-scheme="dark"\] \{/);
});
