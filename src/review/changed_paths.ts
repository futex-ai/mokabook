import fs from "node:fs";
import path from "node:path";

import {
  isSafeRepositoryPath,
  projectRealPath,
  toPosixPath,
} from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError } from "../errors.js";
import type { GitClient } from "./git.js";

/** Collect deterministic changes while excluding the active artifact tree. */
export async function reviewChangedPaths(
  git: GitClient,
  commit: string,
  config: ResolvedConfig,
  outDir: string,
): Promise<readonly string[]> {
  const excludedPaths = outputPaths(config.repoRoot, outDir);
  const changed = await git.changedPaths(commit, excludedPaths);
  return [...new Set(changed)]
    .filter(
      (candidate) =>
        !excludedPaths.some((excluded) => pathBelongsTo(candidate, excluded)),
    )
    .sort();
}

function outputPaths(repoRoot: string, outDir: string): string[] {
  const paths = [
    toPosixPath(path.relative(repoRoot, outDir)),
    toPosixPath(
      path.relative(fs.realpathSync(repoRoot), projectRealPath(outDir)),
    ),
  ];
  for (const candidate of paths) {
    if (!isSafeRepositoryPath(candidate)) {
      throw new MokabookError(
        "review-invalid",
        `Review output is not repository-relative: ${candidate}`,
      );
    }
  }
  return [...new Set(paths)].sort();
}

function pathBelongsTo(candidate: string, root: string): boolean {
  return candidate === root || candidate.startsWith(`${root}/`);
}
