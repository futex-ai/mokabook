import crypto from "node:crypto";
import path from "node:path";

import { minimatch } from "minimatch";

import type { ColorScheme, Viewport } from "../authoring/types.js";
import type { Compilation } from "../build/compile.js";
import { toPosixPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError } from "../errors.js";
import { dependencyContainsChangedPath } from "../registry/dependency_paths.js";
import type { ManifestScreen, ManifestV3 } from "../registry/types.js";
import { VIEWPORTS } from "../registry/views.js";
import { GitReviewAssetReader } from "./assets.js";
import { readBaseManifest } from "./base_manifest.js";
import { reviewChangedPaths } from "./changed_paths.js";
import type { GitClient } from "./git.js";
import { normalizeReviewPair, normalizeSingleDocument } from "./ignore.js";
import {
  aggregateIgnored,
  fragmentForView,
  fragmentRoutes,
  unionColorSchemes,
} from "./screen_views.js";
import type {
  ReviewResult,
  ReviewState,
  ScreenReview,
  ViewReview,
} from "./types.js";

/** Compare checked head output to its Git branch point. */
export async function compareReview(
  compilation: Compilation,
  config: ResolvedConfig,
  git: GitClient,
  baseRef: string,
): Promise<ReviewResult> {
  const baseCommit = await git.mergeBase(baseRef, "HEAD");
  const baseManifest = await readBaseManifest(git, baseCommit, config);
  const changedPaths = await reviewChangedPaths(git, baseCommit, config);
  const mockupsPrefix = toPosixPath(
    path.relative(config.repoRoot, config.mockupsDir),
  );
  const baseAssetReader = new GitReviewAssetReader(
    config,
    git,
    baseCommit,
    mockupsPrefix,
  );
  const baseByRoute = screenMap(baseManifest);
  const headByRoute = screenMap(compilation.manifest);
  const baseDocuments = await baseAssetReader.readMany(
    [...baseByRoute.values()].flatMap((screen) => fragmentRoutes(screen)),
  );
  const routes = [
    ...new Set([...baseByRoute.keys(), ...headByRoute.keys()]),
  ].sort();
  const sharedImpact = changedPaths.filter((changed) =>
    config.review.sharedImpact.some((glob) =>
      minimatch(changed, glob, { dot: true }),
    ),
  );
  const screens: ScreenReview[] = [];
  for (const route of routes) {
    const base = baseByRoute.get(route);
    const head = headByRoute.get(route);
    screens.push(
      compareScreen(
        base,
        head,
        baseDocuments,
        compilation,
        changedPaths,
        sharedImpact,
      ),
    );
  }
  return {
    baseCommit,
    baseRef,
    changedPaths,
    ignoredImpact: aggregateIgnored(screens),
    schemaVersion: 2,
    screens,
    sharedImpact,
  };
}

function compareScreen(
  base: ManifestScreen | undefined,
  head: ManifestScreen | undefined,
  baseDocuments: ReadonlyMap<string, Uint8Array>,
  compilation: Compilation,
  changedPaths: readonly string[],
  sharedImpact: readonly string[],
): ScreenReview {
  const entry = head ?? base;
  if (!entry)
    throw new MokabookError("review-invalid", "comparison route has no screen");
  const views: ViewReview[] = [];
  for (const viewport of VIEWPORTS) {
    for (const colorScheme of unionColorSchemes(base, head)) {
      const baseFragment = base
        ? fragmentForView(base, viewport, colorScheme)
        : undefined;
      const headFragment = head
        ? fragmentForView(head, viewport, colorScheme)
        : undefined;
      const baseDocument = baseFragment
        ? baseDocuments.get(baseFragment)
        : undefined;
      if (baseFragment && !baseDocument) {
        throw new MokabookError(
          "review-invalid",
          `base fragment is missing: ${baseFragment}`,
        );
      }
      const before = baseDocument
        ? Buffer.from(baseDocument).toString("utf8")
        : undefined;
      const after = headFragment
        ? compilation.outputs.get(headFragment)
        : undefined;
      if (headFragment && after === undefined) {
        throw new MokabookError(
          "review-invalid",
          `head fragment is missing: ${headFragment}`,
        );
      }
      views.push(
        compareView(before, after, entry.route, viewport, colorScheme),
      );
    }
  }
  const dependencies = [
    ...new Set([...(base?.dependencies ?? []), ...(head?.dependencies ?? [])]),
  ].sort();
  const dependencyImpact = changedPaths.filter((changedPath) =>
    dependencies.some((dependency) =>
      dependencyContainsChangedPath(dependency, changedPath),
    ),
  );
  return {
    dependencies,
    id: entry.id,
    route: entry.route,
    sharedImpact: [...new Set([...sharedImpact, ...dependencyImpact])].sort(),
    state: aggregateState(views.map((view) => view.state)),
    title: entry.title,
    views,
  };
}

function compareView(
  before: string | undefined,
  after: string | undefined,
  route: string,
  viewport: Viewport,
  colorScheme: ColorScheme,
): ViewReview {
  const context = `${route} (${viewport}, ${colorScheme})`;
  const normalizedBefore =
    before === undefined ? undefined : normalizeSingleDocument(before, context);
  const normalizedAfter =
    after === undefined ? undefined : normalizeSingleDocument(after, context);
  if (before === undefined)
    return { colorScheme, ignoredIds: [], state: "added", viewport };
  if (after === undefined)
    return { colorScheme, ignoredIds: [], state: "removed", viewport };
  const normalized = normalizeReviewPair(before, after, context);
  const normalizedEqual = digest(normalized.base) === digest(normalized.head);
  const rawEqual =
    digest(normalizedBefore ?? "") === digest(normalizedAfter ?? "");
  return {
    colorScheme,
    ignoredIds: normalized.ignoredIds,
    state: rawEqual
      ? "unchanged"
      : normalizedEqual
        ? "ignored-only"
        : "changed",
    viewport,
  };
}

function screenMap(manifest: ManifestV3): Map<string, ManifestScreen> {
  return new Map(
    manifest.entries
      .filter((entry): entry is ManifestScreen => entry.kind === "screen")
      .map((entry) => [entry.route, entry]),
  );
}

function aggregateState(states: readonly ReviewState[]): ReviewState {
  for (const state of [
    "changed",
    "added",
    "removed",
    "ignored-only",
    "unchanged",
  ] as const) {
    if (states.includes(state)) return state;
  }
  return "unchanged";
}

function digest(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}
