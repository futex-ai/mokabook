import fs from "node:fs";

import { MokabookError } from "../errors.js";
import { isInside, resolveInside } from "./paths.js";
import { requireString } from "./rules.js";

/** Resolve an optional consumer module and require a regular file. */
export function optionalModule(
  repoRoot: string,
  configDir: string,
  value: string | undefined,
  label: string,
): string | undefined {
  if (value === undefined) return undefined;
  requireString(value, label);
  const resolved = resolveInside(repoRoot, configDir, value, label);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new MokabookError(
      "config-invalid",
      `${label} does not name a file: ${value}`,
    );
  }
  requireRealInside(repoRoot, resolved, label);
  return resolved;
}

/** Require a configured directory to exist. */
export function requireDirectory(value: string, label: string): void {
  if (!fs.existsSync(value) || !fs.statSync(value).isDirectory()) {
    throw new MokabookError(
      "config-invalid",
      `${label} does not name a directory: ${value}`,
    );
  }
}

/** Reject source roots whose ownership cannot be distinguished. */
export function validateSourceRoots(
  repoRoot: string,
  entriesDir: string,
  mockupsDir: string,
  legacyDir?: string,
): void {
  const realEntries = requireRealInside(repoRoot, entriesDir, "entriesDir");
  const realMockups = requireRealInside(repoRoot, mockupsDir, "mockupsDir");
  const realLegacy = legacyDir
    ? requireRealInside(repoRoot, legacyDir, "legacy.pagesDir")
    : undefined;
  if (entriesDir === mockupsDir || legacyDir === mockupsDir) {
    throw new MokabookError(
      "config-invalid",
      "authored source directories must not equal mockupsDir",
    );
  }
  if (
    legacyDir &&
    (legacyDir === entriesDir ||
      isInside(legacyDir, entriesDir) ||
      isInside(entriesDir, legacyDir))
  ) {
    throw new MokabookError(
      "config-invalid",
      "entriesDir and legacy.pagesDir must not overlap",
    );
  }
  if (realEntries === realMockups || realLegacy === realMockups) {
    throw new MokabookError(
      "config-invalid",
      "authored source directories must not equal mockupsDir through symlinks",
    );
  }
  if (
    realLegacy &&
    (realLegacy === realEntries ||
      isInside(realLegacy, realEntries) ||
      isInside(realEntries, realLegacy))
  ) {
    throw new MokabookError(
      "config-invalid",
      "entriesDir and legacy.pagesDir must not overlap through symlinks",
    );
  }
}

function requireRealInside(
  repoRoot: string,
  candidate: string,
  label: string,
): string {
  const realRepoRoot = fs.realpathSync(repoRoot);
  const realCandidate = fs.realpathSync(candidate);
  if (!isInside(realRepoRoot, realCandidate)) {
    throw new MokabookError(
      "config-invalid",
      `${label} resolves outside repoRoot through a symlink`,
    );
  }
  return realCandidate;
}
