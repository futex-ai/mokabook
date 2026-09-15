import { defineScreen } from "@mokly/mokly";

import { SiteActions } from "./parts/actions.js";
import { SiteLayout } from "./parts/chrome.js";
import { SITE_SCREENS } from "./parts/links.js";
import { SITE_METADATA } from "./parts/metadata.js";
import { SiteClosing, SiteFeatures } from "./parts/sections.js";
import { SiteStage } from "./parts/stage.js";

function SiteHome({ viewport }: { viewport: "mobile" | "desktop" }) {
  return (
    <SiteLayout active={SITE_SCREENS.home} viewport={viewport}>
      <main className="site-main" id="main">
        <section className="site-hero">
          <div className="site-hero-copy">
            <p className="site-eyebrow">A design tool for teams that ship</p>
            <h1>
              Design in your repository.
              <br />
              <span className="site-accent">Decide in the pull request.</span>
            </h1>
            <p className="site-hero-lead">
              Your mockups are React components in Git. Browse every branch as
              screens, review them with your team, and edit with an agent beside
              the screen.
            </p>
            <SiteActions />
            <p className="site-hero-note">
              Light and dark. Mobile and desktop.
            </p>
          </div>
          <SiteStage viewport={viewport} />
        </section>
        <SiteFeatures />
        <SiteClosing />
      </main>
    </SiteLayout>
  );
}

/** The complete home page at the desktop composition. */
export function SiteHomeDesktop() {
  return <SiteHome viewport="desktop" />;
}

/** The home page stacked for the mobile composition. */
export function SiteHomeMobile() {
  return <SiteHome viewport="mobile" />;
}

export const homeScreen = defineScreen({
  ...SITE_METADATA,
  description:
    "Hero, framed catalogue stage, three numbered features and the open-foundation closing. The stage names merged pull request #71 from this repository's changelog as its fixture.",
  desktop: <SiteHomeDesktop />,
  id: "design-site-home",
  mobile: <SiteHomeMobile />,
  route: "design/site/home.html",
  title: "Home",
  useCaseIds: ["design-site-tour"],
});
