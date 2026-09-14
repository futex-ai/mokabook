import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { cacheLayout } from "../dist/baseline/cache_layout.js";
import { BaselineCommandError } from "../dist/baseline/errors.js";
import { CachedBaselineBuilder } from "../dist/baseline/rebuild.js";
import type { BaselineProgress } from "../dist/baseline/types.js";
import { baselineFixture, success } from "./helpers/baseline_fixture.js";

function code(value: unknown, expected: string): boolean {
  assert.equal((value as { code: string }).code, expected);
  return true;
}

test("baseline rebuild adopts once and a cache hit executes no commands", async () => {
  const { builder, request, calls, fs } = baselineFixture();
  const events: BaselineProgress[] = [];
  const first = await builder.build({
    ...request,
    onProgress: (event) => events.push(event),
  });
  assert.equal(first.cacheHit, false);
  assert.equal(first.marker.manifestVersion, 5);
  assert.deepEqual(first.marker.commands, request.commands);
  assert.equal(
    await fs.stat(path.join(path.dirname(first.outputDir), "source")),
    undefined,
  );
  assert.equal(
    await fs.stat(path.join(path.dirname(first.outputDir), "lock")),
    undefined,
  );
  assert.deepEqual(
    calls.map((call) => call.argv[0]),
    ["git", "git", "fixture-build"],
  );
  const second = await builder.build({
    ...request,
    onProgress: (event) => events.push(event),
  });
  assert.equal(second.cacheHit, true);
  assert.equal(calls.length, 3);
  assert.deepEqual(
    events.map((event) => event.type),
    ["start", "complete", "complete"],
  );
  assert.deepEqual(calls[2]?.env, {
    PATH: "/bin",
    HOME: "/home/test",
    CI: "1",
    MOKABOOK_BASELINE_COMMIT: request.commit,
  });
  assert.deepEqual(calls[2]?.argv, request.commands[0]);
});

test("concurrent baseline builders wait for the same completed output", async () => {
  const { builder, request, runner, clock, calls } = baselineFixture();
  const run = runner.run;
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  runner.run = async (request) => {
    if (request.argv[0] === "fixture-build") await pending;
    return run(request);
  };
  clock.onSleep = release;
  const results = await Promise.all([
    builder.build(request),
    builder.build(request),
  ]);
  assert.deepEqual(results.map((result) => result.cacheHit).sort(), [
    false,
    true,
  ]);
  assert.equal(
    calls.filter((call) => call.argv[0] === "fixture-build").length,
    1,
  );
});

test("a dead lock is reclaimed and an interrupted entry is rebuilt", async () => {
  const { builder, request, fs } = baselineFixture();
  const layout = cacheLayout(request.repoRoot, request.commit);
  fs.put(layout.entry, "directory");
  fs.put(layout.lock, "regular", Buffer.from('{"pid":9999,"startedAt":0}'));
  fs.put(layout.source, "directory");
  fs.put(path.join(layout.source, "partial"), "regular");
  fs.put(layout.marker, "regular", Buffer.from("{"));
  const result = await builder.build(request);
  assert.equal(result.cacheHit, false);
  assert.equal(await fs.stat(layout.source), undefined);
});

test("a live lock times out and cancellation never removes its holder's files", async () => {
  const fixture = baselineFixture();
  const layout = cacheLayout(fixture.request.repoRoot, fixture.request.commit);
  fixture.fs.put(layout.entry, "directory");
  fixture.fs.put(
    layout.lock,
    "regular",
    Buffer.from('{"pid":42,"startedAt":0}'),
  );
  fixture.fs.put(layout.source, "directory");
  await assert.rejects(fixture.builder.build(fixture.request), (error) =>
    code(error, "baseline-lock-timeout"),
  );
  assert.ok(await fixture.fs.stat(layout.source));
  const controller = new AbortController();
  fixture.clock.onSleep = () => controller.abort();
  await assert.rejects(
    fixture.builder.build({ ...fixture.request, signal: controller.signal }),
    (error) => code(error, "baseline-interrupted"),
  );
  assert.ok(await fixture.fs.stat(layout.lock));
});

