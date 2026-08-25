import { fileURLToPath } from "node:url";

import { compileCatalogue } from "../build/compile.js";
import {
  FileSystemGeneratedOutputStore,
  type GeneratedOutputStore,
} from "../build/output_store.js";
import { FileSystemConfigLoader, type ConfigLoader } from "../config/load.js";
import type { ResolvedConfig } from "../config/types.js";
import { errorMessage } from "../errors.js";
import {
  NodeCatalogueServerFactory,
  type CatalogueServerFactory,
} from "./factory.js";
import { configuredServedReview } from "./review_routes.js";
import { computeChangedRoutes } from "./changed.js";
import {
  NodeProcessSupervisorFactory,
  type ProcessSupervisor,
  type ProcessSupervisorFactory,
} from "./supervisor.js";
import {
  ChokidarWatcherFactory,
  type ConsumerWatcher,
  type ConsumerWatcherFactory,
} from "./watcher.js";
import {
  closeWatched,
  restartWithRecovery,
  serverLifecycle,
  watcherReadyBeforeShutdown,
} from "./serve_lifecycle.js";
import {
  classifyWatchPath,
  isPackageOwnedIgnoredWatchPath,
  NotificationGate,
  type RuntimeWatchAction,
  WatchActionQueue,
  WatchDebouncer,
  watchTargets,
} from "./watch_events.js";

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
  configLoader: ConfigLoader;
  outputStore: GeneratedOutputStore;
  processSupervisorFactory: ProcessSupervisorFactory;
  serverFactory: CatalogueServerFactory;
  watcherFactory: ConsumerWatcherFactory;
}

const DEFAULT_DEPENDENCIES: ServeDependencies = {
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
    await dependencies.outputStore.write(
      await compileCatalogue(config),
      config,
    );
    const base = options.base ?? config.review.base;
    const server = await dependencies.serverFactory.start(config, {
      base,
      port: options.port,
      review: configuredServedReview(config, base),
    });
    return serverLifecycle(server);
  }
  return serveWatched(
    config,
    options,
    dependencies.configLoader,
    dependencies.watcherFactory,
    dependencies.outputStore,
    dependencies.processSupervisorFactory,
  );
}

async function serveWatched(
  config: ResolvedConfig,
  options: ServeOptions,
  configLoader: ConfigLoader,
  watcherFactory: ConsumerWatcherFactory,
  outputStore: GeneratedOutputStore,
  processSupervisorFactory: ProcessSupervisorFactory,
): Promise<RunningServe> {
  const gate = new NotificationGate<string>();
  const failureGate = new NotificationGate<Error>();
  let activeConfig = config;
  let watcher = createWatcher(watcherFactory, activeConfig, gate);
  let supervisor: ProcessSupervisor | undefined;
  let manifestSignature = "";
  let port: number;
  try {
    await watcher.ready();
    const initialCompilation = await compileCatalogue(config);
    await outputStore.write(initialCompilation, config);
    manifestSignature = JSON.stringify(initialCompilation.manifest);
    const binPath = fileURLToPath(new URL("../cli/bin.js", import.meta.url));
    const baseArguments = [
      "__serve-child",
      "--config",
      config.configPath,
      ...(options.base !== undefined ? ["--base", options.base] : []),
    ];
    supervisor = processSupervisorFactory.create(
      binPath,
      baseArguments,
      options.port,
    );
    supervisor.onUnexpectedExit((error) => failureGate.notify(error));
    port = await supervisor.start();
  } catch (error) {
    await Promise.allSettled([watcher.close(), supervisor?.close()]);
    throw error;
  }
  const runningSupervisor = supervisor;
  let closed = false;
  let signalShutdown: () => void = () => undefined;
  const shutdownStarted = new Promise<void>((resolve) => {
    signalShutdown = resolve;
  });
  let debouncer: WatchDebouncer | undefined;
  const notifyCandidate = (candidate: string): void => {
    debouncer?.notify(classifyWatchPath(candidate, activeConfig));
  };
  const reconfigure = async (): Promise<void> => {
    const nextConfig = await configLoader.load(activeConfig.configPath);
    const replacementGate = new NotificationGate<string>();
    const replacement = createWatcher(
      watcherFactory,
      nextConfig,
      replacementGate,
    );
    let transferred = false;
    let replacementClosed = false;
    const closeReplacement = async (): Promise<void> => {
      if (replacementClosed) return;
      replacementClosed = true;
      await replacement.close();
    };
    try {
      const ready = await watcherReadyBeforeShutdown(
        replacement,
        shutdownStarted,
      );
      if (!ready || closed) {
        await closeReplacement();
        return;
      }
      const nextCompilation = await compileCatalogue(nextConfig);
      await outputStore.write(nextCompilation, nextConfig);
      manifestSignature = JSON.stringify(nextCompilation.manifest);
      if (closed) {
        await closeReplacement();
        return;
      }
      const previous = watcher;
      activeConfig = nextConfig;
      watcher = replacement;
      transferred = true;
      debouncer?.close();
      debouncer = new WatchDebouncer(activeConfig.watch.debounceMs, (action) =>
        actionQueue.notify(action),
      );
      replacementGate.open(notifyCandidate);
      let closeError: unknown;
      try {
        await previous.close();
      } catch (error) {
        closeError = error;
      }
      if (!closed) await restartWithRecovery(runningSupervisor);
      if (closeError !== undefined) throw closeError;
    } catch (error) {
      if (!transferred) await closeReplacement();
      throw error;
    }
  };
  const processAction = async (action: RuntimeWatchAction): Promise<void> => {
    if (closed) return;
    if (action === "reconfigure") {
      await reconfigure();
      return;
    }
    if (action === "rebuild") {
      const nextCompilation = await compileCatalogue(activeConfig);
      await outputStore.write(nextCompilation, activeConfig);
      const nextSignature = JSON.stringify(nextCompilation.manifest);
      if (nextSignature === manifestSignature) {
        await publishUpdate();
      } else {
        manifestSignature = nextSignature;
        await restartWithRecovery(runningSupervisor);
      }
      return;
    }
    if (action === "reload") {
      await publishUpdate();
      return;
    }
    await restartWithRecovery(runningSupervisor);
  };
  const publishUpdate = async (): Promise<void> => {
    const base = options.base ?? activeConfig.review.base;
    const changedRoutes = await computeChangedRoutes(activeConfig, base);
    if (!closed) runningSupervisor.notifyUpdate(changedRoutes);
  };
  const actionQueue = new WatchActionQueue(processAction, (error) =>
    process.stderr.write(`${errorMessage(error)}\n`),
  );
  debouncer = new WatchDebouncer(activeConfig.watch.debounceMs, (action) =>
    actionQueue.notify(action),
  );
  failureGate.open((error) => {
    if (closed) return;
    process.stderr.write(`${errorMessage(error)}\n`);
    actionQueue.notify("restart");
  });
  gate.open(notifyCandidate);
  return {
    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      signalShutdown();
      debouncer?.close();
      await closeWatched(actionQueue, () => watcher, runningSupervisor);
    },
    port,
    url: `http://127.0.0.1:${port}`,
  };
}

function createWatcher(
  factory: ConsumerWatcherFactory,
  config: ResolvedConfig,
  gate: NotificationGate<string>,
): ConsumerWatcher {
  const watcher = factory.create(watchTargets(config), (candidate) =>
    isPackageOwnedIgnoredWatchPath(candidate, config),
  );
  watcher.onChange((candidate) => gate.notify(candidate));
  watcher.onError((error) => process.stderr.write(`${errorMessage(error)}\n`));
  return watcher;
}
