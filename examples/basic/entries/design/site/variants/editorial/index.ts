import { defineCollection } from "@mokly/mokly";

import { variantScreens } from "../scaffold.js";

/** The Editorial direction: home, documentation and changelog. */
export const editorialMockups = [
  defineCollection({
    childIds: [
      "design-site-editorial-home",
      "design-site-editorial-docs",
      "design-site-editorial-changelog",
    ],
    dependencies: ["examples/basic/generated/site-editorial.css"],
    description:
      "The Editorial direction applied to the home, a documentation page and the changelog.",
    id: "design-site-editorial",
    relatedDocs: ["docs/protocol/site-directions.md"],
    title: "Editorial",
  }),
  ...variantScreens("editorial"),
];
