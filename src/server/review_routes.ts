/** Lazy comparison snapshots used by the catalogue diff controls. */
import type { ServerResponse } from "node:http";

import { encodeUrlPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MoklyError } from "../errors.js";
import type { ReadOnlyReviewRepository } from "../review/repository.js";
import { runReview } from "../review/run.js";
import { RepositorySelectedReview } from "../review/selected.js";
import type {
  SelectedReviewProvider,
  SelectedReviewSource,
} from "../review/selection_types.js";

import { safeDecodePath, send } from "./respond.js";
import {
  ReviewGenerationStore,
  type ReviewArtifactProvider,
  type ReviewGeneration,
} from "./review_generations.js";
import type { ReviewRepositorySource } from "./review_repository.js";
import {
  redirectReview,
  sendReviewFailure,
  serveReviewArtifactFile,
} from "./review_responses.js";
import { SelectedReviewRoutes } from "./selected_review_routes.js";

const DIFF_ROUTE = "/__mokly/diffs/";
const GENERATION_ROUTE = `${DIFF_ROUTE}__generations/`;

/** How Browse obtains the Review artifact it serves under `/__mokly/diffs/`. */
export interface ServedReview extends ReviewArtifactProvider {
  /** Comparison base ref, shown when the comparison cannot be generated. */
  base: string;
  selected?: SelectedReviewProvider;
  repository?(): ReadOnlyReviewRepository;
}

/** Serve the configured Git comparison from the consumer's Review engine. */
export function configuredServedReview(
  config: ResolvedConfig,
  base: string,
  git: ReadOnlyReviewRepository | ReviewRepositorySource,
): ServedReview {
  const repository = () => ("current" in git ? git.current() : git);
  return {
    base,
    repository,
    selected: new RepositorySelectedReview(
      config,
      "current" in git ? undefined : git.reader,
    ),
    async generate(options): Promise<void> {
      await runReview(
        config,
        base,
        config.review.outDir,
        repository(),
        undefined,
        options.changedPathExclusions,
      );
    },
    outDir: config.review.outDir,
  };
}

/** Serialize lazy Review generation and serve the artifact's files. */
export class ReviewRoutes {
  private closed = false;
  private closePromise: Promise<void> | undefined;
  private generation: Promise<ReviewGeneration> | undefined;
  private generationKind: "demand" | "refresh" | undefined;
  private queuedGeneration: Promise<ReviewGeneration> | undefined;
  private readonly generations: ReviewGenerationStore;
  private stale = false;
  private readonly selected: SelectedReviewRoutes | undefined;

  constructor(
    private readonly review: ServedReview,
    source: () => SelectedReviewSource | undefined = () => undefined,
  ) {
    this.generations = new ReviewGenerationStore(review);
    this.selected = review.selected
      ? new SelectedReviewRoutes(review.selected, source, review.base)
      : undefined;
  }

  /** Mark the cached artifact stale after an update that reloads browsers. */
  invalidate(): void {
    if (!this.closed) this.stale = true;
    this.selected?.invalidate();
  }

  /** Drain generation work and remove retained artifacts when the server stops. */
  close(): Promise<void> {
    this.closePromise ??= this.finishClose();
    return this.closePromise;
  }

  /** Respond to one `/__mokly/diffs/` or `/__mokly/diffs/<path>` request. */
  async handle(
    url: URL,
    response: ServerResponse,
    method: string,
  ): Promise<void> {
    if (await this.selected?.handle(url, response, method)) return;
    if (url.pathname.startsWith(GENERATION_ROUTE)) {
      const requested = generationPath(url.pathname);
      if (
        !requested ||
        (!isSnapshot(requested.relative) &&
          !isReviewDocument(requested.relative))
      )
        return send(response, 404, "text/plain", "Not found", method);
      await this.handleGeneration(requested, url, response, method);
      return;
    }
    const relative = safeDecodePath(url.pathname.slice(DIFF_ROUTE.length));
    if (relative !== "review.json")
      return send(response, 404, "text/plain", "Not found", method);
    try {
      const generation = await this.ensureGenerated(
        url.searchParams.get("refresh") === "1",
      );
      redirectReview(response, generationUrl(generation, relative));
    } catch (error) {
      return sendReviewFailure(response, error, this.review.base, method);
    }
  }

