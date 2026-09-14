import { ServedReviewRepository } from "./review_repository.js";
import type { BaselineBuilder } from "../baseline/types.js";
import { prepareLiveRuntime } from "../build/live_runtime.js";
import {
  FileSystemGeneratedOutputStore,
  type GeneratedOutputStore,
} from "../build/output_store.js";
import { FileSystemConfigLoader, type ConfigLoader } from "../config/load.js";
import type { ResolvedConfig } from "../config/types.js";
import {
  NodeCatalogueServerFactory,
  type CatalogueServerFactory,
} from "./factory.js";
import { configuredServedReview } from "./review_routes.js";
import {
  RepositoryCatalogueChangeClassifier,
  type CatalogueChangeClassifier,
} from "./component_changes.js";
import {
  NodeProcessSupervisorFactory,
  type ProcessSupervisorFactory,
} from "./supervisor.js";
import {
  ChokidarWatcherFactory,
  type ConsumerWatcherFactory,
} from "./watcher.js";
import { BackgroundGeneration } from "./demand/generation.js";
import { serveWatched } from "./serve_watched.js";

/** Public Serve options after CLI validation. */
export interface ServeOptions {
  base?: string;
  port: number;
  watch: boolean;
}

/** Closable Serve lifecycle returned to CLI and integration tests. */
export interface RunningServe {
  close(): Promise<void>;
  port: number;
  url: string;
}

/** Injectable runtime collaborators for Serve orchestration. */
export interface ServeDependencies {
  /** Derived-mode rebuilds; Serve constructs the Node builder when absent. */
  baselineBuilder?: BaselineBuilder;
  changeClassifier?: CatalogueChangeClassifier;
  configLoader: ConfigLoader;
  outputStore: GeneratedOutputStore;
  processSupervisorFactory: ProcessSupervisorFactory;
  serverFactory: CatalogueServerFactory;
  watcherFactory: ConsumerWatcherFactory;
}

const DEFAULT_CHANGE_CLASSIFIER = new RepositoryCatalogueChangeClassifier();
const DEFAULT_DEPENDENCIES: ServeDependencies = {
  changeClassifier: DEFAULT_CHANGE_CLASSIFIER,
  configLoader: new FileSystemConfigLoader(),
  outputStore: new FileSystemGeneratedOutputStore(),
  processSupervisorFactory: new NodeProcessSupervisorFactory(),
  serverFactory: new NodeCatalogueServerFactory(),
  watcherFactory: new ChokidarWatcherFactory(),
};

/** Build a last-good snapshot and start watched or deterministic Browse. */
export async function serve(
  config: ResolvedConfig,
  options: ServeOptions,
  dependencies: ServeDependencies = DEFAULT_DEPENDENCIES,
): Promise<RunningServe> {
  if (!options.watch) {
    const runtime = await prepareLiveRuntime(config);
    config = runtime.config;
    const base = options.base ?? config.review.base;
    const repository = new ServedReviewRepository(config);
    const background = new BackgroundGeneration(
      dependencies.outputStore,
      dependencies.changeClassifier ?? DEFAULT_CHANGE_CLASSIFIER,
      (compilation, accepted) => {
        server.completeCatalogue?.(compilation.manifest, accepted.generation);
        server.publishUpdate({ kind: "evidence" });
      },
      (snapshot) =>
        server.publishUpdate({
          kind: "evidence",
          changedRoutes: snapshot?.changedRoutes ?? null,
          componentChanges: snapshot ?? null,
          changesStatus: snapshot ? "ready" : "unavailable",
        }),
      {
        baselinePrepared: (commit) => {
          repository.accept(commit);
          server.publishUpdate({
            kind: "evidence",
            ...(commit === null ? { changesStatus: "pending" } : {}),
          });
        },
        baselineStatus: (changesStatus) =>
          server.publishUpdate({ kind: "evidence", changesStatus }),
        ...(dependencies.baselineBuilder
          ? { builder: dependencies.baselineBuilder }
          : {}),
      },
    );
    const server = await dependencies.serverFactory.start(config, {
      base,
      changesStatus: "pending",
      onForeground: (active) => background.foreground(active),
      manifest: runtime.manifest,
      componentRuntime: runtime,
      port: options.port,
      review: configuredServedReview(config, base, repository),
    });
    background.start(runtime, base);
    return {
      port: server.port,
      url: server.url,
      async close() {
        await background.close();
        await server.close();
      },
    };
  }
  return serveWatched(config, options, dependencies);
}
