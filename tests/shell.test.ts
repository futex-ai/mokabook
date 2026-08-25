import assert from "node:assert/strict";
import test from "node:test";

import type { ManifestV3 } from "../dist/registry/types.js";
import type { Catalogue } from "../dist/server/catalogue.js";
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
      childIds: ["screens", "tour"],
      dependencies: [],
      description: "Example catalogue",
      id: "example",
      kind: "collection",
      navPath: [],
      relatedDocs: [],
      sourcePath: "entries/fixture.mockup.tsx",
      title: "Example",
    },
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

const darkManifest: ManifestV3 = {
  ...manifest,
  entries: manifest.entries.map((entry) =>
    entry.kind === "screen" && entry.id === "welcome"
      ? {
          ...entry,
          darkFragments: {
            desktop: "screens/welcome.desktop.dark.html",
            mobile: "screens/welcome.mobile.dark.html",
          },
        }
      : entry,
  ),
};

const context = { base: "origin/main", mode: "browse" as const };

const SCHEME_SWITCH =
  '<span aria-label="Color scheme" class="mbk-seg" data-mokabook-schemeswitch="" role="group">' +
  '<button aria-pressed="true" data-color-scheme-option="light" type="button">Light</button>' +
  '<button aria-pressed="false" data-color-scheme-option="dark" type="button">Dark</button>' +
  "</span>";

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * Collapse stylesheet whitespace so contract assertions pin selectors and
 * declarations rather than the source module's line wrapping.
 */
function flatCss(css: string): string {
  return css.replace(/\s+/g, " ").replace(/\(\s/g, "(").replace(/\s\)/g, ")");
}

/**
 * The selector of every declaration block that reads a dark screen token, used
 * to prove the dark palette cannot reach the light render.
 */
function darkTokenSelectors(css: string): string[] {
  return css
    .split("}")
    .filter((block) => block.includes("var(--mbk-dark-screen-"))
    .map((block) => block.slice(0, block.lastIndexOf("{")).trim());
}

function routePage(catalogue: Catalogue, route: string): string {
  const entry = catalogue.byRoute.get(route);
  assert.ok(entry);
  return viewPage(entry, catalogue, { ...context, activeRoute: route });
}

/**
 * Every scheme-aware frame serves its light fragment until the client swaps it,
 * so the rendered src must equal the light attribute the client assigns back.
 */
function assertLightSrcMatchesAttribute(html: string, frames: number): void {
  const matches = [
    ...html.matchAll(
      /<iframe [^>]*data-fragment-light="([^"]*)"[^>]*src="([^"]*)"[^>]*>/g,
    ),
  ];
  assert.equal(matches.length, frames);
  for (const match of matches) {
    assert.equal(match[2], match[1]);
  }
}

