import { defineCollection, defineUseCase } from "@mokly/mokly";

import { changelogScreen } from "./changelog_screen.js";
import { docsScreen } from "./docs_screen.js";
import { homeScreen } from "./home_screen.js";
import { SITE_METADATA } from "./parts/metadata.js";
import { privacyScreen, termsScreen } from "./policy_screens.js";

/** The public site design: the five routes the website serves, and its tour. */
export const siteMockups = [
  defineCollection({
    ...SITE_METADATA,
    childIds: [
      "design-site-home",
      "design-site-docs",
      "design-site-changelog",
      "design-site-terms",
      "design-site-privacy",
      "design-site-tour",
    ],
    description:
      "Folio marketing and documentation screens for the public Mokly website.",
    id: "design-site",
    title: "Site",
  }),
  homeScreen,
  docsScreen,
  changelogScreen,
  termsScreen,
  privacyScreen,
  defineUseCase({
    ...SITE_METADATA,
    description:
      "Home to the documentation, the changelog and both policy documents.",
    id: "design-site-tour",
    route: "user-flows/design/site-tour.html",
    steps: [
      { screenId: "design-site-home" },
      { screenId: "design-site-docs" },
      { screenId: "design-site-changelog" },
      { screenId: "design-site-terms" },
      { screenId: "design-site-privacy" },
    ],
    title: "Site tour",
  }),
];
