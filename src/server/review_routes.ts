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

import { encodeUrlPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { errorMessage } from "../errors.js";
import { runReview } from "../review/run.js";
import {
  ReviewGenerationStore,
  type ReviewArtifactProvider,
  type ReviewGeneration,
} from "./review_generations.js";
import { contentType, safeDecodePath, send } from "./respond.js";

const GENERATION_ROUTE = "/review/__generations/";

/** How Browse obtains the Review artifact it serves under `/review`. */
export interface ServedReview extends ReviewArtifactProvider {
  /** Comparison base ref, shown when the comparison cannot be generated. */
  base: string;
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
  private generation: Promise<ReviewGeneration> | undefined;
  private readonly generations: ReviewGenerationStore;
  private stale = false;

  constructor(private readonly review: ServedReview) {
    this.generations = new ReviewGenerationStore(review);
  }

  /** Mark the cached artifact stale after an update that reloads browsers. */
  invalidate(): void {
    this.stale = true;
  }

  /** Remove retained superseded generations when the server stops. */
  async close(): Promise<void> {
    await this.generations.close();
  }

  /** Respond to one `/review` or `/review/<path>` request. */
  async handle(
    url: URL,
    response: ServerResponse,
    method: string,
  ): Promise<void> {
    if (url.pathname === "/review" || url.pathname === "/review/") {
      return redirect(response, "/review/index.html");
    }
    if (url.pathname.startsWith(GENERATION_ROUTE)) {
      const requested = generationPath(url.pathname);
      if (!requested)
        return send(response, 404, "text/plain", "Not found", method);
      await this.handleGeneration(requested, url, response, method);
      return;
    }
    const relative = safeDecodePath(url.pathname.slice("/review/".length));
    if (!relative)
      return send(response, 404, "text/plain", "Not found", method);
    try {
      const generation = await this.ensureGenerated(
        url.searchParams.get("refresh") === "1",
      );
      redirect(response, generationUrl(generation, relative));
    } catch (error) {
      return send(
        response,
        500,
        "text/html",
        failedPage(error, this.review.base),
        method,
      );
    }
  }

  /** Reuse a fresh generation; stale and refresh requests queue after it. */
  private ensureGenerated(refresh: boolean): Promise<ReviewGeneration> {
    if (this.generation) return this.generation;
    const current = this.generations.current();
    if (current && !refresh && !this.stale) return Promise.resolve(current);
    this.stale = false;
    const generation = this.generations.generate();
    this.generation = generation;
    void generation.then(
      () => {
        if (this.generation === generation) this.generation = undefined;
      },
      () => {
        if (this.generation === generation) {
          this.generation = undefined;
          this.stale = true;
        }
      },
    );
    return generation;
  }

  private async handleGeneration(
    requested: { readonly relative: string; readonly version: string },
    url: URL,
    response: ServerResponse,
    method: string,
  ): Promise<void> {
    const generation = this.generations.get(requested.version);
    const current = this.generations.current();
    const refresh = url.searchParams.get("refresh") === "1";
    const advance =
      refresh ||
      (isReviewDocument(requested.relative) &&
        (this.stale ||
          this.generation !== undefined ||
          (current !== undefined && current.version !== requested.version)));
    if (advance) {
      try {
        const latest =
          refresh || this.stale || this.generation
            ? await this.ensureGenerated(refresh)
            : current;
        if (latest)
          return redirect(response, generationUrl(latest, requested.relative));
      } catch (error) {
        return send(
          response,
          500,
          "text/html",
          failedPage(error, this.review.base),
          method,
        );
      }
    }
    if (generation) {
      return this.serveArtifactFile(
        generation.directory,
        requested.relative,
        response,
        method,
      );
    }
    if (!isReviewDocument(requested.relative))
      return send(response, 404, "text/plain", "Not found", method);
    try {
      const latest = await this.ensureGenerated(false);
      return redirect(response, generationUrl(latest, requested.relative));
    } catch (error) {
      return send(
        response,
        500,
        "text/html",
        failedPage(error, this.review.base),
        method,
      );
    }
  }

  private serveArtifactFile(
    directory: string,
    relative: string,
    response: ServerResponse,
    method: string,
  ): void {
    const rootPath = path.resolve(directory);
    const filePath = path.resolve(rootPath, relative);
    if (!filePath.startsWith(rootPath + path.sep))
      return send(response, 404, "text/plain", "Not found", method);
    let content: Buffer;
    try {
      content = fs.readFileSync(filePath);
    } catch {
      return send(response, 404, "text/plain", "Not found", method);
    }
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": contentType(filePath),
      "x-content-type-options": "nosniff",
    });
    response.end(method === "HEAD" ? undefined : content);
  }
}

function generationPath(
  pathname: string,
): { readonly relative: string; readonly version: string } | undefined {
  const remainder = pathname.slice(GENERATION_ROUTE.length);
  const separator = remainder.indexOf("/");
  if (separator < 1) return undefined;
  const version = remainder.slice(0, separator);
  const relative = safeDecodePath(remainder.slice(separator + 1));
  return /^[A-Za-z0-9][A-Za-z0-9._~-]*$/.test(version) && relative
    ? { relative, version }
    : undefined;
}

function isReviewDocument(relative: string): boolean {
  return (
    relative === "index.html" ||
    (relative.startsWith("comparisons/") && relative.endsWith(".html"))
  );
}

function generationUrl(generation: ReviewGeneration, relative: string): string {
  return `${GENERATION_ROUTE}${generation.version}/${encodeUrlPath(relative)}`;
}

function redirect(response: ServerResponse, location: string): void {
  response.writeHead(302, {
    "cache-control": "no-store",
    location,
  });
  response.end();
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
