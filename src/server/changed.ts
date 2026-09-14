/** Optional changed-route detection powering the Browse changed/all filter. */
import { projectRealPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MoklyError } from "../errors.js";
import {
  removedManifestEntries,
  type CatalogueChangeSnapshot,
} from "../registry/changes.js";
import { readManifest } from "../registry/manifest.js";
import type { ManifestV5 } from "../registry/types.js";
import type { GitClient } from "../review/git.js";
import { NodeGitCommandRunner, RepositoryGitClient } from "../review/git.js";
import {
  readCatalogueChanges,
  type ComponentChangeSnapshot,
} from "./component_changes.js";

/** Impact and ownership evidence resolved together from one baseline. */
export interface ResolvedCatalogueChanges extends CatalogueChangeSnapshot {
  componentChanges?: ComponentChangeSnapshot;
}

/** Compute routes affected since the base branch point, if available. */
export async function computeChangedRoutes(
  config: ResolvedConfig,
  base: string,
  git?: GitClient,
): Promise<readonly string[] | undefined> {
  try {
    return (await computeCatalogueChanges(config, base, git)).changedRoutes;
  } catch {
    return undefined;
  }
}

/** Resolve one generation; explicit review callers retain failures instead of empty changes. */
export async function computeCatalogueChanges(
  config: ResolvedConfig,
  base: string,
  git?: GitClient,
  manifest: ManifestV5 = readManifest(config),
): Promise<ResolvedCatalogueChanges> {
  let client = git;
  if (!client) {
    const runner = new NodeGitCommandRunner(config.repoRoot);
    const toplevel = (
      await runner.run(["rev-parse", "--show-toplevel"])
    ).trim();
    if (projectRealPath(toplevel) !== projectRealPath(config.repoRoot))
      throw new MoklyError(
        "git-failed",
        "catalogue is not the root of a Git repository",
      );
    client = new RepositoryGitClient(runner);
  }
  const commit = await client.mergeBase(base, "HEAD");
  const componentChanges = await readCatalogueChanges(
    config,
    manifest,
    base,
    client,
    commit,
  );
  const { baseline, changedRoutes } = componentChanges;
  const removedEntries = removedManifestEntries(manifest, baseline);
  return {
    schemaVersion: 1,
    componentChanges,
    baseRef: base,
    baseCommit: commit,
    removedEntries,
    changedRoutes: [
      ...new Set([
        ...(changedRoutes ?? []),
        ...removedEntries.map(({ entry }) => entry.route),
      ]),
    ].sort(),
  };
}
