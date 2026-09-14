import type { StaticDelivery } from "../navigation/delivery.js";
import type { ReviewArtifactContent } from "../review/types.js";

import type { LegacyExportOwnership } from "./ownership.js";

/** Immutable route information available before an adapter finishes staging. */
export interface ExportRoutes {
  readonly outDir: string;
  readonly comparisonUrl: string;
  readonly idRoutes: StaticDelivery["idRoutes"];
}

/** Final identity and paths produced by one completed static export. */
export interface ExportResult extends ExportRoutes {
  readonly deploymentId: string;
}

/** Repository-only staging adapter; consumer deployment is outside the CLI. */
export interface ExportAdapter {
  /** Optional stricter config-relative root, pinned for this operation. */
  outputRoot?: string;
  legacyOwnership?: LegacyExportOwnership;
  transform(
    files: Map<string, ReviewArtifactContent>,
    result: ExportRoutes,
  ):
    | void
    | ReadonlyMap<string, string>
    | Promise<void | ReadonlyMap<string, string>>;
}

/** One explicit export request, with optional cancellation and internal adapter. */
export interface ExportOptions {
  outDir: string;
  base?: string;
  signal?: AbortSignal;
  adapter?: ExportAdapter;
}