test("command failure retains status, argv and only the last output lines", async () => {
  const { builder, request, runner, fs } = baselineFixture();
  const run = runner.run;
  runner.run = async (command) =>
    command.argv[0] === "git"
      ? run(command)
      : {
          ...success,
          exitCode: 17,
          output: Array.from(
            { length: 100 },
            (_, index) => `line ${index}`,
          ).join("\n"),
        };
  await assert.rejects(builder.build(request), (error) => {
    assert.ok(error instanceof BaselineCommandError);
    assert.equal(error.exitCode, 17);
    assert.equal(error.commandIndex, 0);
    assert.deepEqual(error.argv, request.commands[0]);
    assert.equal(error.outputLines.length, 40);
    assert.equal(error.outputLines.at(-1), "line 99");
    return true;
  });
  const layout = cacheLayout(request.repoRoot, request.commit);
  assert.equal(await fs.stat(layout.marker), undefined);
  assert.equal(await fs.stat(layout.source), undefined);
  assert.equal(await fs.stat(layout.lock), undefined);
});

test("aborted command removes partial output and emits a typed failure", async () => {
  const { builder, request, runner, fs } = baselineFixture();
  const controller = new AbortController();
  const run = runner.run;
  runner.run = async (command) => {
    const result = await run(command);
    if (command.argv[0] !== "git") controller.abort();
    return result;
  };
  const events: BaselineProgress[] = [];
  await assert.rejects(
    builder.build({
      ...request,
      signal: controller.signal,
      onProgress: (event) => events.push(event),
    }),
    (error) => code(error, "baseline-interrupted"),
  );
  assert.deepEqual(
    events.map((event) => event.type),
    ["start", "fail"],
  );
  const layout = cacheLayout(request.repoRoot, request.commit);
  assert.equal(await fs.stat(layout.marker), undefined);
  assert.equal(await fs.stat(layout.output), undefined);
  assert.equal(await fs.stat(layout.source), undefined);
});

test("retention protects the active entry and every locked entry", async () => {
  const fixture = baselineFixture();
  const commits = ["a", "b", "c", "d", "e"].map((letter) => letter.repeat(40));
  for (const commit of commits.slice(0, 4)) {
    await fixture.builder.build({ ...fixture.request, commit });
    fixture.clock.time++;
  }
  const locked = cacheLayout("/repo", commits[1]!);
  fixture.fs.put(locked.lock, "regular", Buffer.from('{"pid":42}'));
  const builder = new CachedBaselineBuilder(
    fixture.fs,
    fixture.runner,
    fixture.clock,
    { ...fixture.options, retainedCount: 1 },
  );
  await builder.build({ ...fixture.request, commit: commits[4]! });
  assert.ok(await fixture.fs.stat(locked.output));
  assert.ok(await fixture.fs.stat(cacheLayout("/repo", commits[4]!).output));
  assert.equal(
    await fixture.fs.stat(cacheLayout("/repo", commits[2]!).entry),
    undefined,
  );
});

test("different catalogue settings cannot reuse or erase a completed baseline", async () => {
  const { builder, request, fs } = baselineFixture();
  const first = await builder.build(request);
  const layout = cacheLayout(request.repoRoot, request.commit);
  fs.put(layout.lock, "regular", Buffer.from('{"pid":9999}'));
  await assert.rejects(
    builder.build({ ...request, mockupsPath: "another-catalogue" }),
    (error) => code(error, "baseline-output-invalid"),
  );
  assert.ok(await fs.stat(layout.marker));
  assert.ok(await fs.stat(first.outputDir));
});

for (const outcome of ["missing", "invalid", "symlink"] as const)
  test(`rebuilt output rejects a ${outcome} manifest`, async () => {
    const { builder, request, runner, fs } = baselineFixture();
    const run = runner.run;
    runner.run = async (command) => {
      const result = await run(command);
      if (command.argv[0] !== "git") {
        const file = path.join(command.cwd, "mockups/mokabook-manifest.json");
        await fs.remove(file);
        if (outcome !== "missing")
          fs.put(
            file,
            outcome === "symlink" ? "symlink" : "regular",
            Buffer.from("{}"),
          );
      }
      return result;
    };
    await assert.rejects(builder.build(request), (error) =>
      code(error, "baseline-output-invalid"),
    );
    assert.equal(
      await fs.stat(cacheLayout(request.repoRoot, request.commit).marker),
      undefined,
    );
  });

test("history failures and unsafe cache ancestors never run consumer commands", async () => {
  const fixture = baselineFixture();
  fixture.runner.run = async () => ({
    ...success,
    exitCode: 1,
    output: "missing commit",
  });
  await assert.rejects(fixture.builder.build(fixture.request), {
    code: "baseline-history-unavailable",
  });
  fixture.fs.put("/repo/.mokabook-cache", "symlink");
  await assert.rejects(fixture.builder.build(fixture.request), {
    code: "baseline-output-invalid",
  });
  await assert.rejects(
    fixture.builder.build({ ...fixture.request, commit: "../escape" }),
    { code: "baseline-history-unavailable" },
  );
});
