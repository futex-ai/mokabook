import path from "node:path";

import type { ResolvedRegistryEntry } from "../authoring/types.js";
import { walkFiles } from "../build/discovery.js";
import type { LogicalReferenceRecord } from "../build/logical_record_types.js";
import { validateCompatibilityRecords } from "../build/logical_records.js";
import { logicalArtifactRoutes } from "../build/logical_routes.js";
import { isPublicStaticFile } from "../config/public_files.js";
import { toPosixPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError, errorMessage } from "../errors.js";
import { MANIFEST_NAME } from "../registry/manifest.js";
import type { LoadedGraph } from "../build/load_graph.js";
import { pendingGeneratedOrphanRoutes } from "../build/ownership.js";
import type { ArtifactView } from "../registry/views.js";
import { rewriteMockLinks } from "../build/mock_links.js";

/** Resolve legacy id links and apply an explicitly configured migration bridge. */
export function transformCompatibilityDocuments(
  outputs: Map<string, string>,
  entries: readonly ResolvedRegistryEntry[],
  config: ResolvedConfig,
  graph: LoadedGraph,
  fragmentViews: ReadonlyMap<string, ArtifactView>,
): readonly LogicalReferenceRecord[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const records: LogicalReferenceRecord[] = [];
  const outputRoutes = [...outputs.keys()];
  const availableRoutes = availablePublicRoutes(outputRoutes, config);
  for (const [route, original] of outputs) {
    const { colorScheme, viewport } =
      fragmentViews.get(route) ?? legacyRouteView(route);
    const linked = rewriteMockLinks(
      original,
      route,
      viewport,
      colorScheme,
      byId,
      config.colorSchemes,
    );
    records.push(...linked.records);
    const transformer = graph.compatibilityTransformer;
    if (!transformer) {
      outputs.set(route, linked.content);
      continue;
    }
    let transformed: string;
    try {
      transformed = transformer({
        availableRoutes,
        colorScheme,
        content: linked.content,
        logicalRoutes: logicalArtifactRoutes(
          entries,
          viewport,
          colorScheme,
          config.colorSchemes,
        ),
        outputPath: toPosixPath(
          path.relative(config.repoRoot, path.join(config.mockupsDir, route)),
        ),
        route,
        viewport,
      });
    } catch (error) {
      throw new MokabookError(
        "build-invalid",
        `compatibility transformer failed for ${route}: ${errorMessage(error)}`,
        { cause: error },
      );
    }
    if (typeof transformed !== "string" || !/<html[\s>]/i.test(transformed)) {
      throw new MokabookError(
        "build-invalid",
        `compatibility transformer must return a complete HTML document for ${route}`,
      );
    }
    const normalized = transformed.endsWith("\n")
      ? transformed
      : `${transformed}\n`;
    validateCompatibilityRecords(route, normalized, linked.records);
    outputs.set(route, normalized);
  }
  return records;
}

function availablePublicRoutes(
  outputRoutes: readonly string[],
  config: ResolvedConfig,
): string[] {
  const nextRoutes = [...outputRoutes, MANIFEST_NAME];
  const pendingOrphans = new Set(
    pendingGeneratedOrphanRoutes(config, nextRoutes),
  );
  const publicRoutes = walkFiles(config.mockupsDir)
    .filter((candidate) => isPublicStaticFile(candidate, config))
    .map((candidate) =>
      toPosixPath(path.relative(config.mockupsDir, candidate)),
    )
    .filter((route) => !pendingOrphans.has(route));
  return [...new Set([...nextRoutes, ...publicRoutes])].sort();
}

function legacyRouteView(route: string): ArtifactView {
  if (route.endsWith(".mobile.html")) {
    return { colorScheme: "light", viewport: "mobile" };
  }
  return { colorScheme: "light", viewport: "desktop" };
}
