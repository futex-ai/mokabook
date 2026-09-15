import { defineCollection } from "@mokly/mokly";

import { bandsMockups } from "./bands/index.js";
import { editorialMockups } from "./editorial/index.js";
import { gridMockups } from "./grid/index.js";
import { minimalMockups } from "./minimal/index.js";
import { productMockups } from "./product/index.js";

/** Five design directions for the public site, each across three routes. */
export const siteVariantMockups = [
  defineCollection({
    childIds: [
      "design-site-editorial",
      "design-site-product",
      "design-site-grid",
      "design-site-minimal",
      "design-site-bands",
    ],
    dependencies: [],
    description:
      "Candidate directions for a more refined public site, each applied to the home, a documentation page and the changelog.",
    id: "design-site-variants",
    relatedDocs: ["docs/protocol/site-directions.md"],
    title: "Directions",
  }),
  ...editorialMockups,
  ...productMockups,
  ...gridMockups,
  ...minimalMockups,
  ...bandsMockups,
];
