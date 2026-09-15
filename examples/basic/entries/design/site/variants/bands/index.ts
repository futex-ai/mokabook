import { defineCollection } from "@mokly/mokly";

import { variantScreens } from "../scaffold.js";

/** The Bands direction: home, documentation and changelog. */
export const bandsMockups = [
  defineCollection({
    childIds: [
      "design-site-bands-home",
      "design-site-bands-docs",
      "design-site-bands-changelog",
    ],
    dependencies: ["examples/basic/generated/site-bands.css"],
    description:
      "The Bands direction applied to the home, a documentation page and the changelog.",
    id: "design-site-bands",
    relatedDocs: ["docs/protocol/site-directions.md"],
    title: "Bands",
  }),
  ...variantScreens("bands"),
];
