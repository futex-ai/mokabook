/**
 * The documentation navigation. The tree sits on the page canvas rather than
 * in a filled panel: the version label heads it, every section is listed
 * expanded under a rubric head, page rows are full-height targets and the
 * page you are reading carries the shell's quiet accent fill.
 */

import { MockLink } from "@mokly/mokly";

import { SITE_SCREENS } from "../../../parts/links.js";

import { ProductVersion } from "./chrome.js";
import { DOCS_HEADINGS, DOCS_PAGE, DOCS_SECTIONS } from "./docs_data.js";

function TreeBody() {
  return (
    <>
      <MockLink className="pd-version-link" to={SITE_SCREENS.changelog}>
        <ProductVersion label="Mokly CLI" />
      </MockLink>
      <div className="pd-doc-tree-scroll">
        {DOCS_SECTIONS.map((section) => (
          <div className="pd-doc-section" key={section.title}>
            <p className="pd-doc-section-head pd-rubric">{section.title}</p>
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
          </div>
        ))}
      </div>
      <div className="pd-doc-tree-foot">
        <MockLink className="pd-doc-link" to={SITE_SCREENS.changelog}>
          Changelog
        </MockLink>
      </div>
    </>
  );
}

/** The tree beside the document, hung on the page's own vertical hairline. */
export function DocsTree() {
  return (
    <div className="pd-docs-side">
      <nav aria-label="Documentation" className="pd-doc-tree">
        <TreeBody />
      </nav>
    </div>
  );
}

/** Below the breakpoint the tree collapses into a disclosure. */
export function DocsTreeDisclosure() {
  return (
    <details className="pd-doc-disclosure">
      <summary>
        {DOCS_PAGE.section}
        <span aria-hidden="true" className="pd-eyebrow-sep">
          &#8250;
        </span>
        {DOCS_PAGE.page}
      </summary>
      <nav aria-label="Documentation" className="pd-doc-tree">
        <TreeBody />
      </nav>
    </details>
  );
}

/** The on-this-page rail, generated from the document's own headings. */
export function DocsOnThisPage() {
  return (
    <nav aria-labelledby="on-this-page" className="site-onpage pd-onpage">
      <h2 className="pd-rubric" id="on-this-page">
        On this page
      </h2>
      <ol>
        {DOCS_HEADINGS.map((heading) => (
          <li key={heading.id}>
            <a className="pd-onpage-link" href={`#${heading.id}`}>
              {heading.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Previous and next follow sidebar order across section boundaries. */
export function DocsPager() {
  return (
    <nav aria-label="Pagination" className="pd-pager">
      <span className="pd-pager-item">
        <span className="pd-pager-label pd-rubric">Previous</span>
        Getting started
      </span>
      <span className="pd-pager-item pd-pager-item--next">
        <span className="pd-pager-label pd-rubric">Next</span>
        Configure
      </span>
    </nav>
  );
}
