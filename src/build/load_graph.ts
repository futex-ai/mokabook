import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build, type Plugin, type PluginBuild } from "esbuild";

import type { RegistryDefinition } from "../authoring/types.js";
import { MokabookError, errorMessage } from "../errors.js";
import type { Renderer } from "../renderer/types.js";
import type { ResolvedConfig } from "../config/types.js";
import { toPosixPath } from "../config/paths.js";
import { discoverEntryModules, discoverLegacySources } from "./discovery.js";

/** One loaded legacy module and its authored source path. */
export interface LoadedLegacyModule {
  exports: Record<string, unknown>;
  sourcePath: string;
  sourceRelativePath: string;
}

/** Consumer modules loaded in one React-safe esbuild graph. */
export interface LoadedGraph {
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
): Promise<LoadedGraph> {
  const entrySources = discoverEntryModules(config.entriesDir);
  const allLegacy = config.legacy
    ? discoverLegacySources(config.legacy.pagesDir)
    : [];
  const legacySources = allLegacy.filter(
    (source) => !source.endsWith(".source.html"),
  );
  const temporaryDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "mokabook-graph-"),
  );
  const outputPath = path.join(temporaryDir, "consumer.cjs");
  try {
    await build({
      absWorkingDir: path.dirname(config.configPath),
      bundle: true,
      entryPoints: [virtualEntryPath()],
      format: "cjs",
      jsx: "automatic",
      logLevel: "silent",
      nodePaths: [path.join(config.repoRoot, "node_modules")],
      outfile: outputPath,
      platform: "node",
      plugins: [
        virtualEntryPlugin(config, entrySources, legacySources),
        packageApiPlugin(),
        attributionPlugin(config),
        consumerReactPlugin(config),
      ],
      target: "node22",
    });
    const imported = createRequire(import.meta.url)(outputPath) as {
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
    return {
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
    if (error instanceof MokabookError) throw error;
    throw new MokabookError(
      "build-invalid",
      `could not bundle consumer modules: ${errorMessage(error)}`,
      {
        cause: error,
      },
    );
  } finally {
    await fs.promises.rm(temporaryDir, { force: true, recursive: true });
  }
}

function virtualEntryPath(): string {
  return "mokabook:consumer-entry";
}

function virtualEntryPlugin(
  config: ResolvedConfig,
  entries: readonly string[],
  legacy: readonly string[],
): Plugin {
  return {
    name: "mokabook-consumer-entry",
    setup(pluginBuild: PluginBuild): void {
      pluginBuild.onResolve({ filter: /^mokabook:consumer-entry$/ }, () => ({
        namespace: "mokabook-entry",
        path: virtualEntryPath(),
      }));
      pluginBuild.onLoad({ filter: /.*/, namespace: "mokabook-entry" }, () => ({
        contents: virtualEntryContents(config, entries, legacy),
        loader: "ts",
        resolveDir: path.dirname(config.configPath),
      }));
    },
  };
}

function virtualEntryContents(
  config: ResolvedConfig,
  entries: readonly string[],
  legacy: readonly string[],
): string {
  const imports = entries.map(
    (source, index) => `import * as entry${index} from ${quote(source)};`,
  );
  const legacyImports = legacy.map(
    (source, index) => `import * as legacy${index} from ${quote(source)};`,
  );
  const componentImport = config.legacy?.components
    ? `import * as legacyComponents from ${quote(config.legacy.components)};\nimport { renderToStaticMarkup as renderLegacyNode } from "react-dom/server";`
    : "";
  const rendererPath =
    config.renderer ??
    runtimeModule("../renderer/default.js", "../renderer/default.tsx");
  const entryValues = entries.map(
    (_source, index) =>
      `(entry${index}.mockups ?? entry${index}.default ?? [])`,
  );
  const legacyValues = legacy.map((source, index) => {
    const relative = toPosixPath(path.relative(config.repoRoot, source));
    return `{ exports: legacy${index}, sourcePath: ${quote(source)}, sourceRelativePath: ${quote(relative)} }`;
  });
  return [
    ...imports,
    ...legacyImports,
    componentImport,
    `import renderer from ${quote(rendererPath)};`,
    `const flatten = (values) => values.flat(Infinity);`,
    `export const definitions = flatten([${entryValues.join(",")}]);`,
    `export const legacy = [${legacyValues.join(",")}];`,
    ...(config.legacy?.components
      ? [
          `export const renderLegacyComponent = (name, attributes) => {`,
          `  if (typeof legacyComponents.renderComponent !== "function") throw new Error("legacy components module must export renderComponent");`,
          `  const output = legacyComponents.renderComponent(name, attributes);`,
          `  return typeof output === "string" ? output : renderLegacyNode(output);`,
          `};`,
        ]
      : []),
    `export { renderer };`,
  ].join("\n");
}

function attributionPlugin(config: ResolvedConfig): Plugin {
  const realEntries = fs.realpathSync(config.entriesDir);
  const definitionsPath = runtimeModule(
    "../authoring/definitions.js",
    "../authoring/definitions.ts",
  );
  return {
    name: "mokabook-attribution",
    setup(pluginBuild: PluginBuild): void {
      pluginBuild.onLoad({ filter: /\.mockup\.tsx?$/ }, async (args) => {
        const source = await fs.promises.readFile(args.path, "utf8");
        const relative = toPosixPath(path.relative(config.repoRoot, args.path));
        const banner =
          `import { __setDefiningModule as __mokabookSetModule } from ${quote(definitionsPath)};\n` +
          `__mokabookSetModule(${quote(relative)});\n`;
        if (!fs.realpathSync(args.path).startsWith(realEntries + path.sep))
          return undefined;
        return {
          contents: banner + source,
          loader: args.path.endsWith(".tsx") ? "tsx" : "ts",
          resolveDir: path.dirname(args.path),
        };
      });
    },
  };
}

function packageApiPlugin(): Plugin {
  const indexPath = runtimeModule("../index.js", "../index.ts");
  return {
    name: "mokabook-package-api",
    setup(pluginBuild: PluginBuild): void {
      pluginBuild.onResolve({ filter: /^mokabook$/ }, () => ({
        path: indexPath,
      }));
    },
  };
}

function consumerReactPlugin(config: ResolvedConfig): Plugin {
  const consumerRequire = createRequire(config.configPath);
  return {
    name: "mokabook-single-react",
    setup(pluginBuild: PluginBuild): void {
      pluginBuild.onResolve(
        { filter: /^(react|react-dom)(\/.*)?$/ },
        (args) => {
          try {
            return { path: consumerRequire.resolve(args.path) };
          } catch (error) {
            throw new MokabookError(
              "build-invalid",
              `consumer must install peer dependency ${args.path}: ${errorMessage(error)}`,
            );
          }
        },
      );
    },
  };
}

function quote(value: string): string {
  return JSON.stringify(value);
}

function runtimeModule(compiled: string, source: string): string {
  const compiledPath = fileURLToPath(new URL(compiled, import.meta.url));
  return fs.existsSync(compiledPath)
    ? compiledPath
    : fileURLToPath(new URL(source, import.meta.url));
}

/** Narrow an unknown loaded value after runtime validation. */
export function asRegistryDefinition(
  value: unknown,
): RegistryDefinition | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as RegistryDefinition)
    : undefined;
}
