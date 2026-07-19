import assert from "node:assert/strict";
import test from "node:test";

import type { Compilation } from "../dist/build/compile.js";
import type { GeneratedOutputStore } from "../dist/build/output_store.js";
import { loadConfig } from "../dist/config/load.js";
import type { ResolvedConfig } from "../dist/config/types.js";
import type { CatalogueServerFactory } from "../dist/server/factory.js";
import type { RunningServer, ServerOptions } from "../dist/server/http.js";
import { serve } from "../dist/server/serve.js";
import type {
  ProcessSupervisor,
  ProcessSupervisorFactory,
} from "../dist/server/supervisor.js";
import type {
  ConsumerWatcher,
  ConsumerWatcherFactory,
} from "../dist/server/watcher.js";
import { createFixture, removeFixture } from "./helpers/fixture.js";

test("shutdown during config adoption closes the final watcher without restart", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const loaded = await loadConfig(fixture.root);
  const config: ResolvedConfig = {
    ...loaded,
    watch: { ...loaded.watch, debounceMs: 0 },
  };
  const output = new BlockingOutputStore();
  const watchers = new FakeWatcherFactory();
  const supervisor = new FakeSupervisor();
  const running = await serve(
    config,
    { port: 0, watch: true },
    {
      configLoader: { load: async () => config },
      outputStore: output,
      processSupervisorFactory: new FakeSupervisorFactory(supervisor),
      serverFactory: new UnusedServerFactory(),
      watcherFactory: watchers,
    },
  );

  watchers.watchers[0]?.change(config.configPath);
  await output.candidateStarted;
  const closing = running.close();
  output.releaseCandidate();
  await closing;

  assert.equal(watchers.watchers.length, 2);
  assert.equal(watchers.watchers[0]?.closed, true);
  assert.equal(watchers.watchers[1]?.closed, true);
  assert.equal(supervisor.restarts, 0);
  assert.equal(supervisor.closed, true);
});

class BlockingOutputStore implements GeneratedOutputStore {
  private writes = 0;
  private release: (() => void) | undefined;
  private markCandidateStarted: () => void = () => undefined;
  readonly candidateStarted = new Promise<void>((resolve) => {
    this.markCandidateStarted = resolve;
  });

  check(_compilation: Compilation, _config: ResolvedConfig): void {}

  async write(
    _compilation: Compilation,
    _config: ResolvedConfig,
  ): Promise<void> {
    this.writes += 1;
    if (this.writes === 1) return;
    this.markCandidateStarted();
    await new Promise<void>((resolve) => {
      this.release = resolve;
    });
  }

  releaseCandidate(): void {
    this.release?.();
  }
}

class FakeWatcherFactory implements ConsumerWatcherFactory {
  readonly watchers: FakeWatcher[] = [];

  create(_targets: readonly string[]): ConsumerWatcher {
    const watcher = new FakeWatcher();
    this.watchers.push(watcher);
    return watcher;
  }
}

class FakeWatcher implements ConsumerWatcher {
  closed = false;
  private changeCallback: ((candidate: string) => void) | undefined;

  async close(): Promise<void> {
    this.closed = true;
  }

  onChange(callback: (candidate: string) => void): void {
    this.changeCallback = callback;
  }

  onError(_callback: (error: Error) => void): void {}

  async ready(): Promise<void> {}

  change(candidate: string): void {
    this.changeCallback?.(candidate);
  }
}

class FakeSupervisorFactory implements ProcessSupervisorFactory {
  constructor(private readonly supervisor: ProcessSupervisor) {}

  create(
    _binPath: string,
    _baseArguments: readonly string[],
    _requestedPort: number,
  ): ProcessSupervisor {
    return this.supervisor;
  }
}

class FakeSupervisor implements ProcessSupervisor {
  closed = false;
  restarts = 0;

  async close(): Promise<void> {
    this.closed = true;
  }

  notifyUpdate(): void {}

  onUnexpectedExit(_callback: (error: Error) => void): void {}

  async restart(): Promise<number> {
    this.restarts += 1;
    return 48123;
  }

  async start(): Promise<number> {
    return 48123;
  }
}

class UnusedServerFactory implements CatalogueServerFactory {
  async start(
    _config: ResolvedConfig,
    _options: ServerOptions,
  ): Promise<RunningServer> {
    throw new Error("watched Serve must not start an in-process server");
  }
}
