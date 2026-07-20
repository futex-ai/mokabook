import { screen } from "mokabook";

import {
  BaseLine,
  CompareToolbar,
  ImpactedScreens,
  IgnoredImpactCard,
  Pane,
  ReviewNav,
  SharedImpactCard,
  StatusBadge,
} from "./parts/review.js";
import { Shell } from "./parts/shell.js";
import { EmptyState, MiniWelcome } from "./parts/stage.js";

function SharedImpactSummary({ viewport }: { viewport: "desktop" | "mobile" }) {
  return (
    <Shell
      mode="review"
      viewport={viewport}
      nav={viewport === "desktop" ? <ReviewNav withSharedImpact /> : null}
    >
      <BaseLine />
      <div className="mb-title-row">
        <h1>Mokabook review</h1>
      </div>
      <p className="mb-review-foot">
        1 changed · 1 added · 1 removed · 2 impacted against origin/main. Choose
        a screen to compare.
      </p>
      <ImpactedScreens />
      <SharedImpactCard />
      <span className="mb-empty-link">Open the first impacted screen</span>
    </Shell>
  );
}

function IgnoredOnlyCompare({ viewport }: { viewport: "desktop" | "mobile" }) {
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
      <BaseLine />
      <div className="mb-title-row">
        <h1>Welcome</h1>
        <StatusBadge state="ignored-only" />
        <span className="mb-code">screens/welcome.html</span>
      </div>
      <CompareToolbar mode="side-by-side" viewport={viewport} />
      <div className="mb-panes">
        <Pane label="Before — origin/main">
          <MiniWelcome compact={compact} />
        </Pane>
        <Pane label="After — this branch">
          <MiniWelcome compact={compact} />
        </Pane>
      </div>
      <IgnoredImpactCard />
      <p className="mb-review-foot">
        Every difference falls inside an ignored region, so this screen is not
        counted as changed.
      </p>
    </Shell>
  );
}

function EmptyReviewNav() {
  return (
    <nav className="mb-nav" aria-label="Changed screens">
      <h2 className="mb-nav-group">Changed screens</h2>
      <p className="mb-review-nav-total">0 screens differ from origin/main</p>
    </nav>
  );
}

function EmptyReview({ viewport }: { viewport: "desktop" | "mobile" }) {
  return (
    <Shell
      mode="review"
      viewport={viewport}
      nav={viewport === "desktop" ? <EmptyReviewNav /> : null}
    >
      <BaseLine />
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
