import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { compileCatalogue } from "../build/compile.js";
import { FileSystemGeneratedOutputStore } from "../build/output_store.js";
import { loadConfig } from "../config/load.js";
import { runWithTimings, timeAsync } from "../diagnostics/timings.js";
import { MoklyError } from "../errors.js";
import { runServerChild } from "../server/child.js";
import { receiveComponentRuntimeStartup } from "../server/controls/runtime_ipc.js";
import { serve, type RunningServe } from "../server/serve.js";

import { parseArguments, type CliArguments } from "./arguments.js";
import { runExport } from "./export.js";
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
  return runWithTimings(
    arguments_.debugTimings ?? false,
    arguments_.command === "__serve-child" ? "child" : arguments_.command,
    () => execute(arguments_, cwd),
  );
}

async function execute(arguments_: CliArguments, cwd: string): Promise<number> {
  const runtimeStartup =
    arguments_.command === "__serve-child" && arguments_.retainedRuntime
      ? await timeAsync("child.startup-transfer", () =>
          receiveComponentRuntimeStartup(),
        )
      : undefined;
  const config =
    runtimeStartup?.config ??
    (await timeAsync("config.load", () => loadConfig(cwd, arguments_.config)));
  if (arguments_.command === "export") {
    const result = await timeAsync("export", () =>
      runExport(config, {
        outDir: arguments_.out ?? "",
        ...(arguments_.base !== undefined ? { base: arguments_.base } : {}),
      }),
    );
    process.stdout.write(
      `Exported Mokly to ${result.outDir}.\nDeploy this directory at your site's root with your hosting provider.\n`,
    );
    return 0;
  }
  const outputStore = new FileSystemGeneratedOutputStore();
  if (arguments_.command === "build") {
    const compilation = await compileCatalogue(config);
    await outputStore.write(compilation, config);
    process.stdout.write(
      `Generated ${compilation.outputs.size} Mokly files.\n`,
    );
    return 0;
  }
  if (arguments_.command === "check") {
    const compilation = await compileCatalogue(config);
    await timeAsync("output.check", async () =>
      outputStore.check(compilation, config),
    );
    process.stdout.write(
      config.generatedOutput === "derived"
        ? `Mokly output is valid and untracked (${compilation.outputs.size} files).\n`
        : `Mokly output is current (${compilation.outputs.size} files).\n`,
    );
    return 0;
  }
  const base = arguments_.base ?? config.review.base;
  const port = arguments_.port ?? 4173;
  if (arguments_.command === "__serve-child") {
    await runServerChild(
      config,
      port,
      base,
      arguments_.updateVersion ?? 1,
      arguments_.strictPort ?? false,
      arguments_.retainedRuntime ?? false,
      runtimeStartup?.manifest,
    );
    return 0;
  }
  const running = await timeAsync("serve.ready", () =>
    serve(config, {
      ...(arguments_.base !== undefined ? { base: arguments_.base } : {}),
      port,
      watch: arguments_.watch ?? true,
    }),
  );
  process.stdout.write(
    `Mokly listening at ${running.url}${arguments_.watch === false ? "" : " (watching)"}\n`,
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
    throw new MoklyError("cli-invalid", "package version is missing");
  return value.version;
}

function assertSupportedNode(): void {
  const [major = 0, minor = 0] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 14)) {
    throw new MoklyError(
      "cli-invalid",
      `Node.js 22.14 or newer is required; found ${process.versions.node}`,
    );
  }
}
