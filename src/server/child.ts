import type { ResolvedConfig } from "../config/types.js";
import { computeChangedRoutes } from "./changed.js";
import { startCatalogueServer } from "./http.js";
import { configuredServedReview } from "./review_routes.js";

/** Run the hidden deterministic server child until its parent shuts it down. */
export async function runServerChild(
  config: ResolvedConfig,
  port: number,
  base: string,
  updateVersion: number,
  strictPort: boolean,
): Promise<void> {
  const changedRoutes = await computeChangedRoutes(config, base);
  const server = await startCatalogueServer(config, {
    base,
    ...(changedRoutes ? { changedRoutes } : {}),
    port,
    review: configuredServedReview(config, base),
    strictPort,
    updateVersion,
  });
  process.send?.({ port: server.port, type: "ready", version: updateVersion });
  if (!process.send)
    process.stdout.write(`Mokabook listening at ${server.url}\n`);
  try {
    await waitForChildShutdown(server);
  } finally {
    if (process.connected) process.disconnect?.();
  }
}

function waitForChildShutdown(
  server: Awaited<ReturnType<typeof startCatalogueServer>>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let closing = false;
    const cleanup = (): void => {
      process.off("disconnect", onDisconnect);
      process.off("message", onMessage);
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
    };
    const close = async (): Promise<void> => {
      if (closing) return;
      closing = true;
      try {
        await server.close();
        cleanup();
        resolve();
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    const onMessage = (message: unknown): void => {
      if (isUpdateMessage(message)) server.publishUpdate(message.version);
      if (isMessage(message, "shutdown")) void close();
    };
    const onDisconnect = (): void => void close();
    const onSignal = (): void => void close();
    process.once("disconnect", onDisconnect);
    process.on("message", onMessage);
    process.once("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);
  });
}

function isUpdateMessage(
  value: unknown,
): value is { type: "update"; version: number } {
  return (
    isMessage(value, "update") &&
    Number.isSafeInteger((value as { version?: unknown }).version)
  );
}

function isMessage(value: unknown, type: string): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === type
  );
}
