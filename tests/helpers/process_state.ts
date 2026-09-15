import { execFileSync } from "node:child_process";

/** Inspect one process field; a process may disappear before the query runs. */
export function readProcessField(
  pid: number,
  field: "comm" | "stat",
): string | undefined {
  try {
    return execFileSync("ps", ["-o", `${field}=`, "-p", String(pid)], {
      encoding: "utf8",
    }).trim();
  } catch (error) {
    const failed = error as {
      status?: number | null;
      signal?: string | null;
      stdout?: string;
      stderr?: string;
    };
    if (
      failed.status === 1 &&
      failed.signal === null &&
      failed.stdout === "" &&
      failed.stderr === ""
    )
      return;
    throw error;
  }
}

/** Stop a fixture process without requiring a separate liveness observation. */
export function killProcessIfPresent(pid: number): void {
  try {
    process.kill(pid, "SIGKILL");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
}
