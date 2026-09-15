import { defineCollection } from "@mokly/mokly";

import { gridChangelogScreen } from "./changelog.js";
import { gridDocsScreen } from "./docs.js";
import { gridHomeScreen } from "./home.js";

/** The Grid direction: home, documentation and changelog. */
export const gridMockups = [
  defineCollection({
    childIds: [
      "design-site-grid-home",
      "design-site-grid-docs",
      "design-site-grid-changelog",
    ],
    dependencies: ["examples/basic/generated/site-grid.css"],
    description:
      "The Grid direction applied to the home, a documentation page and the changelog.",
    id: "design-site-grid",
    relatedDocs: ["docs/protocol/site-directions.md"],
    title: "Grid",
  }),
  gridHomeScreen,
  gridDocsScreen,
  gridChangelogScreen,
];
