import { defineCollection, defineScreen } from "@mokly/mokly";

import { variantMetadata } from "../scaffold.js";

import {
  MinimalChangelogDesktop,
  MinimalChangelogMobile,
} from "./changelog.js";
import { MinimalDocsDesktop, MinimalDocsMobile } from "./docs.js";
import { MinimalHomeDesktop, MinimalHomeMobile } from "./home.js";

const METADATA = variantMetadata("minimal");

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
  defineScreen({
    ...METADATA,
    description:
      "A centered hero over a wide framed stage, three airy feature columns and a centered closing with the three steps in one column. The stage names merged pull request #71 from this repository's changelog as its fixture.",
    desktop: <MinimalHomeDesktop />,
    id: "design-site-minimal-home",
    mobile: <MinimalHomeMobile />,
    route: "design/site/minimal/home.html",
    title: "Home",
    useCaseIds: [],
  }),
  defineScreen({
    ...METADATA,
    description:
      "One centered reading column with the sidebar collapsed into a documentation trail and section switcher, the on-this-page list floating beside the column, a copyable code panel and previous and next links.",
    desktop: <MinimalDocsDesktop />,
    id: "design-site-minimal-docs",
    mobile: <MinimalDocsMobile />,
    route: "design/site/minimal/docs.html",
    title: "Documentation",
    useCaseIds: [],
  }),
  defineScreen({
    ...METADATA,
    description:
      "Three releases in one centered column, each a version and date heading line over its grouped notes, divided by a single hairline. The facts are the real 0.9.0, 0.8.0 and 0.7.1 entries of this repository's CHANGELOG.md at the time of authoring.",
    desktop: <MinimalChangelogDesktop />,
    id: "design-site-minimal-changelog",
    mobile: <MinimalChangelogMobile />,
    route: "design/site/minimal/changelog.html",
    title: "Changelog",
    useCaseIds: [],
  }),
];
