import assert from "node:assert/strict";
import test from "node:test";

import { startBrowserLiveUpdates } from "../dist/client/browser.js";

test("browser adapter connects updates to reload and shutdown", () => {
  const source = new FakeEventSource();
  const storage = new FakeStorage();
  const location = new FakeLocation();
  let pageHide: (() => void) | undefined;
  const controller = startBrowserLiveUpdates({
    createEventSource(url) {
      assert.equal(url, "/__mokabook/events");
      return source;
    },
    location,
    onPageHide(callback) {
      pageHide = callback;
    },
    storage,
  });

  source.emit("ready", "1");
  source.emit("update", "2");
  assert.equal(location.reloads, 1);
  assert.deepEqual(controller.consumeRecovery(), {
    url: "http://127.0.0.1:4173/view/screens/home.html",
    version: 2,
  });
  pageHide?.();
  assert.equal(source.closed, true);
});

class FakeEventSource {
  closed = false;
  readonly listeners = new Map<string, (event: { data: string }) => void>();

  addEventListener(
    type: string,
    callback: (event: { data: string }) => void,
  ): void {
    this.listeners.set(type, callback);
  }

  close(): void {
    this.closed = true;
  }

  emit(type: string, data: string): void {
    this.listeners.get(type)?.({ data });
  }
}

class FakeStorage {
  readonly values = new Map<string, string>();

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

class FakeLocation {
  href = "http://127.0.0.1:4173/view/screens/home.html";
  reloads = 0;

  reload(): void {
    this.reloads += 1;
  }
}
