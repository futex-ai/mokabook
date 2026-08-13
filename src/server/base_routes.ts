/** Served branch-point documents backing the on-demand compare view. */

import type { ServerResponse } from "node:http";

import { contentType, safeDecodePath } from "./respond.js";

/** Reader returning catalogue documents at the pinned base commit. */
export interface BaseDocumentSource {
  readMany(routes: readonly string[]): Promise<ReadonlyMap<string, Uint8Array>>;
}

const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

const MISSING_BASE_DOCUMENT = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta content="width=device-width, initial-scale=1" name="viewport" />
    <title>No base version</title>
    <style>
      body {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
        padding: 24px;
        box-sizing: border-box;
        font: 13px/1.5 "Inter", ui-sans-serif, system-ui, sans-serif;
        color: #7d8480;
        background: #ffffff;
      }
      p {
        max-width: 260px;
        margin: 0;
        padding: 16px;
        border: 1px dashed #c8ccc4;
        border-radius: 8px;
        text-align: center;
      }
    </style>
  </head>
  <body data-mokabook-base-missing="">
    <p>No base version — this screen is new on this branch.</p>
  </body>
</html>
`;

/**
 * Serve immutable branch-point documents below
 * `/__mokabook/base/<commit>/<route>`. Only the pinned serve commit is
 * addressable; a missing base document renders the no-base placeholder while
 * a missing non-document resource stays a plain 404.
 */
export class BaseRoutes {
  constructor(
    private readonly commit: string,
    private readonly reader: BaseDocumentSource,
  ) {}

  /** Handle the path remainder after the `/__mokabook/base/` prefix. */
  async handle(
    rest: string,
    response: ServerResponse,
    method: string,
  ): Promise<void> {
    const separator = rest.indexOf("/");
    const commit = separator === -1 ? rest : rest.slice(0, separator);
    const encoded = separator === -1 ? "" : rest.slice(separator + 1);
    const route = safeDecodePath(encoded);
    if (commit !== this.commit || route === undefined) {
      return sendText(response, 404, "text/plain", "Not found", method);
    }
    let document: Uint8Array | undefined;
    try {
      document = (await this.reader.readMany([route])).get(route);
    } catch {
      document = undefined;
    }
    if (document === undefined) {
      if (isDocumentRoute(route)) {
        return sendText(
          response,
          200,
          "text/html",
          MISSING_BASE_DOCUMENT,
          method,
          IMMUTABLE_CACHE,
        );
      }
      return sendText(response, 404, "text/plain", "Not found", method);
    }
    response.writeHead(200, {
      "cache-control": IMMUTABLE_CACHE,
      "content-type": contentType(route),
      "x-content-type-options": "nosniff",
    });
    response.end(method === "HEAD" ? undefined : Buffer.from(document));
  }
}

function isDocumentRoute(route: string): boolean {
  return route.endsWith(".html") || route.endsWith(".htm");
}

function sendText(
  response: ServerResponse,
  status: number,
  type: string,
  body: string,
  method: string,
  cacheControl?: string,
): void {
  response.writeHead(status, {
    ...(cacheControl ? { "cache-control": cacheControl } : {}),
    "content-type": `${type}; charset=utf-8`,
    "x-content-type-options": "nosniff",
  });
  response.end(method === "HEAD" ? undefined : body);
}
