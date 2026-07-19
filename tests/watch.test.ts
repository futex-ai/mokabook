import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import type { Compilation } from "../dist/build/compile.js";
import type { GeneratedOutputStore } from "../dist/build/output_store.js";
import { FileSystemConfigLoader, loadConfig } from "../dist/config/load.js";
import type { ResolvedConfig } from "../dist/config/types.js";
import type { CatalogueServerFactory } from "../dist/server/factory.js";
import type { RunningServer, ServerOptions } from "../dist/server/http.js";
import { restartWithRecovery, serve } from "../dist/server/serve.js";
import {
  NotificationGate,
  WatchActionQueue,
  WatchDebouncer,
  classifyWatchPath,
  type DebounceClock,
} from "../dist/server/watch_events.js";
import {
  ReadyProcessSupervisor,
  type ChildFactory,
  type ChildHandle,
  type ProcessSupervisor,
  type ProcessSupervisorFactory,
} from "../dist/server/supervisor.js";
import type {
  ConsumerWatcher,
  ConsumerWatcherFactory,
} from "../dist/server/watcher.js";
import { createFixture, removeFixture } from "./helpers/fixture.js";

test("notification gate preserves startup events", () => {
  const gate = new NotificationGate<string>();
  const received: string[] = [];
  gate.notify("first");
  gate.notify("second");
  gate.open((value) => received.push(value));
  gate.notify("third");
  assert.deepEqual(received, ["first", "second", "third"]);
});

test("debouncer emits only the highest-impact action", () => {
  const clock = new FakeClock();
  const actions: string[] = [];
  const debouncer = new WatchDebouncer(
    75,
    (action) => actions.push(action),
    clock,
  );
  debouncer.notify("reload");
  debouncer.notify("restart");
  debouncer.notify("rebuild");
  clock.flush();
  assert.deepEqual(actions, ["rebuild"]);
});

test("watch actions serialize and coalesce work received during a rebuild", async () => {
  const actions: string[] = [];
  let active = 0;
  let maxActive = 0;
  let releaseFirst: (() => void) | undefined;
  const first = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const errors: unknown[] = [];
  const queue = new WatchActionQueue(
    async (action) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      actions.push(action);
      if (actions.length === 1) await first;
      active -= 1;
    },
    (error) => errors.push(error),
  );
  queue.notify("reload");
  await new Promise((resolve) => setImmediate(resolve));
  queue.notify("restart");
  queue.notify("rebuild");
  releaseFirst?.();
  await queue.settled();
  assert.deepEqual(actions, ["reload", "rebuild"]);
  assert.equal(maxActive, 1);
  assert.deepEqual(errors, []);
  await queue.close();
});

test("watch classification is derived from consumer config", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  assert.equal(classifyWatchPath(fixture.entryPath, config), "rebuild");
  assert.equal(
    classifyWatchPath(path.join(fixture.root, "notes.md"), config),
    "ignore",
  );
  assert.equal(
    classifyWatchPath(path.join(fixture.mockupsDir, "generated.html"), config),
    "ignore",
  );
});

test("Serve orchestration accepts fake filesystem, server, and watcher boundaries", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const outputStore = new FakeOutputStore();
  const serverFactory = new FakeServerFactory();
  const running = await serve(
    config,
    { base: "origin/main", port: 0, watch: false },
    {
      configLoader: new FileSystemConfigLoader(),
      outputStore,
      processSupervisorFactory: new UnusedProcessSupervisorFactory(),
      serverFactory,
      watcherFactory: new UnusedWatcherFactory(),
    },
  );
  assert.equal(outputStore.writes, 1);
  assert.equal(serverFactory.starts, 1);
  assert.equal(running.port, 43210);
  await running.close();
  assert.equal(serverFactory.closed, true);
});

