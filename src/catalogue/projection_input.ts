import type { ComponentViewRecord } from "../components/manifest_types.js";
import type { ReviewResult } from "../review/types.js";
import type { Catalogue } from "../server/catalogue.js";
import type { ComponentChangeSnapshot } from "../server/component_changes.js";

import type { CatalogueReadModel, ChangesStatus } from "./types.js";

/** Accepted state only: projection has no filesystem, Git, clock or renderer dependency. */
export interface CatalogueProjectionInput {
  configPath: string;
  catalogue: Catalogue;
  changesStatus: ChangesStatus;
  changedRoutes?: readonly string[] | undefined;
  evidence?: ComponentChangeSnapshot | undefined;
  comparison?: ReviewResult | undefined;
  comparisonUrl: string | null;
  revision: CatalogueReadModel["revision"];
  /** Actual saved on-demand documents override exhaustive render-order records. */
  usage?: ReadonlyMap<string, ComponentViewRecord> | undefined;
}
