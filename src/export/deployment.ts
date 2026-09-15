import type { StaticDelivery } from "../navigation/delivery.js";
import type { ReviewArtifactContent } from "../review/types.js";

import { deploymentContentId } from "./content_id.js";
import { exportError } from "./error.js";
import {
  readExportShellMetadata,
  stampExportShell,
  STAGED_DEPLOYMENT_ID,
  type ExportShellMetadata,
} from "./shell_metadata.js";

/** Hash the complete final artifact, then stamp only its authenticated shell roots. */
export function finalizeDeployment(
  files: Map<string, ReviewArtifactContent>,
  shells: ReadonlyMap<string, StaticDelivery>,
  aliases: ReadonlyMap<string, string>,
): string {
  const metadata = new Map<string, ExportShellMetadata>();
  for (const [name, expected] of shells) {
    const bytes = files.get(name);
    if (bytes === undefined)
      throw exportError(`Missing static shell metadata document: ${name}`);
    const shell = readExportShellMetadata(
      name,
      Buffer.from(bytes).toString("utf8"),
      expected,
    );
    metadata.set(name, shell);
    files.set(name, stampExportShell(shell, STAGED_DEPLOYMENT_ID));
  }
  const deploymentId = deploymentContentId(files, aliases);
  for (const [name, shell] of metadata)
    files.set(name, stampExportShell(shell, deploymentId));
  return deploymentId;
}
