/** Lazy generation lifecycle for development Review mode. */

import type { ServerResponse } from "node:http";

import type { ResolvedConfig } from "../config/types.js";
import { errorMessage } from "../errors.js";
import { runReview } from "../review/run.js";
import {
  captureReviewArtifact,
  isReviewComparisonPage,
  sendReviewText,
  serveReviewArtifact,
  type ReviewArtifactIdentity,
} from "./review_artifact_files.js";
import { safeDecodePath } from "./static_files.js";

/** Generation seam used by the served Review lifecycle. */
export interface ReviewGenerator {
  generate(
    config: ResolvedConfig,
    baseRef: string,
    outDir: string,
    signal: AbortSignal,
  ): Promise<void>;
}

/** Production generator backed by Mokabook's static Review engine. */
export class EngineReviewGenerator implements ReviewGenerator {
  async generate(
    config: ResolvedConfig,
    baseRef: string,
    outDir: string,
    signal: AbortSignal,
  ): Promise<void> {
    await runReview(config, baseRef, outDir, undefined, undefined, signal);
  }
}

interface ReviewGeneration {
  promise: Promise<void>;
  revision: number;
}

/** One server instance's lazy, refreshable Review artifact host. */
export class ServedReviewArtifact {
  private readonly abortController = new AbortController();
  private readonly responses = new Set<ServerResponse>();
  private artifact: ReviewArtifactIdentity | undefined;
  private closePromise: Promise<void> | undefined;
  private closing = false;
  private generatedRevision = -1;
  private generation: ReviewGeneration | undefined;
  private readonly knownComparisonPages = new Set<string>();
  private revision = 0;

  constructor(
    private readonly config: ResolvedConfig,
    private readonly baseRef: string,
    private readonly generator: ReviewGenerator,
  ) {}

  /** Handle a `/review` request without blocking unrelated server routes. */
  serve(url: URL, response: ServerResponse, method: string): void {
    if (this.closing) {
      response.destroy();
      return;
    }
    this.responses.add(response);
    void this.respond(url, response, method)
      .catch((error: unknown) => {
        if (this.closing || response.destroyed) return;
        if (response.headersSent) {
          response.destroy();
          return;
        }
        sendReviewText(
          response,
          500,
          `Mokabook could not generate this review.\n${errorMessage(error)}\n`,
          method,
        );
      })
      .finally(() => this.responses.delete(response));
  }

  /** Mark the cached artifact stale before publishing a browser update. */
  invalidate(): void {
    if (!this.closing) this.revision += 1;
  }

  /** Reject new work, abort active generation, and drain its cleanup. */
  close(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    this.closing = true;
    const reason = new Error("served Review is closing");
    this.abortController.abort(reason);
    for (const response of this.responses) response.destroy(reason);
    this.closePromise = (this.generation?.promise ?? Promise.resolve()).catch(
      () => undefined,
    );
    return this.closePromise;
  }

  private async respond(
    url: URL,
    response: ServerResponse,
    method: string,
  ): Promise<void> {
    if (url.pathname === "/review" || url.pathname === "/review/") {
      response.writeHead(302, {
        location: `/review/index.html${url.search}`,
      });
      response.end();
      return;
    }
    const relative = safeDecodePath(url.pathname.slice("/review/".length));
    if (!relative) {
      sendReviewText(response, 400, "Invalid Review path", method);
      return;
    }
    const artifact = await this.ensureGenerated(
      url.searchParams.get("refresh") === "1",
    );
    if (response.destroyed) return;
    if (
      serveReviewArtifact(response, this.config, artifact, relative, method)
    ) {
      return;
    }
    if (this.knownComparisonPages.has(relative)) {
      response.writeHead(302, { location: "/review/index.html" });
      response.end();
      return;
    }
    sendReviewText(response, 404, "Not found", method);
  }

  private async ensureGenerated(
    refresh: boolean,
  ): Promise<ReviewArtifactIdentity> {
    if (refresh) this.invalidate();
    while (true) {
      this.abortController.signal.throwIfAborted();
      if (this.artifact && this.generatedRevision === this.revision) {
        return this.artifact;
      }
      const generation = this.generation ?? this.startGeneration(this.revision);
      await generation.promise;
    }
  }

  private startGeneration(revision: number): ReviewGeneration {
    const state = {
      promise: this.generateRevision(revision),
      revision,
    };
    this.generation = state;
    const clear = (): void => {
      if (this.generation === state) this.generation = undefined;
    };
    void state.promise.then(clear, clear);
    return state;
  }

  private async generateRevision(revision: number): Promise<void> {
    await this.generator.generate(
      this.config,
      this.baseRef,
      this.config.review.outDir,
      this.abortController.signal,
    );
    this.abortController.signal.throwIfAborted();
    if (this.revision !== revision) return;
    const artifact = captureReviewArtifact(this.config);
    for (const relative of artifact.trustedPages) {
      if (isReviewComparisonPage(relative)) {
        this.knownComparisonPages.add(relative);
      }
    }
    this.artifact = artifact;
    this.generatedRevision = revision;
  }
}
