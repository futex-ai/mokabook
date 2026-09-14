import http, { type ServerResponse } from "node:http";

import type { ComponentRuntime } from "../build/component_runtime.js";
import type { ResolvedConfig } from "../config/types.js";
import { timeAsync, timeSync } from "../diagnostics/timings.js";
import { MoklyError } from "../errors.js";
import { parseManifest } from "../registry/manifest.js";
import type { ManifestV5 } from "../registry/types.js";
import { catalogueAtBaseline, createCatalogue } from "./catalogue.js";
import {
  catalogueSnapshotForConfig,
  loadServedCatalogueSnapshot,
  loadLiveCatalogueSnapshot,
  type CatalogueSnapshot,
} from "./catalogue_snapshot.js";
import {
  loadBrowserClientModules,
  loadBrowserNavigationModules,
  loadShellFontAssets,
} from "./client_modules.js";
import {
  ComponentChangeCache,
  type ComponentChangeSource,
  type ComponentChangeSnapshot,
} from "./component_changes.js";
import { handleControls, localHost } from "./controls/http.js";
import { ComponentRenderService } from "./controls/service.js";
import { ForegroundActivity } from "./demand/activity.js";
import type { PreviewObservation } from "./demand/observation.js";
import { DocumentService } from "./demand/service.js";
import { handleCatalogueRequest } from "./http_routes.js";
import { listenOnAvailablePort } from "./ports.js";
import { send } from "./respond.js";
import { ReviewRoutes, type ServedReview } from "./review_routes.js";
import type { CatalogueUpdate, ChangesStatus } from "./update_messages.js";

/** Options for one deterministic server child. */
export interface ServerOptions {
  changesStatus?: ChangesStatus;
  /** Include live Changes states by default; static captures opt out. */
  liveChanges?: boolean;
  onForeground?: (active: boolean) => void;
  onPreviewResources?: (observation: PreviewObservation) => void;
  base: string;
  /** Reuse a validated startup or publication generation without rereading metadata. */
  snapshot?: CatalogueSnapshot;
  componentRuntime?: ComponentRuntime;
  changedRoutes?: readonly string[];
  /** Precomputed component and screen evidence for the immutable generation. */
  componentChanges?: ComponentChangeSnapshot;
  componentChangeSource?: ComponentChangeSource;
  /** Parent-validated manifest supplied to a watched server child. */
  manifest?: ComponentRuntime["manifest"];
  port: number;
  /** Enables on-demand comparison JSON and isolated snapshots. */
  review?: ServedReview;
  strictPort?: boolean;
  updateVersion?: number;
}

/** Running server lifecycle and update-stream boundary. */
export interface RunningServer {
  completeCatalogue?(manifest: ManifestV5, generation: string): boolean;
  close(): Promise<void>;
  publishUpdate(update?: CatalogueUpdate): void;
  replaceComponentRuntime(runtime: ComponentRuntime): void;
  port: number;
  url: string;
}

