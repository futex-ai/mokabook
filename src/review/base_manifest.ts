import path from "node:path";

import { toPosixPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MANIFEST_NAME, parseManifest } from "../registry/manifest.js";
import type { ManifestV3 } from "../registry/types.js";
import type { GitClient } from "./git.js";

/** Read the canonical base manifest, falling back only when it is absent. */
export async function readBaseManifest(
  git: GitClient,
  commit: string,
  config: ResolvedConfig,
): Promise<ManifestV3> {
  const prefix = toPosixPath(path.relative(config.repoRoot, config.mockupsDir));
  const canonicalPath = joinGit(prefix, MANIFEST_NAME);
  if (await git.fileExists(commit, canonicalPath)) {
    return parseManifest(
      JSON.parse(await git.readFile(commit, canonicalPath)),
      false,
    );
  }
  if (!config.compatibility.readManifestV2) {
    return parseManifest(
      JSON.parse(await git.readFile(commit, canonicalPath)),
      false,
    );
  }
  return parseManifest(
    JSON.parse(
      await git.readFile(commit, joinGit(prefix, "mockbook-manifest.json")),
    ),
    true,
  );
}

function joinGit(prefix: string, route: string): string {
  return prefix === "" ? route : `${prefix}/${route}`;
}
