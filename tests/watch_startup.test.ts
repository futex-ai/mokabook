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

test("watched startup attaches the watcher before the initial output write", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const events: string[] = [];
  const watcher = new FakeWatcher(events);
  const running = await serve(
    config,
    { base: "origin/main", port: 0, watch: true },
    dependencies(events, watcher),
  );
  context.after(() => running.close());

  assert.ok(events.indexOf("watcher:create") < events.indexOf("output:write"));
  assert.ok(events.indexOf("watcher:ready") < events.indexOf("output:write"));
});

test("watcher readiness failure closes the watcher", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const events: string[] = [];
  const watcher = new FakeWatcher(events, new Error("watcher failed"));

  await assert.rejects(
    () =>
      serve(
        config,
        { base: "origin/main", port: 0, watch: true },
        dependencies(events, watcher),
      ),
    /watcher failed/,
  );
  assert.equal(watcher.closed, true);
});

function dependencies(events: string[], watcher: FakeWatcher) {
  return {
    outputStore: new FakeOutputStore(events),
    processSupervisorFactory: new FakeSupervisorFactory(events),
    serverFactory: new UnusedServerFactory(),
    watcherFactory: new FakeWatcherFactory(events, watcher),
  };
}

class FakeOutputStore implements GeneratedOutputStore {
  constructor(private readonly events: string[]) {}

  check(_compilation: Compilation, _config: ResolvedConfig): void {}

  async write(
    _compilation: Compilation,
    _config: ResolvedConfig,
  ): Promise<void> {
    this.events.push("output:write");
  }
}

class FakeWatcherFactory implements ConsumerWatcherFactory {
  constructor(
    private readonly events: string[],
    private readonly watcher: ConsumerWatcher,
  ) {}

  create(_targets: readonly string[]): ConsumerWatcher {
    this.events.push("watcher:create");
    return this.watcher;
  }
}

class FakeWatcher implements ConsumerWatcher {
  closed = false;

  constructor(
    private readonly events: string[],
    private readonly failure?: Error,
  ) {}

  async close(): Promise<void> {
    this.closed = true;
    this.events.push("watcher:close");
  }

  onChange(_callback: (path: string) => void): void {}

  onError(_callback: (error: Error) => void): void {}

  async ready(): Promise<void> {
    this.events.push("watcher:ready");
    if (this.failure) throw this.failure;
  }
}

class FakeSupervisorFactory implements ProcessSupervisorFactory {
  constructor(private readonly events: string[]) {}

  create(
    _binPath: string,
    _baseArguments: readonly string[],
    _requestedPort: number,
  ): ProcessSupervisor {
    this.events.push("supervisor:create");
    return new FakeSupervisor(this.events);
  }
}

class FakeSupervisor implements ProcessSupervisor {
  constructor(private readonly events: string[]) {}

  async close(): Promise<void> {
    this.events.push("supervisor:close");
  }

  notifyUpdate(): void {}

  onUnexpectedExit(_callback: (error: Error) => void): void {}

  async restart(): Promise<number> {
    return 43123;
  }

  async start(): Promise<number> {
    this.events.push("supervisor:start");
    return 43123;
  }
}

class UnusedServerFactory implements CatalogueServerFactory {
  async start(
    _config: ResolvedConfig,
    _options: ServerOptions,
  ): Promise<RunningServer> {
    throw new Error("watched serve must not use the in-process server factory");
  }
}
