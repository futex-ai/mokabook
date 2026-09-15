/** Catalogue ids and application routes the site mockups link between. */

/** Owning site screens, addressed by catalogue id. */
export const SITE_SCREENS = {
  changelog: "design-site-changelog",
  docs: "design-site-docs",
  home: "design-site-home",
  privacy: "design-site-privacy",
  terms: "design-site-terms",
} as const;

/** One of the five site screens in the design catalogue. */
export type SiteScreen = (typeof SITE_SCREENS)[keyof typeof SITE_SCREENS];

/**
 * Sign in and Get started are Mokly Cloud routes, not site routes. The
 * mockups depict the default application origin from the site contract.
 */
export const APP_LINKS = {
  signIn: "https://app.mokly.ai/sign-in",
  signUp: "https://app.mokly.ai/sign-up",
} as const;

/** Mark a header or footer link when it addresses the rendered screen. */
export function currentPage(
  active: SiteScreen,
  screen: SiteScreen,
): "page" | undefined {
  return active === screen ? "page" : undefined;
}
