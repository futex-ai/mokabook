import chokidar, { type FSWatcher } from "chokidar";

/** Consumer-input watcher lifecycle used by watched Serve. */
export interface ConsumerWatcher {
  close(): Promise<void>;
  onChange(callback: (path: string) => void): void;
  onError(callback: (error: Error) => void): void;
  ready(): Promise<void>;
}

/** Factory seam for watcher integration tests and alternate platforms. */
export interface ConsumerWatcherFactory {
  create(targets: readonly string[]): ConsumerWatcher;
}

/** Chokidar-backed consumer watcher factory. */
export class ChokidarWatcherFactory implements ConsumerWatcherFactory {
  create(targets: readonly string[]): ConsumerWatcher {
    return new ChokidarConsumerWatcher(
      chokidar.watch([...targets], {
        awaitWriteFinish: { pollInterval: 20, stabilityThreshold: 50 },
        ignoreInitial: true,
      }),
    );
  }
}

class ChokidarConsumerWatcher implements ConsumerWatcher {
  constructor(private readonly watcher: FSWatcher) {}

  close(): Promise<void> {
    return this.watcher.close();
  }

  onChange(callback: (path: string) => void): void {
    this.watcher.on("all", (_event, candidate) => callback(candidate));
  }

  onError(callback: (error: Error) => void): void {
    this.watcher.on("error", (error) =>
      callback(error instanceof Error ? error : new Error(String(error))),
    );
  }

  ready(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.watcher.once("ready", resolve);
      this.watcher.once("error", reject);
    });
  }
}
