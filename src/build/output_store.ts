import type { ResolvedConfig } from "../config/types.js";
import { checkCompilation } from "./check.js";
import type { Compilation } from "./compile.js";
import { writeCompilation } from "./transaction.js";

/** Filesystem boundary for generated catalogue snapshots. */
export interface GeneratedOutputStore {
  check(compilation: Compilation, config: ResolvedConfig): void;
  write(compilation: Compilation, config: ResolvedConfig): Promise<void>;
}

/** Transactional operating-system generated-output store. */
export class FileSystemGeneratedOutputStore implements GeneratedOutputStore {
  check(compilation: Compilation, config: ResolvedConfig): void {
    checkCompilation(compilation, config);
  }

  write(compilation: Compilation, config: ResolvedConfig): Promise<void> {
    return writeCompilation(compilation, config);
  }
}
