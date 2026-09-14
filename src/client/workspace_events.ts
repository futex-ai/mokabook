/** Disposable shell input and layout subscriptions, independent of workspace state. */
export interface WorkspaceActions {
  refresh(): void;
  highlight(): void;
  scheme(): void;
  viewport(): void;
  variant(value: string): void;
  escape(event: KeyboardEvent): void;
}
export function installWorkspaceEvents(
  root: HTMLElement,
  win: Window & typeof globalThis,
  signal: AbortSignal,
  actions: WorkspaceActions,
): void {
  const doc = root.ownerDocument;
  root.addEventListener(
    "click",
    (event) => {
      const target =
        event.target instanceof win.Element ? event.target : undefined;
      if (target?.closest("[data-workspace-highlight]")) actions.highlight();
      if (target?.closest("[data-workspace-scheme]")) actions.scheme();
    },
    { signal },
  );
  root.addEventListener(
    "change",
    (event) => {
      const target = event.target;
      if (!(target instanceof win.HTMLSelectElement)) return;
      if (target.matches("[data-workspace-viewport]")) actions.viewport();
      if (target.matches("[data-workspace-variant]"))
        actions.variant(target.value);
    },
    { signal },
  );
  doc.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") actions.escape(event);
    },
    { signal },
  );
  for (const frame of root.querySelectorAll("iframe[data-workspace-frame]"))
    frame.addEventListener("load", actions.refresh, { signal });
  const mutations = new MutationObserver(actions.refresh);
  mutations.observe(doc.body, {
    attributes: true,
    attributeFilter: ["data-mokly-color-scheme"],
  });
  const stage = root.querySelector("[data-mokly-stage]");
  if (stage)
    mutations.observe(stage, {
      attributes: true,
      attributeFilter: ["data-viewport"],
    });
  signal.addEventListener("abort", () => mutations.disconnect(), {
    once: true,
  });
}
