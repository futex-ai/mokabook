import {
  captureBrowseState,
  restoreBrowseState,
  type BrowseRecoveryState,
} from "./browse_state.js";
import {
  LiveUpdateController,
  type RecoveryStorage,
  type ReloadLocation,
  type UpdateEventStream,
} from "./live_updates.js";

/** EventSource subset consumed by the browser adapter. */
export interface BrowserEventSource {
  addEventListener(
    type: "ready" | "update",
    callback: (event: { data: string }) => void,
  ): void;
  close(): void;
}

/** Injectable browser globals used to test the served live-update entry. */
export interface BrowserLiveUpdateEnvironment {
  createEventSource(url: string): BrowserEventSource;
  captureBrowseState(): BrowseRecoveryState | undefined;
  location: ReloadLocation;
  onPageHide(callback: () => void): void;
  restoreBrowseState(state: BrowseRecoveryState): void;
  storage: RecoveryStorage;
}

/** Connect a served document to Mokabook's versioned update stream. */
export function startBrowserLiveUpdates(
  environment: BrowserLiveUpdateEnvironment,
): LiveUpdateController {
  const controller = new LiveUpdateController(
    new EventSourceStream(environment.createEventSource("/__mokabook/events")),
    environment.storage,
    environment.location,
    environment.captureBrowseState,
  );
  const recovery = controller.consumeRecovery();
  if (recovery?.browse && recovery.url === environment.location.href)
    environment.restoreBrowseState(recovery.browse);
  controller.start();
  environment.onPageHide(() => controller.close());
  return controller;
}

class EventSourceStream implements UpdateEventStream {
  constructor(private readonly source: BrowserEventSource) {}

  close(): void {
    this.source.close();
  }

  onReady(callback: (version: number) => void): void {
    this.source.addEventListener("ready", (event) =>
      callback(Number(event.data)),
    );
  }

  onUpdate(callback: (version: number) => void): void {
    this.source.addEventListener("update", (event) =>
      callback(Number(event.data)),
    );
  }
}

if (typeof window !== "undefined" && typeof EventSource !== "undefined") {
  startBrowserLiveUpdates({
    captureBrowseState: () => captureBrowseState(document, window),
    createEventSource: (url) => new EventSource(url),
    location: window.location,
    onPageHide: (callback) =>
      window.addEventListener("pagehide", callback, { once: true }),
    restoreBrowseState: (state) => restoreBrowseState(document, window, state),
    storage: window.sessionStorage,
  });
}
