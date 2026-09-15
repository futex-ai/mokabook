import { MockLink } from "@mokly/mokly";

import { BandsSearch } from "./chrome.js";
import { DOCS_HEADINGS, DOCS_PAGE, DOCS_SECTIONS } from "./docs_sections.js";
import { BANDS_SCREENS } from "./links.js";

/** The thin band under the header: every section as a documentation tab. */
export function BandsDocsTabs({ search = false }: { search?: boolean }) {
  return (
    <div className="bands-band bands-band--muted bands-tabs-band">
      <div className="bands-inner bands-tabs-inner">
        <nav aria-label="Documentation sections" className="bands-tabs">
          {DOCS_SECTIONS.map((section) =>
            section.title === DOCS_PAGE.section ? (
              <MockLink
                aria-current="page"
                className="bands-tab bands-tab--current"
                key={section.title}
                to={BANDS_SCREENS.docs}
              >
                {section.title}
              </MockLink>
            ) : (
              <span className="bands-tab" key={section.title}>
                {section.title}
              </span>
            ),
          )}
        </nav>
        {search ? <BandsSearch block /> : null}
      </div>
    </div>
  );
}

function DocsSectionList() {
  return (
    <>
      {DOCS_SECTIONS.map((section) => (
        <div
          className="site-docs-section bands-docs-section"
          key={section.title}
        >
          <span>{section.title}</span>
          <ul>
            {section.pages.map((page) =>
              page === DOCS_PAGE.page ? (
                <li key={page}>
                  <MockLink
                    aria-current="page"
                    className="site-docs-link"
                    to={BANDS_SCREENS.docs}
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
      <div className="site-docs-section bands-docs-section">
        <MockLink className="site-docs-link" to={BANDS_SCREENS.changelog}>
          Changelog
        </MockLink>
      </div>
    </>
  );
}

/** The sticky sidebar column, held on the muted surface beside the document. */
export function BandsSidebar() {
  return (
    <div className="bands-sidebar">
      <nav
        aria-label="Documentation"
        className="site-docs-sidebar bands-sidebar-nav"
      >
        <DocsSectionList />
      </nav>
    </div>
  );
}

/** Below the breakpoint the sidebar becomes a disclosure above the document. */
export function BandsDisclosure() {
  return (
    <details className="site-docs-disclosure bands-disclosure">
      <summary>
        {DOCS_PAGE.section} / {DOCS_PAGE.page}
      </summary>
      <nav aria-label="Documentation">
        <DocsSectionList />
      </nav>
    </details>
  );
}

/** The on-this-page rail, a hairline spine beside the document headings. */
export function BandsOnThisPage() {
  return (
    <nav aria-labelledby="on-this-page" className="site-onpage bands-onpage">
      <h2 id="on-this-page">On this page</h2>
      <div className="bands-onpage-list">
        {DOCS_HEADINGS.map((heading) => (
          <a href={`#${heading.id}`} key={heading.id}>
            {heading.title}
          </a>
        ))}
      </div>
    </nav>
  );
}
