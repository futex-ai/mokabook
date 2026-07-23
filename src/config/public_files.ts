import fs from "node:fs";
import path from "node:path";

import { isInside, toPosixPath } from "./paths.js";
import type { ResolvedConfig } from "./types.js";

interface PublicStaticIdentity {
  device: number;
  inode: number;
  route: string;
  sourcePath: string;
}

/** One public static file read from its validated filesystem identity. */
export interface PublicStaticFile {
  content: Buffer;
  route: string;
  sourcePath: string;
}

/** Return whether a path names a public non-symlink file beneath the output root. */
export function isPublicStaticFile(
  candidate: string,
  config: ResolvedConfig,
): boolean {
  return resolvePublicStaticFile(candidate, config) !== undefined;
}

/** Read one public file through the same identity that passed validation. */
export function readPublicStaticFile(
  candidate: string,
  config: ResolvedConfig,
): PublicStaticFile | undefined {
  const identity = resolvePublicStaticFile(candidate, config);
  if (!identity) return undefined;
  let handle: number | undefined;
  try {
    const noFollow = fs.constants.O_NOFOLLOW ?? 0;
    handle = fs.openSync(identity.sourcePath, fs.constants.O_RDONLY | noFollow);
    const opened = fs.fstatSync(handle);
    if (
      !opened.isFile() ||
      opened.dev !== identity.device ||
      opened.ino !== identity.inode
    ) {
      return undefined;
    }
    return {
      content: fs.readFileSync(handle),
      route: identity.route,
      sourcePath: identity.sourcePath,
    };
  } catch {
    return undefined;
  } finally {
    if (handle !== undefined) fs.closeSync(handle);
  }
}

/** List public files in stable route order without traversing symlinks. */
export function listPublicStaticFiles(
  config: ResolvedConfig,
): PublicStaticFile[] {
  const candidates: string[] = [];
  const pending = [config.mockupsDir];
  while (pending.length > 0) {
    const directory = pending.pop();
    if (!directory) continue;
    const entries = fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => right.name.localeCompare(left.name));
    for (const entry of entries) {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) pending.push(candidate);
      else if (entry.isFile()) candidates.push(candidate);
    }
  }
  return candidates
    .flatMap((candidate) => {
      const file = readPublicStaticFile(candidate, config);
      return file ? [file] : [];
    })
    .sort((left, right) => left.route.localeCompare(right.route));
}

function resolvePublicStaticFile(
  candidate: string,
  config: ResolvedConfig,
): PublicStaticIdentity | undefined {
  if (
    !isInside(config.mockupsDir, candidate) ||
    isInside(config.entriesDir, candidate) ||
    Boolean(config.legacy && isInside(config.legacy.pagesDir, candidate))
  ) {
    return undefined;
  }
  try {
    if (!fs.lstatSync(candidate).isFile()) return undefined;
    const relative = path.relative(config.mockupsDir, candidate);
    const realRepoRoot = fs.realpathSync(config.repoRoot);
    const realRoot = fs.realpathSync(config.mockupsDir);
    const realCandidate = fs.realpathSync(candidate);
    const expectedCandidate = path.resolve(realRoot, relative);
    const sourceRoots = [
      fs.realpathSync(config.entriesDir),
      ...(config.legacy ? [fs.realpathSync(config.legacy.pagesDir)] : []),
    ];
    const stats = fs.statSync(realCandidate);
    if (
      !isInside(realRepoRoot, realRoot) ||
      !isInside(realRoot, realCandidate) ||
      realCandidate !== expectedCandidate ||
      sourceRoots.some((root) => isInside(root, realCandidate)) ||
      !stats.isFile()
    ) {
      return undefined;
    }
    return {
      device: stats.dev,
      inode: stats.ino,
      route: toPosixPath(relative),
      sourcePath: realCandidate,
    };
  } catch {
    return undefined;
  }
}
