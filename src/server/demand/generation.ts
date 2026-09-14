/** Background output/evidence can be adopted only by its still-current source generation. */
import type { ComponentRuntime } from "../../build/component_runtime.js";
import type { Compilation } from "../../build/compile.js";
import type { GeneratedOutputStore } from "../../build/output_store.js";
import { errorMessage } from "../../errors.js";
import { timeAsync, timingCounts } from "../../diagnostics/timings.js";
import type {
  CatalogueChangeClassifier,
  ComponentChangeSnapshot,
} from "../component_changes.js";
import { RepositoryCatalogueChangeClassifier } from "../component_changes.js";
import type {
  PreparedResourceWatch,
  ResourceWatcher,
} from "../resource_watcher.js";
import { BackgroundCompilation } from "./background.js";
import { prepareReviewRepository } from "../../review/repository.js";

export class BackgroundGeneration {
  private worker: BackgroundCompilation | undefined;
  private adoption: Promise<void> = Promise.resolve();
  private sequence = 0;
  private closed = false;
  private busy = false;
  private controller: AbortController | undefined;
  constructor(
    private readonly store: GeneratedOutputStore,
    private readonly classifier: CatalogueChangeClassifier,
    private readonly completed: (
      compilation: Compilation,
      runtime: ComponentRuntime,
    ) => void,
    private readonly classified: (
      snapshot: ComponentChangeSnapshot | undefined,
    ) => void,
    private readonly resources?: ResourceWatcher,
    private readonly shutdown: Promise<void> = new Promise(() => {}),
  ) {}

  start(runtime: ComponentRuntime, base: string, existing?: Compilation): void {
    if (this.closed) return;
    const sequence = ++this.sequence;
    const controller = (this.controller = new AbortController());
    const worker = (this.worker = new BackgroundCompilation(runtime, existing));
    worker.foreground(this.busy);
    const current = () => !this.closed && sequence === this.sequence;
    this.adoption = (async () => {
      let prepared: PreparedResourceWatch | undefined;
      try {
        const compilation = await worker.compilation;
        if (!current()) return;
        prepared = await this.resources?.prepare(
          runtime.config,
          compilation,
          this.shutdown,
          existing !== undefined,
        );
        if (!current()) return;
        if (!existing) await this.store.write(compilation, runtime.config);
        if (!current()) return;
        prepared?.adopt();
        this.completed(compilation, runtime);
        const baseline =
          runtime.config.generatedOutput === "derived" &&
          this.classifier instanceof RepositoryCatalogueChangeClassifier
            ? await prepareReviewRepository(runtime.config, base, {
                signal: controller.signal,
              })
            : undefined;
        if (!current()) return;
        const snapshot = await timeAsync("changes.classify", () =>
          this.classifier instanceof RepositoryCatalogueChangeClassifier
            ? worker.classify(base, baseline?.commit)
            : Promise.race([
                this.classifier.read(
                  runtime.config,
                  compilation.manifest,
                  base,
                  controller.signal,
                  { outputs: compilation.outputs },
                ),
                new Promise<undefined>((resolve) =>
                  controller.signal.addEventListener(
                    "abort",
                    () => resolve(undefined),
                    { once: true },
                  ),
                ),
              ]),
        );
        if (current()) {
          if (snapshot)
            timingCounts("changes.publish", () => ({
              changedRoutes: snapshot.changedRoutes?.length ?? 0,
            }));
          this.classified(snapshot);
        }
      } catch (error) {
        if (current()) {
          process.stderr.write(`${errorMessage(error)}\n`);
          this.classified(undefined);
        }
      } finally {
        await prepared?.close();
      }
    })();
  }

  foreground(active: boolean): void {
    this.busy = active;
    this.worker?.foreground(active);
  }
  async invalidate(): Promise<void> {
    this.sequence++;
    this.controller?.abort();
    this.controller = undefined;
    const worker = this.worker;
    this.worker = undefined;
    await worker?.close();
    await this.adoption;
  }
  async close(): Promise<void> {
    this.closed = true;
    await this.invalidate();
  }
}
