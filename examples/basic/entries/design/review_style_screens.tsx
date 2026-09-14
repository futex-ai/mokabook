import { screen } from "mokabook";
import { PreviewWorkspace } from "./components/parts/workspace.js";

import { ComparisonStage } from "./parts/compare.js";
import { DESTINATIONS } from "./parts/destinations.js";
import { DetailsPanel } from "./parts/details.js";
import { NavTree } from "./parts/nav.js";
import {
  ExcludedStyleCard,
  MatchedStyleCard,
  StyleReviewNav,
  UnresolvedStyleCard,
  WelcomeShot,
} from "./parts/review.js";
import { WelcomeHead } from "./parts/screen_heads.js";
import { Shell, type ArtboardViewport } from "./parts/shell.js";

function MatchedStyles({ viewport }: { viewport: ArtboardViewport }) {
  return (
    <Shell
      design={DESTINATIONS.styleMatched}
      viewport={viewport}
      nav={<StyleReviewNav welcome={DESTINATIONS.styleMatched} />}
    >
      <WelcomeHead active={viewport} />
      <PreviewWorkspace
        stage={false}
        inspector={
          <DetailsPanel
            subject="welcome"
            comparisonEvidence={<MatchedStyleCard />}
            open
          />
        }
        render={(previewViewport) => (
          <ComparisonStage state="styles-changed" viewport={previewViewport}>
            <WelcomeShot viewport={previewViewport} comparison={false} />
          </ComparisonStage>
        )}
      />
    </Shell>
  );
}

function UnresolvedStyles({ viewport }: { viewport: ArtboardViewport }) {
  return (
    <Shell
      design={DESTINATIONS.styleUnresolved}
      viewport={viewport}
      nav={<StyleReviewNav welcome={DESTINATIONS.styleUnresolved} />}
    >
      <WelcomeHead active={viewport} />
      <PreviewWorkspace
        stage={false}
        inspector={
          <DetailsPanel
            subject="welcome"
            comparisonEvidence={<UnresolvedStyleCard />}
            open
          />
        }
        render={(previewViewport) => (
          <ComparisonStage state="styles-changed" viewport={previewViewport}>
            <WelcomeShot viewport={previewViewport} comparison={false} />
          </ComparisonStage>
        )}
      />
    </Shell>
  );
}

function ExcludedStyles({ viewport }: { viewport: ArtboardViewport }) {
  return (
    <Shell
      design={DESTINATIONS.styleExcluded}
      viewport={viewport}
      nav={<NavTree activeLabel="Welcome" changedCount={0} />}
    >
      <WelcomeHead active={viewport} />
      <PreviewWorkspace
        stage={false}
        inspector={
          <DetailsPanel
            subject="welcome"
            comparisonEvidence={<ExcludedStyleCard />}
            open
          />
        }
        render={(previewViewport) => (
          <ComparisonStage state="unchanged" viewport={previewViewport}>
            <WelcomeShot viewport={previewViewport} comparison={false} />
          </ComparisonStage>
        )}
      />
    </Shell>
  );
}

/** Design screens for stylesheet evidence that keeps or releases a screen. */
export const reviewStyleScreens = [
  screen({
    colorSchemes: ["light"],
    description:
      "A linked stylesheet changed and some of its changed styles apply here, so the screen stays in Changes and Details names those styles.",
    desktop: <MatchedStyles viewport="desktop" />,
    id: "design-review-style-matched",
    mobile: <MatchedStyles viewport="mobile" />,
    slug: "matched",
    title: "Matched styles",
  }),
  screen({
    colorSchemes: ["light"],
    description:
      "A linked stylesheet changed in a way that could reach any element, so the screen stays in Changes and Details says the change applies anywhere.",
    desktop: <UnresolvedStyles viewport="desktop" />,
    id: "design-review-style-unresolved",
    mobile: <UnresolvedStyles viewport="mobile" />,
    slug: "unresolved",
    title: "Unresolved styles",
  }),
  screen({
    colorSchemes: ["light"],
    description:
      "A linked stylesheet changed but none of its changed styles apply here, so the screen stays out of Changes and Details lists the stylesheet as examined and excluded.",
    desktop: <ExcludedStyles viewport="desktop" />,
    id: "design-review-style-excluded",
    mobile: <ExcludedStyles viewport="mobile" />,
    slug: "excluded",
    title: "Excluded styles",
  }),
];
