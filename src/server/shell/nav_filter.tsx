/** Stable catalogue controls distinguish unknown evidence from a real empty result. */
import type { ShellContext } from "./context.js";

export function NavFilter({ context }: { context: ShellContext }) {
  const status = context.changedRoutes ? "ready" : context.changesStatus;
  if (!status) return null;
  return (
    <div
      aria-label="Catalogue filter"
      className="mbk-nav-filter"
      data-mokly-filter=""
      data-changes-status={status}
      role="group"
    >
      <button
        aria-pressed="true"
        className="mbk-nav-filter-opt"
        data-filter="all"
        type="button"
      >
        All
      </button>
      <button
        aria-pressed="false"
        className="mbk-nav-filter-opt"
        data-filter="changed"
        type="button"
      >
        Changes
        <span className="mbk-nav-filter-count">
          {status === "pending" ? (
            <span
              className="mbk-nav-spinner"
              role="status"
              aria-label="Checking for changes"
            />
          ) : status === "ready" ? (
            context.changedRoutes?.length
          ) : (
            <span aria-label="Changes unavailable">—</span>
          )}
        </span>
      </button>
    </div>
  );
}

export function NavStatus({ context }: { context: ShellContext }) {
  if (!context.changesStatus && !context.changedRoutes) return null;
  return (
    <div className="mbk-nav-status" data-nav-status="" hidden role="status">
      {context.changesStatus === "pending" && !context.changedRoutes ? (
        <span className="mbk-nav-spinner" aria-hidden="true" />
      ) : null}
      <span data-nav-status-text="">
        {context.changedRoutes
          ? "No changes found."
          : context.changesStatus === "pending"
            ? "Checking for changes…"
            : "Changes are unavailable. You can still browse All."}
      </span>
    </div>
  );
}
