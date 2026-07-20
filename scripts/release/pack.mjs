import fs from "node:fs";
import path from "node:path";

import { createPackageArchive } from "../package/archive.mjs";
import { writeWorkflowOutput } from "./context.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const destination = path.resolve(
  repositoryRoot,
  process.argv[2] ?? ".context/release-artifact",
);
const { archivePath, report } = await createPackageArchive(
  repositoryRoot,
  destination,
);
await fs.promises.writeFile(
  path.join(destination, "pack-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
writeWorkflowOutput("archive_path", archivePath);
writeWorkflowOutput("integrity", report.integrity);
writeWorkflowOutput("version", report.version);
process.stdout.write(`Prepared ${archivePath} (${report.integrity}).\n`);
