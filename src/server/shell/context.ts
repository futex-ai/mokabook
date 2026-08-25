/** Server-side context shared by every served Mokabook shell page. */

/** Server-side context shared by every shell page. */
export interface ShellContext {
  /** Route of the currently selected catalogue entry, when one is active. */
  activeRoute?: string;
  /** Review comparison base ref for the serve session. */
  base: string;
  /** Routes changed since the base-ref branch point; absent when unknown. */
  changedRoutes?: readonly string[];
  /** Which top-level mode the requested page belongs to. */
  mode: "browse" | "review";
  /** Validated logical fragment applied to the routed target's frames. */
  fragment?: string;
}

/** Create one page context from the current mutable server snapshot. */
export function shellContext(
  base: string,
  changedRoutes: readonly string[] | undefined,
  mode: ShellContext["mode"],
): ShellContext {
  return {
    base,
    ...(changedRoutes ? { changedRoutes } : {}),
    mode,
  };
}
