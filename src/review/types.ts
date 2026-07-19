import type { Viewport } from "../authoring/types.js";

/** Text or binary bytes retained in one static Review artifact. */
export type ReviewArtifactContent = string | Uint8Array;

/** Classification for one viewport or aggregate screen. */
export type ReviewState =
  "added" | "changed" | "ignored-only" | "removed" | "unchanged";

/** One viewport comparison and its retained artifact paths. */
export interface ViewportReview {
  afterPath?: string;
  beforePath?: string;
  ignoredIds: readonly string[];
  state: ReviewState;
  viewport: Viewport;
}

/** One stable screen route comparison. */
export interface ScreenReview {
  dependencies: readonly string[];
  id: string;
  route: string;
  sharedImpact: readonly string[];
  state: ReviewState;
  title: string;
  viewports: readonly ViewportReview[];
}

/** Deterministic machine-readable Review result. */
export interface ReviewResult {
  baseCommit: string;
  baseRef: string;
  changedPaths: readonly string[];
  ignoredImpact: readonly { count: number; id: string; viewport: Viewport }[];
  screens: readonly ScreenReview[];
  schemaVersion: 1;
  sharedImpact: readonly string[];
}

/** Complete artifact file map plus summary model. */
export interface ReviewArtifact {
  files: ReadonlyMap<string, ReviewArtifactContent>;
  result: ReviewResult;
}
