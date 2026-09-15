import { defineScreen, type Viewport } from "@mokly/mokly";

import { CodePanel } from "../../parts/code_panel.js";
import { DocsPager } from "../../parts/docs_navigation.js";
import { variantMetadata } from "../scaffold.js";

import { BandsLayout } from "./parts/chrome.js";
import {
  BandsDisclosure,
  BandsDocsTabs,
  BandsOnThisPage,
  BandsSidebar,
} from "./parts/docs_parts.js";
import { DOCS_HEADINGS } from "./parts/docs_sections.js";
import { BANDS_SCREENS } from "./parts/links.js";

function BandsDocs({ viewport }: { viewport: Viewport }) {
  const desktop = viewport === "desktop";
  return (
    <BandsLayout
      active={BANDS_SCREENS.docs}
      search={desktop}
      tabs={<BandsDocsTabs search={!desktop} />}
      viewport={viewport}
    >
      <div className="bands-band bands-band--folio bands-docs-band">
        <div className="bands-docs">
          {desktop ? <BandsSidebar /> : <BandsDisclosure />}
          <main className="bands-doc" id="main">
            <div className="bands-doc-intro">
              <p className="bands-eyebrow">Documentation</p>
              <h1 className="bands-doc-title">Install</h1>
              <p className="bands-doc-lead">
                Add Mokly to the repository that holds your components.
              </p>
            </div>
            {desktop ? null : <BandsOnThisPage />}
            <div className="site-docs-body bands-doc-body">
              <section id={DOCS_HEADINGS[0].id}>
                <h2>{DOCS_HEADINGS[0].title}</h2>
                <p>
                  Mokly runs from your repository as a development dependency.
                  React and React DOM render your screens.
                </p>
                <CodePanel
                  code="npm install --save-dev @mokly/mokly react react-dom"
                  language="shell"
                />
              </section>
              <section id={DOCS_HEADINGS[1].id}>
                <h2>{DOCS_HEADINGS[1].title}</h2>
                <p>
                  Create <code>mokly.config.ts</code> at the repository root.
                  Point <code>entriesDir</code> at the folder holding your entry
                  modules and <code>mockupsDir</code> at the folder that
                  receives the generated catalogue.
                </p>
              </section>
              <section id={DOCS_HEADINGS[2].id}>
                <h2>{DOCS_HEADINGS[2].title}</h2>
                <p>
                  Add an entry module ending in <code>.mockup.tsx</code> that
                  exports <code>mockups</code>, then define a screen with a
                  mobile and a desktop view.
                </p>
              </section>
            </div>
            <DocsPager />
          </main>
          {desktop ? <BandsOnThisPage /> : null}
        </div>
      </div>
    </BandsLayout>
  );
}

/** The documentation page: section tabs, sticky sidebar and a reading rail. */
export function BandsDocsDesktop() {
  return <BandsDocs viewport="desktop" />;
}

/** The documentation page with the sections as a disclosure above the document. */
export function BandsDocsMobile() {
  return <BandsDocs viewport="mobile" />;
}

export const bandsDocsScreen = defineScreen({
  ...variantMetadata("bands"),
  description:
    "A documentation page with the section tabs in a band under the header, a sticky sidebar on the muted surface, the document column and an on-this-page rail.",
  desktop: <BandsDocsDesktop />,
  id: "design-site-bands-docs",
  mobile: <BandsDocsMobile />,
  route: "design/site/bands/docs.html",
  title: "Documentation",
  useCaseIds: [],
});
