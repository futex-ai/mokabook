/** Served Review under `/review`: lazy artifact generation plus file serving.
 *
 * Browse links its Review mode here. The artifact is generated into the
 * configured Review output directory on the first request, after a published
 * watch update, and when a request carries `?refresh=1`, so the comparison
 * reflects the workspace when viewed. Generated pages link back to Browse.
 */

import fs from "node:fs";
import path from "node:path";
import type { ServerResponse } from "node:http";

import type { ResolvedConfig } from "../config/types.js";
import { errorMessage } from "../errors.js";
import { runReview } from "../review/run.js";
import { contentType, safeDecodePath, send } from "./respond.js";

/** How Browse obtains the Review artifact it serves under `/review`. */
export interface ServedReview {
  /** Comparison base ref, shown when the comparison cannot be generated. */
  base: string;
  /** Regenerate the artifact into {@link outDir}; awaited lazily and on
   * `?refresh=1`. */
  generate(): Promise<void>;
  /** Directory holding the generated Review artifact files. */
  outDir: string;
}

/** Serve the configured Git comparison from the consumer's Review engine. */
export function configuredServedReview(
  config: ResolvedConfig,
  base: string,
): ServedReview {
  return {
    base,
    async generate(): Promise<void> {
      await runReview(
        config,
        base,
        config.review.outDir,
        undefined,
        undefined,
        { browseHref: "/" },
      );
    },
    outDir: config.review.outDir,
  };
}

/** Serialize lazy Review generation and serve the artifact's files. */
export class ReviewRoutes {
  private generation: Promise<void> | undefined;
  private stale = false;

  constructor(private readonly review: ServedReview) {}

  /** Mark the cached artifact stale after an update that reloads browsers. */
  invalidate(): void {
    this.stale = true;
  }

  /** Respond to one `/review` or `/review/<path>` request. */
  async handle(
    url: URL,
    response: ServerResponse,
    method: string,
  ): Promise<void> {
    if (url.pathname === "/review" || url.pathname === "/review/") {
      response.writeHead(302, { location: "/review/index.html" });
      response.end();
      return;
    }
    try {
      await this.ensureGenerated(url.searchParams.get("refresh") === "1");
    } catch (error) {
      send(
        response,
        500,
        "text/html",
        failedPage(error, this.review.base),
        method,
      );
      return;
    }
    this.serveArtifactFile(
      url.pathname.slice("/review/".length),
      response,
      method,
    );
  }

  /** Reuse a fresh generation; stale and refresh requests queue after it. */
  private ensureGenerated(refresh: boolean): Promise<void> {
    if (this.generation && !refresh && !this.stale) return this.generation;
    this.stale = false;
    const previous = this.generation ?? Promise.resolve();
    const generation = previous
      .catch(() => undefined)
      .then(() => this.review.generate());
    this.generation = generation;
    generation.catch(() => {
      if (this.generation === generation) this.generation = undefined;
    });
    return generation;
  }

  private serveArtifactFile(
    encodedPath: string,
    response: ServerResponse,
    method: string,
  ): void {
    const relative = safeDecodePath(encodedPath);
    const rootPath = path.resolve(this.review.outDir);
    const filePath = relative ? path.resolve(rootPath, relative) : undefined;
    if (!filePath || !filePath.startsWith(rootPath + path.sep))
      return send(response, 404, "text/plain", "Not found", method);
    let content: Buffer;
    try {
      content = fs.readFileSync(filePath);
    } catch {
      return send(response, 404, "text/plain", "Not found", method);
    }
    response.writeHead(200, {
      "content-type": contentType(filePath),
      "x-content-type-options": "nosniff",
    });
    response.end(method === "HEAD" ? undefined : content);
  }
}

function failedPage(error: unknown, base: string): string {
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<title>Review comparison failed · Mokabook</title></head><body>` +
    `<main><h1>Review comparison failed</h1>` +
    `<p>Comparing this branch with <strong>${escapeHtml(base)}</strong> did ` +
    `not complete.</p>` +
    `<p>${escapeHtml(errorMessage(error))}</p>` +
    `<p><a href="/review/index.html?refresh=1">Try again</a> · ` +
    `<a href="/">Browse the catalogue</a></p></main></body></html>\n`
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
