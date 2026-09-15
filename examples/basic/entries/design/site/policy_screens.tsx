/**
 * Terms and Privacy. Both read as the site's document column inside the same
 * chrome as the rest of the site: the location eyebrow, the page title, the
 * placeholder body the site publishes until approved text exists, and the
 * link across to the other policy.
 */

import { MockLink, defineScreen } from "@mokly/mokly";

import { SiteLayout } from "./parts/chrome.js";
import { SITE_SCREENS, type SiteScreen } from "./parts/links.js";
import { SITE_METADATA } from "./parts/metadata.js";

function PolicyScreen({
  active,
  crossLabel,
  crossTo,
  heading,
  title,
  viewport,
}: {
  active: SiteScreen;
  crossLabel: string;
  crossTo: SiteScreen;
  heading: string;
  title: string;
  viewport: "mobile" | "desktop";
}) {
  return (
    <SiteLayout active={active} viewport={viewport}>
      <main className="site-document site-policy" id="main">
        <div className="site-document-intro">
          <p className="site-eyebrow">Using Mokly</p>
          <h1>{title}</h1>
        </div>
        <div className="site-policy-empty">
          <h2>{heading}</h2>
          <MockLink className="site-link" to={crossTo}>
            {crossLabel} <span aria-hidden="true">&#8594;</span>
          </MockLink>
        </div>
      </main>
    </SiteLayout>
  );
}

function Terms({ viewport }: { viewport: "mobile" | "desktop" }) {
  return (
    <PolicyScreen
      active={SITE_SCREENS.terms}
      crossLabel="Privacy"
      crossTo={SITE_SCREENS.privacy}
      heading="Terms are being prepared"
      title="Terms"
      viewport={viewport}
    />
  );
}

function Privacy({ viewport }: { viewport: "mobile" | "desktop" }) {
  return (
    <PolicyScreen
      active={SITE_SCREENS.privacy}
      crossLabel="Terms"
      crossTo={SITE_SCREENS.terms}
      heading="Privacy details are being prepared"
      title="Privacy"
      viewport={viewport}
    />
  );
}

/** Terms at the desktop composition. */
export function SiteTermsDesktop() {
  return <Terms viewport="desktop" />;
}

/** Terms at the mobile composition. */
export function SiteTermsMobile() {
  return <Terms viewport="mobile" />;
}

/** Privacy at the desktop composition. */
export function SitePrivacyDesktop() {
  return <Privacy viewport="desktop" />;
}

/** Privacy at the mobile composition. */
export function SitePrivacyMobile() {
  return <Privacy viewport="mobile" />;
}

export const termsScreen = defineScreen({
  ...SITE_METADATA,
  description:
    "The service terms document before approved text exists, with the link to Privacy.",
  desktop: <SiteTermsDesktop />,
  id: "design-site-terms",
  mobile: <SiteTermsMobile />,
  route: "design/site/terms.html",
  title: "Terms",
  useCaseIds: ["design-site-tour"],
});

export const privacyScreen = defineScreen({
  ...SITE_METADATA,
  description:
    "The privacy document before approved text exists, with the link to Terms.",
  desktop: <SitePrivacyDesktop />,
  id: "design-site-privacy",
  mobile: <SitePrivacyMobile />,
  route: "design/site/privacy.html",
  title: "Privacy",
  useCaseIds: ["design-site-tour"],
});
