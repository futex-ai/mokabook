import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Metafile } from "esbuild";
import { minimatch } from "minimatch";

import { locatePath } from "../config/file_locations.js";
import {
  isInside,
  isSafeRepositoryPath,
  projectRealPath,
  toPosixPath,
} from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MoklyError } from "../errors.js";

/** Names reserved for authoring, including stale helpers no longer imported. */
function isReservedSource(candidate: string): boolean {
  return /\.source\.(?:html?|[cm]?[jt]sx?)$/i.test(candidate);
}

interface SourceIndex {
  inventory: readonly string[] | undefined;
  files: Set<string>;
  aliases: string[];
}
const sourceIndexes = new WeakMap<ResolvedConfig, SourceIndex>();
const logicalSourceIndexes = new WeakMap<
  readonly string[],
  ReadonlySet<string>
>();

/**
 * Shared public source policy. Historical readers use no filesystem aliases;
 * Changes resolves exclusion aliases but leaves retargeted source aliases and
 * unresolvable change paths for resource validation.
 */
export function isAuthoringSource(
  candidate: string,
  config: ResolvedConfig,
  aliases: "all" | "exclusions" | "none" = "all",
): boolean {
  if (
    isInside(config.entriesDir, candidate) ||
    isReservedSource(candidate) ||
    (aliases !== "all" && isListedSource(candidate, config)) ||
    matchesPublicExclusion(candidate, config.mockupsDir, config.publicExclude)
  )
    return true;
  if (aliases === "none") return false;
  let real: string;
  try {
    real = projectRealPath(candidate);
  } catch (error) {
    if (aliases === "exclusions") return false;
    throw error;
  }
  if (
    matchesPublicExclusion(
      real,
      projectRealPath(config.mockupsDir),
      config.publicExclude,
    )
  )
    return true;
  if (aliases === "exclusions") return false;
  if (
    isInside(projectRealPath(config.entriesDir), real) ||
    isReservedSource(real)
  )
    return true;
  let index = sourceIndexes.get(config);
  if (!index || index.inventory !== config.sourceFiles) {
    const files = new Set<string>();
    const aliases: string[] = [];
    for (const source of config.sourceFiles ?? []) {
      const logical = path.resolve(config.repoRoot, source);
      const physical = projectRealPath(logical);
      files.add(logical);
      files.add(physical);
      if (logical !== physical) aliases.push(logical);
    }
    index = { inventory: config.sourceFiles, files, aliases };
    sourceIndexes.set(config, index);
  }
  return (
    index.files.has(candidate) ||
    index.files.has(real) ||
    index.aliases.some((alias) => projectRealPath(alias) === real)
  );
}

function isListedSource(candidate: string, config: ResolvedConfig): boolean {
  const inventory = config.sourceFiles;
  if (!inventory) return false;
  let files = logicalSourceIndexes.get(inventory);
  if (!files) {
    files = new Set(inventory);
    logicalSourceIndexes.set(inventory, files);
  }
  return files.has(toPosixPath(path.relative(config.repoRoot, candidate)));
}

function matchesPublicExclusion(
  candidate: string,
  root: string,
  globs: readonly string[],
): boolean {
  if (!isInside(root, candidate)) return false;
  const relative = toPosixPath(path.relative(root, candidate));
  return globs.some((glob) =>
    minimatch(relative, glob, { nocase: true, dot: true }),
  );
}

/** Record actual graph inputs before tree shaking, including both path aliases. */
export function graphSourceFiles(
  metafile: Metafile,
  workingDir: string,
  repoRoot: string,
): string[] {
  const runtime = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
  const candidates = Object.keys(metafile.inputs).flatMap((input) => {
    const absolute = path.resolve(workingDir, input);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return [];
    const real = fs.realpathSync(absolute);
    if (isInside(runtime, real)) return [];
    if (real.split(path.sep).includes("node_modules")) return [];
    return [absolute];
  });
  return normalizeSourceFiles(candidates, repoRoot);
}

/** Prove regular in-repository inputs and retain logical and physical identities. */
export function normalizeSourceFiles(
  files: readonly string[],
  repoRoot: string,
): string[] {
  const inventory = new Set<string>();
  for (const file of files) {
    const absolute = path.resolve(repoRoot, file);
    const location = locatePath(absolute, repoRoot);
    if (!location || !fs.statSync(location.physicalPath).isFile())
      throw new MoklyError(
        "build-invalid",
        `authoring input must be a regular file inside repoRoot: ${file}`,
      );
    for (const relative of [
      location.relativePath,
      location.physicalRelativePath,
    ]) {
      if (!isSafeRepositoryPath(relative))
        throw new MoklyError(
          "build-invalid",
          `invalid source input: ${relative}`,
        );
      inventory.add(relative);
    }
  }
  return [...inventory].sort();
}