/** Start Browse only after manifest validation succeeds. */
export async function startCatalogueServer(
  config: ResolvedConfig,
  options: ServerOptions,
): Promise<RunningServer> {
  const snapshot =
    options.snapshot ??
    (options.manifest?.schemaVersion === "live-index-1"
      ? await loadLiveCatalogueSnapshot(config, options.manifest)
      : await loadServedCatalogueSnapshot(
          config,
          options.manifest ||
            options.componentChanges ||
            options.componentChangeSource
            ? undefined
            : options.review
              ? options.base
              : undefined,
          options.manifest,
          options.review?.repository,
        ));
  const validated = catalogueSnapshotForConfig(snapshot, config);
  const changes = validated.changes;
  let catalogue = validated.catalogue;
  let manifest = catalogue.manifest;
  let controls = options.componentRuntime
    ? new ComponentRenderService(options.componentRuntime)
    : undefined;
  const activity = new ForegroundActivity(options.onForeground ?? (() => {}));
  const createDocuments = (runtime: ComponentRuntime) =>
    runtime.manifest.schemaVersion === "live-index-1"
      ? new DocumentService(runtime, activity.channel(), {
          onDocument: (document) =>
            options.onPreviewResources?.({
              generation: runtime.generation,
              documents: [
                [document.route, document.html],
                ...(document.watchDocuments ?? []),
              ],
            }),
        })
      : undefined;
  let documents = options.componentRuntime
    ? createDocuments(options.componentRuntime)
    : undefined;
  const clientModules = timeSync("server.client-modules", () =>
    loadBrowserClientModules(),
  );
  const navigationModules = timeSync("server.navigation-modules", () =>
    loadBrowserNavigationModules(),
  );
  const fontAssets = timeSync("server.fonts", () => loadShellFontAssets());
  const streams = new Set<ServerResponse>();
  const reviewRoutes = options.review
    ? new ReviewRoutes(options.review, () =>
        manifest.schemaVersion === 5 && componentChanges?.comparison
          ? {
              ...componentChanges.comparison,
              before: componentChanges.baseline,
              after: manifest,
              ...(componentChanges.result
                ? { result: componentChanges.result }
                : {}),
            }
          : undefined,
      )
    : undefined;
  let componentChanges =
    options.componentChanges ??
    snapshot.componentChanges ??
    (options.review && options.componentChangeSource
      ? await new ComponentChangeCache(options.componentChangeSource).read(
          options.updateVersion ?? 1,
        )
      : undefined);
  let activeCatalogue = componentChanges
    ? catalogueAtBaseline(manifest, componentChanges.baseline)
    : catalogue;
  let changedRoutes =
    changes?.changedRoutes ??
    options.changedRoutes ??
    componentChanges?.changedRoutes;
  let changesStatus: ChangesStatus =
    options.changesStatus ??
    (changedRoutes || componentChanges ? "ready" : "unavailable");
  let updateVersion = options.updateVersion ?? 1;
  let contentVersion = updateVersion;
  const server = http.createServer((request, response) => {
    if (controls && !localHost(request))
      return send(
        response,
        403,
        "text/plain",
        "This request is not allowed.",
        request.method ?? "GET",
      );
    if (controls && request.url?.startsWith("/__mokly/components/")) {
      const busy = activity.channel();
      busy(true);
      void handleControls(request, response, controls).finally(() =>
        busy(false),
      );
      return;
    }
    const requestedVersion = updateVersion;
    const requestedChanges = changedRoutes;
    void handleCatalogueRequest(
      request.url ?? "/",
      request.method ?? "GET",
      response,
      activeCatalogue,
      config,
      options.base,
      () => requestedChanges,
      streams,
      { clientModules, fontAssets, navigationModules },
      () => requestedVersion,
      reviewRoutes,
      componentChanges,
      controls?.capability(),
      documents,
      options.liveChanges === false ? undefined : changesStatus,
      contentVersion,
    ).catch(() => {
      if (!response.destroyed && !response.headersSent)
        send(
          response,
          500,
          "text/plain",
          "Could not open this page.",
          request.method ?? "GET",
        );
    });
  });
  await timeAsync("server.listen", () =>
    listenOnAvailablePort(server, options.port, options.strictPort ?? false),
  );
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new MoklyError(
      "server-failed",
      "server did not expose a TCP address",
    );
  }
  return {
    completeCatalogue(complete, generation): boolean {
      if (controls?.capability().generation !== generation) return false;
      parseManifest(complete);
      manifest = complete;
      catalogue = createCatalogue(complete);
      activeCatalogue = componentChanges
        ? catalogueAtBaseline(manifest, componentChanges.baseline)
        : catalogue;
      return true;
    },
    async close(): Promise<void> {
      for (const stream of streams) stream.end();
      const serverClosing = new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      const reviewClosing = reviewRoutes?.close() ?? Promise.resolve();
      const results = await Promise.allSettled([
        serverClosing,
        reviewClosing,
        controls?.close(),
        documents?.close(),
      ]);
      for (const result of results) {
        if (result.status === "rejected") throw result.reason;
      }
    },
    port: address.port,
    replaceComponentRuntime(runtime): void {
      void documents?.close();
      documents = createDocuments(runtime);
      if (runtime.manifest.schemaVersion === "live-index-1") {
        manifest = runtime.manifest;
        catalogue = createCatalogue(manifest);
        activeCatalogue = catalogue;
      }
      if (controls) controls.replace(runtime);
      else controls = new ComponentRenderService(runtime);
    },
    publishUpdate(update = {}): void {
      const nextVersion = update.version ?? updateVersion + 1;
      if (!Number.isSafeInteger(nextVersion) || nextVersion <= updateVersion)
        return;
      if (Object.hasOwn(update, "changedRoutes")) {
        changedRoutes = update.changedRoutes ?? undefined;
      }
      if (Object.hasOwn(update, "componentChanges")) {
        componentChanges = update.componentChanges ?? undefined;
        activeCatalogue = componentChanges
          ? catalogueAtBaseline(manifest, componentChanges.baseline)
          : catalogue;
      }
      if (
        Object.hasOwn(update, "changedRoutes") ||
        Object.hasOwn(update, "componentChanges")
      )
        changesStatus =
          changedRoutes || componentChanges ? "ready" : "unavailable";
      changesStatus = update.changesStatus ?? changesStatus;
      if (changesStatus !== "ready") {
        changedRoutes = undefined;
        componentChanges = undefined;
        activeCatalogue = catalogue;
      }
      updateVersion = nextVersion;
      if (update.kind !== "evidence") contentVersion = nextVersion;
      reviewRoutes?.invalidate();
      const payload = `event: update\ndata: ${updateVersion}\n\n`;
      for (const stream of streams) stream.write(payload);
    },
    url: `http://127.0.0.1:${address.port}`,
  };
}
