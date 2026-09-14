import { spawn, type ChildProcess } from "node:child_process";

import {
  NodeBaselineExecutableResolver,
  type BaselineExecutableResolver,
} from "./executable.js";
import type {
  BaselineProcessRequest,
  BaselineProcessResult,
  BaselineProcessRunner,
} from "./types.js";

export const MAX_COMMAND_OUTPUT_BYTES = 64 * 1024;
export const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;

/** Bounded subprocess capture; cancellation drains the process group before settling. */
export class NodeBaselineProcessRunner implements BaselineProcessRunner {
  constructor(
    private readonly executable: BaselineExecutableResolver = new NodeBaselineExecutableResolver(),
  ) {}
  readonly pid = process.pid;
  isAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code !== "ESRCH";
    }
  }

  async run(request: BaselineProcessRequest): Promise<BaselineProcessResult> {
    request.signal?.throwIfAborted();
    const [executable, ...args] = await this.executable.resolve(request);
    request.signal?.throwIfAborted();
    if (!executable) throw new Error("Baseline command has no executable");
    return new Promise((resolve, reject) => {
      const grouped = process.platform !== "win32";
      const child = spawn(executable, args, {
        cwd: request.cwd,
        env: { ...request.env },
        shell: false,
        detached: grouped,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let failure: unknown;
      let tail = Buffer.alloc(0);
      const stdout: Buffer[] = [];
      let stdoutBytes = 0;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const stop = () => {
        if (timer) return;
        terminate(child, grouped, "SIGTERM");
        timer = setTimeout(() => terminate(child, grouped, "SIGKILL"), 1000);
      };
      const abort = () => {
        failure =
          request.signal?.reason ?? new Error("Baseline command interrupted");
        stop();
      };
      const capture = (chunk: Buffer) => {
        tail = Buffer.concat([
          tail,
          chunk.subarray(-MAX_COMMAND_OUTPUT_BYTES),
        ]).subarray(-MAX_COMMAND_OUTPUT_BYTES);
      };
      child.stdout!.on("data", (chunk: Buffer) => {
        capture(chunk);
        if (!request.captureArchive || failure) return;
        stdoutBytes += chunk.byteLength;
        if (stdoutBytes > MAX_ARCHIVE_BYTES) {
          failure = new Error("Git archive exceeds 64 MiB");
          stop();
        } else stdout.push(chunk);
      });
      child.stderr!.on("data", capture);
      child.once("error", (error) => {
        failure ??= error;
      });
      child.once("close", (exitCode, signal) => {
        clearTimeout(timer);
        request.signal?.removeEventListener("abort", abort);
        if (failure) {
          terminate(child, grouped, "SIGKILL");
          reject(failure);
        } else
          resolve({
            exitCode,
            signal,
            output: tail.toString("utf8"),
            stdout: Buffer.concat(stdout),
          });
      });
      request.signal?.addEventListener("abort", abort, { once: true });
      if (request.signal?.aborted) abort();
    });
  }
}

function terminate(
  child: ChildProcess,
  grouped: boolean,
  signal: NodeJS.Signals,
): void {
  if (grouped && child.pid !== undefined) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ESRCH") return;
    }
  }
  if (child.exitCode === null && child.signalCode === null) child.kill(signal);
}
