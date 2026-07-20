import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Plugin, PluginBuild } from "esbuild";

import { isInside, toPosixPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";

/** Virtual module name for the complete consumer-owned build graph. */
export const CONSUMER_ENTRY_PATH = "mokabook:consumer-entry";

/** Load every consumer entry, legacy module, renderer, and migration bridge. */
export function consumerEntryPlugin(
  config: ResolvedConfig,
  entries: readonly string[],
  legacy: readonly string[],
): Plugin {
  return {
    name: "mokabook-consumer-entry",
    setup(pluginBuild: PluginBuild): void {
      pluginBuild.onResolve({ filter: /^mokabook:consumer-entry$/ }, () => ({
        namespace: "mokabook-entry",
        path: CONSUMER_ENTRY_PATH,
      }));
      pluginBuild.onLoad({ filter: /.*/, namespace: "mokabook-entry" }, () => ({
        contents: virtualEntryContents(config, entries, legacy),
        loader: "ts",
        resolveDir: path.dirname(config.configPath),
      }));
    },
  };
}

/** Resolve consumer imports of the public package with source attribution. */
export function packageApiPlugin(config: ResolvedConfig): Plugin {
  const realEntries = fs.realpathSync(config.entriesDir);
  const indexPath = runtimeModule("../index.js", "../index.ts");
  const definitionsPath = runtimeModule(
    "../authoring/definitions.js",
    "../authoring/definitions.ts",
  );
  return {
    name: "mokabook-package-api",
    setup(pluginBuild: PluginBuild): void {
      pluginBuild.onResolve({ filter: /^mokabook$/ }, (args) => {
        if (!args.importer) return { path: indexPath };
        let realImporter: string;
        try {
          realImporter = fs.realpathSync(args.importer);
        } catch {
          return { path: indexPath };
        }
        if (!isInside(realEntries, realImporter)) return { path: indexPath };
        return {
          namespace: "mokabook-attributed-api",
          path: toPosixPath(path.relative(config.repoRoot, args.importer)),
        };
      });
      pluginBuild.onLoad(
        { filter: /.*/, namespace: "mokabook-attributed-api" },
        (args) => ({
          contents: attributedApiContents(
            args.path,
            indexPath,
            definitionsPath,
          ),
          loader: "js",
        }),
      );
      pluginBuild.onResolve(
        { filter: /.*/, namespace: "mokabook-attributed-api" },
        (args) => ({ namespace: "file", path: args.path }),
      );
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
  const transformerImport = config.compatibility.transformer
    ? `import compatibilityTransformer from ${quote(config.compatibility.transformer)};`
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
    transformerImport,
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
    ...(config.compatibility.transformer
      ? [`export { compatibilityTransformer };`]
      : []),
    `export { renderer };`,
  ].join("\n");
}

function attributedApiContents(
  sourceRelativePath: string,
  indexPath: string,
  definitionsPath: string,
): string {
  return [
    `import * as api from ${quote(indexPath)};`,
    `import { __attributeDefinition as attribute } from ${quote(definitionsPath)};`,
    `const source = ${quote(sourceRelativePath)};`,
    `export const defineScreen = (input) => attribute(api.defineScreen(input), source);`,
    `export const defineCollection = (input) => attribute(api.defineCollection(input), source);`,
    `export const defineUseCase = (input) => attribute(api.defineUseCase(input), source);`,
    `export const screen = (input) => attribute(api.screen(input), source);`,
    `export const collection = (input) => attribute(api.collection(input), source);`,
    `export const defineRoot = (input) => api.defineRoot(input).map((definition) => definition.definedIn ? definition : attribute(definition, source));`,
    `export const defineConfig = api.defineConfig;`,
    `export const MockLink = api.MockLink;`,
    `export const mockLink = api.mockLink;`,
    `export const ReviewIgnore = api.ReviewIgnore;`,
    `export const ReviewIgnoreScope = api.ReviewIgnoreScope;`,
    `export const reviewMaterialKey = api.reviewMaterialKey;`,
  ].join("\n");
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
