import fs from "node:fs";

import { MokabookError, type MokabookErrorCode } from "../errors.js";
import { isInside, projectRealPath, resolveInside } from "./paths.js";
import { requireString } from "./rules.js";

interface ReviewOutBoundary {
  entriesDir: string;
  legacy?: { pagesDir: string };
  mockupsDir: string;
  repoRoot: string;
}

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

/** Keep destructive Review replacement away from source and output roots. */
export function validateReviewOut(
  reviewOut: string,
  boundary: ReviewOutBoundary,
  label = "review.outDir",
  code: MokabookErrorCode = "config-invalid",
): void {
  const { entriesDir, mockupsDir, repoRoot } = boundary;
  const legacyDir = boundary.legacy?.pagesDir;
  const protectedRoots = [
    mockupsDir,
    entriesDir,
    ...(legacyDir ? [legacyDir] : []),
  ];
  const realRepoRoot = fs.realpathSync(repoRoot);
  const realReviewOut = projectRealPath(reviewOut);
  const realProtectedRoots = protectedRoots.map((root) =>
    fs.realpathSync(root),
  );
  if (
    reviewOut === repoRoot ||
    !isInside(repoRoot, reviewOut) ||
    !isInside(realRepoRoot, realReviewOut) ||
    protectedRoots.some(
      (root) =>
        reviewOut === root ||
        isInside(reviewOut, root) ||
        isInside(root, reviewOut),
    ) ||
    realProtectedRoots.some(
      (root) =>
        realReviewOut === root ||
        isInside(realReviewOut, root) ||
        isInside(root, realReviewOut),
    )
  ) {
    if (!isInside(realRepoRoot, realReviewOut)) {
      throw new MokabookError(
        code,
        `${label} resolves outside repoRoot through a symlink`,
      );
    }
    throw new MokabookError(
      code,
      `${label} must not overlap repository, mockup, or source roots`,
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
