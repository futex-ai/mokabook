import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import { renderReviewArtifact } from "../dist/review/artifact.js";
import type { ReviewResult, ScreenReview } from "../dist/review/types.js";

function screenReview(overrides: Partial<ScreenReview>): ScreenReview {
  return {
    dependencies: [],
    id: "welcome",
    route: "screens/welcome.html",
    sharedImpact: [],
    state: "changed",
    title: "Welcome",
    views: [
      {
        afterPath: "snapshots/after/screens/welcome.mobile.html",
        beforePath: "snapshots/before/screens/welcome.mobile.html",
        colorScheme: "light",
        ignoredIds: [],
        state: "changed",
        viewport: "mobile",
      },
      {
        afterPath: "snapshots/after/screens/welcome.desktop.html",
        beforePath: "snapshots/before/screens/welcome.desktop.html",
        colorScheme: "light",
        ignoredIds: ["example-nav"],
        state: "changed",
        viewport: "desktop",
      },
    ],
    ...overrides,
  };
}

function schemedScreenReview(): ScreenReview {
  return screenReview({
    views: [
      {
        afterPath: "snapshots/after/screens/welcome.mobile.html",
        beforePath: "snapshots/before/screens/welcome.mobile.html",
        colorScheme: "light",
        ignoredIds: [],
        state: "changed",
        viewport: "mobile",
      },
      {
        afterPath: "snapshots/after/screens/welcome.mobile.dark.html",
        beforePath: "snapshots/before/screens/welcome.mobile.dark.html",
        colorScheme: "dark",
        ignoredIds: [],
        state: "changed",
        viewport: "mobile",
      },
      {
        afterPath: "snapshots/after/screens/welcome.desktop.html",
        beforePath: "snapshots/before/screens/welcome.desktop.html",
        colorScheme: "light",
        ignoredIds: [],
        state: "changed",
        viewport: "desktop",
      },
      {
        afterPath: "snapshots/after/screens/welcome.desktop.dark.html",
        beforePath: "snapshots/before/screens/welcome.desktop.dark.html",
        colorScheme: "dark",
        ignoredIds: [],
        state: "changed",
        viewport: "desktop",
      },
    ],
  });
}

function result(overrides: Partial<ReviewResult>): ReviewResult {
  return {
    baseCommit: "a".repeat(40),
    baseRef: "origin/main",
    changedPaths: [],
    ignoredImpact: [],
    screens: [],
    schemaVersion: 2,
    sharedImpact: [],
    ...overrides,
  };
}

test("review index groups outcomes and reports aggregate impact", () => {
  const files = renderReviewArtifact({
    files: new Map(),
    result: result({
      ignoredImpact: [
        {
          colorScheme: "light",
          count: 2,
          id: "example-nav",
          viewport: "desktop",
        },
      ],
      screens: [
        screenReview({}),
        screenReview({
          id: "added",
          route: "screens/added.html",
          state: "added",
          title: "Added",
        }),
        screenReview({
          id: "same",
          route: "screens/same.html",
          state: "unchanged",
          title: "Same",
        }),
      ],
      sharedImpact: ["styles.css"],
    }),
  });
  const index = files.get("index.html");
  assert.equal(typeof index, "string");
  assert.match(index as string, /Comparing this branch with/);
  assert.match(index as string, /Changed screens/);
  assert.match(index as string, /<\/span>Changed<span class="mbk-chg-count">1/);
  assert.match(index as string, /<\/span>Added<span class="mbk-chg-count">1/);
  assert.match(index as string, /1 screen unchanged/);
  assert.match(index as string, /Shared impact/);
  assert.match(index as string, /example-nav/);
  assert.match(index as string, /--mokabook-accent/);
});

test("empty review renders the no-visual-changes state", () => {
  const files = renderReviewArtifact({
    files: new Map(),
    result: result({
      screens: [screenReview({ state: "unchanged", title: "Same" })],
    }),
  });
  assert.match(files.get("index.html") as string, /No visual changes/);
});

