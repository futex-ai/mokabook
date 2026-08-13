import fs from "node:fs";
import http, { type ServerResponse } from "node:http";
import path from "node:path";

import { GitReviewAssetReader } from "../changes/base_assets.js";
import { NodeGitCommandRunner, RepositoryGitClient } from "../changes/git.js";
import { encodeUrlPath, toPosixPath } from "../config/paths.js";
import { isPublicStaticFile } from "../config/public_files.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError } from "../errors.js";
import { readManifest } from "../registry/manifest.js";
import { BaseRoutes } from "./base_routes.js";
import { createCatalogue, type Catalogue } from "./catalogue.js";
import {
  loadBrowserClientModules,
  loadShellFontAssets,
} from "./client_modules.js";
import { homePage, notFoundPage, viewPage } from "./pages.js";
import { listenOnAvailablePort } from "./ports.js";
import { contentType, safeDecode, safeDecodePath, send } from "./respond.js";
import type { ShellContext } from "./shell/context.js";
import { SHELL_CSS } from "./shell/css.js";

/** Options for one deterministic server child. */
export interface ServerOptions {
  base: string;
  /** Pinned branch-point commit backing base-document routes. */
  baseCommit?: string;
  /** Fragment routes that exist in the branch-point manifest. */
  baseFragments?: readonly string[];
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
): Promise<RunningServer> {
  const catalogue = createCatalogue(readManifest(config));
  const clientModules = loadBrowserClientModules();
  const fontAssets = loadShellFontAssets();
  const streams = new Set<ServerResponse>();
  const baseRoutes = configuredBaseRoutes(config, options);
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
      () => updateVersion,
      baseRoutes,
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
  return {
    async close(): Promise<void> {
      for (const stream of streams) stream.end();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
    port: address.port,
    publishUpdate(version?: number): void {
      const nextVersion = version ?? updateVersion + 1;
      if (!Number.isSafeInteger(nextVersion) || nextVersion <= updateVersion)
        return;
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
  currentVersion: () => number,
  baseRoutes?: BaseRoutes,
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
  if (baseRoutes && url.pathname.startsWith("/__mokabook/base/")) {
    void baseRoutes.handle(
      url.pathname.slice("/__mokabook/base/".length),
      response,
      method,
    );
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
    return serveStatic(response, url.pathname.slice(8), config, method);
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
    base: options.base,
    ...(options.baseCommit ? { baseCommit: options.baseCommit } : {}),
    ...(options.baseFragments ? { baseFragments: options.baseFragments } : {}),
    ...(options.changedRoutes ? { changedRoutes: options.changedRoutes } : {}),
  };
}

function configuredBaseRoutes(
  config: ResolvedConfig,
  options: ServerOptions,
): BaseRoutes | undefined {
  if (!options.baseCommit) return undefined;
  const reader = new GitReviewAssetReader(
    config,
    new RepositoryGitClient(new NodeGitCommandRunner(config.repoRoot)),
    options.baseCommit,
    toPosixPath(path.relative(config.repoRoot, config.mockupsDir)),
  );
  return new BaseRoutes(options.baseCommit, reader);
}

function serveClientModule(
  response: ServerResponse,
  filename: string,
  modules: ReadonlyMap<string, Buffer>,
  method: string,
): void {
  const content = modules.get(filename);
  if (!content) return send(response, 404, "text/plain", "Not found", method);
  response.writeHead(200, {
    "cache-control": "no-cache",
    "content-type": "text/javascript; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  response.end(method === "HEAD" ? undefined : content);
}

function serveFontAsset(
  response: ServerResponse,
  filename: string,
  fonts: ReadonlyMap<string, Buffer>,
  method: string,
): void {
  const content = fonts.get(filename);
  if (!content) return send(response, 404, "text/plain", "Not found", method);
  response.writeHead(200, {
    "cache-control": "no-cache",
    "content-type": filename.endsWith(".woff2")
      ? "font/woff2"
      : "text/plain; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  response.end(method === "HEAD" ? undefined : content);
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

function serveStatic(
  response: ServerResponse,
  encodedPath: string,
  config: ResolvedConfig,
  method: string,
): void {
  const relative = safeDecodePath(encodedPath);
  if (!relative)
    return send(response, 400, "text/plain", "Invalid static path", method);
  const candidate = path.resolve(config.mockupsDir, relative);
  if (!isPublicStaticFile(candidate, config)) {
    return send(response, 404, "text/plain", "Not found", method);
  }
  let content: Buffer;
  try {
    content = fs.readFileSync(candidate);
  } catch {
    return send(response, 404, "text/plain", "Not found", method);
  }
  response.writeHead(200, {
    "content-type": contentType(candidate),
    "x-content-type-options": "nosniff",
  });
  if (method !== "HEAD") response.end(content);
  else response.end();
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