test("supervisor waits for readiness, keeps port, sends update, and shuts down before restart", async () => {
  const factory = new FakeFactory();
  const supervisor = new ReadyProcessSupervisor(factory, ["__serve-child"], 0);
  const starting = supervisor.start();
  factory.children[0]?.ready(48123);
  assert.equal(await starting, 48123);
  supervisor.notifyUpdate();
  assert.deepEqual(factory.children[0]?.messages, [
    { type: "update", version: 2 },
  ]);

  const restarting = supervisor.restart();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(factory.children[0]?.messages, [
    { type: "update", version: 2 },
    { type: "shutdown" },
  ]);
  assert.deepEqual(factory.arguments_[1], [
    "__serve-child",
    "--port",
    "48123",
    "--update-version",
    "3",
  ]);
  factory.children[1]?.ready(48123);
  assert.equal(await restarting, 48123);
  await supervisor.close();
});

test("a failed restart restores a child and retains the original diagnostic", async () => {
  const supervisor = new RecoverableFakeSupervisor();
  await assert.rejects(() => restartWithRecovery(supervisor), /restart failed/);
  assert.equal(supervisor.restarts, 1);
  assert.equal(supervisor.starts, 1);
});

class FakeClock implements DebounceClock {
  private callback: (() => void) | undefined;
  private readonly handle = { fake: true } as unknown as ReturnType<
    typeof setTimeout
  >;

  clear(_handle: ReturnType<typeof setTimeout>): void {
    this.callback = undefined;
  }

  schedule(
    callback: () => void,
    _milliseconds: number,
  ): ReturnType<typeof setTimeout> {
    this.callback = callback;
    return this.handle;
  }

  flush(): void {
    const callback = this.callback;
    this.callback = undefined;
    callback?.();
  }
}

class FakeOutputStore implements GeneratedOutputStore {
  writes = 0;

  check(_compilation: Compilation, _config: ResolvedConfig): void {}

  async write(
    _compilation: Compilation,
    _config: ResolvedConfig,
  ): Promise<void> {
    this.writes += 1;
  }
}

class FakeServerFactory implements CatalogueServerFactory {
  closed = false;
  starts = 0;

  async start(
    _config: ResolvedConfig,
    _options: ServerOptions,
  ): Promise<RunningServer> {
    this.starts += 1;
    return {
      close: async () => {
        this.closed = true;
      },
      port: 43210,
      publishUpdate: () => undefined,
      url: "http://127.0.0.1:43210",
    };
  }
}

class UnusedWatcherFactory implements ConsumerWatcherFactory {
  create(_targets: readonly string[]): ConsumerWatcher {
    throw new Error("no-watch Serve must not create a watcher");
  }
}

class UnusedProcessSupervisorFactory implements ProcessSupervisorFactory {
  create(
    _binPath: string,
    _baseArguments: readonly string[],
    _requestedPort: number,
  ): ProcessSupervisor {
    throw new Error("no-watch Serve must not create a process supervisor");
  }
}

class FakeFactory implements ChildFactory {
  readonly arguments_: string[][] = [];
  readonly children: FakeChild[] = [];

  spawn(arguments_: readonly string[]): ChildHandle {
    this.arguments_.push([...arguments_]);
    const child = new FakeChild();
    this.children.push(child);
    return child;
  }
}

class RecoverableFakeSupervisor implements ProcessSupervisor {
  restarts = 0;
  starts = 0;

  async close(): Promise<void> {}

  notifyUpdate(): void {}

  onUnexpectedExit(_callback: (error: Error) => void): void {}

  async restart(): Promise<number> {
    this.restarts += 1;
    throw new Error("restart failed");
  }

  async start(): Promise<number> {
    this.starts += 1;
    return 48123;
  }
}

class FakeChild implements ChildHandle {
  readonly messages: Array<Record<string, string | number>> = [];
  private errorCallback: ((error: Error) => void) | undefined;
  private exitCallback: ((code: number | null) => void) | undefined;
  private messageCallback: ((message: unknown) => void) | undefined;

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  onExit(callback: (code: number | null) => void): void {
    this.exitCallback = callback;
  }

  onMessage(callback: (message: unknown) => void): void {
    this.messageCallback = callback;
  }

  send(message: Record<string, string | number>): void {
    this.messages.push(message);
    if (message.type === "shutdown")
      queueMicrotask(() => this.exitCallback?.(0));
  }

  terminate(): void {
    this.exitCallback?.(null);
  }

  ready(port: number): void {
    this.messageCallback?.({ port, type: "ready" });
  }
}
