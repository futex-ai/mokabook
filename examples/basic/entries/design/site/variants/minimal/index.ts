import { defineCollection } from "@mokly/mokly";

import { variantScreens } from "../scaffold.js";

/** The Minimal direction: home, documentation and changelog. */
export const minimalMockups = [
  defineCollection({
    childIds: [
      "design-site-minimal-home",
      "design-site-minimal-docs",
      "design-site-minimal-changelog",
    ],
    dependencies: ["examples/basic/generated/site-minimal.css"],
    description:
      "The Minimal direction applied to the home, a documentation page and the changelog.",
    id: "design-site-minimal",
    relatedDocs: ["docs/protocol/site-directions.md"],
    title: "Minimal",
  }),
  ...variantScreens("minimal"),
];
