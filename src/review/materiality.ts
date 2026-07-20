/** Shared Review materiality rules for artifacts and CI summaries. */

import type { ScreenReview } from "./types.js";

/** Return whether an unchanged screen still has review impact evidence. */
export function isImpactOnly(screen: ScreenReview): boolean {
  return screen.state === "unchanged" && screen.sharedImpact.length > 0;
}

/** Return whether a screen needs reviewer attention. */
export function isMaterial(screen: ScreenReview): boolean {
  return screen.state !== "unchanged" || isImpactOnly(screen);
}
