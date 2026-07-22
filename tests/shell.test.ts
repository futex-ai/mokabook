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
import { buildNavTree } from "../dist/server/shell/nav_tree.js";

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
  legacyPages: [
    { route: "legacy/index.html", sourcePath: "pages/index.html" },
    { route: "legacy/old.html", sourcePath: "pages/old.html" },
  ],
  schemaVersion: 3,
};

const context = { base: "origin/main", mode: "browse" as const };

test("nav tree nests collections and folds legacy directories", () => {
  const tree = buildNavTree(manifest.entries, manifest.legacyPages);
  const labels = tree.map((node) => node.label);
  assert.deepEqual(labels, ["Example", "Legacy"]);
  const example = tree[0];
  assert.ok(example?.kind === "group");
  const screens = example.children.find((node) => node.label === "Screens");
  assert.ok(screens?.kind === "group");
  assert.deepEqual(
    screens.children.map((node) => node.label),
    ["Details", "Welcome"],
  );
  const tour = example.children.find((node) => node.label === "Tour");
  assert.ok(tour?.kind === "leaf" && tour.entryKind === "use-case");
  const legacy = tree[1];
  assert.ok(legacy?.kind === "group");
  assert.deepEqual(
    legacy.children.map((node) => node.label),
    ["Overview", "Old"],
  );
});

test("legacy breadcrumbs link ancestors through their Overview page", () => {
  const catalogue = createCatalogue(manifest);
  const entry = catalogue.byRoute.get("legacy/old.html");
  assert.ok(entry);
  const html = viewPage(entry, catalogue, {
    ...context,
    activeRoute: "legacy/old.html",
  });
  assert.match(
    html,
    /class="mbk-crumb-link" href="\/view\/legacy\/index\.html">Legacy</,
  );
  assert.match(html, /class="mbk-stage-embed"/);
});

test("catalogue nav marks active, changed, and iconed rows", () => {
  const catalogue = createCatalogue(manifest);
  const entry = catalogue.byRoute.get("screens/welcome.html");
  assert.ok(entry);
  const html = viewPage(entry, catalogue, {
    ...context,
    activeRoute: "screens/welcome.html",
    changedRoutes: ["screens/welcome.html"],
  });
  assert.match(
    html,
    /aria-current="page"[^>]*data-route="screens\/welcome\.html"/,
  );
  assert.match(html, /data-changed="true"/);
  assert.match(html, /data-nav-collection="\/Example\/Screens"/);
  assert.match(html, /class="mbk-nav-ico folder"><svg/);
  assert.match(html, /class="mbk-nav-count">2</);
  assert.match(html, /Collapse all/);
  const inactive = homePage(catalogue, context);
  assert.equal(inactive.includes('aria-current="page"[^>]*data-route'), false);
});

test("screen page renders device chrome, viewport switch, and details", () => {
  const catalogue = createCatalogue(manifest);
  const entry = catalogue.byRoute.get("screens/welcome.html");
  assert.ok(entry);
  const html = viewPage(entry, catalogue, {
    ...context,
    activeRoute: "screens/welcome.html",
  });
  assert.match(html, /class="mbk-frag" sandbox=""[^>]*welcome\.mobile/);
  assert.match(html, /class="mbk-frag" sandbox=""[^>]*welcome\.desktop/);
  assert.match(html, /class="phone-frame"/);
  assert.match(html, /class="phone-notch"/);
  assert.match(html, /class="browser-frame"/);
  assert.match(html, /class="browser-expand"/);
  assert.match(html, /class="address">example\.test\/welcome</);
  assert.match(html, /data-mokabook-stage="" data-viewport="both"/);
  assert.match(html, /data-viewport-option="mobile"/);
  assert.match(
    html,
    /data-mokabook-viewswitch=""[\s\S]*<\/span><\/div><div class="mbk-stage/,
  );
  assert.equal(html.includes('class="mbk-viewbar"'), false);
  assert.match(html, /class="mbk-crumbs"/);
  assert.match(
    html,
    /aria-label="Copy ID welcome" class="mbk-idchip" data-copy-id="welcome" type="button">welcome<\/button>/,
  );
  assert.doesNotMatch(html, /class="mbk-idchip"[^>]*href=/);
  assert.match(html, /Proves the shell/);
  assert.match(html, /notes\.md/);
  assert.match(
    html,
    /class="mbk-chip flow" href="\/view\/user-flows\/tour\.html"/,
  );
  assert.match(html, /aria-live="polite"/);
});

test("use-case page renders the flow with catalogue links per step", () => {
  const catalogue = createCatalogue(manifest);
  const entry = catalogue.byRoute.get("user-flows/tour.html");
  assert.ok(entry);
  const html = viewPage(entry, catalogue, context);
  assert.match(html, /This screen in the catalogue: Welcome/);
  assert.match(html, /href="\/view\/screens\/welcome\.html"/);
  assert.match(html, /class="flow-step-num"/);
  assert.match(html, /class="mbk-flow-screen"/);
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
  assert.match(review, /aria-current="page"[^>]*href="\/review"/);
  assert.match(review, /class="mbk-basewatch"/);
});

test("filter renders in the nav only when changed routes are known", () => {
  const catalogue = createCatalogue(manifest);
  const withFilter = homePage(catalogue, {
    ...context,
    changedRoutes: ["screens/welcome.html"],
  });
  assert.match(withFilter, /data-mokabook-filter/);
  assert.match(withFilter, /class="mbk-nav-filter-count">1</);
  const withoutFilter = homePage(catalogue, context);
  assert.equal(withoutFilter.includes("data-mokabook-filter"), false);
  assert.match(withoutFilter, /data-mokabook-search/);
});

test("shell stylesheet stays aligned with the design contract", () => {
  assert.match(SHELL_CSS, /--mokabook-accent: #4f7864/);
  assert.match(SHELL_CSS, /--mb-added: #1d7a3d/);
  assert.match(SHELL_CSS, /width: 390px/);
  assert.match(SHELL_CSS, /max-width: 1180px/);
  assert.match(SHELL_CSS, /max-width: 56\.25rem/);
  assert.match(SHELL_CSS, /prefers-reduced-motion/);
  assert.match(SHELL_CSS, /InterVariable\.woff2/);
  assert.equal(SHELL_CSS.includes("bookfolio"), false);
});
