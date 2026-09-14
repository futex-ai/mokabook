import path from "node:path";

import { validCommands } from "../baseline/cache_layout.js";
import { MokabookError } from "../errors.js";
import { isSafeRepositoryPath, toPosixPath } from "./paths.js";
import type { MokabookConfig } from "./types.js";

/** Validate the explicit mode before resolving mode-dependent filesystem paths. */
export function generatedOutputMode(value: unknown): "committed" | "derived" {
  if (value === undefined) return "committed";
  if (value === "committed" || value === "derived") return value;
  throw new MokabookError(
    "config-invalid",
    'generatedOutput must be "committed" or "derived"',
  );
}

/** Resolve an exact, shell-free build recipe; explicit recipes have no implicit suffix. */
export function baselineBuildCommands(
  input: MokabookConfig,
  repoRoot: string,
  configPath: string,
): readonly (readonly string[])[] | undefined {
  const commands = input.review?.baselineBuild;
  if (input.generatedOutput !== "derived") {
    if (commands !== undefined)
      throw new MokabookError(
        "config-invalid",
        "review.baselineBuild is valid only with generatedOutput: derived",
      );
    return;
  }
  const relativeConfig = toPosixPath(path.relative(repoRoot, configPath));
  if (!isSafeRepositoryPath(relativeConfig))
    throw new MokabookError(
      "config-invalid",
      "derived config must be a repository-relative file",
    );
  if (commands === undefined)
    return [
      ["npm", "ci"],
      ["npx", "--no-install", "mokabook", "build", "--config", relativeConfig],
    ];
  if (!validCommands(commands))
    throw new MokabookError(
      "config-invalid",
      "review.baselineBuild must contain non-empty argv arrays with a non-empty executable and string arguments without NUL",
    );
  return commands.map((argv) => [...argv]);
}
