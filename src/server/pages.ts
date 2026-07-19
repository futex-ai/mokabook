/** Served shell pages composed from the catalogue and shell views. */

import type { ManifestEntry, ManifestLegacyPage } from "../registry/types.js";
import type { Catalogue } from "./catalogue.js";
import { shellDocument, type ShellContext } from "./shell/html.js";
import { catalogueNav } from "./shell/nav.js";
import {
  entryView,
  homeView,
  missingView,
  reviewLauncherView,
} from "./shell/views.js";

/** Render the catalogue home page. */
export function homePage(catalogue: Catalogue, context: ShellContext): string {
  return shellDocument({
    context,
    main: homeView(catalogue),
    nav: catalogueNav(catalogue.manifest, context),
    title: "Mokabook",
  });
}

/** Render one screen, use case, or legacy route page. */
export function viewPage(
  entry: ManifestEntry | ManifestLegacyPage,
  catalogue: Catalogue,
  context: ShellContext,
): string {
  const title = "kind" in entry ? entry.title : entry.route;
  return shellDocument({
    context,
    main: entryView(entry, catalogue),
    nav: catalogueNav(catalogue.manifest, context),
    title: `${title} · Mokabook`,
  });
}

/** Render a route-aware not-found page keeping navigation available. */
export function notFoundPage(
  detail: string,
  catalogue: Catalogue,
  context: ShellContext,
): string {
  return shellDocument({
    context,
    main: missingView(detail),
    nav: catalogueNav(catalogue.manifest, context),
    title: "Not found · Mokabook",
  });
}

/** Render the served Review launcher page. */
export function reviewPage(
  base: string,
  catalogue: Catalogue,
  context: ShellContext,
): string {
  return shellDocument({
    context,
    main: reviewLauncherView(base),
    nav: catalogueNav(catalogue.manifest, context),
    title: "Review · Mokabook",
  });
}
