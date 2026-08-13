import { collection, defineRoot } from "mokabook";

import { browseCompareScreens } from "./browse_compare_screens.js";
import { browseSchemeScreens } from "./browse_scheme_screens.js";
import { browseStateScreens, browseViewScreens } from "./browse_screens.js";

const DESIGN_DEPENDENCIES = [
  "examples/basic/generated/design-stage.css",
  "examples/basic/generated/design.css",
];

/** The neutral Mokabook Browse shell design catalogue. */
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
          children: [...browseStateScreens, ...browseSchemeScreens],
          description:
            "Browse states for details, missing routes, narrow layouts, and color schemes.",
          id: "design-browse-states",
          segment: "states",
          title: "Shell states",
        }),
        collection({
          children: browseCompareScreens,
          dependencies: [
            ...DESIGN_DEPENDENCIES,
            "examples/basic/generated/design-compare.css",
          ],
          description:
            "Per-screen compare modes rendering the branch-point base version on demand.",
          id: "design-browse-compare",
          segment: "compare",
          title: "Compare modes",
        }),
      ],
      description:
        "The package-owned responsive Browse shell around consumer fragments.",
      id: "design-browse",
      segment: "browse",
      title: "Browse shell",
    }),
  ],
  collection: {
    dependencies: DESIGN_DEPENDENCIES,
    description:
      "Neutral design mockups for the Mokabook shell implemented in the UI milestone.",
    id: "design",
    rationale:
      "Reviewers approve the complete Browse shell design, including its per-screen compare modes, from synthetic data before any shell UI is implemented.",
    relatedDocs: [
      "docs/protocol/mokabook-shell-design.md",
      "examples/basic/notes.md",
    ],
  },
  navPath: ["Design"],
  path: "design",
  title: "Mokabook design",
});
