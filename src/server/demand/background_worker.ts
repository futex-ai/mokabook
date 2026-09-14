/** A single lower-priority background compilation; foreground requests can pause it. */
import { parentPort, workerData, type MessagePort } from "node:worker_threads";
import { setImmediate, setTimeout } from "node:timers/promises";
import type { ComponentRuntime } from "../../build/component_runtime.js";
import { compileRuntime } from "../../build/compile_runtime.js";
import { errorMessage } from "../../errors.js";
import { runWithTimings, timeAsync } from "../../diagnostics/timings.js";
import { RepositoryCatalogueChangeClassifier } from "../component_changes.js";
import type { ManifestV5 } from "../../registry/types.js";
import { WorkerGitCommandRunner } from "./git_worker.js";

const { runtime, pause, debug, existingManifest, gitPort } = workerData as {
  runtime: ComponentRuntime;
  pause: SharedArrayBuffer;
  debug: boolean;
  existingManifest?: ManifestV5;
  gitPort: MessagePort;
};
const classifier = new RepositoryCatalogueChangeClassifier(
  new WorkerGitCommandRunner(gitPort),
);
const state = new Int32Array(pause);
let manifest: ManifestV5 | undefined = existingManifest;
const checkpoint = async () => {
  await setImmediate();
  while (Atomics.load(state, 0)) await setTimeout(20);
};
if (!existingManifest)
  void runWithTimings(debug, "background", async () => {
    try {
      const compilation = await compileRuntime(runtime, checkpoint);
      manifest = compilation.manifest;
      parentPort?.postMessage({ type: "compiled", compilation });
    } catch (error) {
      parentPort?.postMessage({ type: "failed", error: errorMessage(error) });
    }
  });
parentPort?.on("message", (message: { type: string; base: string }) => {
  if (message.type !== "classify" || !manifest) return;
  void runWithTimings(debug, "background", async () => {
    await checkpoint();
    const snapshot = await timeAsync("changes.classify", () =>
      classifier.read(runtime.config, manifest!, message.base),
    );
    parentPort?.postMessage({ type: "classified", snapshot });
  });
});
