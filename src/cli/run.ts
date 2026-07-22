import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compileCatalogue } from "../build/compile.js";
import { FileSystemGeneratedOutputStore } from "../build/output_store.js";
import { loadConfig } from "../config/load.js";
import { validateReviewOut } from "../config/path_validation.js";
import { MokabookError } from "../errors.js";
import { runReview } from "../review/run.js";
import { runServerChild } from "../server/child.js";
import { serve, type RunningServe } from "../server/serve.js";
import { parseArguments } from "./arguments.js";
import { HELP } from "./help.js";

/** Execute one CLI invocation and return its process exit code. */
export async function run(
  argv: readonly string[],
  cwd = process.cwd(),
): Promise<number> {
  assertSupportedNode();
  const arguments_ = parseArguments(argv);
  if (arguments_.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (arguments_.version) {
    process.stdout.write(`${packageVersion()}\n`);
    return 0;
  }
  const config = await loadConfig(cwd, arguments_.config);
  const outputStore = new FileSystemGeneratedOutputStore();
  if (arguments_.command === "build") {
    const compilation = await compileCatalogue(config);
    await outputStore.write(compilation, config);
    process.stdout.write(
      `Generated ${compilation.outputs.size} Mokabook files.\n`,
    );
    return 0;
  }
  if (arguments_.command === "check") {
    const compilation = await compileCatalogue(config);
    outputStore.check(compilation, config);
    process.stdout.write(
      `Mokabook output is current (${compilation.outputs.size} files).\n`,
    );
    return 0;
  }
  const base = arguments_.base ?? config.review.base;
  if (arguments_.command === "review") {
    const outDir = arguments_.out
      ? path.resolve(config.repoRoot, arguments_.out)
      : config.review.outDir;
    validateReviewOut(outDir, config, "--out", "cli-invalid");
    const result = await runReview(config, base, outDir);
    process.stdout.write(
      `Review compared ${result.screens.length} screens in ${outDir}.\n`,
    );
    return 0;
  }
  const port = arguments_.port ?? 4173;
  if (arguments_.command === "__serve-child") {
    await runServerChild(
      config,
      port,
      base,
      arguments_.updateVersion ?? 1,
      arguments_.strictPort ?? false,
    );
    return 0;
  }
  const running = await serve(config, {
    ...(arguments_.base !== undefined ? { base: arguments_.base } : {}),
    port,
    watch: arguments_.watch ?? true,
  });
  process.stdout.write(
    `Mokabook listening at ${running.url}${arguments_.watch === false ? "" : " (watching)"}\n`,
  );
  await waitForShutdown(running);
  return 0;
}

function waitForShutdown(running: RunningServe): Promise<void> {
  return new Promise((resolve, reject) => {
    let closing = false;
    const close = async (): Promise<void> => {
      if (closing) return;
      closing = true;
      try {
        await running.close();
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    process.once("SIGINT", () => void close());
    process.once("SIGTERM", () => void close());
  });
}

function packageVersion(): string {
  const packagePath = fileURLToPath(
    new URL("../../package.json", import.meta.url),
  );
  const value = JSON.parse(fs.readFileSync(packagePath, "utf8")) as {
    version?: unknown;
  };
  if (typeof value.version !== "string")
    throw new MokabookError("cli-invalid", "package version is missing");
  return value.version;
}

function assertSupportedNode(): void {
  const [major = 0, minor = 0] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 14)) {
    throw new MokabookError(
      "cli-invalid",
      `Node.js 22.14 or newer is required; found ${process.versions.node}`,
    );
  }
}
