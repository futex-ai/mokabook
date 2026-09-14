/** Background output/evidence can be adopted only by its still-current source generation. */
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
import type {
  BaselineBuilder,
  BaselineProgress,
} from "../../baseline/types.js";
import type { Compilation } from "../../build/compile.js";
import type { ComponentRuntime } from "../../build/component_runtime.js";
import type { GeneratedOutputStore } from "../../build/output_store.js";
import { timeAsync, timingCounts } from "../../diagnostics/timings.js";
import { errorMessage } from "../../errors.js";
import { prepareReviewRepository } from "../../review/prepare.js";

/** Collaborators and observers supplied by the Serve composition root. */
export interface BackgroundGenerationOptions {
  readonly resources?: ResourceWatcher;
  /** Resolves when the host shuts down; preparation stays independently cancellable. */
  readonly shutdown?: Promise<void>;
  /** The parent publishes or revokes the read capability for this generation. */
  readonly baselinePrepared?: (commit: string | null) => void;
  /**
   * Publish `preparing` while a derived baseline is genuinely rebuilt and
   * `pending` once it settles. Committed mode and a cache hit never call this.
   */
  readonly baselineStatus?: (status: "preparing" | "pending") => void;
  /** Injected by tests; the composition root builds the real one on demand. */
  readonly builder?: BaselineBuilder;
}

export class BackgroundGeneration {
  private worker: BackgroundCompilation | undefined;
  private adoption: Promise<void> = Promise.resolve();
  private sequence = 0;
  private closed = false;
  private busy = false;
  private derived = false;
  private controller: AbortController | undefined;
  private readonly shutdown: Promise<void>;
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
    private readonly options: BackgroundGenerationOptions = {},
  ) {
    this.shutdown = options.shutdown ?? new Promise(() => {});
  }

  start(runtime: ComponentRuntime, base: string, existing?: Compilation): void {
    if (this.closed) return;
    this.derived = runtime.config.generatedOutput === "derived";
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
        prepared = await this.options.resources?.prepare(
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
                onProgress: this.preparationObserver(current),
                ...(this.options.builder
                  ? { builder: this.options.builder }
                  : {}),
              })
            : undefined;
        if (!current()) return;
        if (baseline) this.options.baselinePrepared?.(baseline.commit);
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

  /**
   * Announce `preparing` only for a rebuild this generation started, and return
   * to `pending` when it settles. A failed rebuild rejects `build()`, so the
   * shared error path publishes `unavailable` with its reason on stderr alone.
   */
  private preparationObserver(
    current: () => boolean,
  ): (event: BaselineProgress) => void {
    let announced = false;
    return (event) => {
      if (event.type === "fail" || !current()) return;
      if (event.type === "start") announced = true;
      else if (!announced) return;
      this.options.baselineStatus?.(
        event.type === "start" ? "preparing" : "pending",
      );
    };
  }

  foreground(active: boolean): void {
    this.busy = active;
    this.worker?.foreground(active);
  }
  async invalidate(): Promise<void> {
    this.sequence++;
    if (this.derived) this.options.baselinePrepared?.(null);
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
