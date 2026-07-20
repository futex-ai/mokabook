import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { build, type Plugin, type PluginBuild } from "esbuild";

import { MokabookError, errorMessage } from "../errors.js";
import type { ResolvedConfig } from "./types.js";
import { resolveConfig } from "./validate.js";

const CONFIG_NAMES = [
  "mokabook.config.ts",
  "mokabook.config.mts",
  "mokabook.config.js",
  "mokabook.config.mjs",
] as const;

/** Reloadable consumer-configuration boundary used by watched Serve. */
export interface ConfigLoader {
  load(configPath: string): Promise<ResolvedConfig>;
}

/** Filesystem-backed configuration loader. */
export class FileSystemConfigLoader implements ConfigLoader {
  load(configPath: string): Promise<ResolvedConfig> {
    return loadConfig(path.dirname(configPath), configPath);
  }
}

/** Find a Mokabook config by explicit path or upward discovery. */
export function discoverConfig(cwd: string, explicitPath?: string): string {
  if (explicitPath) {
    const candidate = path.resolve(cwd, explicitPath);
    if (!isFile(candidate)) {
      throw new MokabookError(
        "config-missing",
        `config file does not exist: ${candidate}`,
      );
    }
    return candidate;
  }

  const attempted: string[] = [];
  let current = path.resolve(cwd);
  while (true) {
    for (const name of CONFIG_NAMES) {
      const candidate = path.join(current, name);
      attempted.push(candidate);
      if (isFile(candidate)) return candidate;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new MokabookError(
    "config-missing",
    `no Mokabook config found; attempted:\n${attempted.map((item) => `- ${item}`).join("\n")}`,
  );
}

/** Import and validate a TypeScript or JavaScript consumer config. */
export async function loadConfig(
  cwd: string,
  explicitPath?: string,
): Promise<ResolvedConfig> {
  const configPath = discoverConfig(cwd, explicitPath);
  const temporaryDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "mokabook-config-"),
  );
  const outputPath = path.join(temporaryDir, "config.mjs");
  try {
    await build({
      absWorkingDir: path.dirname(configPath),
      bundle: true,
      entryPoints: [configPath],
      format: "esm",
      logLevel: "silent",
      outfile: outputPath,
      platform: "node",
      plugins: [configApiPlugin()],
      target: "node22",
    });
    const loaded = (await import(
      `${pathToFileURL(outputPath).href}?v=${Date.now()}`
    )) as {
      default?: unknown;
    };
    if (loaded.default === undefined) {
      throw new MokabookError(
        "config-invalid",
        `${configPath} must have a default export`,
      );
    }
    return resolveConfig(loaded.default, configPath);
  } catch (error) {
    if (error instanceof MokabookError) throw error;
    throw new MokabookError(
      "config-invalid",
      `could not load ${configPath}: ${errorMessage(error)}`,
      { cause: error },
    );
  } finally {
    await fs.promises.rm(temporaryDir, { force: true, recursive: true });
  }
}

function configApiPlugin(): Plugin {
  return {
    name: "mokabook-config-api",
    setup(pluginBuild: PluginBuild): void {
      pluginBuild.onResolve({ filter: /^mokabook$/ }, () => ({
        namespace: "mokabook-config-api",
        path: "mokabook",
      }));
      pluginBuild.onLoad(
        { filter: /.*/, namespace: "mokabook-config-api" },
        () => ({
          contents: "export const defineConfig = (value) => value;",
          loader: "js",
        }),
      );
    },
  };
}

function isFile(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}
