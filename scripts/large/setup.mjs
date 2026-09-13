/** Explicit fixture setup; ordinary startup never rebuilds a Git baseline. */
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { start, stop } from "./process.mjs";

const run = promisify(execFile);
export function fixtureRecord(repository, size) {
  return path.join(
    repository,
    ".context",
    `large-${size.areas}-${size.screens}-${size.rows}.json`,
  );
}

export async function prepareFixture(repository, size, debug) {
  const { generateLargeFixture } =
    await import("../../tests/fixtures/large/generate.ts");
  const beginning = performance.now();
  const context = path.join(repository, ".context");
  await fs.mkdir(context, { recursive: true });
  const root = await fs.mkdtemp(path.join(context, "mokly-large-"));
  const fixture = await generateLargeFixture(root, size);
  process.stdout.write(
    `Preparing ${fixture.routes} routes and ${fixture.documents} documents in ${root}\n`,
  );
  const baseline = start(
    [
      path.join(repository, "dist/cli/bin.js"),
      "build",
      "--config",
      fixture.configPath,
      ...(debug ? ["--debug-timings"] : []),
    ],
    root,
  );
  const forward = () => void stop(baseline);
  process.once("SIGINT", forward);
  process.once("SIGTERM", forward);
  try {
    await baseline.done;
  } finally {
    process.off("SIGINT", forward);
    process.off("SIGTERM", forward);
  }
  if (baseline.child.signalCode !== null)
    throw new Error("Fixture setup was interrupted");
  const git = (...args) => run("git", args, { cwd: root });
  await git("init", "-q", "-b", "main");
  await git("config", "user.name", "Mokly Fixture");
  await git("config", "user.email", "fixture@example.invalid");
  await git("add", ".");
  await git(
    "-c",
    "core.hooksPath=/dev/null",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-qm",
    "test: large catalogue baseline",
  );
  const record = {
    ...fixture,
    setupMs: Math.round(performance.now() - beginning),
  };
  await fs.writeFile(
    fixtureRecord(repository, size),
    JSON.stringify(record) + "\n",
  );
  process.stdout.write(
    `Fixture setup ${JSON.stringify(record)}\nReady for npm run dev:large or npm run benchmark:large.\n`,
  );
}

export async function preparedFixture(repository, size) {
  try {
    const fixture = JSON.parse(
      await fs.readFile(fixtureRecord(repository, size), "utf8"),
    );
    await fs.access(fixture.configPath);
    return fixture;
  } catch {
    throw new Error(
      `Prepare this fixture first: npm run fixture:large -- --areas ${size.areas} --screens ${size.screens} --rows ${size.rows}`,
    );
  }
}