  /** Reuse a fresh generation; stale and refresh requests queue after it. */
  private ensureGenerated(refresh: boolean): Promise<ReviewGeneration> {
    if (this.closed) return Promise.reject(reviewServerClosing());
    if (this.queuedGeneration) return this.queuedGeneration;
    if (this.generation) {
      if (this.stale || (refresh && this.generationKind === "demand")) {
        return this.queueGeneration(this.generation);
      }
      return this.generation;
    }
    const current = this.generations.current();
    if (current && !refresh && !this.stale) return Promise.resolve(current);
    return this.startGeneration(refresh || this.stale ? "refresh" : "demand");
  }

  private startGeneration(
    kind: "demand" | "refresh",
  ): Promise<ReviewGeneration> {
    if (this.closed) return Promise.reject(reviewServerClosing());
    this.stale = false;
    const generation = this.generations.generate();
    this.trackGeneration(generation, kind);
    return generation;
  }

  private queueGeneration(
    active: Promise<ReviewGeneration>,
  ): Promise<ReviewGeneration> {
    const queued = active
      .catch(() => undefined)
      .then(() => {
        if (this.queuedGeneration === queued) this.queuedGeneration = undefined;
        return this.startGeneration("refresh");
      });
    this.queuedGeneration = queued;
    return queued;
  }

  private trackGeneration(
    generation: Promise<ReviewGeneration>,
    kind: "demand" | "refresh",
  ): void {
    this.generation = generation;
    this.generationKind = kind;
    void generation.then(
      () => {
        if (this.generation === generation) {
          this.generation = undefined;
          this.generationKind = undefined;
        }
      },
      () => {
        if (this.generation === generation) {
          this.generation = undefined;
          this.generationKind = undefined;
          if (!this.closed) this.stale = true;
        }
      },
    );
  }

  private async finishClose(): Promise<void> {
    this.closed = true;
    await this.selected?.close();
    const pending = this.queuedGeneration ?? this.generation;
    if (pending) await Promise.allSettled([pending]);
    await this.generations.close();
  }

  private async handleGeneration(
    requested: { readonly relative: string; readonly version: string },
    url: URL,
    response: ServerResponse,
    method: string,
  ): Promise<void> {
    const generation = this.generations.get(requested.version);
    const current = this.generations.current();
    const refresh =
      isReviewDocument(requested.relative) &&
      url.searchParams.get("refresh") === "1";
    const pending = this.queuedGeneration ?? this.generation;
    const advance =
      refresh ||
      (isReviewDocument(requested.relative) &&
        (this.stale ||
          pending !== undefined ||
          (current !== undefined && current.version !== requested.version)));
    if (advance) {
      try {
        const latest =
          refresh || this.stale || pending
            ? await this.ensureGenerated(refresh)
            : current;
        if (latest)
          return redirectReview(
            response,
            generationUrl(latest, requested.relative),
          );
      } catch (error) {
        return sendReviewFailure(response, error, this.review.base, method);
      }
    }
    if (
      !isSnapshot(requested.relative) &&
      !isReviewDocument(requested.relative)
    )
      return send(response, 404, "text/plain", "Not found", method);
    if (generation) {
      return serveReviewArtifactFile(
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
      return redirectReview(
        response,
        generationUrl(latest, requested.relative),
      );
    } catch (error) {
      return sendReviewFailure(response, error, this.review.base, method);
    }
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
  return relative === "review.json";
}

function isSnapshot(relative: string): boolean {
  return relative.startsWith("snapshots/");
}

function generationUrl(generation: ReviewGeneration, relative: string): string {
  return `${GENERATION_ROUTE}${generation.version}/${encodeUrlPath(relative)}`;
}

function reviewServerClosing(): MoklyError {
  return new MoklyError("server-failed", "Comparison server is closing");
}
