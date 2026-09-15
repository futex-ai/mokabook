/** Catalogue ids the Bands direction links between. */

import { SITE_SCREENS } from "../../../parts/links.js";

/**
 * The direction owns the home, the documentation page and the changelog, so
 * its chrome navigates within the direction. Terms and Privacy have no
 * direction screen and keep the site's own policy documents.
 */
export const BANDS_SCREENS = {
  changelog: "design-site-bands-changelog",
  docs: "design-site-bands-docs",
  home: "design-site-bands-home",
  privacy: SITE_SCREENS.privacy,
  terms: SITE_SCREENS.terms,
} as const;

/** One of the destinations the Bands chrome addresses. */
export type BandsScreen = (typeof BANDS_SCREENS)[keyof typeof BANDS_SCREENS];

/** Mark a header, footer or sidebar link when it addresses this screen. */
export function bandsCurrent(
  active: BandsScreen,
  screen: BandsScreen,
): "page" | undefined {
  return active === screen ? "page" : undefined;
}
