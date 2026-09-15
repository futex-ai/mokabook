/**
 * The Product home: a compact hero above the catalogue shell rendered at
 * full width, then the three product modules and the open-foundation
 * closing. The shell is the page's principal image, so the copy stays short
 * and the chrome carries the hierarchy.
 */

import { defineScreen } from "@mokly/mokly";

import { SiteActions } from "../../parts/actions.js";
import { SITE_SCREENS } from "../../parts/links.js";
import { variantMetadata } from "../scaffold.js";

import { ProductLayout } from "./parts/chrome.js";
import { ProductClosing, ProductModules } from "./parts/modules.js";
import { CatalogueFrame } from "./parts/shell.js";

function ProductHome({ viewport }: { viewport: "mobile" | "desktop" }) {
  return (
    <ProductLayout active={SITE_SCREENS.home} viewport={viewport}>
      <main className="pd-main" id="main">
        <section className="pd-hero">
          <p className="pd-hero-eyebrow">A design tool for teams that ship</p>
          <h1>
            Design in your repository.
            <br />
            <span className="site-accent">Decide in the pull request.</span>
          </h1>
          <p className="pd-hero-lead">
            Your mockups are React components in Git. Browse every branch as
            screens, review them with your team, and edit with an agent beside
            the screen.
          </p>
          <SiteActions />
          <p className="pd-hero-note">Light and dark. Mobile and desktop.</p>
        </section>
        <div className="pd-frame-wrap">
          <CatalogueFrame viewport={viewport} />
        </div>
        <ProductModules />
        <ProductClosing />
      </main>
    </ProductLayout>
  );
}

/** The home at the desktop composition: the shell spans the full measure. */
export function ProductHomeDesktop() {
  return <ProductHome viewport="desktop" />;
}

/** The home at the mobile composition: the shell keeps its top bar and stage. */
export function ProductHomeMobile() {
  return <ProductHome viewport="mobile" />;
}

export const productHomeScreen = defineScreen({
  ...variantMetadata("product"),
  description:
    "A compact hero above the catalogue shell at full width: the top bar, the catalogue navigation, the screen header and the example Welcome screen on the stage. The frame names merged pull request #71 from this repository's changelog as its fixture.",
  desktop: <ProductHomeDesktop />,
  id: "design-site-product-home",
  mobile: <ProductHomeMobile />,
  route: "design/site/product/home.html",
  title: "Home",
  useCaseIds: [],
});
