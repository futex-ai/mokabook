import fs from "node:fs";
import path from "node:path";

import {
  isSafeCatalogueRoute,
  toPosixPath,
  validateRelativeRoute,
} from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError, errorMessage } from "../errors.js";
import type { LoadedGraph, LoadedLegacyModule } from "../build/load_graph.js";
import { discoverLegacySources } from "../build/discovery.js";

/** One rendered legacy page ready for static output. */
export interface RenderedLegacyPage {
  content: string;
  route: string;
  sourcePath: string;
  sourceRelativePath: string;
}

/** Render configured legacy sources with no application-specific defaults. */
export function renderLegacyPages(
  config: ResolvedConfig,
  graph: LoadedGraph,
): RenderedLegacyPage[] {
  const legacyConfig = config.legacy;
  if (!legacyConfig) return [];
  const loaded = new Map(
    graph.legacy.map((module) => [module.sourcePath, module]),
  );
  return discoverLegacySources(legacyConfig.pagesDir).map((sourcePath) => {
    const relative = toPosixPath(
      path.relative(legacyConfig.pagesDir, sourcePath),
    );
    const defaultRoute = relative.replace(/\.source\.(?:tsx?|html)$/, ".html");
    const route = validateRelativeRoute(
      legacyConfig.routeAliases?.[relative] ??
        legacyConfig.routeAliases?.[defaultRoute] ??
        defaultRoute,
      `legacy route for ${relative}`,
    );
    if (!isSafeCatalogueRoute(route)) {
      throw new MokabookError(
        "build-invalid",
        `legacy route for ${relative} must use portable URL-safe path segments and end in .html`,
      );
    }
    const sourceRelativePath = toPosixPath(
      path.relative(config.repoRoot, sourcePath),
    );
    const content = sourcePath.endsWith(".source.html")
      ? expandComponents(
          fs.readFileSync(sourcePath, "utf8"),
          graph.renderLegacyComponent,
          sourceRelativePath,
        )
      : renderTypedSource(loaded.get(sourcePath), sourceRelativePath);
    lintLegacy(content, route, config);
    return { content, route, sourcePath, sourceRelativePath };
  });
}

function expandComponents(
  source: string,
  renderer: LoadedGraph["renderLegacyComponent"],
  sourcePath: string,
): string {
  return source.replace(
    /<!--\s*@(mokabook|mockups)\/component\s+([a-z0-9-]+)([\s\S]*?)-->/g,
    (_token, _namespace: string, name: string, rawAttributes: string) => {
      if (!renderer) {
        throw new MokabookError(
          "build-invalid",
          `${sourcePath} uses component ${name} but legacy.components is not configured`,
        );
      }
      return renderer(name, parseAttributes(rawAttributes, sourcePath));
    },
  );
}

function parseAttributes(
  source: string,
  sourcePath: string,
): Record<string, string> {
  const attributes: Record<string, string> = {};
  let rest = source;
  const pattern = /^\s+([a-zA-Z][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/;
  while (rest.trim().length > 0) {
    const match = rest.match(pattern);
    if (!match?.[1]) {
      throw new MokabookError(
        "build-invalid",
        `${sourcePath} has malformed component attributes`,
      );
    }
    if (attributes[match[1]] !== undefined) {
      throw new MokabookError(
        "build-invalid",
        `${sourcePath} repeats component attribute ${match[1]}`,
      );
    }
    attributes[match[1]] = match[2] ?? match[3] ?? "";
    rest = rest.slice(match[0].length);
  }
  return attributes;
}

function renderTypedSource(
  module: LoadedLegacyModule | undefined,
  source: string,
): string {
  if (!module)
    throw new MokabookError("build-invalid", `legacy bundle omitted ${source}`);
  const candidate = module.exports.source ?? module.exports.default;
  try {
    const output = typeof candidate === "function" ? candidate() : candidate;
    if (typeof output !== "string") {
      throw new MokabookError(
        "build-invalid",
        `${source} must export source() returning complete HTML`,
      );
    }
    return output;
  } catch (error) {
    if (error instanceof MokabookError) throw error;
    throw new MokabookError(
      "build-invalid",
      `could not render ${source}: ${errorMessage(error)}`,
      {
        cause: error,
      },
    );
  }
}

function lintLegacy(
  content: string,
  route: string,
  config: ResolvedConfig,
): void {
  const lint = config.legacy?.lint;
  if (!lint || lint.allowRoutes?.includes(route)) return;
  if (lint.maxScreensPerPage !== undefined) {
    const count = [...content.matchAll(/\bdata-mokabook-screen(?:=|\s|>)/g)]
      .length;
    if (count > lint.maxScreensPerPage) {
      throw new MokabookError(
        "build-invalid",
        `${route} contains ${count} screens; configured maximum is ${lint.maxScreensPerPage}`,
      );
    }
  }
  if (lint.requireStageIds) {
    const stages = [
      ...content.matchAll(
        /<([a-z][\w:-]*)([^>]*\bdata-mokabook-stage(?:=[^\s>]+)?[^>]*)>/gi,
      ),
    ];
    if (stages.some((match) => !/\bid\s*=/.test(match[2] ?? ""))) {
      throw new MokabookError(
        "build-invalid",
        `${route} has a data-mokabook-stage without an id`,
      );
    }
  }
}
