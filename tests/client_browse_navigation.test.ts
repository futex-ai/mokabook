import assert from "node:assert/strict";
import test from "node:test";

import {
  isNavDisclosureKey,
  NavDisclosurePreference,
  type NavPreferenceStorage,
} from "../dist/client/browse_navigation.js";

test("stable collection keys preserve independent disclosure across reloads", () => {
  const storage = new FakeStorage();
  const firstAlpha = group("collection:alpha", false);
  const firstBeta = group("collection:beta", true);
  new NavDisclosurePreference(storage).remember(
    fakeDocument(firstAlpha, firstBeta),
  );

  const nextAlpha = group("collection:alpha", true);
  const nextBeta = group("collection:beta", false);
  new NavDisclosurePreference(storage).apply(fakeDocument(nextAlpha, nextBeta));

  assert.equal(nextAlpha.open, false);
  assert.equal(nextBeta.open, true);
});

test("legacy label paths cannot match current disclosure keys", () => {
  assert.equal(isNavDisclosureKey("collection:example-screens"), true);
  assert.equal(isNavDisclosureKey("legacy:archive/screens"), true);
  assert.equal(isNavDisclosureKey("/Example/Screens"), false);

  const current = group("collection:example-screens", true);
  const preference = new NavDisclosurePreference(
    new FakeStorage(JSON.stringify(["/Example/Screens"])),
  );
  preference.apply(fakeDocument(current));
  assert.equal(current.open, true);
});

function group(key: string, open: boolean): HTMLDetailsElement {
  return {
    getAttribute(name: string) {
      return name === "data-nav-collection" ? key : null;
    },
    open,
  } as HTMLDetailsElement;
}

function fakeDocument(...groups: HTMLDetailsElement[]): Document {
  return {
    querySelectorAll(selector: string) {
      assert.equal(selector, "details[data-nav-collection]");
      return groups;
    },
  } as unknown as Document;
}

class FakeStorage implements NavPreferenceStorage {
  constructor(public value: string | null = null) {}

  getItem(): string | null {
    return this.value;
  }

  setItem(_key: string, value: string): void {
    this.value = value;
  }
}
