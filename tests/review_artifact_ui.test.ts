import assert from "node:assert/strict";
import test from "node:test";

import { renderReviewArtifact } from "../dist/review/artifact.js";
import { comparisonPagePath } from "../dist/review/paths.js";
import type { ReviewResult, ScreenReview } from "../dist/review/types.js";

function screenReview(overrides: Partial<ScreenReview>): ScreenReview {
  return {
    dependencies: [],
    id: "welcome",
    route: "screens/welcome.html",
    sharedImpact: [],
    state: "changed",
    title: "Welcome",
    viewports: [
      {
        afterPath: "snapshots/after/screens/welcome.mobile.html",
        beforePath: "snapshots/before/screens/welcome.mobile.html",
        ignoredIds: [],
        state: "changed",
        viewport: "mobile",
      },
      {
        afterPath: "snapshots/after/screens/welcome.desktop.html",
        beforePath: "snapshots/before/screens/welcome.desktop.html",
        ignoredIds: ["example-nav"],
        state: "changed",
        viewport: "desktop",
      },
    ],
    ...overrides,
  };
}

function result(overrides: Partial<ReviewResult>): ReviewResult {
  return {
    baseCommit: "a".repeat(40),
    baseRef: "origin/main",
    changedPaths: [],
    ignoredImpact: [],
    screens: [],
    schemaVersion: 1,
    sharedImpact: [],
    ...overrides,
  };
}

test("review index groups outcomes and reports aggregate impact", () => {
  const files = renderReviewArtifact({
    files: new Map(),
    result: result({
      ignoredImpact: [{ count: 2, id: "example-nav", viewport: "desktop" }],
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
  const unchangedViewports = screenReview({}).viewports.map((viewport) => ({
    ...viewport,
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
          viewports: unchangedViewports,
        }),
        screenReview({
          dependencies: ["tokens.json"],
          id: "dependency-only",
          route: "screens/dependency-only.html",
          sharedImpact: ["tokens.json"],
          state: "unchanged",
          title: "Dependency only",
          viewports: unchangedViewports,
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
      `href="${comparisonPagePath("screens/shared-only.html", "mobile")}"`,
    ),
  );
  assert.ok(
    index.includes(
      `href="${comparisonPagePath("screens/dependency-only.html", "mobile")}"`,
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
          viewports: [
            {
              afterPath: "snapshots/after/screens/added.mobile.html",
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
    comparisonPagePath("screens/welcome.html", "desktop"),
  ) as string;
  assert.match(changed, /data-mode="side"/);
  assert.match(changed, /data-mode="overlay"/);
  assert.match(changed, /data-mode="difference"/);
  assert.match(changed, /aria-current="page"[^>]*>Desktop/);
  assert.match(changed, /href="[^"]*mobile[^"]*">Mobile/);
  assert.match(changed, /mbk-status changed/);
  assert.match(changed, /Ignored regions/);
  assert.match(changed, /<iframe class="mb-frag" sandbox=""/);
  const added = files.get(
    comparisonPagePath("screens/added.html", "mobile"),
  ) as string;
  assert.match(added, /does not exist on origin\/main/);
  assert.match(added, /mb-pane-doc--added/);
});

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
    comparisonPagePath("screens/welcome.html", "mobile"),
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
    comparisonPagePath("screens/welcome.html", "mobile"),
  ) as string;
  assert.match(
    staticCompare,
    /aria-current="page" class="mbk-mode active" href="\.\.\/\.\.\/\.\.\/index\.html">Review/,
  );
  assert.doesNotMatch(staticIndex, /refresh=1/);
  assert.doesNotMatch(staticIndex, /browser\.js/);
});
