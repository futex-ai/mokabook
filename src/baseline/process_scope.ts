import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { BaselineProcessRequest } from "./types.js";
import type { WindowsProcessJob } from "./windows_job.js";

/** Own every subprocess of one command, including after its immediate launcher exits. */
export interface BaselineProcessScope {
  spawn(request: BaselineProcessRequest): ChildProcess;
  start(): void;
  terminate(signal: NodeJS.Signals): void;
  dispose(): Promise<void>;
}

export interface BaselineProcessScopeFactory {
  create(): Promise<BaselineProcessScope>;
}

export class NodeBaselineProcessScopeFactory implements BaselineProcessScopeFactory {
  async create(): Promise<BaselineProcessScope> {
    if (process.platform !== "win32") return new NodeBaselineProcessScope();
    const { createWindowsProcessJob } = await import("./windows_job.js");
    return new NodeBaselineProcessScope(await createWindowsProcessJob());
  }
}

class NodeBaselineProcessScope implements BaselineProcessScope {
  private child: ChildProcess | undefined;
  private argv: readonly string[] = [];

  constructor(private readonly job?: WindowsProcessJob) {}

  spawn(request: BaselineProcessRequest): ChildProcess {
    this.argv = request.argv;
    const [executable = "", ...args] = request.argv;
    this.child = this.job
      ? spawn(
          process.execPath,
          [fileURLToPath(new URL("./process_worker.js", import.meta.url))],
          {
            cwd: request.cwd,
            env: { ...request.env },
            shell: false,
            windowsHide: true,
            stdio: ["ignore", "pipe", "pipe", "ipc"],
          },
        )
      : spawn(executable, args, {
          cwd: request.cwd,
          env: { ...request.env },
          shell: false,
          detached: true,
          stdio: ["ignore", "pipe", "pipe"],
        });
    return this.child;
  }

  /** The worker waits for this release, so no historical code can outrun job assignment. */
  start(): void {
    const child = this.child;
    if (!this.job || child?.pid === undefined) return;
    this.job.assign(child.pid);
    child.send({ argv: this.argv }, (error) => {
      if (error) child.emit("error", error);
    });
  }

  terminate(signal: NodeJS.Signals): void {
    const child = this.child;
    if (!child) return;
    if (this.job) {
      try {
        this.job.terminate();
      } finally {
        if (child.exitCode === null && child.signalCode === null)
          child.kill(signal);
      }
      return;
    }
    if (child.pid !== undefined) {
      try {
        process.kill(-child.pid, signal);
        return;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ESRCH") return;
      }
    }
    if (child.exitCode === null && child.signalCode === null)
      child.kill(signal);
  }

  async dispose(): Promise<void> {
    await this.job?.dispose();
  }
}
