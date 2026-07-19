/** Document scaffold and top bar for the served Mokabook shell. */

/** Escape text for safe interpolation into shell HTML. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Server-side context shared by every shell page. */
export interface ShellContext {
  activeRoute?: string;
  base: string;
  changedRoutes?: readonly string[];
  mode: "browse" | "review";
}

/** Inputs for one complete served shell document. */
export interface ShellDocumentInput {
  context: ShellContext;
  main: string;
  nav: string;
  title: string;
}

/** Render one complete server-side shell document. */
export function shellDocument(input: ShellDocumentInput): string {
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${escapeHtml(input.title)}</title>` +
    `<link rel="stylesheet" href="/__mokabook/shell.css">` +
    `</head><body>` +
    `<div class="mb-shell" data-mokabook-shell data-drawer="closed">` +
    `<a class="mb-skip-link" href="#mb-main">Skip to content</a>` +
    topBar(input.context) +
    `<div class="mb-body">${input.nav}` +
    `<main class="mb-main" id="mb-main" tabindex="-1" data-mokabook-view>${input.main}</main>` +
    `</div>` +
    `<p class="mb-sr-only" id="mb-status" role="status" aria-live="polite"></p>` +
    `</div>` +
    `<script type="module" src="/__mokabook/client/browser.js"></script>` +
    `<script type="module" src="/__mokabook/client/browse.js"></script>` +
    `</body></html>`
  );
}

function topBar(context: ShellContext): string {
  const browseCurrent = context.mode === "browse" ? ` aria-current="page"` : "";
  const reviewCurrent = context.mode === "review" ? ` aria-current="page"` : "";
  return (
    `<header class="mb-topbar">` +
    `<button class="mb-menu-button" type="button" data-mokabook-menu ` +
    `aria-expanded="false" aria-controls="mb-nav" ` +
    `aria-label="Open catalogue navigation">☰</button>` +
    `<a class="mb-brand" href="/"><span class="mb-brand-mark" aria-hidden="true"></span>Mokabook</a>` +
    `<nav class="mb-modes" aria-label="Mokabook modes">` +
    `<a class="mb-mode" href="/"${browseCurrent} data-mokabook-mode>Browse</a>` +
    `<a class="mb-mode" href="/review"${reviewCurrent} data-mokabook-mode>Review</a>` +
    `</nav>` +
    searchAndFilter(context) +
    `</header>`
  );
}

function searchAndFilter(context: ShellContext): string {
  if (context.mode !== "browse") return "";
  const search =
    `<input class="mb-search" type="search" data-mokabook-search ` +
    `placeholder="Search screens…" aria-label="Search screens">`;
  if (!context.changedRoutes) return search;
  return (
    search +
    `<span class="mb-filter" role="group" aria-label="Catalogue filter" data-mokabook-filter>` +
    `<button class="mb-filter-option" type="button" data-filter="all" aria-pressed="true">All</button>` +
    `<button class="mb-filter-option" type="button" data-filter="changed" aria-pressed="false">Changed</button>` +
    `</span>`
  );
}
