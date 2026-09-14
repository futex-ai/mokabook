import type { RenderCapability } from "../components/render_types.js";
import type { ComponentChangeSnapshot } from "./component_changes.js";
import { redirectId, renderView } from "./view_routes.js";
import type { ServerResponse } from "node:http";

import type { ResolvedConfig } from "../config/types.js";
import {
  openEventStream,
  serveClientModule,
  serveFontAsset,
  type ServedAssets,
} from "./browser_assets.js";
import type { Catalogue } from "./catalogue.js";
import { homePage, notFoundPage } from "./pages.js";
import { send } from "./respond.js";
import type { ReviewRoutes } from "./review_routes.js";
import { shellContext } from "./shell/context.js";
import { SHELL_CSS } from "./shell/css.js";
import { serveStatic } from "./static_routes.js";
import { handleDemandRequest } from "./demand/http.js";
import type { DocumentService } from "./demand/service.js";
import type { ChangesStatus } from "./update_messages.js";

/** Dispatch a request against one validated catalogue generation. */
export async function handleCatalogueRequest(
  rawUrl: string,
  method: string,
  response: ServerResponse,
  catalogue: Catalogue,
  config: ResolvedConfig,
  base: string,
  currentChangedRoutes: () => readonly string[] | undefined,
  streams: Set<ServerResponse>,
  assets: ServedAssets,
  currentVersion: () => number,
  reviewRoutes?: ReviewRoutes,
  componentChanges?: ComponentChangeSnapshot,
  renderCapability?: RenderCapability,
  documents?: DocumentService,
  changesStatus?: ChangesStatus,
  contentVersion?: number,
): Promise<void> {
  if (method !== "GET" && method !== "HEAD")
    return send(response, 405, "text/plain", "Method not allowed", method);
  const url = new URL(rawUrl, "http://mokly.invalid");
  if (
    documents &&
    (await handleDemandRequest(url, method, response, catalogue, documents))
  )
    return;
  const requestVersion = currentVersion();
  const changed =
    componentChanges?.changedRoutes ??
    (componentChanges?.result
      ? componentChanges.result.changes.map(
          (entry) => (entry.after ?? entry.before)!.route,
        )
      : currentChangedRoutes());
  const context = shellContext(
    base,
    changed
      ? [
          ...new Set([
            ...changed,
            ...catalogue.removedEntries.map(({ entry }) => entry.route),
          ]),
        ]
      : undefined,
    requestVersion,
  );
  context.comparisons = reviewRoutes !== undefined;
  if (contentVersion !== undefined) context.contentVersion = contentVersion;
  if (documents && renderCapability)
    context.previewGeneration = renderCapability.generation;
  if (changesStatus) context.changesStatus = changed ? "ready" : changesStatus;
  if (componentChanges) context.componentChanges = componentChanges;
  if (renderCapability) context.renderCapability = renderCapability;
  if (url.pathname === "/")
    return send(
      response,
      200,
      "text/html",
      homePage(catalogue, context),
      method,
    );
  if (reviewRoutes && url.pathname.startsWith("/__mokly/diffs/")) {
    void reviewRoutes.handle(url, response, method);
    return;
  }
  if (url.pathname === "/__mokly/shell.css")
    return send(response, 200, "text/css", SHELL_CSS, method);
  if (url.pathname === "/__mokly/events")
    return openEventStream(response, streams, requestVersion, method);
  if (url.pathname.startsWith("/__mokly/client/")) {
    return serveClientModule(
      response,
      url.pathname.slice("/__mokly/client/".length),
      assets.clientModules,
      method,
    );
  }
  if (url.pathname.startsWith("/__mokly/navigation/")) {
    return serveClientModule(
      response,
      url.pathname.slice("/__mokly/navigation/".length),
      assets.navigationModules,
      method,
    );
  }
  if (url.pathname.startsWith("/__mokly/fonts/")) {
    return serveFontAsset(
      response,
      url.pathname.slice("/__mokly/fonts/".length),
      assets.fontAssets,
      method,
    );
  }
  if (url.pathname.startsWith("/id/"))
    return redirectId(
      response,
      url,
      url.pathname.slice(4),
      catalogue,
      config,
      context,
      method,
      documents,
    );
  if (url.pathname.startsWith("/view/"))
    return renderView(
      response,
      url,
      url.pathname.slice(6),
      catalogue,
      config,
      context,
      method,
      documents,
    );
  if (url.pathname.startsWith("/static/"))
    return serveStatic(
      response,
      url.pathname.slice(8),
      config,
      catalogue,
      method,
    );
  return send(
    response,
    404,
    "text/html",
    notFoundPage(url.pathname, catalogue, context),
    method,
  );
}
