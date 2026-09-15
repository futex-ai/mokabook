import type {
  BaselineClock,
  BaselineFileSystem,
  BaselineProcessRunner,
} from "../../src/baseline/types.js";
import type { ResolvedConfig } from "../../src/config/types.js";
import type { RepositoryEvidence } from "../../src/review/git.js";

export function resetFixtureBaseline(
  config: Pick<ResolvedConfig, "repoRoot" | "review">,
  dependencies?: {
    fs?: BaselineFileSystem;
    runner?: BaselineProcessRunner;
    clock?: BaselineClock;
    evidence?: RepositoryEvidence;
  },
): Promise<void>;
