/** Post-adoption diagnostics never turn a completed baseline into a failed build. */
import { errorMessage } from "../errors.js";

export interface BaselineMaintenanceFailure {
  readonly entry: string;
  readonly error: unknown;
}

export function reportBaselineMaintenance(
  failure: BaselineMaintenanceFailure,
): void {
  try {
    process.stderr.write(
      `[mokabook/baseline-cleanup] ${failure.entry}: ${errorMessage(failure.error)}\n`,
    );
  } catch {
    // A closed diagnostic stream cannot revoke published output.
  }
}
