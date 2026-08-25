/** Shutdown and child-restart helpers for watched Serve orchestration. */

import type { RunningServer } from "./http.js";
import type { RunningServe } from "./serve.js";
import type { ProcessSupervisor } from "./supervisor.js";
import type { ConsumerWatcher } from "./watcher.js";
import type { WatchActionQueue } from "./watch_events.js";

/** Present a deterministic child server through the public Serve lifecycle. */
export function serverLifecycle(server: RunningServer): RunningServe {
  return { close: () => server.close(), port: server.port, url: server.url };
}

/** Stop waiting for a candidate watcher as soon as watched shutdown begins. */
export async function watcherReadyBeforeShutdown(
  watcher: ConsumerWatcher,
  shutdownStarted: Promise<void>,
): Promise<boolean> {
  return Promise.race([
    watcher.ready().then(() => true),
    shutdownStarted.then(() => false),
  ]);
}

/** Close queued work, the active watcher, and child while preserving first failure. */
export async function closeWatched(
  actionQueue: WatchActionQueue,
  currentWatcher: () => ConsumerWatcher,
  supervisor: ProcessSupervisor,
): Promise<void> {
  let firstError: unknown;
  for (const close of [
    () => actionQueue.close(),
    () => currentWatcher().close(),
    () => supervisor.close(),
  ]) {
    try {
      await close();
    } catch (error) {
      firstError ??= error;
    }
  }
  if (firstError !== undefined) throw firstError;
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
