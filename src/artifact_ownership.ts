/** Shared ownership contract for generated Review and preview directories. */

import fs from "node:fs";
import path from "node:path";

interface DirectoryIdentity {
  readonly device: number;
  readonly inode: number;
}

/** Inputs for safely replacing one marker-owned generated directory. */
export interface OwnedDirectoryReplacement {
  /** Prefix for a private sibling directory that holds the previous output. */
  readonly backupPrefix: string;
  /** Marker filename proving that an existing output belongs to Mokabook. */
  readonly markerName: string;
  /** Final generated directory to install. */
  readonly output: string;
  /** Error text used when ownership cannot be proven. */
  readonly ownershipError: string;
  /** Fully generated sibling directory ready to install. */
  readonly stage: string;
}

/** Exact content proving that a generated artifact uses the current contract. */
export const ARTIFACT_MARKER_CONTENT = "schemaVersion=1\n";

/** Ownership marker written into repository preview artifacts. */
export const PREVIEW_ARTIFACT_MARKER = ".mokabook-preview-artifact";

/** Ownership marker written into Review artifacts. */
export const REVIEW_ARTIFACT_MARKER = ".mokabook-review-artifact";

/** Return whether a directory contains an exact, regular ownership marker. */
export function hasArtifactOwnershipMarker(
  directory: string,
  markerName: string,
): boolean {
  const marker = path.join(directory, markerName);
  let handle: number | undefined;
  try {
    const expected = fs.lstatSync(marker);
    if (!expected.isFile()) return false;
    const noFollow = fs.constants.O_NOFOLLOW ?? 0;
    handle = fs.openSync(marker, fs.constants.O_RDONLY | noFollow);
    const opened = fs.fstatSync(handle);
    if (
      !opened.isFile() ||
      opened.dev !== expected.dev ||
      opened.ino !== expected.ino
    ) {
      return false;
    }
    return fs.readFileSync(handle).toString("utf8") === ARTIFACT_MARKER_CONTENT;
  } catch {
    return false;
  } finally {
    if (handle !== undefined) fs.closeSync(handle);
  }
}

/** Replace an existing owned directory without deleting a raced-in directory. */
export async function replaceOwnedDirectory({
  backupPrefix,
  markerName,
  output,
  ownershipError,
  stage,
}: OwnedDirectoryReplacement): Promise<void> {
  const expected = ownedDirectoryIdentity(output, markerName, ownershipError);
  if (!expected) {
    await fs.promises.rename(stage, output);
    return;
  }

  const backupRoot = await fs.promises.mkdtemp(
    path.join(path.dirname(output), backupPrefix),
  );
  const backup = path.join(backupRoot, "artifact");
  let moved = false;
  try {
    await fs.promises.rename(output, backup);
    moved = true;
    assertMovedDirectory(backup, markerName, ownershipError, expected);
    await fs.promises.rename(stage, output);
  } catch (error) {
    if (moved) {
      await restoreMovedDirectory(backup, output, backupRoot, error);
    } else {
      await fs.promises.rmdir(backupRoot);
    }
    throw error;
  }

  try {
    assertMovedDirectory(backup, markerName, ownershipError, expected);
  } catch (error) {
    throw preservedBackupError(backup, error);
  }
  await fs.promises.rm(backup, { recursive: true });
  await fs.promises.rmdir(backupRoot);
}

function ownedDirectoryIdentity(
  directory: string,
  markerName: string,
  ownershipError: string,
): DirectoryIdentity | undefined {
  let stats: fs.Stats;
  try {
    stats = fs.lstatSync(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  if (
    !stats.isDirectory() ||
    !hasArtifactOwnershipMarker(directory, markerName)
  ) {
    throw new Error(ownershipError);
  }
  return { device: stats.dev, inode: stats.ino };
}

function assertMovedDirectory(
  directory: string,
  markerName: string,
  ownershipError: string,
  expected: DirectoryIdentity,
): void {
  const actual = ownedDirectoryIdentity(directory, markerName, ownershipError);
  if (
    !actual ||
    actual.device !== expected.device ||
    actual.inode !== expected.inode
  ) {
    throw new Error(ownershipError);
  }
}

async function restoreMovedDirectory(
  backup: string,
  output: string,
  backupRoot: string,
  cause: unknown,
): Promise<void> {
  if (pathExists(output)) {
    throw preservedBackupError(backup, cause);
  }
  try {
    await fs.promises.rename(backup, output);
  } catch {
    throw preservedBackupError(backup, cause);
  }
  await fs.promises.rmdir(backupRoot);
}

function pathExists(candidate: string): boolean {
  try {
    fs.lstatSync(candidate);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function preservedBackupError(backup: string, cause: unknown): Error {
  return new Error(
    `could not restore replaced directory; preserved it at ${backup}`,
    { cause },
  );
}
