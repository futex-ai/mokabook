import fs from "node:fs";
import path from "node:path";

import {
  isInside,
  isSafeRepositoryPath,
  projectRealPath,
} from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError, errorMessage } from "../errors.js";

/** Reject generated routes that escape output or target authored source trees. */
export function validateGeneratedOutputPaths(
  routes: Iterable<string>,
  config: ResolvedConfig,
): void {
  const authoredRoots = [
    config.entriesDir,
    ...(config.legacy ? [config.legacy.pagesDir] : []),
  ];
  const realRepoRoot = fs.realpathSync(config.repoRoot);
  const realMockupsRoot = fs.realpathSync(config.mockupsDir);
  const realAuthoredRoots = authoredRoots.map((root) => fs.realpathSync(root));
  if (!isInside(realRepoRoot, realMockupsRoot)) {
    throw new MokabookError(
      "build-invalid",
      "mockupsDir resolves outside repoRoot through a symlink",
    );
  }
  for (const route of routes) {
    if (!isSafeRepositoryPath(route)) {
      throw new MokabookError(
        "build-invalid",
        `generated route is unsafe: ${route}`,
      );
    }
    const target = path.resolve(config.mockupsDir, route);
    let projectedTarget: string;
    try {
      projectedTarget = projectRealPath(target);
    } catch (error) {
      throw new MokabookError(
        "build-invalid",
        `could not validate generated route ${route}: ${errorMessage(error)}`,
        { cause: error },
      );
    }
    if (!isInside(config.mockupsDir, target)) {
      throw new MokabookError(
        "build-invalid",
        `generated route escapes mockupsDir: ${route}`,
      );
    }
    if (
      authoredRoots.some((root) => isInside(root, target)) ||
      realAuthoredRoots.some((root) => isInside(root, projectedTarget))
    ) {
      throw new MokabookError(
        "build-invalid",
        `generated route overlaps authored source root: ${route}`,
      );
    }
    if (!isInside(realMockupsRoot, projectedTarget)) {
      throw new MokabookError(
        "build-invalid",
        `generated route escapes mockupsDir: ${route}`,
      );
    }
  }
}
