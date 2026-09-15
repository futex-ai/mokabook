/**
 * The Product documentation page: search sits in the header, the tree sits
 * on the page canvas behind a vertical hairline, and the document keeps a
 * ruled reading structure — an accent-ruled lead, hairlines between the
 * intro, the body and the previous and next row, and its own on-this-page
 * rail hung from a hairline at the outer edge.
 */

import { defineScreen } from "@mokly/mokly";

import { CodePanel } from "../../parts/code_panel.js";
import { SITE_SCREENS } from "../../parts/links.js";
import { variantMetadata } from "../scaffold.js";

import { ProductEyebrow, ProductLayout } from "./parts/chrome.js";
import { DOCS_HEADINGS, DOCS_PAGE } from "./parts/docs_data.js";
import {
  DocsOnThisPage,
  DocsPager,
  DocsTree,
  DocsTreeDisclosure,
} from "./parts/docs_tree.js";

function ProductDocs({ viewport }: { viewport: "mobile" | "desktop" }) {
  const desktop = viewport === "desktop";
  return (
    <ProductLayout active={SITE_SCREENS.docs} search viewport={viewport}>
      <div className="pd-docs">
        {desktop ? <DocsTree /> : <DocsTreeDisclosure />}
        <main className="pd-document pd-docs-document" id="main">
          <div className="pd-document-intro">
            <ProductEyebrow trail={["Documentation", DOCS_PAGE.section]} />
            <h1>{DOCS_PAGE.page}</h1>
            <p className="pd-pullquote">
              Add Mokly to the repository that holds your components.
            </p>
          </div>
          {desktop ? null : <DocsOnThisPage />}
          <div className="pd-document-body">
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
          <div className="pd-docs-rail">
            <DocsOnThisPage />
          </div>
        ) : null}
      </div>
    </ProductLayout>
  );
}

/** The documentation page with the tree and the on-this-page rail. */
export function ProductDocsDesktop() {
  return <ProductDocs viewport="desktop" />;
}

/** The documentation page with the tree collapsed above the document. */
export function ProductDocsMobile() {
  return <ProductDocs viewport="mobile" />;
}

export const productDocsScreen = defineScreen({
  ...variantMetadata("product"),
  description:
    "A documentation page in the shell's reading layout: search in the header, an unfilled section tree carrying the workspace package version, the copyable install command, the on-this-page rail and previous and next.",
  desktop: <ProductDocsDesktop />,
  id: "design-site-product-docs",
  mobile: <ProductDocsMobile />,
  route: "design/site/product/docs.html",
  title: "Documentation",
  useCaseIds: [],
});
