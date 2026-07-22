import http, { type ServerResponse } from "node:http";

import { encodeUrlPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError } from "../errors.js";
import { readManifest } from "../registry/manifest.js";
import { createCatalogue, type Catalogue } from "./catalogue.js";
import {
  loadBrowserClientModules,
  loadShellFontAssets,
} from "./client_modules.js";
import { homePage, notFoundPage, viewPage } from "./pages.js";
import { listenOnAvailablePort } from "./ports.js";
import {
  EngineReviewGenerator,
  type ReviewGenerator,
  ServedReviewArtifact,
} from "./review_artifact.js";
import type { ShellContext } from "./shell/context.js";
import { SHELL_CSS } from "./shell/css.js";
import {
  safeDecodePath,
  serveClientModule,
  serveFontAsset,
  servePublicStatic,
} from "./static_files.js";

/** Options for one deterministic server child. */
export interface ServerOptions {
  base: string;
  changedRoutes?: readonly string[];
  port: number;
  strictPort?: boolean;
  updateVersion?: number;
}

/** Running server lifecycle and update-stream boundary. */
export interface RunningServer {
  close(): Promise<void>;
  publishUpdate(version?: number): void;
  port: number;
  url: string;
}

/** Start Browse only after manifest validation succeeds. */
export async function startCatalogueServer(
  config: ResolvedConfig,
  options: ServerOptions,
  reviewGenerator: ReviewGenerator = new EngineReviewGenerator(),
): Promise<RunningServer> {
  const catalogue = createCatalogue(readManifest(config));
  const clientModules = loadBrowserClientModules();
  const fontAssets = loadShellFontAssets();
  const review = new ServedReviewArtifact(
    config,
    options.base,
    reviewGenerator,
  );
  const streams = new Set<ServerResponse>();
  let updateVersion = options.updateVersion ?? 1;
  const server = http.createServer((request, response) => {
    handleRequest(
      request.url ?? "/",
      request.method ?? "GET",
      response,
      catalogue,
      config,
      options,
      streams,
      { clientModules, fontAssets },
      review,
      () => updateVersion,
    );
  });
  await listenOnAvailablePort(
    server,
    options.port,
    options.strictPort ?? false,
  );
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new MokabookError(
      "server-failed",
      "server did not expose a TCP address",
    );
  }
  let closePromise: Promise<void> | undefined;
  return {
    close(): Promise<void> {
      if (closePromise) return closePromise;
      for (const stream of streams) stream.end();
      const serverClosing = new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      closePromise = Promise.all([serverClosing, review.close()]).then(
        () => undefined,
      );
      return closePromise;
    },
    port: address.port,
    publishUpdate(version?: number): void {
      const nextVersion = version ?? updateVersion + 1;
      if (!Number.isSafeInteger(nextVersion) || nextVersion <= updateVersion)
        return;
      review.invalidate();
      updateVersion = nextVersion;
      const payload = `event: update\ndata: ${updateVersion}\n\n`;
      for (const stream of streams) stream.write(payload);
    },
    url: `http://127.0.0.1:${address.port}`,
  };
}

interface ServedAssets {
  clientModules: ReadonlyMap<string, Buffer>;
  fontAssets: ReadonlyMap<string, Buffer>;
}

function handleRequest(
  rawUrl: string,
  method: string,
  response: ServerResponse,
  catalogue: Catalogue,
  config: ResolvedConfig,
  options: ServerOptions,
  streams: Set<ServerResponse>,
  assets: ServedAssets,
  review: ServedReviewArtifact,
  currentVersion: () => number,
): void {
  if (method !== "GET" && method !== "HEAD")
    return send(response, 405, "text/plain", "Method not allowed");
  const url = new URL(rawUrl, "http://mokabook.invalid");
  const context = shellContext(options);
  if (url.pathname === "/")
    return send(
      response,
      200,
      "text/html",
      homePage(catalogue, context),
      method,
    );
  if (url.pathname === "/review" || url.pathname.startsWith("/review/")) {
    review.serve(url, response, method);
    return;
  }
  if (url.pathname === "/__mokabook/shell.css")
    return send(response, 200, "text/css", SHELL_CSS, method);
  if (url.pathname === "/__mokabook/events")
    return openEventStream(response, streams, currentVersion(), method);
  if (url.pathname.startsWith("/__mokabook/client/")) {
    return serveClientModule(
      response,
      url.pathname.slice("/__mokabook/client/".length),
      assets.clientModules,
      method,
    );
  }
  if (url.pathname.startsWith("/__mokabook/fonts/")) {
    return serveFontAsset(
      response,
      url.pathname.slice("/__mokabook/fonts/".length),
      assets.fontAssets,
      method,
    );
  }
  if (url.pathname.startsWith("/id/"))
    return redirectId(response, url.pathname.slice(4), catalogue, context);
  if (url.pathname.startsWith("/view/"))
    return renderView(
      response,
      url.pathname.slice(6),
      catalogue,
      context,
      method,
    );
  if (url.pathname.startsWith("/static/"))
    return servePublicStatic(response, url.pathname.slice(8), config, method);
  return send(
    response,
    404,
    "text/html",
    notFoundPage(url.pathname, catalogue, context),
    method,
  );
}

function shellContext(options: ServerOptions): ShellContext {
  return {
    ...(options.changedRoutes ? { changedRoutes: options.changedRoutes } : {}),
  };
}

function redirectId(
  response: ServerResponse,
  encodedId: string,
  catalogue: Catalogue,
  context: ShellContext,
): void {
  const entry = catalogue.byId.get(safeDecode(encodedId));
  if (!entry || entry.kind === "collection")
    return send(
      response,
      404,
      "text/html",
      notFoundPage(encodedId, catalogue, context),
    );
  response.writeHead(302, {
    location: `/view/${encodeUrlPath(entry.route)}`,
  });
  response.end();
}

function renderView(
  response: ServerResponse,
  encodedRoute: string,
  catalogue: Catalogue,
  context: ShellContext,
  method: string,
): void {
  const route = safeDecodePath(encodedRoute);
  const entry = route ? catalogue.byRoute.get(route) : undefined;
  if (!entry)
    return send(
      response,
      404,
      "text/html",
      notFoundPage(encodedRoute, catalogue, context),
      method,
    );
  const viewContext = { ...context, ...(route ? { activeRoute: route } : {}) };
  return send(
    response,
    200,
    "text/html",
    viewPage(entry, catalogue, viewContext),
    method,
  );
}

function openEventStream(
  response: ServerResponse,
  streams: Set<ServerResponse>,
  version: number,
  method: string,
): void {
  response.writeHead(200, {
    "cache-control": "no-cache",
    connection: "keep-alive",
    "content-type": "text/event-stream",
  });
  if (method === "HEAD") {
    response.end();
    return;
  }
  response.write(`event: ready\ndata: ${version}\n\n`);
  streams.add(response);
  response.on("close", () => streams.delete(response));
}

function send(
  response: ServerResponse,
  status: number,
  type: string,
  body: string,
  method = "GET",
): void {
  response.writeHead(status, {
    "cache-control": "no-cache",
    "content-type": `${type}; charset=utf-8`,
    "x-content-type-options": "nosniff",
  });
  response.end(method === "HEAD" ? undefined : body);
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}
