/** Main-thread interface to the supervised consumer renderer. */
import { Worker } from "node:worker_threads";

import { compactRuntime } from "../../build/compact_runtime.js";
import type { ComponentRuntime } from "../../build/component_runtime.js";
import {
  ComponentRenderError,
  type ComponentRenderRequest,
} from "../../components/render_types.js";

import type { TransientRender } from "./transient_assets.js";

export interface RenderWorker {
  render(request: ComponentRenderRequest): Promise<TransientRender>;
  close(): Promise<void>;
}
export interface RenderWorkerFactory {
  create(): RenderWorker;
}
export class NodeRenderWorkerFactory implements RenderWorkerFactory {
  constructor(private readonly runtime: ComponentRuntime) {}
  create(): RenderWorker {
    return new NodeRenderWorker(this.runtime);
  }
}
class NodeRenderWorker implements RenderWorker {
  private readonly worker: Worker;
  constructor(runtime: ComponentRuntime) {
    this.worker = new Worker(new URL("./worker.js", import.meta.url), {
      workerData: compactRuntime(runtime),
      execArgv: [],
      resourceLimits: { maxOldGenerationSizeMb: 256 },
    });
    this.worker.on("error", () => {});
  }
  render(request: ComponentRenderRequest): Promise<TransientRender> {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.worker.off("message", message);
        this.worker.off("error", failed);
        this.worker.off("exit", failed);
      };
      const failed = () => {
        cleanup();
        reject(
          new ComponentRenderError(
            "render-failed",
            "The preview could not be rendered. Try again or reset the props.",
          ),
        );
      };
      const message = (value: { ok: boolean; result: TransientRender }) => {
        if (!value.ok) return failed();
        cleanup();
        resolve(value.result);
      };
      this.worker.once("message", message);
      this.worker.once("error", failed);
      this.worker.once("exit", failed);
      this.worker.postMessage(request);
    });
  }
  async close(): Promise<void> {
    await this.worker.terminate();
  }
}
