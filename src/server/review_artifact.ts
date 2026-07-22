/** Lazy generation and confined HTTP serving for development Review mode. */

import fs from "node:fs";
import type { ServerResponse } from "node:http";
import path from "node:path";

import { isInside } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { errorMessage } from "../errors.js";
import { runReview } from "../review/run.js";
import { contentType, safeDecodePath } from "./static_files.js";

/** Generation seam used by the served Review lifecycle. */
export interface ReviewGenerator {
  generate(
    config: ResolvedConfig,
    baseRef: string,
    outDir: string,
  ): Promise<void>;
}

/** Production generator backed by Mokabook's static Review engine. */
export class EngineReviewGenerator implements ReviewGenerator {
  async generate(
    config: ResolvedConfig,
    baseRef: string,
    outDir: string,
  ): Promise<void> {
    await runReview(config, baseRef, outDir);
  }
}

/** One server instance's lazy, refreshable Review artifact host. */
export class ServedReviewArtifact {
  private generated = false;
  private generation: Promise<void> | undefined;

  constructor(
    private readonly config: ResolvedConfig,
    private readonly baseRef: string,
    private readonly generator: ReviewGenerator,
  ) {}

  /** Handle a `/review` request without blocking unrelated server routes. */
  serve(url: URL, response: ServerResponse, method: string): void {
    void this.respond(url, response, method).catch((error: unknown) => {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      sendText(
        response,
        500,
        `Mokabook could not generate this review.\n${errorMessage(error)}\n`,
        method,
      );
    });
  }

  private async respond(
    url: URL,
    response: ServerResponse,
    method: string,
  ): Promise<void> {
    if (url.pathname === "/review" || url.pathname === "/review/") {
      response.writeHead(302, { location: "/review/index.html" });
      response.end();
      return;
    }
    const relative = safeDecodePath(url.pathname.slice("/review/".length));
    if (!relative) {
      sendText(response, 400, "Invalid Review path", method);
      return;
    }
    await this.ensureGenerated(url.searchParams.get("refresh") === "1");
    serveArtifactFile(response, this.config.review.outDir, relative, method);
  }

  private async ensureGenerated(refresh: boolean): Promise<void> {
    if (this.generation) {
      await this.generation;
      return;
    }
    if (this.generated && !refresh) return;
    const generation = this.generator.generate(
      this.config,
      this.baseRef,
      this.config.review.outDir,
    );
    this.generation = generation;
    try {
      await generation;
      this.generated = true;
    } finally {
      if (this.generation === generation) this.generation = undefined;
    }
  }
}

function serveArtifactFile(
  response: ServerResponse,
  outDir: string,
  relative: string,
  method: string,
): void {
  const candidate = path.resolve(outDir, relative);
  let content: Buffer;
  try {
    const realOutDir = fs.realpathSync(outDir);
    const realCandidate = fs.realpathSync(candidate);
    if (
      !isInside(realOutDir, realCandidate) ||
      !fs.lstatSync(candidate).isFile()
    ) {
      sendText(response, 404, "Not found", method);
      return;
    }
    content = fs.readFileSync(candidate);
  } catch {
    sendText(response, 404, "Not found", method);
    return;
  }
  const body = isReviewPage(relative)
    ? enhanceServedPage(content.toString("utf8"))
    : content;
  response.writeHead(200, {
    "cache-control": "no-cache",
    "content-type": contentType(candidate),
    "x-content-type-options": "nosniff",
  });
  response.end(method === "HEAD" ? undefined : body);
}

function isReviewPage(relative: string): boolean {
  return (
    relative === "index.html" ||
    (relative.startsWith("comparisons/") && relative.endsWith(".html"))
  );
}

function enhanceServedPage(content: string): string {
  const controls =
    `<div class="mb-served-reviewbar">` +
    `<nav aria-label="Mokabook modes" class="mb-viewswitch">` +
    `<a class="mb-viewswitch-option" href="/">Browse</a>` +
    `<span aria-current="page" class="mb-viewswitch-option">Review</span>` +
    `</nav><a class="mb-empty-link" href="?refresh=1">Refresh comparison</a>` +
    `</div>`;
  const client = `<script src="/__mokabook/client/browser.js" type="module"></script>`;
  return content
    .replace('<main class="mb-artifact-main">', `$&${controls}`)
    .replace("</body>", `${client}</body>`);
}

function sendText(
  response: ServerResponse,
  status: number,
  body: string,
  method: string,
): void {
  response.writeHead(status, {
    "cache-control": "no-cache",
    "content-type": "text/plain; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  response.end(method === "HEAD" ? undefined : body);
}
