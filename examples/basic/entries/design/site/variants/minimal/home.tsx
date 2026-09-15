import { SiteActions } from "../../parts/actions.js";
import { SITE_SCREENS } from "../../parts/links.js";
import { SiteStage } from "../../parts/stage.js";

import { MinimalLayout } from "./parts/chrome.js";
import { MinimalClosing, MinimalFeatures } from "./parts/sections.js";

function MinimalHome({ viewport }: { viewport: "mobile" | "desktop" }) {
  return (
    <MinimalLayout active={SITE_SCREENS.home} viewport={viewport}>
      <main className="mn-main" id="main">
        <section className="mn-hero">
          <p className="site-eyebrow">A design tool for teams that ship</p>
          <h1>
            Design in your repository.
            <br />
            <span className="site-accent">Decide in the pull request.</span>
          </h1>
          <p className="mn-hero-lead">
            Your mockups are React components in Git. Browse every branch as
            screens, review them with your team, and edit with an agent beside
            the screen.
          </p>
          <SiteActions />
          <p className="mn-hero-note">Light and dark. Mobile and desktop.</p>
        </section>
        <div className="mn-stage">
          <SiteStage viewport={viewport} />
        </div>
        <MinimalFeatures />
        <MinimalClosing />
      </main>
    </MinimalLayout>
  );
}

/** The centered home at the desktop composition, the stage set wide beneath. */
export function MinimalHomeDesktop() {
  return <MinimalHome viewport="desktop" />;
}

/** The centered home stacked for the mobile composition. */
export function MinimalHomeMobile() {
  return <MinimalHome viewport="mobile" />;
}
