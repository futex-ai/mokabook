import { MockLink } from "@mokly/mokly";

import { DOCS_PAGE } from "../../../parts/docs_navigation.js";
import { SITE_SCREENS } from "../../../parts/links.js";

/** The eight documentation sections, in the order the docs contract fixes. */
const SECTIONS = [
  "Getting started",
  "Authoring",
  "Catalogue",
  "CLI reference",
  "Continuous integration",
  "Mokly Cloud",
  "Reference",
  "Review and edit",
] as const;

/** The pages of the section this page belongs to, in sidebar order. */
const SECTION_PAGES = [
  "Install",
  "Configure",
  "Your first screen",
  "Build",
  "Serve",
] as const;

/**
 * The rail: every section in order, the reader's own section opened onto its
 * pages. Pages the design catalogue does not own are depicted as plain text,
 * the rule the rest of the design mockups follow.
 */
export function GridDocsRail() {
  return (
    <nav aria-label="Documentation" className="grid-rail">
      {SECTIONS.map((section) => (
        <div className="grid-rail-section" key={section}>
          <span className="grid-rail-title">{section}</span>
          {section === DOCS_PAGE.section ? (
            <ul>
              {SECTION_PAGES.map((page) =>
                page === DOCS_PAGE.page ? (
                  <li key={page}>
                    <MockLink
                      aria-current="page"
                      className="grid-rail-link"
                      to={SITE_SCREENS.docs}
                    >
                      {page}
                    </MockLink>
                  </li>
                ) : (
                  <li className="grid-rail-link" key={page}>
                    {page}
                  </li>
                ),
              )}
            </ul>
          ) : null}
        </div>
      ))}
      <div className="grid-rail-section">
        <MockLink className="grid-rail-link" to={SITE_SCREENS.changelog}>
          Changelog
        </MockLink>
      </div>
    </nav>
  );
}
