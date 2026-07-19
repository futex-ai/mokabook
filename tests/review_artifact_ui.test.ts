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
  assert.match(index as string, /Changed<\/h2>/);
  assert.match(index as string, /Added<\/h2>/);
  assert.match(index as string, /1 unchanged/);
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
  assert.match(changed, /aria-current="page">Desktop/);
  assert.match(changed, /href="[^"]*mobile[^"]*">Mobile/);
  assert.match(changed, /mb-badge--changed/);
  assert.match(changed, /Ignored regions/);
  assert.match(changed, /<iframe class="mb-frag" sandbox=""/);
  const added = files.get(
    comparisonPagePath("screens/added.html", "mobile"),
  ) as string;
  assert.match(added, /does not exist on origin\/main/);
  assert.match(added, /mb-pane-doc--added/);
});
