import path from "node:path";

import { isReservedSource } from "../build/source_inventory.js";
import {
  isInside,
  isSafeRepositoryPath,
  projectRealPath,
} from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import {
  FORMER_MANIFEST_NAME,
  LEGACY_MANIFEST_NAME,
  MANIFEST_NAME,
} from "../registry/manifest.js";
import { exportError } from "./error.js";

const PRIVATE_DIRECTORIES = new Set([
  "node_modules",
  "target",
  "dist",
  "coverage",
  "test-results",
  "playwright-report",
]);

/** Public names cannot identify private modules, hidden paths, or cache trees. */
export function isExportPublicName(
  name: string,
  options: { allowBuildDirectories?: boolean } = {},
): boolean {
  return (
    isSafeRepositoryPath(name) &&
    !isReservedSource(name) &&
    name !== MANIFEST_NAME &&
    name !== FORMER_MANIFEST_NAME &&
    name !== LEGACY_MANIFEST_NAME &&
    !name
      .split("/")
      .some(
        (part) =>
          part.startsWith(".") ||
          (!options.allowBuildDirectories && PRIVATE_DIRECTORIES.has(part)),
      ) &&
    !/\.(?:[cm]?[jt]sx?|map)$/i.test(name)
  );
}

/** The same private-file boundary applies to current and historical resources. */
export function exportResourcePolicy(
  config: ResolvedConfig,
): (name: string) => boolean {
  const mockups = projectRealPath(config.mockupsDir);
  const packages = config.moduleResolution.packageRoots.map(projectRealPath);
  if (packages.includes(mockups))
    throw exportError(
      "A consumer package root must not equal mockupsDir; choose a separate public output directory.",
    );
  const roots = [
    config.entriesDir,
    config.review.outDir,
    ...packages.filter((root) => isInside(mockups, root)),
  ].flatMap((root) => [root, projectRealPath(root)]);
  const files = [
    config.configPath,
    config.renderer,
    config.compatibility.transformer,
    ...(config.sourceFiles ?? []).map((name) =>
      path.resolve(config.repoRoot, name),
    ),
  ].flatMap((file) => (file ? [file, projectRealPath(file)] : []));
  return (name) => {
    if (!isExportPublicName(name)) return false;
    const candidates = [
      path.resolve(config.mockupsDir, name),
      path.resolve(mockups, name),
    ];
    return !candidates.some(
      (candidate) =>
        files.includes(candidate) ||
        roots.some((root) => isInside(root, candidate)),
    );
  };
}
