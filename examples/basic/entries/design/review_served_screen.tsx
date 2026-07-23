import { screen } from "mokabook";

type ReviewViewport = "desktop" | "mobile";

function ChangedScreenRow() {
  return (
    <li>
      <span className="mb-chg-row">
        <span className="mb-chg-dot mb-chg-dot--changed" aria-hidden="true" />
        <span>
          Welcome
          <span className="mb-chg-route">screens/welcome.html</span>
        </span>
        <span className="mb-served-links">mobile · desktop</span>
      </span>
    </li>
  );
}

function ServedReview({ viewport }: { viewport: ReviewViewport }) {
  return (
    <div className={`mbk-served-artifact mbk-served-artifact--${viewport}`}>
      <main className="mb-artifact-main">
        <div className="mb-served-reviewbar">
          <nav aria-label="Mokabook modes" className="mb-viewswitch">
            <span className="mb-viewswitch-option">Browse</span>
            <span aria-current="page" className="mb-viewswitch-option">
              Review
            </span>
          </nav>
          <span className="mb-empty-link">Refresh comparison</span>
        </div>
        <p className="mb-baseline">
          <span className="mb-baseline-dot" aria-hidden="true" />
          Comparing this branch with <strong>origin/main</strong>
        </p>
        <div className="mb-title-row">
          <h1>Mokabook review</h1>
        </div>
        <p className="mb-review-foot">
          1 changed · 0 added · 0 removed · 0 impacted against origin/main. 1
          unchanged. Choose a screen to compare.
        </p>
        <section>
          <h2 className="mb-nav-group">Changed</h2>
          <ul className="mb-nav-list">
            <ChangedScreenRow />
          </ul>
        </section>
      </main>
    </div>
  );
}

/** Served Review design state with host navigation and refresh controls. */
export const reviewServedScreen = screen({
  description:
    "The hosted Review summary with Browse, Review, and refresh controls.",
  desktop: <ServedReview viewport="desktop" />,
  id: "design-review-served",
  mobile: <ServedReview viewport="mobile" />,
  slug: "served",
  title: "Served review",
});
