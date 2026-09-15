import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import test, { type TestContext } from "node:test";

import {
  killProcessIfPresent,
  readProcessField,
} from "./helpers/process_state.js";

function inspectWith(t: TestContext, result: string | Error): void {
  t.mock.method(childProcess, "execFileSync", () => {
    if (result instanceof Error) throw result;
    return result;
  });
  syncBuiltinESMExports();
  t.after(() => {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  });
}

test("fixture cleanup accepts a process that has already exited", (t) => {
  t.mock.method(process, "kill", () => {
    throw Object.assign(new Error("Process exited"), { code: "ESRCH" });
  });
  assert.doesNotThrow(() => killProcessIfPresent(123));
});

test("fixture cleanup retains permission failures", (t) => {
  const error = Object.assign(new Error("Permission denied"), {
    code: "EPERM",
  });
  t.mock.method(process, "kill", () => {
    throw error;
  });
  assert.throws(
    () => killProcessIfPresent(123),
    (actual) => actual === error,
  );
});

test("fixture cleanup terminates the exact process without a liveness probe", (t) => {
  const kill = t.mock.method(process, "kill", () => true);
  killProcessIfPresent(123);
  assert.equal(kill.mock.callCount(), 1);
  assert.deepEqual(kill.mock.calls[0]!.arguments, [123, "SIGKILL"]);
});

for (const field of ["comm", "stat"] as const) {
  test(`a process disappearing before ps ${field} is absent`, (t) => {
    inspectWith(
      t,
      Object.assign(new Error("No matching process"), {
        status: 1,
        signal: null,
        stdout: "",
        stderr: "",
      }),
    );
    assert.equal(readProcessField(123, field), undefined);
  });
}

for (const state of ["S", "Z", "git"]) {
  test(`process inspection preserves ${state} for the caller to assert`, (t) => {
    inspectWith(t, ` ${state}\n`);
    assert.equal(readProcessField(123, "stat"), state);
  });
}

for (const details of [
  { code: "ENOENT" },
  { status: 2, signal: null, stdout: "", stderr: "" },
  { status: 1, signal: null, stdout: "", stderr: "permission denied" },
  { status: 1, signal: null, stdout: "S\n", stderr: "" },
  { status: null, signal: "SIGTERM", stdout: "", stderr: "" },
]) {
  test(`unexpected process-inspection failure is retained: ${JSON.stringify(details)}`, (t) => {
    const error = Object.assign(new Error("Inspection failed"), details);
    inspectWith(t, error);
    assert.throws(
      () => readProcessField(123, "stat"),
      (actual) => actual === error,
    );
  });
}
