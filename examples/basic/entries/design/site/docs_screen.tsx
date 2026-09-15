/**
 * The documentation page: search sits in the header, the tree sits
 * on the page canvas behind a vertical hairline, and the document keeps a
 * ruled reading structure — an accent-ruled lead, hairlines between the
 * intro, the body and the previous and next row, and its own on-this-page
 * rail hung from a hairline at the outer edge.
 */

import { defineScreen } from "@mokly/mokly";

import { SiteLayout, SiteTrail } from "./parts/chrome.js";
import { CodePanel } from "./parts/code_panel.js";
import { DOCS_HEADINGS, DOCS_PAGE } from "./parts/docs_data.js";
import {
  DocsOnThisPage,
  DocsPager,
  DocsTree,
  DocsTreeDisclosure,
} from "./parts/docs_navigation.js";
import { SITE_SCREENS } from "./parts/links.js";
import { SITE_METADATA } from "./parts/metadata.js";

function SiteDocs({ viewport }: { viewport: "mobile" | "desktop" }) {
  const desktop = viewport === "desktop";
  return (
    <SiteLayout active={SITE_SCREENS.docs} search viewport={viewport}>
      <div className="site-docs">
        {desktop ? <DocsTree /> : <DocsTreeDisclosure />}
        <main className="site-document site-docs-document" id="main">
          <div className="site-document-intro">
            <SiteTrail trail={["Documentation", DOCS_PAGE.section]} />
            <h1>{DOCS_PAGE.page}</h1>
            <p className="site-pullquote">
              Add Mokly to the repository that holds your components.
            </p>
          </div>
          {desktop ? null : <DocsOnThisPage />}
          <div className="site-document-body">
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
                modules and <code>mockupsDir</code> at the folder that receives
                the generated catalogue.
              </p>
            </section>
            <section id={DOCS_HEADINGS[2].id}>
              <h2>{DOCS_HEADINGS[2].title}</h2>
              <p>
                Add an entry module ending in <code>.mockup.tsx</code> that
                exports <code>mockups</code>, then define a screen with a mobile
                and a desktop view.
              </p>
            </section>
          </div>
          <DocsPager />
        </main>
        {desktop ? (
          <div className="site-docs-rail">
            <DocsOnThisPage />
          </div>
        ) : null}
      </div>
    </SiteLayout>
  );
}

/** The documentation page with the tree and the on-this-page rail. */
export function SiteDocsDesktop() {
  return <SiteDocs viewport="desktop" />;
}

/** The documentation page with the tree collapsed above the document. */
export function SiteDocsMobile() {
  return <SiteDocs viewport="mobile" />;
}

export const docsScreen = defineScreen({
  ...SITE_METADATA,
  description:
    "A documentation page in the shell's reading layout: search in the header, an unfilled section tree carrying the workspace package version, the copyable install command, the on-this-page rail and previous and next.",
  desktop: <SiteDocsDesktop />,
  id: "design-site-docs",
  mobile: <SiteDocsMobile />,
  route: "design/site/docs.html",
  title: "Documentation",
  useCaseIds: ["design-site-tour"],
});
