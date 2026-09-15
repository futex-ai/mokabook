import { defineScreen } from "@mokly/mokly";

import { SiteActions } from "../../parts/actions.js";
import { SITE_SCREENS } from "../../parts/links.js";
import { SiteStage } from "../../parts/stage.js";
import { variantMetadata } from "../scaffold.js";

import { GridLayout, GridSubhead } from "./parts/chrome.js";
import { FEATURES } from "./parts/copy.js";
import { GridClosing, GridFacts, GridFeatures } from "./parts/sections.js";

/** The hero: five columns of copy, seven columns of stage, over column rules. */
function GridHero({ viewport }: { viewport: "mobile" | "desktop" }) {
  return (
    <section className="grid-hero">
      <span aria-hidden="true" className="grid-rules" />
      <div className="grid-inner grid-12 grid-hero-inner">
        <div className="grid-hero-copy">
          <p className="grid-eyebrow">A design tool for teams that ship</p>
          <h1>
            Design in your repository.
            <br />
            <span className="site-accent">Decide in the pull request.</span>
          </h1>
          <p className="grid-hero-lead">
            Your mockups are React components in Git. Browse every branch as
            screens, review them with your team, and edit with an agent beside
            the screen.
          </p>
          <SiteActions />
          <p className="grid-hero-note">Light and dark. Mobile and desktop.</p>
        </div>
        <div className="grid-hero-stage">
          <SiteStage viewport={viewport} />
        </div>
      </div>
    </section>
  );
}

function GridHome({ viewport }: { viewport: "mobile" | "desktop" }) {
  return (
    <GridLayout
      active={SITE_SCREENS.home}
      subhead={
        <GridSubhead crumbs={["Home"]}>
          {FEATURES.map((feature) => (
            <a
              className="grid-subhead-link"
              href={`#${feature.anchor}`}
              key={feature.anchor}
            >
              {feature.name}
            </a>
          ))}
          <a className="grid-subhead-link" href="#foundation">
            Open foundation
          </a>
        </GridSubhead>
      }
      viewport={viewport}
    >
      <main className="grid-main" id="main">
        <GridHero viewport={viewport} />
        <GridFeatures />
        <GridFacts />
        <GridClosing />
      </main>
    </GridLayout>
  );
}

/** The Grid home at the desktop composition: a 5/7 hero on twelve columns. */
export function GridHomeDesktop() {
  return <GridHome viewport="desktop" />;
}

/** The Grid home stacked onto four columns for the mobile composition. */
export function GridHomeMobile() {
  return <GridHome viewport="mobile" />;
}

export const gridHomeScreen = defineScreen({
  ...variantMetadata("grid"),
  description:
    "Grid home: a 5/7 hero over visible column rules, three bordered feature cards, a definitions row of the product nouns and a three-cell workflow strip. The stage names merged pull request #71 from this repository's changelog as its fixture.",
  desktop: <GridHomeDesktop />,
  id: "design-site-grid-home",
  mobile: <GridHomeMobile />,
  route: "design/site/grid/home.html",
  title: "Home",
  useCaseIds: [],
});
