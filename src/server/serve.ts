import { fileURLToPath } from "node:url";

import { compileCatalogue } from "../build/compile.js";
import {
  FileSystemGeneratedOutputStore,
  type GeneratedOutputStore,
} from "../build/output_store.js";
import type { ResolvedConfig, WatchAction } from "../config/types.js";
import { errorMessage } from "../errors.js";
import {
  NodeCatalogueServerFactory,
  type CatalogueServerFactory,
} from "./factory.js";
import type { RunningServer } from "./http.js";
import {
  NodeProcessSupervisorFactory,
  type ProcessSupervisor,
  type ProcessSupervisorFactory,
} from "./supervisor.js";
import {
  ChokidarWatcherFactory,
  type ConsumerWatcherFactory,
} from "./watcher.js";
import {
  classifyWatchPath,
  NotificationGate,
  WatchActionQueue,
  WatchDebouncer,
  watchTargets,
} from "./watch_events.js";

/** Public Serve options after CLI validation. */
export interface ServeOptions {
  base: string;
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
  outputStore: GeneratedOutputStore;
  processSupervisorFactory: ProcessSupervisorFactory;
  serverFactory: CatalogueServerFactory;
  watcherFactory: ConsumerWatcherFactory;
}

const DEFAULT_DEPENDENCIES: ServeDependencies = {
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
  await dependencies.outputStore.write(await compileCatalogue(config), config);
  if (!options.watch) {
    const server = await dependencies.serverFactory.start(config, options);
    return serverLifecycle(server);
  }
  return serveWatched(
    config,
    options,
    dependencies.watcherFactory,
    dependencies.outputStore,
    dependencies.processSupervisorFactory,
  );
}

async function serveWatched(
  config: ResolvedConfig,
  options: ServeOptions,
  watcherFactory: ConsumerWatcherFactory,
  outputStore: GeneratedOutputStore,
  processSupervisorFactory: ProcessSupervisorFactory,
): Promise<RunningServe> {
  const gate = new NotificationGate<string>();
  const watcher = watcherFactory.create(watchTargets(config));
  watcher.onChange((candidate) => gate.notify(candidate));
  watcher.onError((error) => process.stderr.write(`${errorMessage(error)}\n`));
  await watcher.ready();
  const binPath = fileURLToPath(new URL("../cli/bin.js", import.meta.url));
  const baseArguments = [
    "__serve-child",
    "--config",
    config.configPath,
    "--base",
    options.base,
  ];
  const supervisor = processSupervisorFactory.create(
    binPath,
    baseArguments,
    options.port,
  );
  let port: number;
  try {
    port = await supervisor.start();
  } catch (error) {
    await watcher.close();
    throw error;
  }
  let closed = false;
  const processAction = async (action: WatchAction): Promise<void> => {
    if (closed) return;
    if (action === "rebuild")
      await outputStore.write(await compileCatalogue(config), config);
    if (action === "reload") supervisor.notifyUpdate();
    else await restartWithRecovery(supervisor);
  };
  const actionQueue = new WatchActionQueue(processAction, (error) =>
    process.stderr.write(`${errorMessage(error)}\n`),
  );
  const debouncer = new WatchDebouncer(config.watch.debounceMs, (action) =>
    actionQueue.notify(action),
  );
  gate.open((candidate) =>
    debouncer.notify(classifyWatchPath(candidate, config)),
  );
  return {
    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      debouncer.close();
      await watcher.close();
      await actionQueue.close();
      await supervisor.close();
    },
    port,
    url: `http://127.0.0.1:${port}`,
  };
}

/** Restore a child after a failed restart while still reporting the failure. */
export async function restartWithRecovery(
  supervisor: ProcessSupervisor,
): Promise<void> {
  try {
    await supervisor.restart();
  } catch (restartError) {
    try {
      await supervisor.start();
    } catch {
      throw restartError;
    }
    throw restartError;
  }
}

function serverLifecycle(server: RunningServer): RunningServe {
  return { close: () => server.close(), port: server.port, url: server.url };
}
