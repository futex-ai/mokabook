import assert from "node:assert/strict";
import test from "node:test";

import { restartWithRecovery } from "../dist/server/serve.js";
import {
  ReadyProcessSupervisor,
  type ChildFactory,
  type ChildHandle,
} from "../dist/server/supervisor.js";

test("supervisor waits for readiness and shuts down before restart", async () => {
  const factory = new ResponsiveChildFactory();
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
    "--strict-port",
    "--update-version",
    "3",
  ]);
  factory.children[1]?.ready(48123);
  assert.equal(await restarting, 48123);
  await supervisor.close();
});

test(
  "supervisor close waits for an unresponsive child to exit",
  { timeout: 5_000 },
  async () => {
    const factory = new UnresponsiveChildFactory();
    const supervisor = new ReadyProcessSupervisor(
      factory,
      ["__serve-child"],
      0,
      { gracefulMilliseconds: 10, terminateMilliseconds: 10 },
    );
    const starting = supervisor.start();
    factory.child.ready(48123);
    await starting;
    let closed = false;
    const closing = supervisor.close().then(() => {
      closed = true;
    });

    await waitFor(() => factory.child.forceKills === 1);
    try {
      assert.equal(factory.child.terminations, 1);
      assert.equal(factory.child.forceKills, 1);
      assert.equal(closed, false);
    } finally {
      factory.child.exit(0);
      await closing;
    }
  },
);

test(
  "recovery reaps a readiness-stalled child before replacing it",
  { timeout: 20_000 },
  async () => {
    const initial = new ResponsiveChild();
    const stalled = new ForceKillResponsiveChild();
    const replacement = new ResponsiveChild();
    const factory = new SequencedChildFactory([initial, stalled, replacement]);
    const supervisor = new ReadyProcessSupervisor(
      factory,
      ["__serve-child"],
      0,
      { gracefulMilliseconds: 10, terminateMilliseconds: 10 },
      10,
    );
    const starting = supervisor.start();
    initial.ready(48123);
    await starting;

    const recovery = restartWithRecovery(supervisor);
    await waitFor(() => factory.arguments_.length === 3);
    assert.equal(stalled.terminations, 1);
    assert.equal(stalled.forceKills, 1);
    assert.deepEqual(factory.arguments_[2], [
      "__serve-child",
      "--port",
      "48123",
      "--strict-port",
      "--update-version",
      "3",
    ]);
    replacement.ready(48123);
    await assert.rejects(recovery, /server child readiness timed out/);
    await supervisor.close();
  },
);

class UnresponsiveChildFactory implements ChildFactory {
  readonly child = new UnresponsiveChild();

  spawn(_arguments: readonly string[]): ChildHandle {
    return this.child;
  }
}

class ResponsiveChildFactory implements ChildFactory {
  readonly arguments_: string[][] = [];
  readonly children: ResponsiveChild[] = [];

  spawn(arguments_: readonly string[]): ChildHandle {
    this.arguments_.push([...arguments_]);
    const child = new ResponsiveChild();
    this.children.push(child);
    return child;
  }
}

class SequencedChildFactory implements ChildFactory {
  readonly arguments_: string[][] = [];
  private next = 0;

  constructor(private readonly children: readonly ChildHandle[]) {}

  spawn(arguments_: readonly string[]): ChildHandle {
    const child = this.children[this.next];
    if (!child) throw new Error("no child configured for spawn");
    this.arguments_.push([...arguments_]);
    this.next += 1;
    return child;
  }
}

class ResponsiveChild implements ChildHandle {
  readonly messages: Array<Record<string, string | number>> = [];
  private readonly exitCallbacks: Array<(code: number | null) => void> = [];
  private messageCallback: ((message: unknown) => void) | undefined;

  forceKill(): void {
    this.exit(null);
  }

  onError(_callback: (error: Error) => void): void {}

  onExit(callback: (code: number | null) => void): void {
    this.exitCallbacks.push(callback);
  }

  onMessage(callback: (message: unknown) => void): void {
    this.messageCallback = callback;
  }

  send(message: Record<string, string | number>): void {
    this.messages.push(message);
    if (message.type === "shutdown") queueMicrotask(() => this.exit(0));
  }

  terminate(): void {
    this.exit(null);
  }

  ready(port: number): void {
    this.messageCallback?.({ port, type: "ready" });
  }

  private exit(code: number | null): void {
    for (const callback of this.exitCallbacks.splice(0)) callback(code);
  }
}

class UnresponsiveChild implements ChildHandle {
  forceKills = 0;
  terminations = 0;
  private readonly exitCallbacks: Array<(code: number | null) => void> = [];
  private readonly messageCallbacks: Array<(message: unknown) => void> = [];

  forceKill(): void {
    this.forceKills += 1;
  }

  onError(_callback: (error: Error) => void): void {}

  onExit(callback: (code: number | null) => void): void {
    this.exitCallbacks.push(callback);
  }

  onMessage(callback: (message: unknown) => void): void {
    this.messageCallbacks.push(callback);
  }

  send(_message: Record<string, string | number>): void {}

  terminate(): void {
    this.terminations += 1;
  }

  exit(code: number | null): void {
    for (const callback of this.exitCallbacks.splice(0)) callback(code);
  }

  ready(port: number): void {
    for (const callback of this.messageCallbacks) {
      callback({ port, type: "ready" });
    }
  }
}

class ForceKillResponsiveChild extends UnresponsiveChild {
  override forceKill(): void {
    super.forceKill();
    this.exit(null);
  }
}

async function waitFor(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("shutdown escalation did not complete");
}
