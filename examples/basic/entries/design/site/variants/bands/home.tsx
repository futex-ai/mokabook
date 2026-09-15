import { defineScreen, type Viewport } from "@mokly/mokly";

import { variantMetadata } from "../scaffold.js";

import { BandsLayout } from "./parts/chrome.js";
import {
  BandsClosing,
  BandsFeatures,
  BandsHero,
  BandsJump,
} from "./parts/home_sections.js";
import { BANDS_SCREENS } from "./parts/links.js";

function BandsHome({ viewport }: { viewport: Viewport }) {
  return (
    <BandsLayout active={BANDS_SCREENS.home} viewport={viewport}>
      <main className="bands-main" id="main">
        <BandsHero viewport={viewport} />
        <BandsJump />
        <BandsFeatures />
        <BandsClosing />
      </main>
    </BandsLayout>
  );
}

/** The home as a sequence of full-bleed bands at the desktop composition. */
export function BandsHomeDesktop() {
  return <BandsHome viewport="desktop" />;
}

/** The same bands stacked for the mobile composition. */
export function BandsHomeMobile() {
  return <BandsHome viewport="mobile" />;
}

export const bandsHomeScreen = defineScreen({
  ...variantMetadata("bands"),
  description:
    "Full-bleed bands alternate the canvas and the muted surface: the hero over the catalogue stage, a segmented strip for the three phases, one band for each phase with a framed illustration, and a closing stepper.",
  desktop: <BandsHomeDesktop />,
  id: "design-site-bands-home",
  mobile: <BandsHomeMobile />,
  route: "design/site/bands/home.html",
  title: "Home",
  useCaseIds: [],
});
