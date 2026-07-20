import { createRequire } from "node:module";
import path from "node:path";

import type { Plugin, PluginBuild } from "esbuild";

import type { ResolvedConfig } from "../config/types.js";
import { MokabookError } from "../errors.js";

/** Resolve React peers from consumer package roots before the executing package. */
export function consumerReactPlugin(config: ResolvedConfig): Plugin {
  const consumerRequires = [
    createRequire(config.configPath),
    ...config.moduleResolution.packageRoots.map((root) =>
      createRequire(path.join(root, "package.json")),
    ),
  ];
  return {
    name: "mokabook-single-react",
    setup(pluginBuild: PluginBuild): void {
      pluginBuild.onResolve(
        { filter: /^(react|react-dom)(\/.*)?$/ },
        (arguments_) => {
          for (const consumerRequire of consumerRequires) {
            try {
              return { path: consumerRequire.resolve(arguments_.path) };
            } catch {
              continue;
            }
          }
          throw new MokabookError(
            "build-invalid",
            `consumer must install peer dependency ${arguments_.path}`,
          );
        },
      );
    },
  };
}

/** Return dependency directories searched after normal importer resolution. */
export function packageNodePaths(config: ResolvedConfig): string[] {
  return [
    path.join(config.repoRoot, "node_modules"),
    ...config.moduleResolution.packageRoots.map((root) =>
      path.join(root, "node_modules"),
    ),
  ];
}
