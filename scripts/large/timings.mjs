/** Keep benchmark clocks local while accepting chunked diagnostics from child processes. */
export function timingCollector(now = () => performance.now()) {
  let partial = "";
  const records = [];
  return {
    records,
    accept(chunk) {
      const decoded =
        typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
      const lines = (partial + decoded).split("\n");
      partial = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("[mokly:timing] ")) continue;
        try {
          const event = JSON.parse(line.slice("[mokly:timing] ".length));
          if (event?.schemaVersion === 1 && typeof event.stage === "string")
            records.push({ event, receivedMs: now() });
        } catch {
          continue;
        }
      }
    },
  };
}

/** A claimed cold/warm run must actually rebuild/reuse the pinned baseline. */
export function baselineMeasurement(records, beginning, cacheHit) {
  const completed = records.filter(
    ({ event }) => event.stage === "baseline" && event.event === "end",
  );
  if (completed.length !== 1)
    throw new Error("Expected exactly one completed baseline preparation");
  const { event, receivedMs } = completed[0];
  if (
    event.status !== "ok" ||
    event.cacheHit !== cacheHit ||
    !Number.isFinite(event.durationMs)
  )
    throw new Error(
      `Expected a successful ${cacheHit ? "warm" : "cold"} baseline preparation`,
    );
  const phases = records.filter(
    ({ event: phase }) =>
      phase.session === event.session &&
      phase.parentId === event.id &&
      phase.event === "end",
  );
  if (cacheHit && phases.length)
    throw new Error("A warm baseline unexpectedly ran build phases");
  if (
    !cacheHit &&
    !phases.some(
      ({ event }) => event.stage === "baseline.adopt" && event.status === "ok",
    )
  )
    throw new Error("A cold baseline did not adopt rebuilt output");
  return {
    cacheHit,
    baselineMs: event.durationMs,
    baselineReadyMs: Math.round(receivedMs - beginning),
    preparingToPendingMs: cacheHit ? 0 : event.durationMs,
    baselinePhases: phases.map(({ event }) => ({
      stage: event.stage,
      durationMs: event.durationMs,
    })),
  };
}
