import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

import {
  attribute,
  byClass,
  designCatalogue,
  designDocument,
  elements,
  textContent,
} from "./helpers/design_catalogue.js";
import { repositoryRoot } from "./helpers/fixture.js";

const DIRECTIONS = [
  "editorial",
  "product",
  "grid",
  "minimal",
  "bands",
] as const;

const PAGES = ["home", "docs", "changelog"] as const;

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|color-mix|oklch)\(/;

test("the directions collection holds five directions with three screens each", async () => {
  const { manifest } = await designCatalogue;
  const variants = manifest.entries.find(
    (entry) => entry.id === "design-site-variants",
  );
  assert.ok(variants?.kind === "collection");
  assert.deepEqual(
    variants.childIds,
    DIRECTIONS.map((slug) => `design-site-${slug}`),
  );
  for (const slug of DIRECTIONS) {
    const direction = manifest.entries.find(
      (entry) => entry.id === `design-site-${slug}`,
    );
    assert.ok(direction?.kind === "collection", slug);
    assert.deepEqual(
      direction.childIds,
      PAGES.map((page) => `design-site-${slug}-${page}`),
    );
  }
});

for (const slug of DIRECTIONS) {
  test(`${slug}: every screen owns its route, both viewports, both schemes and its stylesheet`, async () => {
    const { manifest } = await designCatalogue;
    for (const page of PAGES) {
      const id = `design-site-${slug}-${page}`;
      const route = `design/site/${slug}/${page}.html`;
      const entry = manifest.entries.find((entry) => entry.id === id);
      assert.ok(entry?.kind === "screen", id);
      assert.equal(entry.route, route);
      assert.ok(entry.darkFragments, `${id} renders dark`);
      assert.deepEqual(entry.declaredDependencies, [
        `examples/basic/generated/site-${slug}.css`,
        "examples/basic/generated/site-tokens.css",
      ]);
      for (const viewport of ["mobile", "desktop"] as const) {
        const { document, html } = await designDocument(id, viewport);
        assert.match(html, new RegExp(`site-${slug}\\.css`), id);
        assert.doesNotMatch(html, /site\.css"/, `${id} links only its sheet`);
        const mains = elements(document, (node) => node.tagName === "main");
        assert.equal(mains.length, 1, `${id} ${viewport} has one main`);
        assert.equal(attribute(mains[0]!, "id"), "main");
        const headings = elements(document, (node) => node.tagName === "h1");
        assert.equal(headings.length, 1, `${id} ${viewport} has one h1`);
        const skip = elements(
          document,
          (node) => node.tagName === "a" && attribute(node, "href") === "#main",
        );
        assert.ok(skip.length >= 1, `${id} ${viewport} has a skip link`);
        assert.ok(
          byClass(document, "site-brand").length >= 1,
          `${id} ${viewport} shows the brand`,
        );
        const body = elements(document, (node) => node.tagName === "body")[0];
        assert.ok(body);
        const text = textContent(body);
        assert.doesNotMatch(text, /coming soon|roadmap/i);
        if (page === "home") {
          assert.match(text, /Design in your repository\./);
          assert.match(text, /Decide in the pull request\./);
          assert.match(text, /Pull request #71/);
          assert.match(text, /Ready for review/);
        }
        if (page === "docs") {
          assert.match(
            text,
            /npm install --save-dev @mokly\/mokly react react-dom/,
          );
          assert.match(text, /Getting started/);
        }
        if (page === "changelog") {
          assert.match(text, /Mokly CLI 0\.9\.0/);
          assert.match(
            html,
            /https:\/\/github\.com\/mokly-ai\/mokly\/compare\/v0\.8\.0\.\.\.v0\.9\.0/,
          );
        }
      }
    }
  });

  test(`${slug}: the direction stylesheet holds no literal color`, async () => {
    const stylesheet = await fs.readFile(
      path.join(repositoryRoot, `examples/basic/generated/site-${slug}.css`),
      "utf8",
    );
    assert.doesNotMatch(stylesheet, COLOR_LITERAL);
  });
}
