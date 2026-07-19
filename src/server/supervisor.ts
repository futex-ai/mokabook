import { fork, type ChildProcess } from "node:child_process";

import { MokabookError, errorMessage } from "../errors.js";

interface ReadyMessage {
  port: number;
  type: "ready";
}

/** Child-process handle used by the restart supervisor. */
export interface ChildHandle {
  onError(callback: (error: Error) => void): void;
  onExit(callback: (code: number | null) => void): void;
  onMessage(callback: (message: unknown) => void): void;
  send(message: Record<string, string | number>): void;
  terminate(): void;
}

/** Factory seam for unit-testing child lifecycle ordering. */
export interface ChildFactory {
  spawn(arguments_: readonly string[]): ChildHandle;
}

/** Node IPC child factory. */
export class NodeChildFactory implements ChildFactory {
  constructor(private readonly binPath: string) {}

  spawn(arguments_: readonly string[]): ChildHandle {
    return new NodeChildHandle(
      fork(this.binPath, [...arguments_], {
        stdio: ["inherit", "inherit", "inherit", "ipc"],
      }),
    );
  }
}

/** Restartable child interface used by watched Serve. */
export interface ProcessSupervisor {
  close(): Promise<void>;
  notifyUpdate(): void;
  restart(): Promise<number>;
  start(): Promise<number>;
}

/** Factory seam for selecting the watched child-process implementation. */
export interface ProcessSupervisorFactory {
  create(
    binPath: string,
    baseArguments: readonly string[],
    requestedPort: number,
  ): ProcessSupervisor;
}

/** Node child-process supervisor factory. */
export class NodeProcessSupervisorFactory implements ProcessSupervisorFactory {
  create(
    binPath: string,
    baseArguments: readonly string[],
    requestedPort: number,
  ): ProcessSupervisor {
    return new ReadyProcessSupervisor(
      new NodeChildFactory(binPath),
      baseArguments,
      requestedPort,
    );
  }
}

/** Child supervisor that waits for readiness and retains a resolved port. */
export class ReadyProcessSupervisor implements ProcessSupervisor {
  #child: ChildHandle | undefined;
  #resolvedPort: number | undefined;
  #updateVersion = 0;

  constructor(
    private readonly factory: ChildFactory,
    private readonly baseArguments: readonly string[],
    private readonly requestedPort: number,
  ) {}

  async start(): Promise<number> {
    if (this.#child)
      throw new MokabookError(
        "server-failed",
        "server child is already running",
      );
    const port = this.#resolvedPort ?? this.requestedPort;
    this.#updateVersion += 1;
    const child = this.factory.spawn([
      ...this.baseArguments,
      "--port",
      String(port),
      "--update-version",
      String(this.#updateVersion),
    ]);
    this.#child = child;
    try {
      const readyPort = await waitForReady(child);
      this.#resolvedPort = readyPort;
      return readyPort;
    } catch (error) {
      if (this.#child === child) this.#child = undefined;
      child.terminate();
      throw error;
    }
  }

  async restart(): Promise<number> {
    await this.close();
    return this.start();
  }

  notifyUpdate(): void {
    if (!this.#child) return;
    this.#updateVersion += 1;
    this.#child.send({ type: "update", version: this.#updateVersion });
  }

  async close(): Promise<void> {
    const child = this.#child;
    if (!child) return;
    this.#child = undefined;
    await new Promise<void>((resolve) => {
      let finished = false;
      const finish = (): void => {
        if (!finished) {
          finished = true;
          resolve();
        }
      };
      child.onExit(finish);
      child.send({ type: "shutdown" });
      setTimeout(() => {
        child.terminate();
        finish();
      }, 2_000).unref();
    });
  }
}

function waitForReady(child: ChildHandle): Promise<number> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(
      () => fail(new Error("server child readiness timed out")),
      15_000,
    );
    timer.unref();
    const fail = (error: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        new MokabookError("server-failed", errorMessage(error), {
          cause: error,
        }),
      );
    };
    child.onError(fail);
    child.onExit((code) =>
      fail(new Error(`server child exited before readiness (${String(code)})`)),
    );
    child.onMessage((message) => {
      if (!isReady(message) || settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(message.port);
    });
  });
}

function isReady(message: unknown): message is ReadyMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    (message as { type?: unknown }).type === "ready" &&
    Number.isInteger((message as { port?: unknown }).port)
  );
}

class NodeChildHandle implements ChildHandle {
  constructor(private readonly child: ChildProcess) {}

  onError(callback: (error: Error) => void): void {
    this.child.once("error", callback);
  }

  onExit(callback: (code: number | null) => void): void {
    this.child.once("exit", callback);
  }

  onMessage(callback: (message: unknown) => void): void {
    this.child.on("message", callback);
  }

  send(message: Record<string, string | number>): void {
    if (this.child.connected) this.child.send(message);
  }

  terminate(): void {
    if (!this.child.killed) this.child.kill("SIGTERM");
  }
}
