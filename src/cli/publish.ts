import { loadConfig } from "../config/load.js";
import { MoklyError } from "../errors.js";
import { exportCatalogue } from "../export/run.js";
import { resolvePublishOptions } from "../publish/options.js";
import { publishCatalogue } from "../publish/run.js";
import { NodeGitCommandRunner } from "../review/git.js";
import type { CliArguments } from "./arguments.js";
import { packageVersion } from "./version.js";

/** Validate credentials first and drain export/upload work on termination signals. */
export async function runPublish(
  arguments_: CliArguments,
  cwd: string,
): Promise<void> {
  const options = resolvePublishOptions(arguments_, process.env);
  const controller = new AbortController();
  const cancel = (): void => controller.abort();
  process.on("SIGINT", cancel);
  process.on("SIGTERM", cancel);
  try {
    const config = await loadConfig(cwd, arguments_.config);
    await publishCatalogue(
      config,
      { ...arguments_, ...options },
      packageVersion(),
      process.env,
      {
        git: new NodeGitCommandRunner(config.repoRoot, controller.signal),
        export: exportCatalogue,
        fetch,
        now: () => new Date(),
      },
      controller.signal,
    );
  } catch (error) {
    if (error instanceof MoklyError) throw error;
    throw new MoklyError(
      "upload-failed",
      "Could not prepare the publication. Check local configuration and temporary storage before retrying.",
    );
  } finally {
    process.off("SIGINT", cancel);
    process.off("SIGTERM", cancel);
  }
}
