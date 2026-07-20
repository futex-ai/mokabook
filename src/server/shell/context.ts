/** Server-side context shared by every served Mokabook shell page. */

/** Server-side context shared by every shell page. */
export interface ShellContext {
  /** Route of the currently selected catalogue entry, when one is active. */
  activeRoute?: string;
  /** Review comparison base ref for the serve session. */
  base: string;
  /** Routes marked changed against the base ref; absent when unknown. */
  changedRoutes?: readonly string[];
  /** Which top-level mode the requested page belongs to. */
  mode: "browse" | "review";
}
