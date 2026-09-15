import fs from "node:fs";
import path from "node:path";

import { isAuthoringSource } from "../build/source_inventory.js";
import {
  FORMER_MANIFEST_NAME,
  LEGACY_MANIFEST_NAME,
  MANIFEST_NAME,
} from "../registry/manifest.js";

import { isBaselineCachePath } from "./cache_paths.js";
import { locatePath, type FileLocation } from "./file_locations.js";
import { projectRealPath } from "./paths.js";
import type { ResolvedConfig } from "./types.js";

/** Catalogue manifests are internal even when requested through another path. */
export function isInternalCatalogueFile(
  candidate: string,
  config: ResolvedConfig,
  resolveAliases = true,
): boolean {
  const internal = [
    MANIFEST_NAME,
    FORMER_MANIFEST_NAME,
    LEGACY_MANIFEST_NAME,
  ].map((name) => path.join(config.mockupsDir, name));
  if (internal.includes(candidate)) return true;
  if (!resolveAliases) return false;
  const realCandidate = projectRealPath(candidate);
  return internal.some(
    (file) => fs.existsSync(file) && realCandidate === fs.realpathSync(file),
  );
}

/** Shared denial policy; historical readers disable current filesystem aliases. */
export function isPrivateStaticPath(
  candidate: string,
  config: ResolvedConfig,
  resolveAliases = true,
): boolean {
  return (
    isBaselineCachePath(candidate, config.repoRoot, resolveAliases) ||
    isInternalCatalogueFile(candidate, config, resolveAliases) ||
    isAuthoringSource(candidate, config, resolveAliases ? "all" : "none")
  );
}

/** Locate a public path, retaining confined missing paths for deletion handling. */
export function publicPathLocation(
  candidate: string,
  config: ResolvedConfig,
): FileLocation | undefined {
  try {
    const location = locatePath(candidate, config.mockupsDir, config.repoRoot);
    if (!location || isPrivateStaticPath(location.logicalPath, config)) return;
    return location;
  } catch {
    return;
  }
}

/** Locate a public regular file for readers that must use its validated target. */
export function publicFileLocation(
  candidate: string,
  config: ResolvedConfig,
): FileLocation | undefined {
  const location = publicPathLocation(candidate, config);
  try {
    if (location && fs.statSync(location.physicalPath).isFile())
      return location;
  } catch {
    return;
  }
}

/** Return whether a path names a public regular file beneath the output root. */
export function isPublicStaticFile(
  candidate: string,
  config: ResolvedConfig,
): boolean {
  return publicFileLocation(candidate, config) !== undefined;
}
