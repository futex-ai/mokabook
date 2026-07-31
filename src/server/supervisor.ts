import { fork, type ChildProcess } from "node:child_process";

import { MokabookError, errorMessage } from "../errors.js";

interface ReadyMessage {
  port: number;
  type: "ready";
}

/** Child-process handle used by the restart supervisor. */
export interface ChildHandle {
  forceKill(): void;
  onError(callback: (error: Error) => void): void;
  onExit(callback: (code: number | null) => void): void;
  onMessage(callback: (message: unknown) => void): void;
  send(message: Record<string, string | number>): void;
  terminate(): void;
}

/** Time allowed for each watched-child shutdown stage. */
export interface ChildShutdownTimings {
  /** Time allowed for the IPC shutdown request. */
  gracefulMilliseconds: number;
  /** Time allowed for SIGTERM before SIGKILL. */
  terminateMilliseconds: number;
}

const DEFAULT_SHUTDOWN_TIMINGS: ChildShutdownTimings = {
  gracefulMilliseconds: 2_000,
  terminateMilliseconds: 2_000,
};
const DEFAULT_READINESS_MILLISECONDS = 15_000;

interface SupervisedChild {
  exited: Promise<void>;
  handle: ChildHandle;
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
  /** Register the watched-runtime handler for a post-readiness child failure. */
  onUnexpectedExit(callback: (error: Error) => void): void;
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
  #child: SupervisedChild | undefined;
  #unexpectedExit: ((error: Error) => void) | undefined;
  #resolvedPort: number | undefined;
  #updateVersion = 0;

  constructor(
    private readonly factory: ChildFactory,
    private readonly baseArguments: readonly string[],
    private readonly requestedPort: number,
    private readonly shutdownTimings: ChildShutdownTimings = DEFAULT_SHUTDOWN_TIMINGS,
    private readonly readinessMilliseconds = DEFAULT_READINESS_MILLISECONDS,
  ) {}

  async start(): Promise<number> {
    if (this.#child)
      throw new MokabookError(
        "server-failed",
        "server child is already running",
      );
    const resolvedPort = this.#resolvedPort;
    const port = resolvedPort ?? this.requestedPort;
    this.#updateVersion += 1;
    const child = superviseChild(
      this.factory.spawn([
        ...this.baseArguments,
        "--port",
        String(port),
        ...(resolvedPort === undefined ? [] : ["--strict-port"]),
        "--update-version",
        String(this.#updateVersion),
      ]),
    );
    this.#child = child;
    try {
      const readyPort = await waitForReady(
        child.handle,
        (error) => {
          if (this.#child !== child) return;
          this.#child = undefined;
          child.handle.terminate();
          this.#unexpectedExit?.(error);
        },
        this.readinessMilliseconds,
      );
      this.#resolvedPort = readyPort;
      return readyPort;
    } catch (error) {
      if (this.#child !== child) throw error;
      this.#child = undefined;
      await stopChild(child, this.shutdownTimings);
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
    this.#child.handle.send({ type: "update", version: this.#updateVersion });
  }

  onUnexpectedExit(callback: (error: Error) => void): void {
    this.#unexpectedExit = callback;
  }

  async close(): Promise<void> {
    const child = this.#child;
    if (!child) return;
    this.#child = undefined;
    await stopChild(child, this.shutdownTimings);
  }
}

function stopChild(
  child: SupervisedChild,
  timings: ChildShutdownTimings,
): Promise<void> {
  let forceTimer: ReturnType<typeof setTimeout> | undefined;
  const terminateTimer = setTimeout(() => {
    child.handle.terminate();
    forceTimer = setTimeout(() => {
      child.handle.forceKill();
    }, timings.terminateMilliseconds);
    forceTimer.unref();
  }, timings.gracefulMilliseconds);
  terminateTimer.unref();
  child.handle.send({ type: "shutdown" });
  return child.exited.finally(() => {
    clearTimeout(terminateTimer);
    if (forceTimer) clearTimeout(forceTimer);
  });
}

function superviseChild(handle: ChildHandle): SupervisedChild {
  return {
    exited: new Promise((resolve) => handle.onExit(() => resolve())),
    handle,
  };
}

function waitForReady(
  child: ChildHandle,
  onUnexpectedFailure: (error: Error) => void,
  readinessMilliseconds: number,
): Promise<number> {
  return new Promise((resolve, reject) => {
    let state: "failed" | "ready" | "waiting" = "waiting";
    const timer = setTimeout(
      () => fail(new Error("server child readiness timed out")),
      readinessMilliseconds,
    );
    timer.unref();
    const fail = (error: Error): void => {
      if (state !== "waiting") return;
      state = "failed";
      clearTimeout(timer);
      reject(serverFailure(error));
    };
    child.onError((error) => {
      if (state === "ready") onUnexpectedFailure(serverFailure(error));
      else fail(error);
    });
    child.onExit((code) => {
      if (state === "ready") {
        onUnexpectedFailure(
          serverFailure(
            new Error(`server child exited unexpectedly (${String(code)})`),
          ),
        );
      } else {
        fail(
          new Error(`server child exited before readiness (${String(code)})`),
        );
      }
    });
    child.onMessage((message) => {
      if (!isReady(message) || state !== "waiting") return;
      state = "ready";
      clearTimeout(timer);
      resolve(message.port);
    });
  });
}

function serverFailure(error: Error): MokabookError {
  return new MokabookError("server-failed", errorMessage(error), {
    cause: error,
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

  forceKill(): void {
    if (this.child.exitCode === null && this.child.signalCode === null)
      this.child.kill("SIGKILL");
  }

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
    if (this.child.exitCode === null && this.child.signalCode === null)
      this.child.kill("SIGTERM");
  }
}
