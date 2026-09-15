import { defineScreen } from "@mokly/mokly";

import { CodePanel } from "../../parts/code_panel.js";
import {
  DOCS_PAGE,
  DocsDisclosure,
  DocsSidebar,
} from "../../parts/docs_navigation.js";
import { SITE_SCREENS } from "../../parts/links.js";
import { variantMetadata } from "../scaffold.js";

import { EditorialLayout } from "./parts/chrome.js";
import { EditorialPager, OnThisPage, SECTIONS } from "./parts/docs_parts.js";

function DocsRail() {
  return (
    <nav aria-label="Breadcrumb" className="ed-rail-nav ed-breadcrumb">
      <span>Documentation</span>
      <span aria-hidden="true">/</span>
      <span>{DOCS_PAGE.section}</span>
      <span aria-hidden="true">/</span>
      <span className="ed-breadcrumb-current">{DOCS_PAGE.page}</span>
    </nav>
  );
}

function EditorialDocs({ viewport }: { viewport: "mobile" | "desktop" }) {
  const desktop = viewport === "desktop";
  return (
    <EditorialLayout
      active={SITE_SCREENS.docs}
      measure="docs"
      rail={<DocsRail />}
      search
      viewport={viewport}
    >
      <div className="ed-docs">
        {desktop ? <DocsSidebar /> : <DocsDisclosure />}
        <main className="ed-doc" id="main">
          <div className="ed-doc-intro">
            <p className="ed-rubric">Documentation</p>
            <h1>Install</h1>
            <p className="ed-pullquote">
              Add Mokly to the repository that holds your components.
            </p>
          </div>
          {desktop ? null : <OnThisPage />}
          <div className="ed-doc-body">
            <section id={SECTIONS[0].id}>
              <h2>{SECTIONS[0].title}</h2>
              <p>
                Mokly runs from your repository as a development dependency.
                React and React DOM render your screens.
              </p>
              <CodePanel
                code="npm install --save-dev @mokly/mokly react react-dom"
                language="shell"
              />
            </section>
            <section id={SECTIONS[1].id}>
              <h2>{SECTIONS[1].title}</h2>
              <p>
                Create <code>mokly.config.ts</code> at the repository root.
                Point <code>entriesDir</code> at the folder holding your entry
                modules and <code>mockupsDir</code> at the folder that receives
                the generated catalogue.
              </p>
            </section>
            <section id={SECTIONS[2].id}>
              <h2>{SECTIONS[2].title}</h2>
              <p>
                Add an entry module ending in <code>.mockup.tsx</code> that
                exports <code>mockups</code>, then define a screen with a mobile
                and a desktop view.
              </p>
            </section>
          </div>
          <EditorialPager />
        </main>
        {desktop ? <OnThisPage /> : null}
      </div>
    </EditorialLayout>
  );
}

/** The documentation page with a ruled sidebar and an on-this-page column. */
export function EditorialDocsDesktop() {
  return <EditorialDocs viewport="desktop" />;
}

/** The documentation page with the sidebar as a disclosure above it. */
export function EditorialDocsMobile() {
  return <EditorialDocs viewport="mobile" />;
}

export const editorialDocsScreen = defineScreen({
  ...variantMetadata("editorial"),
  description:
    "A documentation page with a ruled sidebar, the lead set as a pull quote, a wide reading measure, a search control in the masthead rail, an on-this-page column and ruled previous and next links.",
  desktop: <EditorialDocsDesktop />,
  id: "design-site-editorial-docs",
  mobile: <EditorialDocsMobile />,
  route: "design/site/editorial/docs.html",
  title: "Documentation",
  useCaseIds: [],
});
