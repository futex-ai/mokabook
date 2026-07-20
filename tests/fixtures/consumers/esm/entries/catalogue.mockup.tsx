import React from "react";

import {
  defineCollection,
  defineScreen,
  defineUseCase,
  MockLink,
  ReviewIgnore,
} from "mokabook";

const metadata = {
  dependencies: ["notes.md"],
  navPath: ["Packed ESM"],
  relatedDocs: ["notes.md"],
};

export const mockups = [
  defineCollection({
    ...metadata,
    childIds: ["packed-home", "packed-detail"],
    description: "Screens loaded from an installed tarball.",
    id: "packed-pages",
    title: "Packed pages",
  }),
  defineScreen({
    ...metadata,
    description: "A clean ESM consumer screen.",
    desktop: (
      <main data-fixture="esm-desktop">
        <ReviewIgnore id="fixture-navigation">
          <nav>Fixture navigation</nav>
        </ReviewIgnore>
        <MockLink to="packed-detail">Open details</MockLink>
      </main>
    ),
    id: "packed-home",
    mobile: (
      <main data-fixture="esm-mobile">
        <MockLink to="packed-detail">Open details</MockLink>
      </main>
    ),
    route: "screens/home.html",
    title: "Packed home",
    useCaseIds: ["packed-tour"],
  }),
  defineScreen({
    ...metadata,
    description: "The destination in the clean ESM consumer.",
    desktop: <main data-fixture="esm-detail-desktop">Packed details</main>,
    id: "packed-detail",
    mobile: <main data-fixture="esm-detail-mobile">Packed details</main>,
    route: "screens/detail.html",
    title: "Packed details",
    useCaseIds: ["packed-tour"],
  }),
  defineUseCase({
    ...metadata,
    description: "A two-step packed package journey.",
    id: "packed-tour",
    route: "user-flows/packed-tour.html",
    steps: [{ screenId: "packed-home" }, { screenId: "packed-detail" }],
    title: "Packed tour",
  }),
];