test("impact-only screens remain visible and material", () => {
  const unchangedViews = screenReview({}).views.map((view) => ({
    ...view,
    state: "unchanged" as const,
  }));
  const files = renderReviewArtifact({
    files: new Map(),
    result: result({
      screens: [
        screenReview({
          id: "shared-only",
          route: "screens/shared-only.html",
          sharedImpact: ["styles.css"],
          state: "unchanged",
          title: "Shared only",
          views: unchangedViews,
        }),
        screenReview({
          dependencies: ["tokens.json"],
          id: "dependency-only",
          route: "screens/dependency-only.html",
          sharedImpact: ["tokens.json"],
          state: "unchanged",
          title: "Dependency only",
          views: unchangedViews,
        }),
      ],
      sharedImpact: ["styles.css"],
    }),
  });
  const index = files.get("index.html") as string;
  const summary = files.get("summary.md") as string;

  assert.doesNotMatch(index, /No visual changes/);
  assert.match(index, /Impacted/);
  assert.match(index, /Shared only/);
  assert.match(index, /Dependency only/);
  assert.ok(
    index.includes(
      `href="${literalComparisonPagePath("screens/shared-only.html", "mobile")}"`,
    ),
  );
  assert.ok(
    index.includes(
      `href="${literalComparisonPagePath("screens/dependency-only.html", "mobile")}"`,
    ),
  );
  assert.match(summary, /material: 2/);
  assert.match(summary, /impacted: 2/);
});

test("compare pages render modes, viewport links, and missing panes", () => {
  const files = renderReviewArtifact({
    files: new Map(),
    result: result({
      screens: [
        screenReview({}),
        screenReview({
          id: "added",
          route: "screens/added.html",
          state: "added",
          title: "Added",
          views: [
            {
              afterPath: "snapshots/after/screens/added.mobile.html",
              colorScheme: "light",
              ignoredIds: [],
              state: "added",
              viewport: "mobile",
            },
          ],
        }),
      ],
    }),
  });
  const changed = files.get(
    literalComparisonPagePath("screens/welcome.html", "desktop"),
  ) as string;
  assert.match(changed, /data-mode="side"/);
  assert.match(changed, /data-mode="overlay"/);
  assert.match(changed, /data-mode="difference"/);
  assert.match(changed, /aria-current="page"[^>]*>Desktop/);
  assert.match(changed, /href="\.\.\/mobile\/index\.html">Mobile/);
  assert.match(changed, /mbk-status changed/);
  assert.match(changed, /Ignored regions/);
  assert.match(changed, /<iframe class="mb-frag" sandbox=""/);
  const added = files.get(
    literalComparisonPagePath("screens/added.html", "mobile"),
  ) as string;
  assert.match(added, /does not exist on origin\/main/);
  assert.match(added, /mb-pane-doc--added/);
});

