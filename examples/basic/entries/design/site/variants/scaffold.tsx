import { defineScreen } from "@mokly/mokly";

import {
  SiteChangelogDesktop,
  SiteChangelogMobile,
} from "../changelog_screen.js";
import { SiteDocsDesktop, SiteDocsMobile } from "../docs_screen.js";
import { SiteHomeDesktop, SiteHomeMobile } from "../home_screen.js";
import { SITE_METADATA } from "../parts/metadata.js";

/** A direction's slug; it names the folder, the stylesheet and the ids. */
export type VariantSlug =
  "bands" | "editorial" | "grid" | "minimal" | "product";

/** The three routes every direction renders. */
export const VARIANT_PAGES = ["home", "docs", "changelog"] as const;

/** Entry metadata for one direction's screens. */
export function variantMetadata(slug: VariantSlug) {
  return {
    ...SITE_METADATA,
    dependencies: [
      "examples/basic/generated/site-tokens.css",
      `examples/basic/generated/site-${slug}.css`,
    ],
    relatedDocs: [
      ...SITE_METADATA.relatedDocs,
      "docs/protocol/site-directions.md",
    ],
  };
}

/**
 * Placeholder screens that render the baseline site under a direction's
 * routes until that direction replaces them with its own components.
 */
export function variantScreens(slug: VariantSlug) {
  const metadata = variantMetadata(slug);
  return [
    defineScreen({
      ...metadata,
      description:
        "Placeholder: the baseline home under this direction's route.",
      desktop: <SiteHomeDesktop />,
      id: `design-site-${slug}-home`,
      mobile: <SiteHomeMobile />,
      route: `design/site/${slug}/home.html`,
      title: "Home",
      useCaseIds: [],
    }),
    defineScreen({
      ...metadata,
      description:
        "Placeholder: the baseline documentation page under this direction's route.",
      desktop: <SiteDocsDesktop />,
      id: `design-site-${slug}-docs`,
      mobile: <SiteDocsMobile />,
      route: `design/site/${slug}/docs.html`,
      title: "Documentation",
      useCaseIds: [],
    }),
    defineScreen({
      ...metadata,
      description:
        "Placeholder: the baseline changelog under this direction's route.",
      desktop: <SiteChangelogDesktop />,
      id: `design-site-${slug}-changelog`,
      mobile: <SiteChangelogMobile />,
      route: `design/site/${slug}/changelog.html`,
      title: "Changelog",
      useCaseIds: [],
    }),
  ];
}
