import crypto from "node:crypto";
import path from "node:path";

import { minimatch } from "minimatch";

import type { Compilation } from "../build/compile.js";
import { toPosixPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError } from "../errors.js";
import { dependencyContainsChangedPath } from "../registry/dependency_paths.js";
import type { ManifestScreen, ManifestV3 } from "../registry/types.js";
import {
  copySnapshotDependencies,
  FileSystemReviewAssetReader,
  GitReviewAssetReader,
  type ReviewAssetReader,
} from "./assets.js";
import { readBaseManifest } from "./base_manifest.js";
import { reviewChangedPaths } from "./changed_paths.js";
import type { GitClient } from "./git.js";
import { normalizeReviewPair, normalizeSingleDocument } from "./ignore.js";
import { addArtifactFile, snapshotPath } from "./paths.js";
import type {
  ReviewArtifact,
  ReviewArtifactContent,
  ReviewResult,
  ReviewState,
  ScreenReview,
  ViewportReview,
} from "./types.js";

/** Compare checked head output to a Git base and retain complete pane artifacts. */
export async function compareReview(
  compilation: Compilation,
  config: ResolvedConfig,
  git: GitClient,
  baseRef: string,
  outDir = config.review.outDir,
  assetReader: ReviewAssetReader = new FileSystemReviewAssetReader(config),
  signal?: AbortSignal,
): Promise<ReviewArtifact> {
  signal?.throwIfAborted();
  const baseCommit = await git.resolveRef(baseRef);
  signal?.throwIfAborted();
  const baseManifest = await readBaseManifest(git, baseCommit, config, signal);
  const changedPaths = await reviewChangedPaths(
    git,
    baseCommit,
    config,
    outDir,
    signal,
  );
  signal?.throwIfAborted();
  const mockupsPrefix = toPosixPath(
    path.relative(config.repoRoot, config.mockupsDir),
  );
  const baseAssetReader = new GitReviewAssetReader(
    config,
    git,
    baseCommit,
    mockupsPrefix,
  );
  const files = new Map<string, ReviewArtifactContent>();
  const baseSeeds = new Set<string>();
  const headSeeds = new Set<string>();
  const baseByRoute = screenMap(baseManifest);
  const headByRoute = screenMap(compilation.manifest);
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
    signal?.throwIfAborted();
    const base = baseByRoute.get(route);
    const head = headByRoute.get(route);
    screens.push(
      await compareScreen(
        base,
        head,
        baseAssetReader,
        compilation,
        changedPaths,
        sharedImpact,
        files,
        baseSeeds,
        headSeeds,
        signal,
      ),
    );
  }
  await copySnapshotDependencies(
    files,
    "before",
    baseSeeds,
    (route, activeSignal) => baseAssetReader.read(route, activeSignal),
    signal,
  );
  await copySnapshotDependencies(
    files,
    "after",
    headSeeds,
    async (route, activeSignal) => {
      const generated = compilation.outputs.get(route);
      return generated ?? assetReader.read(route, activeSignal);
    },
    signal,
  );
  signal?.throwIfAborted();
  const result: ReviewResult = {
    baseCommit,
    baseRef,
    changedPaths,
    ignoredImpact: aggregateIgnored(screens),
    schemaVersion: 1,
    screens,
    sharedImpact,
  };
  return { files, result };
}

async function compareScreen(
  base: ManifestScreen | undefined,
  head: ManifestScreen | undefined,
  baseAssetReader: ReviewAssetReader,
  compilation: Compilation,
  changedPaths: readonly string[],
  sharedImpact: readonly string[],
  files: Map<string, ReviewArtifactContent>,
  baseSeeds: Set<string>,
  headSeeds: Set<string>,
  signal?: AbortSignal,
): Promise<ScreenReview> {
  signal?.throwIfAborted();
  const entry = head ?? base;
  if (!entry)
    throw new MokabookError("review-invalid", "comparison route has no screen");
  const viewports: ViewportReview[] = [];
  for (const viewport of ["mobile", "desktop"] as const) {
    signal?.throwIfAborted();
    const baseFragment = base?.fragments[viewport];
    const headFragment = head?.fragments[viewport];
    const before = baseFragment
      ? Buffer.from(await baseAssetReader.read(baseFragment, signal)).toString(
          "utf8",
        )
      : undefined;
    signal?.throwIfAborted();
    const after = headFragment
      ? compilation.outputs.get(headFragment)
      : undefined;
    if (head && after === undefined) {
      throw new MokabookError(
        "review-invalid",
        `head fragment is missing: ${headFragment ?? viewport}`,
      );
    }
    const beforePath = baseFragment
      ? snapshotPath("before", baseFragment)
      : undefined;
    const afterPath = headFragment
      ? snapshotPath("after", headFragment)
      : undefined;
    if (before !== undefined && beforePath && baseFragment) {
      addArtifactFile(files, beforePath, before);
      baseSeeds.add(baseFragment);
    }
    if (after !== undefined && afterPath && headFragment) {
      addArtifactFile(files, afterPath, after);
      headSeeds.add(headFragment);
    }
    viewports.push(
      compareViewport(
        before,
        after,
        entry.route,
        viewport,
        beforePath,
        afterPath,
      ),
    );
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
    state: aggregateState(viewports.map((viewport) => viewport.state)),
    title: entry.title,
    viewports,
  };
}

function compareViewport(
  before: string | undefined,
  after: string | undefined,
  route: string,
  viewport: "desktop" | "mobile",
  beforePath: string | undefined,
  afterPath: string | undefined,
): ViewportReview {
  const context = `${route} (${viewport})`;
  const normalizedBefore =
    before === undefined ? undefined : normalizeSingleDocument(before, context);
  const normalizedAfter =
    after === undefined ? undefined : normalizeSingleDocument(after, context);
  if (before === undefined)
    return {
      ...(afterPath ? { afterPath } : {}),
      ignoredIds: [],
      state: "added",
      viewport,
    };
  if (after === undefined)
    return {
      ...(beforePath ? { beforePath } : {}),
      ignoredIds: [],
      state: "removed",
      viewport,
    };
  const normalized = normalizeReviewPair(before, after, context);
  const normalizedEqual = digest(normalized.base) === digest(normalized.head);
  const rawEqual =
    digest(normalizedBefore ?? "") === digest(normalizedAfter ?? "");
  return {
    ...(afterPath ? { afterPath } : {}),
    ...(beforePath ? { beforePath } : {}),
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

function aggregateIgnored(screens: readonly ScreenReview[]) {
  const counts = new Map<string, number>();
  for (const screen of screens) {
    for (const viewport of screen.viewports) {
      for (const id of viewport.ignoredIds) {
        const key = `${viewport.viewport}:${id}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return [...counts]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => {
      const [viewport, ...id] = key.split(":");
      return {
        count,
        id: id.join(":"),
        viewport: viewport as "desktop" | "mobile",
      };
    });
}

function digest(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}
