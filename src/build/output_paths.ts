import fs from "node:fs";
import path from "node:path";

import {
  isInside,
  isSafeCatalogueRoute,
  projectRealPath,
} from "../config/paths.js";
import { isInternalCatalogueFile } from "../config/public_files.js";
import type { ResolvedConfig } from "../config/types.js";
import { MoklyError, errorMessage } from "../errors.js";
import { MANIFEST_NAME } from "../registry/manifest.js";

import { isAuthoringSource } from "./source_inventory.js";

/** Reject generated routes that escape output or target authored source trees. */
export function validateGeneratedOutputPaths(
  routes: Iterable<string>,
  config: ResolvedConfig,
): void {
  const authoredRoots = [config.entriesDir];
  const realRepoRoot = fs.realpathSync(config.repoRoot);
  const realMockupsRoot = projectRealPath(config.mockupsDir);
  const realAuthoredRoots = authoredRoots.map((root) => fs.realpathSync(root));
  if (!isInside(realRepoRoot, realMockupsRoot)) {
    throw new MoklyError(
      "build-invalid",
      "mockupsDir resolves outside repoRoot through a symlink",
    );
  }
  for (const route of routes) {
    if (route !== MANIFEST_NAME && !isSafeCatalogueRoute(route)) {
      throw new MoklyError(
        "build-invalid",
        `generated route is unsafe: ${route}`,
      );
    }
    const target = path.resolve(config.mockupsDir, route);
    let projectedTarget: string;
    try {
      projectedTarget = projectRealPath(target);
    } catch (error) {
      throw new MoklyError(
        "build-invalid",
        `could not validate generated route ${route}: ${errorMessage(error)}`,
        { cause: error },
      );
    }
    if (!isInside(config.mockupsDir, target)) {
      throw new MoklyError(
        "build-invalid",
        `generated route escapes mockupsDir: ${route}`,
      );
    }
    if (
      (route !== MANIFEST_NAME && isInternalCatalogueFile(target, config)) ||
      isAuthoringSource(
        target,
        route === MANIFEST_NAME ? { ...config, publicExclude: [] } : config,
      ) ||
      authoredRoots.some((root) => isInside(root, target)) ||
      realAuthoredRoots.some((root) => isInside(root, projectedTarget))
    ) {
      throw new MoklyError(
        "build-invalid",
        `generated route overlaps authored source root: ${route}`,
      );
    }
    if (!isInside(realMockupsRoot, projectedTarget)) {
      throw new MoklyError(
        "build-invalid",
        `generated route escapes mockupsDir: ${route}`,
      );
    }
  }
}
