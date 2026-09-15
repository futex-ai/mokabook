import { MoklyError } from "../errors.js";

import type { ReviewArtifactContent } from "./types.js";

/** Preserve a source route beneath one isolated Review snapshot. */
export function snapshotPath(side: "after" | "before", route: string): string {
  return `snapshots/${side}/${route}`;
}

/** Add one artifact file and fail instead of silently overwriting a collision. */
export function addArtifactFile(
  files: Map<string, ReviewArtifactContent>,
  relative: string,
  content: ReviewArtifactContent,
): void {
  if (files.has(relative)) {
    throw new MoklyError(
      "review-invalid",
      `Review artifact path collision: ${relative}`,
    );
  }
  files.set(relative, content);
}
