/** Optional changed-route detection powering the Browse changed/all filter. */

import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { projectRealPath, toPosixPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { dependencyContainsChangedPath } from "../registry/dependency_paths.js";
import { readManifest } from "../registry/manifest.js";
import type { ManifestEntry, ManifestV3 } from "../registry/types.js";
import { readBaseManifest } from "../review/base_manifest.js";
import { reviewChangedPaths } from "../review/changed_paths.js";
import type { GitClient } from "../review/git.js";
import { NodeGitCommandRunner, RepositoryGitClient } from "../review/git.js";

/** Compute routes affected against the base, or undefined when unavailable. */
export async function computeChangedRoutes(
  config: ResolvedConfig,
  base: string,
  git?: GitClient,
): Promise<readonly string[] | undefined> {
  try {
    let client = git;
    if (!client) {
      const runner = new NodeGitCommandRunner(config.repoRoot);
      const toplevel = (
        await runner.run(["rev-parse", "--show-toplevel"])
      ).trim();
      if (projectRealPath(toplevel) !== projectRealPath(config.repoRoot))
        return undefined;
      client = new RepositoryGitClient(runner);
    }
    const commit = await client.resolveRef(base);
    const changed = await reviewChangedPaths(
      client,
      commit,
      config,
      config.review.outDir,
    );
    const manifest = readManifest(config);
    const baseManifest = await readBaseManifest(client, commit, config);
    return changedManifestRoutes(manifest, baseManifest, config, changed);
  } catch {
    return undefined;
  }
}

/** Match manifest entries against repository-relative changed paths. */
export function changedManifestRoutes(
  manifest: ManifestV3,
  baseManifest: ManifestV3,
  config: ResolvedConfig,
  changedPaths: readonly string[],
): readonly string[] {
  const mockupsPrefix = toPosixPath(
    path.relative(config.repoRoot, config.mockupsDir),
  );
  const routes = new Set<string>();
  const changedScreenIds = new Set<string>();
  const baseEntries = new Map(
    baseManifest.entries.map((entry) => [entry.id, entry]),
  );
  for (const entry of manifest.entries) {
    if (entry.kind === "collection") continue;
    const baseEntry = baseEntries.get(entry.id);
    const candidates = changedPathCandidates(entry, baseEntry, mockupsPrefix);
    if (
      isDeepStrictEqual(entry, baseEntry) &&
      !candidates.some((candidate) =>
        changedPaths.some((changedPath) =>
          dependencyContainsChangedPath(candidate, changedPath),
        ),
      )
    ) {
      continue;
    }
    routes.add(entry.route);
    if (entry.kind === "screen") changedScreenIds.add(entry.id);
  }
  for (const entry of manifest.entries) {
    if (
      entry.kind === "use-case" &&
      entry.steps.some((step) => changedScreenIds.has(step.screenId))
    ) {
      routes.add(entry.route);
    }
  }
  return [...routes].sort();
}

function changedPathCandidates(
  entry: ManifestEntry,
  baseEntry: ManifestEntry | undefined,
  mockupsPrefix: string,
): string[] {
  const candidates = [
    ...declaredDependencies(entry),
    ...(baseEntry ? declaredDependencies(baseEntry) : []),
  ];
  for (const candidate of [entry, baseEntry]) {
    if (candidate?.kind !== "screen") continue;
    candidates.push(
      `${mockupsPrefix}/${candidate.fragments.mobile}`,
      `${mockupsPrefix}/${candidate.fragments.desktop}`,
    );
  }
  return [...new Set(candidates)];
}

function declaredDependencies(entry: ManifestEntry): readonly string[] {
  return entry.dependencies.filter(
    (dependency) => dependency !== entry.sourcePath,
  );
}
