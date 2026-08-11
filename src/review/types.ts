import type { ColorScheme, Viewport } from "../authoring/types.js";

/** Text or binary bytes retained in one static Review artifact. */
export type ReviewArtifactContent = string | Uint8Array;

/** Classification for one view or aggregate screen. */
export type ReviewState =
  "added" | "changed" | "ignored-only" | "removed" | "unchanged";

/** One view comparison and its retained artifact paths. */
export interface ViewReview {
  afterPath?: string;
  beforePath?: string;
  colorScheme: ColorScheme;
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
  views: readonly ViewReview[];
}

/** Deterministic machine-readable Review result. */
export interface ReviewResult {
  /** Common ancestor shared by HEAD and the configured base ref. */
  baseCommit: string;
  /** Configured ref used to resolve the comparison branch point. */
  baseRef: string;
  changedPaths: readonly string[];
  ignoredImpact: readonly {
    colorScheme: ColorScheme;
    count: number;
    id: string;
    viewport: Viewport;
  }[];
  screens: readonly ScreenReview[];
  schemaVersion: 2;
  sharedImpact: readonly string[];
}

/** Complete artifact file map plus summary model. */
export interface ReviewArtifact {
  files: ReadonlyMap<string, ReviewArtifactContent>;
  result: ReviewResult;
}
