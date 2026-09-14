/** Observe visited resource closures without waiting for all catalogue documents. */
import { ResourceWatcher } from "../resource_watcher.js";
import type { ConsumerWatcherFactory } from "../watcher.js";
import type { PreviewObservation } from "./observation.js";
import type { ComponentRuntime } from "../../build/component_runtime.js";
import { errorMessage } from "../../errors.js";

export class PreviewResources {
  private readonly resources: ResourceWatcher;
  private pending: Promise<void> = Promise.resolve();
  private generation: string | undefined;
  private closed = false;
  constructor(
    factory: ConsumerWatcherFactory,
    changed: (path: string) => void,
    private readonly current: () => ComponentRuntime,
    private readonly shutdown: Promise<void>,
  ) {
    this.resources = new ResourceWatcher(factory, changed, (error) =>
      process.stderr.write(`${errorMessage(error)}\n`),
    );
  }
  get paths(): ReadonlySet<string> {
    return this.resources.paths;
  }

  observe(observation: PreviewObservation): void {
    this.pending = this.pending
      .then(async () => {
        const runtime = this.current();
        const valid = () =>
          !this.closed && this.current().generation === observation.generation;
        if (!valid()) return;
        const prepared = await this.resources.prepare(
          runtime.config,
          { outputs: new Map(observation.documents) },
          this.shutdown,
          true,
          this.generation === observation.generation,
        );
        try {
          if (valid()) {
            prepared?.adopt();
            this.generation = observation.generation;
          }
        } finally {
          await prepared?.close();
        }
      })
      .catch((error) => {
        if (!this.closed) process.stderr.write(`${errorMessage(error)}\n`);
      });
  }

  async close(): Promise<void> {
    this.closed = true;
    await this.pending;
    await this.resources.close();
  }
}
