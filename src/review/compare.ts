import crypto from "node:crypto";
import path from "node:path";

import { minimatch } from "minimatch";

import type { Compilation } from "../build/compile.js";
import type { ResolvedConfig } from "../config/types.js";
import { toPosixPath } from "../config/paths.js";
import { MokabookError } from "../errors.js";
import { MANIFEST_NAME, parseManifest } from "../registry/manifest.js";
import type { ManifestScreen, ManifestV3 } from "../registry/types.js";
import type { GitClient } from "./git.js";
import { normalizeReviewPair, normalizeSingleDocument } from "./ignore.js";
import type {
  ReviewArtifact,
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
): Promise<ReviewArtifact> {
  const baseCommit = await git.resolveRef(baseRef);
  const baseManifest = await readBaseManifest(git, baseCommit, config);
  const changedPaths = await git.changedPaths(baseCommit);
  const mockupsPrefix = toPosixPath(
    path.relative(config.repoRoot, config.mockupsDir),
  );
  const files = new Map<string, string>();
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
    const base = baseByRoute.get(route);
    const head = headByRoute.get(route);
    screens.push(
      await compareScreen(
        base,
        head,
        baseCommit,
        mockupsPrefix,
        compilation,
        changedPaths,
        sharedImpact,
        git,
        files,
      ),
    );
  }
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
  commit: string,
  mockupsPrefix: string,
  compilation: Compilation,
  changedPaths: readonly string[],
  sharedImpact: readonly string[],
  git: GitClient,
  files: Map<string, string>,
): Promise<ScreenReview> {
  const entry = head ?? base;
  if (!entry)
    throw new MokabookError("review-invalid", "comparison route has no screen");
  const viewports: ViewportReview[] = [];
  for (const viewport of ["mobile", "desktop"] as const) {
    const before = base
      ? await git.readFile(
          commit,
          joinGit(mockupsPrefix, base.fragments[viewport]),
        )
      : undefined;
    const after = head
      ? compilation.outputs.get(head.fragments[viewport])
      : undefined;
    if (head && after === undefined) {
      throw new MokabookError(
        "review-invalid",
        `head fragment is missing: ${head.fragments[viewport]}`,
      );
    }
    const stem = artifactStem(entry.route, viewport);
    if (before !== undefined) files.set(`${stem}/before.html`, before);
    if (after !== undefined) files.set(`${stem}/after.html`, after);
    viewports.push(compareViewport(before, after, entry.route, viewport, stem));
  }
  const dependencies = [
    ...new Set([...(base?.dependencies ?? []), ...(head?.dependencies ?? [])]),
  ].sort();
  const dependencyImpact = dependencies.filter((dependency) =>
    changedPaths.includes(dependency),
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
  stem: string,
): ViewportReview {
  if (before === undefined)
    return {
      afterPath: `${stem}/after.html`,
      ignoredIds: [],
      state: "added",
      viewport,
    };
  if (after === undefined)
    return {
      beforePath: `${stem}/before.html`,
      ignoredIds: [],
      state: "removed",
      viewport,
    };
  const normalized = normalizeReviewPair(
    before,
    after,
    `${route} (${viewport})`,
  );
  const normalizedEqual = digest(normalized.base) === digest(normalized.head);
  const rawEqual =
    digest(normalizeSingleDocument(before, route)) ===
    digest(normalizeSingleDocument(after, route));
  return {
    afterPath: `${stem}/after.html`,
    beforePath: `${stem}/before.html`,
    ignoredIds: normalized.ignoredIds,
    state: rawEqual
      ? "unchanged"
      : normalizedEqual
        ? "ignored-only"
        : "changed",
    viewport,
  };
}

async function readBaseManifest(
  git: GitClient,
  commit: string,
  config: ResolvedConfig,
): Promise<ManifestV3> {
  const prefix = toPosixPath(path.relative(config.repoRoot, config.mockupsDir));
  try {
    return parseManifest(
      JSON.parse(await git.readFile(commit, joinGit(prefix, MANIFEST_NAME))),
      false,
    );
  } catch (error) {
    if (!config.compatibility.readManifestV2) throw error;
    return parseManifest(
      JSON.parse(
        await git.readFile(commit, joinGit(prefix, "mockbook-manifest.json")),
      ),
      true,
    );
  }
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

function artifactStem(route: string, viewport: string): string {
  return `screens/${route.replace(/\.html$/, "").replace(/[^a-zA-Z0-9/_-]/g, "-")}/${viewport}`;
}

function joinGit(prefix: string, route: string): string {
  return prefix === "" ? route : `${prefix}/${route}`;
}

function digest(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}
