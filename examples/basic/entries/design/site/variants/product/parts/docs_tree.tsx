/**
 * The documentation tree, drawn like the catalogue's navigation: section
 * disclosures with a chevron, page rows at one indent, and the current page
 * in the quiet filled state the shell uses for the entry you are viewing.
 */

import { MockLink } from "@mokly/mokly";

import { SITE_SCREENS } from "../../../parts/links.js";

import { DOCS_HEADINGS, DOCS_PAGE, DOCS_SECTIONS } from "./docs_data.js";
import { ChevronGlyph } from "./glyphs.js";

function TreeSections() {
  return (
    <>
      {DOCS_SECTIONS.map((section) => (
        <details
          className="pd-doc-section"
          key={section.title}
          open={section.title === DOCS_PAGE.section}
        >
          <summary className="pd-doc-section-head">
            <span aria-hidden="true" className="pd-tree-chevron">
              <ChevronGlyph />
            </span>
            {section.title}
          </summary>
          <ul>
            {section.pages.map((page) =>
              page === DOCS_PAGE.page ? (
                <li key={page}>
                  <MockLink
                    aria-current="page"
                    className="pd-doc-link pd-doc-link--current"
                    to={SITE_SCREENS.docs}
                  >
                    {page}
                  </MockLink>
                </li>
              ) : (
                <li className="pd-doc-link" key={page}>
                  {page}
                </li>
              ),
            )}
          </ul>
        </details>
      ))}
      <MockLink
        className="pd-doc-link pd-doc-link--last"
        to={SITE_SCREENS.changelog}
      >
        Changelog
      </MockLink>
    </>
  );
}

/** The left tree beside the document at the desktop composition. */
export function DocsTree() {
  return (
    <nav aria-label="Documentation" className="pd-doc-tree">
      <p className="pd-tree-head">Documentation</p>
      <TreeSections />
    </nav>
  );
}

/** Below the breakpoint the tree collapses into a disclosure. */
export function DocsTreeDisclosure() {
  return (
    <details className="pd-doc-disclosure">
      <summary>
        {DOCS_PAGE.section} / {DOCS_PAGE.page}
      </summary>
      <nav aria-label="Documentation">
        <TreeSections />
      </nav>
    </details>
  );
}

/** The on-this-page rail, generated from the document's own headings. */
export function DocsOnThisPage() {
  return (
    <nav aria-labelledby="on-this-page" className="site-onpage pd-onpage">
      <h2 id="on-this-page">On this page</h2>
      {DOCS_HEADINGS.map((heading) => (
        <a href={`#${heading.id}`} key={heading.id}>
          {heading.title}
        </a>
      ))}
    </nav>
  );
}

/** Previous and next follow sidebar order across section boundaries. */
export function DocsPager() {
  return (
    <nav aria-label="Pagination" className="pd-pager">
      <span className="pd-pager-item">
        <span>Previous</span>
        Getting started
      </span>
      <span className="pd-pager-item pd-pager-item--next">
        <span>Next</span>
        Configure
      </span>
    </nav>
  );
}
