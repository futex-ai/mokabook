import { MockLink } from "@mokly/mokly";

import { DOCS_PAGE } from "../../../parts/docs_navigation.js";
import { SITE_SCREENS } from "../../../parts/links.js";

/**
 * The eight documentation sections in their fixed order. Sections without an
 * owning mockup are depicted as plain text, the rule the rest of the design
 * catalogue follows for destinations that have no authored screen.
 */
const DOCS_SECTION_TITLES = [
  "Getting started",
  "Authoring",
  "Catalogue",
  "CLI reference",
  "Continuous integration",
  "Mokly Cloud",
  "Reference",
  "Review and edit",
] as const;

/** The headings this documentation page lists in its on-this-page rail. */
export const DOCS_HEADINGS = [
  { id: "install-the-package", title: "Install the package" },
  { id: "add-the-configuration", title: "Add the configuration" },
  { id: "author-your-first-screen", title: "Author your first screen" },
] as const;

/**
 * The docs trail and section switcher that replace the sidebar: one quiet
 * row naming the place in the documentation, one row of the eight sections.
 */
export function DocsTrail() {
  return (
    <nav aria-label="Documentation" className="mn-docs-nav">
      <ol className="mn-crumbs">
        <li>
          <MockLink className="mn-crumb-link" to={SITE_SCREENS.docs}>
            Docs
          </MockLink>
        </li>
        <li aria-hidden="true" className="mn-crumb-divider">
          /
        </li>
        <li>{DOCS_PAGE.section}</li>
        <li aria-hidden="true" className="mn-crumb-divider">
          /
        </li>
        <li aria-current="page" className="mn-crumb-current">
          {DOCS_PAGE.page}
        </li>
      </ol>
      <ul className="mn-sections">
        {DOCS_SECTION_TITLES.map((title) =>
          title === DOCS_PAGE.section ? (
            <li key={title}>
              <MockLink
                aria-current="true"
                className="mn-section-link"
                to={SITE_SCREENS.docs}
              >
                {title}
              </MockLink>
            </li>
          ) : (
            <li className="mn-section-link" key={title}>
              {title}
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

/** The on-this-page list: a floating rail on desktop, a panel on mobile. */
export function DocsOnThisPage() {
  return (
    <nav aria-labelledby="on-this-page" className="mn-onpage">
      <h2 id="on-this-page">On this page</h2>
      {DOCS_HEADINGS.map((heading) => (
        <a href={`#${heading.id}`} key={heading.id}>
          {heading.title}
        </a>
      ))}
    </nav>
  );
}
