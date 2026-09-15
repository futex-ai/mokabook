import path from "node:path";

import type { ComponentViewRecord } from "@mokly/viewer";
import { invalidData, validateResourcePath } from "@mokly/viewer/data";

import { isPublicStaticFile } from "../config/public_files.js";
import type { ResolvedConfig } from "../config/types.js";

/** Metadata cannot grant ownership of source files or missing public resources. */
export function validateComponentResources(
  views: ReadonlyMap<string, ComponentViewRecord>,
  config: ResolvedConfig,
): void {
  for (const [route, view] of views)
    for (const resource of view.resources) {
      validateResourcePath(resource.path, route);
      if (
        !isPublicStaticFile(
          path.resolve(config.mockupsDir, resource.path),
          config,
        )
      )
        invalidData(
          route,
          `component resource is not a public file: ${resource.path}`,
        );
    }
}
