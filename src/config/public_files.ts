import fs from "node:fs";

import { isInside } from "./paths.js";
import type { ResolvedConfig } from "./types.js";

/** Return whether a path names a public regular file beneath the output root. */
export function isPublicStaticFile(
  candidate: string,
  config: ResolvedConfig,
): boolean {
  if (
    !isInside(config.mockupsDir, candidate) ||
    isInside(config.entriesDir, candidate) ||
    Boolean(config.legacy && isInside(config.legacy.pagesDir, candidate))
  ) {
    return false;
  }
  try {
    if (!fs.statSync(candidate).isFile()) return false;
    const realRepoRoot = fs.realpathSync(config.repoRoot);
    const realRoot = fs.realpathSync(config.mockupsDir);
    const realCandidate = fs.realpathSync(candidate);
    const sourceRoots = [
      fs.realpathSync(config.entriesDir),
      ...(config.legacy ? [fs.realpathSync(config.legacy.pagesDir)] : []),
    ];
    return (
      isInside(realRepoRoot, realRoot) &&
      isInside(realRoot, realCandidate) &&
      !sourceRoots.some((root) => isInside(root, realCandidate))
    );
  } catch {
    return false;
  }
}
