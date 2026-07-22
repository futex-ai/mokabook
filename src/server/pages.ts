/** Served shell pages composed from the catalogue and shell views. */

import type { ManifestEntry, ManifestLegacyPage } from "../registry/types.js";
import type { Catalogue } from "./catalogue.js";
import type { ShellContext } from "./shell/context.js";
import { renderShellPage } from "./shell/document.js";
import { toRouteTarget } from "./shell/target.js";
import type { ShellView } from "./shell/views.js";

/** Render the catalogue home page. */
export function homePage(catalogue: Catalogue, context: ShellContext): string {
  return renderShellPage(catalogue, { kind: "home" }, context);
}

/** Render one screen, use case, or legacy route page. */
export function viewPage(
  entry: ManifestEntry | ManifestLegacyPage,
  catalogue: Catalogue,
  context: ShellContext,
): string {
  const target = toRouteTarget(entry);
  const view: ShellView = target
    ? { kind: "target", target }
    : { kind: "missing", requested: "kind" in entry ? entry.title : "" };
  return renderShellPage(catalogue, view, context);
}

/** Render a route-aware not-found page keeping navigation available. */
export function notFoundPage(
  detail: string,
  catalogue: Catalogue,
  context: ShellContext,
): string {
  return renderShellPage(
    catalogue,
    { kind: "missing", requested: detail },
    context,
  );
}
