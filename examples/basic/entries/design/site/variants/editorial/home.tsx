import { defineScreen } from "@mokly/mokly";

import { SiteActions } from "../../parts/actions.js";
import { SITE_SCREENS } from "../../parts/links.js";
import { SiteStage } from "../../parts/stage.js";
import { variantMetadata } from "../scaffold.js";

import { EditorialLayout } from "./parts/chrome.js";
import {
  EDITORIAL_FEATURES,
  EditorialClosing,
  EditorialContents,
} from "./parts/home_sections.js";

function HomeRail() {
  return (
    <nav aria-label="Sections" className="ed-rail-nav">
      {EDITORIAL_FEATURES.map((feature) => (
        <a
          className="ed-rail-link"
          href={`#${feature.anchor}`}
          key={feature.number}
        >
          <span className="ed-rail-number">{feature.number}</span>
          {feature.name}
        </a>
      ))}
      <a className="ed-rail-link" href="#foundation">
        Open foundation
      </a>
    </nav>
  );
}

function EditorialHome({ viewport }: { viewport: "mobile" | "desktop" }) {
  return (
    <EditorialLayout
      active={SITE_SCREENS.home}
      rail={<HomeRail />}
      viewport={viewport}
    >
      <main className="ed-main" id="main">
        <section className="ed-hero">
          <div className="ed-measure">
            <p className="ed-rubric ed-hero-rubric">
              A design tool for teams that ship
            </p>
            <h1 className="ed-display">
              Design in your repository.
              <br />
              <span className="site-accent">Decide in the pull request.</span>
            </h1>
          </div>
        </section>
        <div className="ed-hero-deck">
          <div className="ed-measure ed-hero-deck-inner">
            <div className="ed-hero-copy">
              <p className="ed-hero-lead">
                Your mockups are React components in Git. Browse every branch as
                screens, review them with your team, and edit with an agent
                beside the screen.
              </p>
              <div className="ed-hero-foot">
                <SiteActions />
                <p className="ed-hero-note">
                  Light and dark. Mobile and desktop.
                </p>
              </div>
            </div>
            <SiteStage viewport={viewport} />
          </div>
        </div>
        <EditorialContents />
        <EditorialClosing />
      </main>
    </EditorialLayout>
  );
}

/** The editorial home at the desktop composition. */
export function EditorialHomeDesktop() {
  return <EditorialHome viewport="desktop" />;
}

/** The editorial home stacked for the mobile composition. */
export function EditorialHomeMobile() {
  return <EditorialHome viewport="mobile" />;
}

export const editorialHomeScreen = defineScreen({
  ...variantMetadata("editorial"),
  description:
    "A ruled masthead, an oversized hero heading across the measure, the framed catalogue stage beside the lead, and the three features as a ruled table of contents. The stage names merged pull request #71 from this repository's changelog as its fixture.",
  desktop: <EditorialHomeDesktop />,
  id: "design-site-editorial-home",
  mobile: <EditorialHomeMobile />,
  route: "design/site/editorial/home.html",
  title: "Home",
  useCaseIds: [],
});
