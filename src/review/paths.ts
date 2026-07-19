import crypto from "node:crypto";

import type { Viewport } from "../authoring/types.js";
import { MokabookError } from "../errors.js";
import type { ReviewArtifactContent } from "./types.js";

/** Create a bounded, cross-platform comparison-page path for one route. */
export function comparisonPagePath(route: string, viewport: Viewport): string {
  const digest = crypto.createHash("sha256").update(route).digest("hex");
  return `comparisons/${digest}/${viewport}/index.html`;
}

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
    throw new MokabookError(
      "review-invalid",
      `Review artifact path collision: ${relative}`,
    );
  }
  files.set(relative, content);
}
