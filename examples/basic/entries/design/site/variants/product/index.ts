import { defineCollection } from "@mokly/mokly";

import { productChangelogScreen } from "./changelog.js";
import { productDocsScreen } from "./docs.js";
import { productHomeScreen } from "./home.js";

/** The Product direction: home, documentation and changelog. */
export const productMockups = [
  defineCollection({
    childIds: [
      "design-site-product-home",
      "design-site-product-docs",
      "design-site-product-changelog",
    ],
    dependencies: ["examples/basic/generated/site-product.css"],
    description:
      "The Product direction applied to the home, a documentation page and the changelog.",
    id: "design-site-product",
    relatedDocs: ["docs/protocol/site-directions.md"],
    title: "Product",
  }),
  productHomeScreen,
  productDocsScreen,
  productChangelogScreen,
];
