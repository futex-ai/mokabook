import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

import { context, type BuildContext } from "esbuild";

import type { RegistryDefinition } from "../authoring/types.js";
import type { CompatibilityTransformer } from "../compatibility/types.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError, errorMessage } from "../errors.js";
import type { Renderer } from "../renderer/types.js";
import { discoverEntryModules, discoverLegacySources } from "./discovery.js";
import {
  consumerReactPlugin,
  packageNodePaths,
} from "./consumer_resolution.js";
import {
  CONSUMER_ENTRY_PATH,
  consumerEntryPlugin,
  packageApiPlugin,
} from "./consumer_entry.js";

/** One loaded legacy module and its authored source path. */
export interface LoadedLegacyModule {
  exports: Record<string, unknown>;
  sourcePath: string;
  sourceRelativePath: string;
}

/** Consumer modules loaded in one React-safe esbuild graph. */
export interface LoadedGraph {
  compatibilityTransformer?: CompatibilityTransformer;
  definitions: unknown[];
  entrySources: readonly string[];
  legacy: readonly LoadedLegacyModule[];
  renderLegacyComponent?: (
    name: string,
    attributes: Readonly<Record<string, string>>,
  ) => string;
  renderer: Renderer;
}

/** Bundle and import all React-bearing consumer modules as one graph. */
export async function loadConsumerGraph(
  config: ResolvedConfig,
  signal?: AbortSignal,
): Promise<LoadedGraph> {
  signal?.throwIfAborted();
  const entrySources = discoverEntryModules(config.entriesDir);
  const allLegacy = config.legacy
    ? discoverLegacySources(config.legacy.pagesDir, config.legacy.exclude)
    : [];
  const legacySources = allLegacy.filter(
    (source) => !source.endsWith(".source.html"),
  );
  const temporaryDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "mokabook-graph-"),
  );
  const outputPath = path.join(temporaryDir, "consumer.cjs");
  let buildContext: BuildContext | undefined;
  let cancelBuild: (() => void) | undefined;
  try {
    buildContext = await context({
      absWorkingDir: path.dirname(config.configPath),
      alias: config.moduleResolution.aliases,
      bundle: true,
      ...(config.moduleResolution.conditions
        ? { conditions: [...config.moduleResolution.conditions] }
        : {}),
      entryPoints: [CONSUMER_ENTRY_PATH],
      format: "cjs",
      jsx: "automatic",
      loader: config.moduleResolution.loaders,
      logLevel: "silent",
      ...(config.moduleResolution.mainFields
        ? { mainFields: [...config.moduleResolution.mainFields] }
        : {}),
      nodePaths: packageNodePaths(config),
      outfile: outputPath,
      platform: "node",
      plugins: [
        consumerEntryPlugin(config, entrySources, legacySources),
        packageApiPlugin(config),
        consumerReactPlugin(config),
      ],
      ...(config.moduleResolution.resolveExtensions
        ? { resolveExtensions: [...config.moduleResolution.resolveExtensions] }
        : {}),
      target: "node22",
    });
    cancelBuild = (): void => {
      const activeContext = buildContext;
      if (activeContext) void activeContext.cancel().catch(() => undefined);
    };
    signal?.addEventListener("abort", cancelBuild, { once: true });
    signal?.throwIfAborted();
    await buildContext.rebuild();
    signal?.throwIfAborted();
    const imported = createRequire(import.meta.url)(outputPath) as {
      compatibilityTransformer?: unknown;
      definitions: unknown[];
      legacy: Array<{
        exports: Record<string, unknown>;
        sourcePath: string;
        sourceRelativePath: string;
      }>;
      renderLegacyComponent?: unknown;
      renderer: unknown;
    };
    if (typeof imported.renderer !== "function") {
      throw new MokabookError(
        "build-invalid",
        "renderer module must default-export a function",
      );
    }
    if (
      config.compatibility.transformer &&
      typeof imported.compatibilityTransformer !== "function"
    ) {
      throw new MokabookError(
        "build-invalid",
        "compatibility transformer module must default-export a function",
      );
    }
    signal?.throwIfAborted();
    return {
      ...(typeof imported.compatibilityTransformer === "function"
        ? {
            compatibilityTransformer:
              imported.compatibilityTransformer as CompatibilityTransformer,
          }
        : {}),
      definitions: imported.definitions,
      entrySources,
      legacy: imported.legacy,
      ...(typeof imported.renderLegacyComponent === "function"
        ? {
            renderLegacyComponent: imported.renderLegacyComponent as (
              name: string,
              attributes: Readonly<Record<string, string>>,
            ) => string,
          }
        : {}),
      renderer: imported.renderer as Renderer,
    };
  } catch (error) {
    signal?.throwIfAborted();
    if (error instanceof MokabookError) throw error;
    throw new MokabookError(
      "build-invalid",
      `could not bundle consumer modules: ${errorMessage(error)}`,
      {
        cause: error,
      },
    );
  } finally {
    if (cancelBuild) signal?.removeEventListener("abort", cancelBuild);
    await buildContext?.dispose();
    await fs.promises.rm(temporaryDir, { force: true, recursive: true });
  }
}

/** Narrow an unknown loaded value after runtime validation. */
export function asRegistryDefinition(
  value: unknown,
): RegistryDefinition | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as RegistryDefinition)
    : undefined;
}