test("nav tree nests collections and folds legacy directories", () => {
  const catalogue = createCatalogue(manifest);
  const tree = buildNavTree(catalogue.hierarchy, manifest.legacyPages);
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
  assert.match(html, /data-nav-collection="collection:screens"/);
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
  assert.match(
    html,
    /class="phone-status"><span>9:41<\/span><span class="phone-status-icons">(<svg[\s\S]*?<\/svg>){3}<\/span><\/div><iframe/,
  );
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
    /aria-label="Copy ID welcome" class="mbk-idchip" data-copy-id="welcome" type="button">#welcome<\/button>/,
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

test("scheme switch renders only for catalogues with dark fragments", () => {
  const lightOnly = createCatalogue(manifest);
  assert.equal(lightOnly.hasDarkFragments, false);
  assert.equal(
    homePage(lightOnly, context).includes("data-mokabook-schemeswitch"),
    false,
  );
  assert.equal(
    routePage(lightOnly, "screens/welcome.html").includes(
      "data-mokabook-schemeswitch",
    ),
    false,
  );

  const dark = createCatalogue(darkManifest);
  assert.equal(dark.hasDarkFragments, true);
  const home = homePage(dark, context);
  assert.ok(home.includes(SCHEME_SWITCH));
  assert.equal(occurrences(home, "data-mokabook-schemeswitch"), 1);
  assert.match(
    home,
    /data-mokabook-search[\s\S]*?<\/div><span aria-label="Color scheme"[\s\S]*?<\/span><nav aria-label="Mokabook modes"/,
  );

  const screen = routePage(dark, "screens/welcome.html");
  assert.equal(occurrences(screen, "data-mokabook-schemeswitch"), 2);
  assert.match(
    screen,
    /data-mokabook-viewswitch=""[\s\S]*?<\/span><span aria-label="Color scheme" class="mbk-seg" data-mokabook-schemeswitch="" role="group">[\s\S]*?<\/span><\/div><div class="mbk-stage/,
  );

  const flow = routePage(dark, "user-flows/tour.html");
  assert.equal(occurrences(flow, "data-mokabook-schemeswitch"), 2);
  assert.equal(flow.includes("data-mokabook-viewswitch"), false);
  assert.match(
    flow,
    /<\/div><span aria-label="Color scheme"[\s\S]*?<\/span><\/div><div class="mbk-flow"/,
  );

  const legacy = routePage(dark, "legacy/old.html");
  assert.equal(occurrences(legacy, "data-mokabook-schemeswitch"), 1);
  const review = reviewPage("origin/main", dark, {
    ...context,
    mode: "review",
  });
  assert.equal(occurrences(review, "data-mokabook-schemeswitch"), 1);
});

test("screen stage carries per-frame scheme fragment data", () => {
  const dark = createCatalogue(darkManifest);
  const screen = routePage(dark, "screens/welcome.html");
  assert.match(
    screen,
    /<iframe class="mbk-frag" data-fragment-dark="\/static\/screens\/welcome\.mobile\.dark\.html" data-fragment-light="\/static\/screens\/welcome\.mobile\.html" sandbox="" src="\/static\/screens\/welcome\.mobile\.html" title="Welcome — mobile"><\/iframe>/,
  );
  assert.match(
    screen,
    /<iframe class="mbk-frag" data-fragment-dark="\/static\/screens\/welcome\.desktop\.dark\.html" data-fragment-light="\/static\/screens\/welcome\.desktop\.html" sandbox="" src="\/static\/screens\/welcome\.desktop\.html" title="Welcome — desktop"><\/iframe>/,
  );
  assert.equal(screen.includes("data-color-scheme-fallback"), false);
  assert.equal(screen.includes("mbk-frame-scheme-note"), false);
  assertLightSrcMatchesAttribute(screen, 2);

  const fallback = routePage(dark, "screens/details.html");
  assert.match(
    fallback,
    /<div class="mbk-frame-wrap mbk-frame-mobile" data-color-scheme-fallback=""><p class="mbk-frame-label">Mobile<span class="mbk-frame-scheme-note"> — Light only<\/span><\/p>/,
  );
  assert.match(
    fallback,
    /<div class="mbk-frame-wrap mbk-frame-desktop" data-color-scheme-fallback=""><p class="mbk-frame-label">Desktop<span class="mbk-frame-scheme-note"> — Light only<\/span><\/p>/,
  );
  assert.match(
    fallback,
    /<iframe class="mbk-frag" data-fragment-light="\/static\/screens\/details\.mobile\.html" sandbox="" src="\/static\/screens\/details\.mobile\.html" title="Details — mobile"><\/iframe>/,
  );
  assert.equal(fallback.includes("data-fragment-dark"), false);
  assertLightSrcMatchesAttribute(fallback, 2);

  const flow = routePage(dark, "user-flows/tour.html");
  assert.match(
    flow,
    /<div class="mbk-flow-screen"><div class="browser-frame">[\s\S]*?<iframe class="mbk-frag" data-fragment-dark="\/static\/screens\/welcome\.desktop\.dark\.html" data-fragment-light="\/static\/screens\/welcome\.desktop\.html" sandbox=""/,
  );
  assert.match(
    flow,
    /<div class="mbk-flow-screen" data-color-scheme-fallback=""><div class="browser-frame">[\s\S]*?<iframe class="mbk-frag" data-fragment-light="\/static\/screens\/details\.desktop\.html" sandbox=""/,
  );
  assert.equal(flow.includes("mbk-frame-scheme-note"), false);
  assertLightSrcMatchesAttribute(flow, 2);

  const lightOnly = createCatalogue(manifest);
  const lightScreen = routePage(lightOnly, "screens/welcome.html");
  assert.match(
    lightScreen,
    /<div class="mbk-frame-wrap mbk-frame-mobile"><p class="mbk-frame-label">Mobile<\/p>/,
  );
  assert.match(
    lightScreen,
    /<iframe class="mbk-frag" sandbox="" src="\/static\/screens\/welcome\.mobile\.html" title="Welcome — mobile"><\/iframe>/,
  );
  assert.equal(lightScreen.includes("data-fragment-"), false);
  assert.equal(lightScreen.includes("data-color-scheme-fallback"), false);
  const lightFlow = routePage(lightOnly, "user-flows/tour.html");
  assert.match(
    lightFlow,
    /<div class="mbk-flow-screen"><div class="browser-frame">/,
  );
  assert.equal(lightFlow.includes("data-fragment-"), false);
});

test("details inspector lists dark fragments and the schemes row", () => {
  const dark = createCatalogue(darkManifest);
  const screen = routePage(dark, "screens/welcome.html");
  assert.ok(
    screen.includes(
      '<span class="mbk-meta-k">Generated</span><span class="mbk-meta-v">' +
        '<span class="mbk-chips">' +
        '<code class="mbk-code">screens/welcome.mobile.html</code>' +
        '<code class="mbk-code">screens/welcome.desktop.html</code>' +
        '<code class="mbk-code">screens/welcome.mobile.dark.html</code>' +
        '<code class="mbk-code">screens/welcome.desktop.dark.html</code>' +
        "</span></span></div>" +
        '<div class="mbk-meta-row"><span class="mbk-meta-k">Schemes</span>' +
        '<span class="mbk-meta-v">light, dark</span></div>' +
        '<div class="mbk-meta-row"><span class="mbk-meta-k">Related docs</span>',
    ),
  );

  const fallback = routePage(dark, "screens/details.html");
  assert.ok(
    fallback.includes(
      '<span class="mbk-meta-k">Generated</span><span class="mbk-meta-v">' +
        '<span class="mbk-chips">' +
        '<code class="mbk-code">screens/details.mobile.html</code>' +
        '<code class="mbk-code">screens/details.desktop.html</code>' +
        "</span></span></div>" +
        '<div class="mbk-meta-row"><span class="mbk-meta-k">Schemes</span>' +
        '<span class="mbk-meta-v">light</span></div>',
    ),
  );

  const flow = routePage(dark, "user-flows/tour.html");
  assert.equal(flow.includes('mbk-meta-k">Schemes'), false);

  const lightOnly = createCatalogue(manifest);
  const lightScreen = routePage(lightOnly, "screens/welcome.html");
  assert.equal(lightScreen.includes('mbk-meta-k">Schemes'), false);
  assert.ok(
    lightScreen.includes(
      '<span class="mbk-meta-k">Generated</span><span class="mbk-meta-v">' +
        '<span class="mbk-chips">' +
        '<code class="mbk-code">screens/welcome.mobile.html</code>' +
        '<code class="mbk-code">screens/welcome.desktop.html</code>' +
        "</span></span></div>" +
        '<div class="mbk-meta-row"><span class="mbk-meta-k">Related docs</span>',
    ),
  );
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
  const withNoChanges = homePage(catalogue, {
    ...context,
    changedRoutes: [],
  });
  assert.match(withNoChanges, /data-mokabook-filter/);
  assert.match(withNoChanges, /class="mbk-nav-filter-count">0</);
  const withoutFilter = homePage(catalogue, context);
  assert.equal(withoutFilter.includes("data-mokabook-filter"), false);
  assert.match(withoutFilter, /data-mokabook-search/);
});

test("shell stylesheet stays aligned with the design contract", () => {
  assert.match(SHELL_CSS, /--mokabook-accent: #4f7864/);
  assert.match(SHELL_CSS, /--mb-added: #1d7a3d/);
  assert.match(SHELL_CSS, /--mbk-dark-screen-bg: #121514/);
  assert.match(SHELL_CSS, /--mbk-dark-screen-ink: #eef1ef/);
  assert.match(SHELL_CSS, /color-scheme: light/);
  assert.match(SHELL_CSS, /width: 390px/);
  assert.match(SHELL_CSS, /max-width: 1180px/);
  assert.match(SHELL_CSS, /max-width: 56\.25rem/);
  assert.match(
    SHELL_CSS,
    /\.phone-status \{[\s\S]*flex: 0 0 44px;[\s\S]*padding: 14px 28px 0;/,
  );
  assert.match(SHELL_CSS, /\.phone-screen \{[\s\S]*flex-direction: column;/);
  assert.match(
    SHELL_CSS,
    /\.phone-screen \.mbk-frag \{[\s\S]*border-radius: 0 0 36px 36px;/,
  );
  assert.ok(
    flatCss(SHELL_CSS).includes(
      '.mbk-cmp-toolbar > [aria-label="Viewport"]:not(:last-child) ' +
        "{ margin-left: auto; }",
    ),
  );
  assert.match(SHELL_CSS, /prefers-reduced-motion/);
  assert.match(SHELL_CSS, /InterVariable\.woff2/);
  assert.match(SHELL_CSS, /\.mbk-idchip \{[\s\S]*cursor: pointer;/);
  assert.match(
    SHELL_CSS,
    /\.mbk-idchip:active \{[\s\S]*transform: translateY\(1px\);/,
  );
  assert.equal(SHELL_CSS.includes("bookfolio"), false);
});

test("dark scheme paints device screens and leaves the chrome light", () => {
  const css = flatCss(SHELL_CSS);
  const scope =
    'body[data-mokabook-color-scheme="dark"] ' +
    ":is(.mbk-frame-wrap, .mbk-flow-screen):not([data-color-scheme-fallback]) ";

  assert.ok(
    css.includes(
      `${scope}.phone-screen { background: var(--mbk-dark-screen-bg); }`,
    ),
  );
  assert.ok(
    css.includes(
      `${scope}.phone-screen::after { content: ""; position: absolute; ` +
        "inset: 0; border-radius: inherit; " +
        "box-shadow: inset 0 0 0 1px color-mix(in srgb, " +
        "var(--mbk-dark-screen-ink) 12%, var(--mbk-dark-screen-bg)); " +
        "pointer-events: none; }",
    ),
  );
  assert.ok(
    css.includes(
      `${scope}.phone-status { color: var(--mbk-dark-screen-ink); }`,
    ),
  );
  assert.ok(
    css.includes(
      `${scope}.phone-home { background: color-mix(in srgb, ` +
        "var(--mbk-dark-screen-ink) 40%, transparent); }",
    ),
  );
  assert.ok(
    css.includes(
      `${scope}.browser-viewport { background: var(--mbk-dark-screen-bg); }`,
    ),
  );
  assert.ok(
    css.includes(
      `${scope}.mbk-frag { background: var(--mbk-dark-screen-bg); }`,
    ),
  );

  const selectors = darkTokenSelectors(SHELL_CSS).map(flatCss);
  assert.equal(selectors.length, 6);
  for (const selector of selectors) {
    assert.ok(selector.startsWith(scope.trim()), selector);
  }

  assert.match(SHELL_CSS, /\.phone-screen \{[^}]*background: #ffffff;/);
  assert.match(SHELL_CSS, /\.phone-status \{[^}]*color: var\(--chrome-ink\);/);
  assert.match(
    SHELL_CSS,
    /\.phone-home \{[^}]*background: rgba\(20, 24, 20, 0\.4\);/,
  );
  assert.match(
    SHELL_CSS,
    /\.browser-viewport \{[^}]*background: var\(--chrome-surface\);/,
  );
});

test("frame labels note a light-only screen only under a dark selection", () => {
  const css = flatCss(SHELL_CSS);
  assert.ok(
    css.includes(".mbk-frame-scheme-note { display: none; font-weight: 500; }"),
  );
  assert.ok(
    css.includes(
      'body[data-mokabook-color-scheme="dark"] ' +
        ".mbk-frame-wrap[data-color-scheme-fallback] " +
        ".mbk-frame-scheme-note { display: inline; }",
    ),
  );
});

test("one scheme switch instance shows per side of the breakpoint", () => {
  const css = flatCss(SHELL_CSS);
  assert.ok(
    css.includes(
      ".mbk-screen-head > [data-mokabook-schemeswitch] " +
        "{ display: none; margin-left: 0; }",
    ),
  );
  assert.ok(
    css.includes(
      "@media (max-width: 56.25rem) { " +
        ".mbk-topbar > [data-mokabook-schemeswitch] { display: none; } " +
        ".mbk-screen-head > [data-mokabook-schemeswitch] " +
        "{ display: inline-flex; } }",
    ),
  );
});
