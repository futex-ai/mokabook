import { defineScreen } from "@mokly/mokly";

import { CodePanel } from "../../parts/code_panel.js";
import {
  DOCS_PAGE,
  DocsDisclosure,
  DocsPager,
} from "../../parts/docs_navigation.js";
import { SITE_SCREENS } from "../../parts/links.js";
import { variantMetadata } from "../scaffold.js";

import { GridLayout, GridSearch, GridSubhead } from "./parts/chrome.js";
import { GridDocsRail } from "./parts/docs_rail.js";

const SECTIONS = [
  { id: "install-the-package", title: "Install the package" },
  { id: "add-the-configuration", title: "Add the configuration" },
  { id: "author-your-first-screen", title: "Author your first screen" },
] as const;

function OnThisPage() {
  return (
    <nav aria-labelledby="on-this-page" className="grid-onpage">
      <h2 id="on-this-page">On this page</h2>
      <ol>
        {SECTIONS.map((section, index) => (
          <li key={section.id}>
            <a href={`#${section.id}`}>
              <span className="grid-onpage-number">{`0${index + 1}`}</span>
              {section.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function GridDocs({ viewport }: { viewport: "mobile" | "desktop" }) {
  const desktop = viewport === "desktop";
  return (
    <GridLayout
      active={SITE_SCREENS.docs}
      subhead={
        <GridSubhead
          crumbs={["Documentation", DOCS_PAGE.section, DOCS_PAGE.page]}
        >
          <GridSearch />
        </GridSubhead>
      }
      viewport={viewport}
    >
      <div className="grid-docs">
        <div className="grid-docs-frame">
          {desktop ? <GridDocsRail /> : <DocsDisclosure />}
          <main className="grid-doc" id="main">
            <div className="grid-doc-head">
              <p className="grid-eyebrow">Documentation</p>
              <h1>Install</h1>
              <p className="grid-doc-lead">
                Add Mokly to the repository that holds your components.
              </p>
            </div>
            {desktop ? null : <OnThisPage />}
            <div className="grid-doc-body">
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
                  modules and <code>mockupsDir</code> at the folder that
                  receives the generated catalogue.
                </p>
              </section>
              <section id={SECTIONS[2].id}>
                <h2>{SECTIONS[2].title}</h2>
                <p>
                  Add an entry module ending in <code>.mockup.tsx</code> that
                  exports <code>mockups</code>, then define a screen with a
                  mobile and a desktop view.
                </p>
              </section>
            </div>
            <DocsPager />
          </main>
          {desktop ? <OnThisPage /> : null}
        </div>
      </div>
    </GridLayout>
  );
}

/** The documentation page as one bordered frame of three aligned cells. */
export function GridDocsDesktop() {
  return <GridDocs viewport="desktop" />;
}

/** The documentation frame stacked: disclosure, document, on-this-page. */
export function GridDocsMobile() {
  return <GridDocs viewport="mobile" />;
}

export const gridDocsScreen = defineScreen({
  ...variantMetadata("grid"),
  description:
    "Grid documentation: one bordered frame divided by hairlines into the section sidebar, the document and the on-this-page column, with the code panel and the pager bordered to the same rule.",
  desktop: <GridDocsDesktop />,
  id: "design-site-grid-docs",
  mobile: <GridDocsMobile />,
  route: "design/site/grid/docs.html",
  title: "Documentation",
  useCaseIds: [],
});
