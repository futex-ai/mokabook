/** Storage subset used for one-shot reload recovery. */

import {
  parseBrowseRecoveryState,
  type BrowseRecoveryState,
} from "./browse_state.js";
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
  browse?: BrowseRecoveryState;
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
    private readonly captureBrowseState: () =>
      BrowseRecoveryState | undefined = () => undefined,
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
      const value = JSON.parse(raw) as {
        browse?: unknown;
        url?: unknown;
        version?: unknown;
      };
      if (typeof value.url !== "string" || !Number.isSafeInteger(value.version))
        return undefined;
      const browse =
        value.browse === undefined
          ? undefined
          : parseBrowseRecoveryState(value.browse);
      if (value.browse !== undefined && !browse) return undefined;
      return {
        ...(browse ? { browse } : {}),
        url: value.url,
        version: value.version as number,
      };
    } catch {
      return undefined;
    }
  }

  private receive(version: number, forceReload: boolean): void {
    if (!Number.isSafeInteger(version) || version <= this.#lastVersion) return;
    const initialReady = this.#lastVersion === 0 && !forceReload;
    this.#lastVersion = version;
    if (initialReady) return;
    const browse = this.captureBrowseState();
    const recovery: RecoveryState = {
      ...(browse ? { browse } : {}),
      url: this.location.href,
      version,
    };
    this.storage.setItem(RECOVERY_KEY, JSON.stringify(recovery));
    this.location.reload();
  }
}
