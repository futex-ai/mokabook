import fs from "node:fs";
import path from "node:path";

import {
  createPackageArchive,
  inspectDryRun,
  inspectRuntimeLicenses,
} from "./package/archive.mjs";
import {
  smokeAccountingFixture,
  smokeCleanCacheExecution,
  smokeEsmConsumer,
  smokeJunoFixture,
  smokeNodeNextConsumer,
} from "./package/consumer_cases.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const fixturesRoot = path.join(repositoryRoot, "tests/fixtures/consumers");
const contextRoot = path.join(repositoryRoot, ".context");
await fs.promises.mkdir(contextRoot, { recursive: true });
const workingRoot = await fs.promises.mkdtemp(
  path.join(contextRoot, "package-smoke-"),
);

try {
  const packageJson = JSON.parse(
    await fs.promises.readFile(
      path.join(repositoryRoot, "package.json"),
      "utf8",
    ),
  );
  await inspectDryRun(repositoryRoot);
  await inspectRuntimeLicenses(repositoryRoot);
  const { archivePath } = await createPackageArchive(
    repositoryRoot,
    path.join(workingRoot, "archive"),
  );
  const context = {
    archivePath,
    fixturesRoot,
    packageVersion: packageJson.version,
    versions: {
      react: packageJson.devDependencies.react,
      reactDom: packageJson.devDependencies["react-dom"],
      reactDomTypes: packageJson.devDependencies["@types/react-dom"],
      reactTypes: packageJson.devDependencies["@types/react"],
      typescript: packageJson.devDependencies.typescript,
    },
    workingRoot,
  };
  await smokeEsmConsumer(context);
  await smokeNodeNextConsumer(context);
  await smokeCleanCacheExecution(context);
  await smokeAccountingFixture(context);
  await smokeJunoFixture(context);
  process.stdout.write("Packed Mokabook consumers passed.\n");
} finally {
  await fs.promises.rm(workingRoot, { force: true, recursive: true });
}
