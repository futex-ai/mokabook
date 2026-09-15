import { MockLink } from "@mokly/mokly";

import { SITE_SCREENS } from "./links.js";

/**
 * The documentation architecture. Entries the design catalogue does not own
 * are depicted as plain text, the same rule the rest of the design mockups
 * follow for destinations that have no authored screen.
 */
const DOCS_SECTIONS = [
  {
    pages: ["Install", "Configure", "Your first screen", "Build", "Serve"],
    title: "Getting started",
  },
  {
    pages: [
      "Config",
      "Screens",
      "Components",
      "Viewports and color schemes",
      "Collections and tags",
      "Use-case flows",
      "Pages",
      "Links",
      "Review-ignore",
    ],
    title: "Authoring",
  },
  {
    pages: [
      "Browse",
      "Search and filters",
      "Changes",
      "Details",
      "Export and host",
    ],
    title: "Catalogue",
  },
  {
    pages: [
      "serve",
      "build",
      "check",
      "export",
      "publish",
      "Options and exit status",
    ],
    title: "CLI reference",
  },
  {
    pages: [
      "GitHub Action",
      "Publish from CI",
      "Project tokens",
      "The upload",
      "The check on a pull request",
    ],
    title: "Continuous integration",
  },
  {
    pages: [
      "Overview",
      "Connect a repository",
      "Branches and pull requests",
      "Sharing and access",
      "Organizations and roles",
      "Settings",
    ],
    title: "Mokly Cloud",
  },
  {
    pages: [
      "Static export delivery",
      "Export ownership",
      "Catalogue upload",
      "Catalogue navigation",
      "Styled link controls",
      "Pages in the catalogue",
    ],
    title: "Reference",
  },
  {
    pages: [
      "Comments",
      "Approvals",
      "Pull request sync",
      "Agent sessions",
      "Click to reference",
    ],
    title: "Review and edit",
  },
] as const;

/** The section and page this docs mockup renders. */
export const DOCS_PAGE = { page: "Install", section: "Getting started" };

function DocsSectionList() {
  return (
    <>
      {DOCS_SECTIONS.map((section) => (
        <div className="site-docs-section" key={section.title}>
          <span>{section.title}</span>
          <ul>
            {section.pages.map((page) =>
              page === DOCS_PAGE.page ? (
                <li key={page}>
                  <MockLink
                    aria-current="page"
                    className="site-docs-link"
                    to={SITE_SCREENS.docs}
                  >
                    {page}
                  </MockLink>
                </li>
              ) : (
                <li className="site-docs-link" key={page}>
                  {page}
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
      <div className="site-docs-section">
        <MockLink className="site-docs-link" to={SITE_SCREENS.changelog}>
          Changelog
        </MockLink>
      </div>
    </>
  );
}

/** The left sidebar listing every documentation section in order. */
export function DocsSidebar() {
  return (
    <nav aria-label="Documentation" className="site-docs-sidebar">
      <DocsSectionList />
    </nav>
  );
}

/** Below the breakpoint the sidebar becomes a disclosure above the document. */
export function DocsDisclosure() {
  return (
    <details className="site-docs-disclosure">
      <summary>
        {DOCS_PAGE.section} / {DOCS_PAGE.page}
      </summary>
      <nav aria-label="Documentation">
        <DocsSectionList />
      </nav>
    </details>
  );
}

/** Previous and next follow sidebar order across section boundaries. */
export function DocsPager() {
  return (
    <nav aria-label="Pagination" className="site-pager">
      <span className="site-pager-item">
        <span>Previous</span>
        Getting started
      </span>
      <span className="site-pager-item">
        <span>Next</span>
        Configure
      </span>
    </nav>
  );
}
