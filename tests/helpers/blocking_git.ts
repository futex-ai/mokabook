/** A real Git process blocked on a FIFO, independent of its worker's IPC pipes. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { TestContext } from "node:test";
import { setTimeout } from "node:timers/promises";

export async function blockingGit(
  t: TestContext,
  root: string,
  ignoreTermination = false,
  withHelper = false,
) {
  const originalPath = process.env.PATH;
  const executable = execFileSync("sh", ["-c", "command -v git"], {
    encoding: "utf8",
  }).trim();
  const bin = path.join(root, "git-bin");
  const fifo = path.join(root, "git-input");
  const marker = path.join(root, "git-pid");
  const observed = new Set<number>();
  await fs.mkdir(bin);
  execFileSync("mkfifo", [fifo]);
  const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
  const hash = `exec ${quote(executable)} hash-object --no-filters ${quote(fifo)}`;
  const helper = `!printf '%s\\n' "$$" >> ${quote(marker)}; ${hash}`;
  await fs.writeFile(
    path.join(bin, "git"),
    `#!/bin/sh
if [ "$1" = "rev-parse" ] && [ "$2" = "--show-toplevel" ]; then
  ${ignoreTermination ? "trap '' TERM" : ":"}
  printf '%s\\n' "$$" >> ${quote(marker)}
  ${withHelper ? `exec ${quote(executable)} -c ${quote(`alias.mokabook-block=${helper}`)} mokabook-block` : hash}
fi
exec ${quote(executable)} "$@"
`,
    { mode: 0o755 },
  );
  const restore = () => {
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
  };
  process.env.PATH = `${bin}${path.delimiter}${originalPath ?? ""}`;
  t.after(async () => {
    restore();
    for (const pid of observed)
      if (processExists(pid)) process.kill(pid, "SIGKILL");
  });
  return {
    restore,
    async started(count = 1): Promise<number> {
      for (let attempt = 0; attempt < 300; attempt++) {
        const pids = (await fs.readFile(marker, "utf8").catch(() => ""))
          .trim()
          .split("\n")
          .map(Number)
          .filter((pid) => pid > 0);
        for (const pid of pids) observed.add(pid);
        const pid = pids[count - 1] ?? 0;
        if (pid > 0 && processExists(pid)) {
          const name = execFileSync("ps", ["-o", "comm=", "-p", String(pid)], {
            encoding: "utf8",
          }).trim();
          if (path.basename(name) === "git") return pid;
        }
        await setTimeout(10);
      }
      assert.fail("Background classification did not start its Git subprocess");
    },
  };
}

export function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return false;
    throw error;
  }
}
