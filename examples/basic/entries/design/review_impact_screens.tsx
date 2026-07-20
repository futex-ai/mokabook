import { screen } from "mokabook";

import {
  CompareGrid,
  CompareToolbar,
  Pane,
  ReviewSummary,
} from "./parts/compare.js";
import {
  EmptyReviewNav,
  IgnoredImpactCard,
  ImpactedScreens,
  ReviewNav,
  SharedImpactCard,
  StatusBadge,
} from "./parts/review.js";
import { ScreenHead, Shell } from "./parts/shell.js";
import {
  BrowserFrame,
  EmptyState,
  MiniWelcome,
  PhoneFrame,
} from "./parts/stage.js";

type ReviewViewport = "desktop" | "mobile";

function SharedImpactSummary({ viewport }: { viewport: ReviewViewport }) {
  return (
    <Shell
      mode="review"
      viewport={viewport}
      nav={viewport === "desktop" ? <ReviewNav withSharedImpact /> : null}
    >
      <ScreenHead crumbs={["Review"]} title="Mokabook review" />
      <div className="mbk-review-overview">
        <p className="mbk-review-lede">
          1 changed · 1 added · 1 removed · 2 impacted against origin/main.
          Choose a screen to compare.
        </p>
        <ImpactedScreens />
        <SharedImpactCard />
        <span className="mbk-empty-link">Open the first impacted screen</span>
      </div>
    </Shell>
  );
}

function IgnoredOnlyCompare({ viewport }: { viewport: ReviewViewport }) {
  const compact = viewport === "mobile";
  return (
    <Shell
      mode="review"
      viewport={viewport}
      nav={
        viewport === "desktop" ? (
          <ReviewNav activeTitle="Welcome" withIgnored />
        ) : null
      }
    >
      <ScreenHead
        action={<span className="mbk-open-browse">Open in Browse ↗</span>}
        crumbs={["Example", "Screens"]}
        idChip="example-welcome"
        status={<StatusBadge state="ignored-only" />}
        title="Welcome"
      />
      <CompareToolbar mode="side-by-side" viewport={viewport} />
      <CompareGrid>
        <Pane label="Before · origin/main" side="before">
          {viewport === "desktop" ? (
            <BrowserFrame address="example.test/welcome">
              <MiniWelcome compact={compact} />
            </BrowserFrame>
          ) : (
            <PhoneFrame small>
              <MiniWelcome compact={compact} />
            </PhoneFrame>
          )}
        </Pane>
        <Pane label="After · this branch" side="after">
          {viewport === "desktop" ? (
            <BrowserFrame address="example.test/welcome">
              <MiniWelcome compact={compact} />
            </BrowserFrame>
          ) : (
            <PhoneFrame small>
              <MiniWelcome compact={compact} />
            </PhoneFrame>
          )}
        </Pane>
      </CompareGrid>
      {viewport === "mobile" ? <IgnoredImpactCard /> : null}
      <ReviewSummary
        facts="Every difference falls inside an ignored region, so this screen is not counted as changed."
        state="ignored-only"
      />
    </Shell>
  );
}

function EmptyReview({ viewport }: { viewport: ReviewViewport }) {
  return (
    <Shell
      mode="review"
      viewport={viewport}
      nav={viewport === "desktop" ? <EmptyReviewNav /> : null}
    >
      <EmptyState
        title="No visual changes"
        body="This branch matches origin/main for every screen in the catalogue."
        linkLabel="Browse the catalogue"
      />
    </Shell>
  );
}

/** Review design screens for aggregate and empty comparison states. */
export const reviewImpactScreens = [
  screen({
    description:
      "The review summary when shared files can affect unchanged screens.",
    desktop: <SharedImpactSummary viewport="desktop" />,
    id: "design-review-shared-impact",
    mobile: <SharedImpactSummary viewport="mobile" />,
    slug: "shared-impact",
    title: "Shared impact",
  }),
  screen({
    description: "A screen whose only differences fall inside ignored regions.",
    desktop: <IgnoredOnlyCompare viewport="desktop" />,
    id: "design-review-ignored-only",
    mobile: <IgnoredOnlyCompare viewport="mobile" />,
    slug: "ignored-only",
    title: "Ignored only",
  }),
  screen({
    description: "The empty comparison when no screen differs from the base.",
    desktop: <EmptyReview viewport="desktop" />,
    id: "design-review-empty",
    mobile: <EmptyReview viewport="mobile" />,
    slug: "empty",
    title: "Empty review",
  }),
];
