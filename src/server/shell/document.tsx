// Server-side full-document rendering for the served Mokabook shell. Full
// pages keep one persistent frame — top bar, catalogue navigation, and status
// region — around the route-owned main view that progressive navigation
// replaces.

import { renderToStaticMarkup } from "react-dom/server";

import type { Catalogue } from "../catalogue.js";
import type { ShellContext } from "./context.js";
import { CatalogueNav } from "./nav.js";
import { ShellMain, viewTitle } from "./views.js";
import type { ShellView } from "./views.js";

function TopBar() {
  return (
    <header className="mbk-topbar">
      <button
        aria-controls="mb-nav"
        aria-expanded="false"
        aria-label="Open catalogue navigation"
        className="mbk-menu"
        data-mokabook-menu=""
        type="button"
      >
        <span aria-hidden="true">☰</span>
      </button>
      <a className="mbk-brand" href="/">
        <span aria-hidden="true" className="mbk-mark">
          ◫
        </span>
        Mokabook
      </a>
      <div className="mbk-search">
        <span aria-hidden="true">⌕</span>
        <input
          aria-label="Search screens"
          data-mokabook-search=""
          placeholder="Search screens…"
          type="search"
        />
      </div>
      <nav aria-label="Mokabook modes" className="mbk-modes">
        <a
          aria-current="page"
          className="mbk-mode active"
          data-mokabook-mode=""
          href="/"
        >
          Browse
        </a>
        <a className="mbk-mode" data-mokabook-mode="" href="/review">
          Review
        </a>
      </nav>
    </header>
  );
}

/** Render one full Mokabook shell page to an HTML document string. */
export function renderShellPage(
  catalogue: Catalogue,
  view: ShellView,
  context: ShellContext,
): string {
  const markup = renderToStaticMarkup(
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <title>{viewTitle(catalogue, view)}</title>
        <link href="/__mokabook/shell.css" rel="stylesheet" />
      </head>
      <body className="mbk-fs">
        <div className="mbk" data-drawer="closed" data-mokabook-shell="">
          <a className="mbk-skip-link" href="#mb-main">
            Skip to content
          </a>
          <TopBar />
          <div className="mbk-body">
            <CatalogueNav context={context} manifest={catalogue.manifest} />
            <ShellMain catalogue={catalogue} view={view} />
          </div>
          <p
            aria-atomic="true"
            aria-live="polite"
            className="mbk-route-status"
            id="mb-status"
            role="status"
          />
        </div>
        <script src="/__mokabook/client/browser.js" type="module" />
        <script src="/__mokabook/client/browse.js" type="module" />
      </body>
    </html>,
  );
  return `<!doctype html>\n${markup}\n`;
}
