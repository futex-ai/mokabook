import type { ResolvedConfig } from "../config/types.js";
import { transformCompatibilityDocuments } from "../compatibility/transform.js";
import { MokabookError } from "../errors.js";
import { renderLegacyPages } from "../legacy/pages.js";
import {
  createManifest,
  fragmentRoute,
  MANIFEST_NAME,
  parseManifest,
  serializeManifest,
} from "../registry/manifest.js";
import { prepareRegistry } from "../registry/prepare.js";
import type { ManifestLegacyPage, ManifestV3 } from "../registry/types.js";
import { normalizeSingleDocument } from "../review/ignore.js";
import { validateHtmlLinks } from "./html_links.js";
import { loadConsumerGraph } from "./load_graph.js";
import { validateGeneratedOutputPaths } from "./output_paths.js";
import { addOutput, generatedHeader, renderFragments } from "./render.js";

/** Complete in-memory static compilation result. */
export interface Compilation {
  manifest: ManifestV3;
  outputs: ReadonlyMap<string, string>;
}

/** Compile all expected bytes without mutating consumer output. */
export async function compileCatalogue(
  config: ResolvedConfig,
): Promise<Compilation> {
  const graph = await loadConsumerGraph(config);
  const registry = prepareRegistry(graph.definitions, config);
  const outputs = renderFragments(registry.entries, graph.renderer, config);
  const legacy = renderLegacyPages(config, graph);
  const routedEntries = new Set(
    registry.entries.flatMap((entry) =>
      entry.kind === "collection" ? [] : [entry.route],
    ),
  );
  const fragmentRoutes = new Set(
    registry.entries.flatMap((entry) =>
      entry.kind === "screen"
        ? [
            fragmentRoute(entry.route, "mobile"),
            fragmentRoute(entry.route, "desktop"),
          ]
        : [],
    ),
  );
  for (const page of legacy) {
    if (routedEntries.has(page.route) || fragmentRoutes.has(page.route)) {
      throw new MokabookError(
        "build-invalid",
        `legacy route collides with registry output: ${page.route}`,
      );
    }
    addOutput(
      outputs,
      page.route,
      `${generatedHeader(page.sourceRelativePath)}${page.content}`,
    );
  }
  for (const route of routedEntries) {
    if (fragmentRoutes.has(route)) {
      throw new MokabookError(
        "build-invalid",
        `fragment route collides with registry route: ${route}`,
      );
    }
  }
  transformCompatibilityDocuments(outputs, registry.entries, config, graph);
  for (const [route, content] of outputs) {
    normalizeSingleDocument(content, route);
  }
  validateHtmlLinks(outputs, config);
  const legacyManifest: ManifestLegacyPage[] = legacy.map((page) => ({
    route: page.route,
    sourcePath: page.sourceRelativePath,
  }));
  const manifest = createManifest(registry.entries, legacyManifest);
  parseManifest(manifest);
  outputs.set(MANIFEST_NAME, serializeManifest(manifest));
  validateGeneratedOutputPaths(outputs.keys(), config);
  return { manifest, outputs };
}
