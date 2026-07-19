import assert from "node:assert/strict";
import test from "node:test";

import {
  LiveUpdateController,
  type RecoveryStorage,
  type ReloadLocation,
  type UpdateEventStream,
} from "../dist/client/live_updates.js";

test("live updates are latest-wins and recovery is consumed once", () => {
  const stream = new FakeStream();
  const storage = new FakeStorage();
  const location = new FakeLocation();
  const controller = new LiveUpdateController(stream, storage, location);
  controller.start();
  stream.ready(1);
  assert.equal(location.reloads, 0);
  stream.update(2);
  stream.update(1);
  assert.equal(location.reloads, 1);
  assert.deepEqual(controller.consumeRecovery(), {
    url: "http://127.0.0.1:4173/view/screens/home.html",
    version: 2,
  });
  assert.equal(controller.consumeRecovery(), undefined);
  controller.close();
  assert.equal(stream.closed, true);
});

class FakeStream implements UpdateEventStream {
  closed = false;
  private readyCallback: ((version: number) => void) | undefined;
  private updateCallback: ((version: number) => void) | undefined;

  close(): void {
    this.closed = true;
  }

  onReady(callback: (version: number) => void): void {
    this.readyCallback = callback;
  }

  onUpdate(callback: (version: number) => void): void {
    this.updateCallback = callback;
  }

  ready(version: number): void {
    this.readyCallback?.(version);
  }

  update(version: number): void {
    this.updateCallback?.(version);
  }
}

class FakeStorage implements RecoveryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class FakeLocation implements ReloadLocation {
  href = "http://127.0.0.1:4173/view/screens/home.html";
  reloads = 0;

  reload(): void {
    this.reloads += 1;
  }
}
