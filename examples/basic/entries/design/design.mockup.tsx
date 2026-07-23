import { collection, defineRoot } from "mokabook";

import { browseStateScreens, browseViewScreens } from "./browse_screens.js";
import { reviewOutcomeScreens } from "./review_outcome_screens.js";
import { reviewImpactScreens } from "./review_impact_screens.js";
import { reviewServedScreen } from "./review_served_screen.js";

const DESIGN_DEPENDENCIES = [
  "examples/basic/generated/design-stage.css",
  "examples/basic/generated/design.css",
];

/** The neutral Mokabook Browse and Review design catalogue. */
export const mockups = defineRoot({
  children: [
    collection({
      children: [
        collection({
          children: browseViewScreens,
          description:
            "Canonical Browse destinations: home, a screen, and a use case.",
          id: "design-browse-views",
          segment: "views",
          title: "Catalogue views",
        }),
        collection({
          children: browseStateScreens,
          description:
            "Browse states for details, missing routes, and narrow layouts.",
          id: "design-browse-states",
          segment: "states",
          title: "Shell states",
        }),
      ],
      description:
        "The package-owned responsive Browse shell around consumer fragments.",
      id: "design-browse",
      segment: "browse",
      title: "Browse shell",
    }),
    collection({
      children: [
        collection({
          children: [...reviewOutcomeScreens, reviewServedScreen],
          description:
            "Per-screen comparisons and the hosted Review entry state.",
          id: "design-review-outcomes",
          segment: "outcomes",
          title: "Comparison outcomes",
        }),
        collection({
          children: reviewImpactScreens,
          description:
            "Aggregate review states: shared impact, ignored regions, empty.",
          id: "design-review-impact",
          segment: "impact",
          title: "Impact states",
        }),
      ],
      dependencies: [
        ...DESIGN_DEPENDENCIES,
        "examples/basic/generated/design-review.css",
        "examples/basic/generated/design-served-review.css",
      ],
      description:
        "The static Git comparison experience produced by mokabook review.",
      id: "design-review",
      segment: "review",
      title: "Review",
    }),
  ],
  collection: {
    dependencies: DESIGN_DEPENDENCIES,
    description:
      "Neutral design mockups for the Mokabook shell implemented in the UI milestone.",
    id: "design",
    rationale:
      "Reviewers approve the complete Browse and Review design from synthetic data before any shell UI is implemented.",
    relatedDocs: [
      "docs/protocol/mokabook-shell-design.md",
      "examples/basic/notes.md",
    ],
  },
  navPath: ["Design"],
  path: "design",
  title: "Mokabook design",
});
