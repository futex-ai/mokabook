import assert from "node:assert/strict";
import test from "node:test";

import type { ManifestV3 } from "../dist/registry/types.js";
import { createCatalogue } from "../dist/server/catalogue.js";
import {
  homePage,
  notFoundPage,
  reviewPage,
  viewPage,
} from "../dist/server/pages.js";
import { SHELL_CSS } from "../dist/server/shell/css.js";
import { buildNavGroups, catalogueNav } from "../dist/server/shell/nav.js";

const manifest: ManifestV3 = {
  entries: [
    {
      childIds: ["welcome", "details"],
      dependencies: [],
      description: "Screens",
      id: "screens",
      kind: "collection",
      navPath: ["Example"],
      relatedDocs: [],
      sourcePath: "entries/fixture.mockup.tsx",
      title: "Screens",
    },
    {
      address: "example.test/welcome",
      dependencies: ["styles.css"],
      description: "Landing screen",
      fragments: {
        desktop: "screens/welcome.desktop.html",
        mobile: "screens/welcome.mobile.html",
      },
      id: "welcome",
      kind: "screen",
      navPath: ["Example", "Screens"],
      rationale: "Proves the shell",
      relatedDocs: ["notes.md"],
      route: "screens/welcome.html",
      sourcePath: "entries/fixture.mockup.tsx",
      title: "Welcome",
      useCaseIds: ["tour"],
      viewports: ["mobile", "desktop"],
    },
    {
      dependencies: [],
      description: "Second screen",
      fragments: {
        desktop: "screens/details.desktop.html",
        mobile: "screens/details.mobile.html",
      },
      id: "details",
      kind: "screen",
      navPath: ["Example", "Screens"],
      relatedDocs: [],
      route: "screens/details.html",
      sourcePath: "entries/fixture.mockup.tsx",
      title: "Details",
      useCaseIds: ["tour"],
      viewports: ["mobile", "desktop"],
    },
    {
      dependencies: [],
      description: "Ordered journey",
      id: "tour",
      kind: "use-case",
      navPath: ["Example"],
      relatedDocs: [],
      route: "user-flows/tour.html",
      sourcePath: "entries/fixture.mockup.tsx",
      steps: [{ screenId: "welcome" }, { screenId: "details" }],
      title: "Tour",
    },
  ],
  generatedBy: "mokabook",
  legacyPages: [{ route: "legacy/old.html", sourcePath: "pages/old.html" }],
  schemaVersion: 3,
};

const context = { base: "origin/main", mode: "browse" as const };

test("nav groups follow collection nesting and navPath roots", () => {
  const groups = buildNavGroups(manifest);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.label, "Example");
  const [screens, tour] = groups[0]?.nodes ?? [];
  assert.equal(screens?.entry.id, "screens");
  assert.deepEqual(
    screens?.children.map((child) => child.entry.id),
    ["welcome", "details"],
  );
  assert.equal(tour?.entry.id, "tour");
});

test("catalogue nav marks active, changed, and legacy rows", () => {
  const nav = catalogueNav(manifest, {
    ...context,
    activeRoute: "screens/welcome.html",
    changedRoutes: ["screens/welcome.html"],
  });
  assert.match(nav, /aria-current="page"[^>]*>[^<]*<[^>]*>▢<\/span>Welcome/);
  assert.match(nav, /data-changed="true"/);
  assert.match(nav, /data-nav-collection="screens"/);
  assert.match(nav, /Legacy pages/);
  assert.match(nav, /legacy\/old\.html/);
  const inactive = catalogueNav(manifest, context);
  assert.equal(inactive.includes('aria-current="page"'), false);
});

test("screen page renders frames, viewport switch, and details", () => {
  const catalogue = createCatalogue(manifest);
  const entry = catalogue.byRoute.get("screens/welcome.html");
  assert.ok(entry);
  const html = viewPage(entry, catalogue, {
    ...context,
    activeRoute: "screens/welcome.html",
  });
  assert.match(html, /<iframe class="mb-frag" sandbox=""[^>]*welcome\.mobile/);
  assert.match(html, /<iframe class="mb-frag" sandbox=""[^>]*welcome\.desktop/);
  assert.match(html, /data-mokabook-stage data-viewport="both"/);
  assert.match(html, /data-viewport-option="mobile"/);
  assert.match(html, /example\.test\/welcome/);
  assert.match(html, /Example › /);
  assert.match(html, /Proves the shell/);
  assert.match(html, /notes\.md/);
  assert.match(html, /\/id\/tour/);
  assert.match(html, /aria-live="polite"/);
});

test("use-case page links each step back to its standalone screen", () => {
  const catalogue = createCatalogue(manifest);
  const entry = catalogue.byRoute.get("user-flows/tour.html");
  assert.ok(entry);
  const html = viewPage(entry, catalogue, context);
  assert.match(html, /Open standalone screen/);
  assert.match(html, /href="\/view\/screens\/welcome\.html"/);
  assert.match(html, /class="mb-step-num"/);
});

test("missing routes and review keep the catalogue shell", () => {
  const catalogue = createCatalogue(manifest);
  const missing = notFoundPage("view/unknown.html", catalogue, context);
  assert.match(missing, /Screen not found/);
  assert.match(missing, /aria-label="Catalogue"/);
  const review = reviewPage("origin/main", catalogue, {
    ...context,
    mode: "review",
  });
  assert.match(review, /mokabook review --base origin\/main/);
  assert.match(review, /href="\/review" aria-current="page"/);
});

test("filter renders only when changed routes are known", () => {
  const catalogue = createCatalogue(manifest);
  const withFilter = homePage(catalogue, {
    ...context,
    changedRoutes: [],
  });
  assert.match(withFilter, /data-mokabook-filter/);
  const withoutFilter = homePage(catalogue, context);
  assert.equal(withoutFilter.includes("data-mokabook-filter"), false);
  assert.match(withoutFilter, /data-mokabook-search/);
});

test("shell stylesheet stays aligned with the design contract", () => {
  assert.match(SHELL_CSS, /--mokabook-accent: #6f4e37/);
  assert.match(SHELL_CSS, /--mb-added: #1d7a3d/);
  assert.match(SHELL_CSS, /min-width: 56\.25rem/);
  assert.match(SHELL_CSS, /prefers-reduced-motion/);
  assert.equal(SHELL_CSS.includes("bookfolio"), false);
});
