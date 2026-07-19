import type { Catalogue } from "./catalogue.js";
import type { ManifestEntry, ManifestLegacyPage } from "../registry/types.js";

/** Render the diagnostic milestone-5 catalogue home. */
export function homePage(catalogue: Catalogue): string {
  const items = catalogue.manifest.entries
    .filter((entry) => entry.kind !== "collection")
    .map(
      (entry) =>
        `<li><a href="/view/${encodePath(entry.route)}">${escape(entry.title)}</a></li>`,
    )
    .join("");
  return document(
    "Mokabook",
    `<h1>Mokabook</h1><p>Static catalogue diagnostic view.</p><ul>${items}</ul>`,
  );
}

/** Render one screen, use case, or legacy route. */
export function viewPage(entry: ManifestEntry | ManifestLegacyPage): string {
  if (!("kind" in entry)) {
    return document(
      `Legacy · ${entry.route}`,
      `<h1>${escape(entry.route)}</h1><iframe sandbox="" title="Legacy mockup" src="/static/${encodePath(entry.route)}"></iframe>`,
    );
  }
  if (entry.kind === "screen") {
    return document(
      entry.title,
      `<h1>${escape(entry.title)}</h1><p>${escape(entry.description)}</p>` +
        `<h2>Mobile</h2><iframe sandbox="" title="Mobile" src="/static/${encodePath(entry.fragments.mobile)}"></iframe>` +
        `<h2>Desktop</h2><iframe sandbox="" title="Desktop" src="/static/${encodePath(entry.fragments.desktop)}"></iframe>`,
    );
  }
  if (entry.kind === "use-case") {
    const steps = entry.steps
      .map(
        (step) =>
          `<li><a href="/id/${encodeURIComponent(step.screenId)}">${escape(step.title ?? step.screenId)}</a></li>`,
      )
      .join("");
    return document(
      entry.title,
      `<h1>${escape(entry.title)}</h1><ol>${steps}</ol>`,
    );
  }
  return notFoundPage("Collections do not own a route");
}

/** Render a route-aware not-found response. */
export function notFoundPage(detail: string): string {
  return document(
    "Not found · Mokabook",
    `<h1>Not found</h1><p>${escape(detail)}</p><a href="/">Catalogue</a>`,
  );
}

/** Render a diagnostic Review route. */
export function reviewPage(base: string): string {
  return document(
    "Review · Mokabook",
    `<h1>Review</h1><p>Run <code>mokabook review --base ${escape(base)}</code> to generate the static comparison.</p>`,
  );
}

function document(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><style>body{font:16px system-ui;max-width:72rem;margin:2rem auto;padding:0 1rem}iframe{width:100%;min-height:32rem;border:1px solid #bbb}code{background:#eee;padding:.15rem .3rem}</style></head><body>${body}</body></html>`;
}

function encodePath(value: string): string {
  return value.split("/").map(encodeURIComponent).join("/");
}

function escape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
