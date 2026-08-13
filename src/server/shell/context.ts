/** Server-side context shared by every served Mokabook shell page. */

/** Server-side context shared by every shell page. */
export interface ShellContext {
  /** Route of the currently selected catalogue entry, when one is active. */
  activeRoute?: string;
  /** Comparison base ref for the serve session. */
  base: string;
  /** Pinned branch-point commit backing base-document routes, when known. */
  baseCommit?: string;
  /** Fragment routes that exist in the branch-point manifest. */
  baseFragments?: readonly string[];
  /** Routes changed since the base-ref branch point; absent when unknown. */
  changedRoutes?: readonly string[];
}
