/** Storage subset used for one-shot reload recovery. */
export interface RecoveryStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

/** Browser location subset used by live updates. */
export interface ReloadLocation {
  href: string;
  reload(): void;
}

/** Event stream subset used by the package client. */
export interface UpdateEventStream {
  close(): void;
  onReady(callback: (version: number) => void): void;
  onUpdate(callback: (version: number) => void): void;
}

/** One-shot recovery payload consumed after an automatic reload. */
export interface RecoveryState {
  url: string;
  version: number;
}

const RECOVERY_KEY = "mokabook:live-update-recovery";

/** Coordinate latest-wins reloads and one-shot directory-state recovery. */
export class LiveUpdateController {
  #lastVersion = 0;

  constructor(
    private readonly stream: UpdateEventStream,
    private readonly storage: RecoveryStorage,
    private readonly location: ReloadLocation,
  ) {}

  /** Begin receiving server update versions. */
  start(): void {
    this.stream.onReady((version) => this.receive(version, false));
    this.stream.onUpdate((version) => this.receive(version, true));
  }

  /** Close the stream when the shell unmounts. */
  close(): void {
    this.stream.close();
  }

  /** Consume recovery exactly once; later manual refreshes see no stale state. */
  consumeRecovery(): RecoveryState | undefined {
    const raw = this.storage.getItem(RECOVERY_KEY);
    this.storage.removeItem(RECOVERY_KEY);
    if (!raw) return undefined;
    try {
      const value = JSON.parse(raw) as { url?: unknown; version?: unknown };
      return typeof value.url === "string" && Number.isInteger(value.version)
        ? { url: value.url, version: value.version as number }
        : undefined;
    } catch {
      return undefined;
    }
  }

  private receive(version: number, forceReload: boolean): void {
    if (!Number.isSafeInteger(version) || version <= this.#lastVersion) return;
    const initialReady = this.#lastVersion === 0 && !forceReload;
    this.#lastVersion = version;
    if (initialReady) return;
    this.storage.setItem(
      RECOVERY_KEY,
      JSON.stringify({ url: this.location.href, version }),
    );
    this.location.reload();
  }
}
