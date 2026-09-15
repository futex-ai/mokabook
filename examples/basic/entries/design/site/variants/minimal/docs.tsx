import { CodePanel } from "../../parts/code_panel.js";
import { DocsPager } from "../../parts/docs_navigation.js";
import { SITE_SCREENS } from "../../parts/links.js";

import { MinimalLayout } from "./parts/chrome.js";
import {
  DOCS_HEADINGS,
  DocsOnThisPage,
  DocsTrail,
} from "./parts/docs_navigation.js";

function MinimalDocs({ viewport }: { viewport: "mobile" | "desktop" }) {
  const desktop = viewport === "desktop";
  return (
    <MinimalLayout active={SITE_SCREENS.docs} search viewport={viewport}>
      <div className="mn-docs">
        <DocsTrail />
        <div className="mn-docs-grid">
          <main className="mn-document" id="main">
            <div className="mn-document-intro">
              <p className="site-eyebrow">Documentation</p>
              <h1>Install</h1>
              <p className="mn-lead">
                Add Mokly to the repository that holds your components.
              </p>
            </div>
            {desktop ? null : <DocsOnThisPage />}
            <div className="mn-document-body">
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
          {desktop ? <DocsOnThisPage /> : null}
        </div>
      </div>
    </MinimalLayout>
  );
}

/** The single reading column with the on-this-page rail floating beside it. */
export function MinimalDocsDesktop() {
  return <MinimalDocs viewport="desktop" />;
}

/** The reading column with the on-this-page list under the lead. */
export function MinimalDocsMobile() {
  return <MinimalDocs viewport="mobile" />;
}
