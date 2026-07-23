/** Shared ownership contract for generated Review and preview directories. */

import fs from "node:fs";
import path from "node:path";

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