test("artifact emits one compare page per view", () => {
  const screen = schemedScreenReview();
  const files = renderReviewArtifact({
    files: new Map(),
    result: result({ screens: [screen] }),
  });

  for (const path of [
    literalComparisonPagePath(screen.route, "mobile"),
    literalComparisonPagePath(screen.route, "mobile.dark"),
    literalComparisonPagePath(screen.route, "desktop"),
    literalComparisonPagePath(screen.route, "desktop.dark"),
  ]) {
    assert.equal(path.split("/").length, 4);
    assert.ok(files.has(path));
  }
  const dark = files.get(
    literalComparisonPagePath(screen.route, "mobile.dark"),
  ) as string;
  assert.match(dark, /<title>Welcome · mobile · dark<\/title>/);
  assert.match(dark, /href="\.\.\/desktop\.dark\/index\.html">Desktop/);
  assert.match(dark, /mbk-review-facts">Mobile · Changed</);
  assert.doesNotMatch(dark, /Mobile · Dark/);
});

test("compare pages segment the color scheme for dark-capable screens", () => {
  const screen = schemedScreenReview();
  const files = renderReviewArtifact({
    files: new Map(),
    result: result({
      screens: [
        screen,
        screenReview({
          id: "light-only",
          route: "screens/light-only.html",
          title: "Light only",
        }),
      ],
    }),
  });

  const dark = compareToolbar(
    files.get(literalComparisonPagePath(screen.route, "mobile.dark")) as string,
  );
  assert.ok(
    dark.indexOf('aria-label="Comparison mode"') <
      dark.indexOf('aria-label="Viewport"'),
  );
  assert.ok(
    dark.indexOf('aria-label="Viewport"') <
      dark.indexOf('aria-label="Color scheme"'),
  );
  assert.match(
    dark,
    /<span aria-label="Color scheme" class="mbk-seg" role="group">/,
  );
  assert.match(
    dark,
    /role="group"><a href="\.\.\/mobile\/index\.html">Light<\/a>/,
  );
  assert.match(dark, /<span aria-current="page" class="active">Dark<\/span>/);

  const light = compareToolbar(
    files.get(literalComparisonPagePath(screen.route, "desktop")) as string,
  );
  assert.match(light, /<span aria-current="page" class="active">Light<\/span>/);
  assert.match(light, /<a href="\.\.\/desktop\.dark\/index\.html">Dark<\/a>/);
  assert.match(light, /<a href="\.\.\/mobile\/index\.html">Mobile<\/a>/);

  const lightOnly = compareToolbar(
    files.get(
      literalComparisonPagePath("screens/light-only.html", "mobile"),
    ) as string,
  );
  assert.match(lightOnly, /aria-label="Viewport"/);
  assert.doesNotMatch(lightOnly, /Color scheme/);
  assert.doesNotMatch(lightOnly, />Dark</);
});

/** The compare band markup alone, so assertions ignore the inlined shell CSS. */
function compareToolbar(page: string): string {
  const start = page.indexOf('<div class="mbk-cmp-toolbar">');
  return page.slice(start, page.indexOf('<div class="mbk-rvw-stage">', start));
}

test("served render options add browse, recompute, and live-update hooks", () => {
  const artifact = {
    files: new Map(),
    result: result({ screens: [screenReview({})] }),
  };
  const served = renderReviewArtifact(artifact, { browseHref: "/" });
  const index = served.get("index.html") as string;
  assert.match(index, /href="\/">Browse<\/a>/);
  assert.match(index, /index\.html\?refresh=1">Recompute the comparison/);
  assert.match(index, /\/__mokabook\/client\/browser\.js/);
  const compare = served.get(
    literalComparisonPagePath("screens/welcome.html", "mobile"),
  ) as string;
  assert.match(compare, /href="\/">Browse<\/a>/);
  assert.match(compare, /\/__mokabook\/client\/browser\.js/);

  const staticArtifact = renderReviewArtifact({
    files: new Map(),
    result: result({ screens: [screenReview({})] }),
  });
  const staticIndex = staticArtifact.get("index.html") as string;
  assert.match(staticIndex, /data-mokabook-menu=""/);
  assert.match(staticIndex, /data-drawer="closed"/);
  assert.match(
    staticIndex,
    /aria-current="page" class="mbk-mode active" href="index\.html">Review/,
  );
  const staticCompare = staticArtifact.get(
    literalComparisonPagePath("screens/welcome.html", "mobile"),
  ) as string;
  assert.match(
    staticCompare,
    /aria-current="page" class="mbk-mode active" href="\.\.\/\.\.\/\.\.\/index\.html">Review/,
  );
  assert.doesNotMatch(staticIndex, /refresh=1/);
  assert.doesNotMatch(staticIndex, /browser\.js/);
});

function literalComparisonPagePath(route: string, segment: string): string {
  const digest = crypto.createHash("sha256").update(route).digest("hex");
  return `comparisons/${digest}/${segment}/index.html`;
}
