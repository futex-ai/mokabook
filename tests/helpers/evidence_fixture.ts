/** A controllable live generation with real previews and exhaustive usage. */
import path from "node:path";

import {
  createFixture,
  removeFixture,
  reparentedEntrySource,
} from "./fixture.js";
import { compileCatalogue } from "../../dist/build/compile.js";
import { prepareLiveRuntime } from "../../dist/build/live_runtime.js";
import { loadConfig } from "../../dist/config/load.js";
import { startCatalogueServer } from "../../dist/server/http.js";

export async function startEvidenceFixture(
  source = reparentedEntrySource("screens"),
) {
  const fixture = await createFixture(source, {
    extraConfig: 'colorSchemes: ["light", "dark"],',
  });
  try {
    const runtime = await prepareLiveRuntime(await loadConfig(fixture.root));
    const compilation = await compileCatalogue(runtime.config);
    let comparisonRequests = 0;
    const server = await startCatalogueServer(runtime.config, {
      base: "main",
      port: 0,
      manifest: runtime.manifest,
      componentRuntime: runtime,
      changesStatus: "pending",
      review: {
        base: "main",
        outDir: path.join(fixture.root, ".review"),
        generate: async () => {
          comparisonRequests++;
          throw new Error("Comparisons are not requested by this fixture");
        },
      },
    });
    return {
      server,
      runtime,
      compilation,
      get comparisonRequests() {
        return comparisonRequests;
      },
      async close() {
        await server.close();
        await removeFixture(fixture);
      },
    };
  } catch (error) {
    await removeFixture(fixture);
    throw error;
  }
}
