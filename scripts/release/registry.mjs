import fs from "node:fs";
import path from "node:path";

import { runCommand, runCommandResult } from "../package/command.mjs";
import { writeWorkflowOutput } from "./context.mjs";
import {
  comparePublishedPackage,
  isMissingPackage,
} from "./registry_contract.mjs";

const options = parseOptions(process.argv.slice(2));
const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const localReport = JSON.parse(
  await fs.promises.readFile(
    path.resolve(repositoryRoot, options.report),
    "utf8",
  ),
);
const spec = `${localReport.name}@${localReport.version}`;
const metadataResult = await lookupWithRetry(spec, options.mode === "verify");
if (isMissingPackage(metadataResult)) {
  if (options.mode === "verify")
    throw new Error(`${spec} is not visible on npm`);
  writeWorkflowOutput("published", "false");
  process.stdout.write(
    `${spec} is not published; the checked tarball may publish.\n`,
  );
  process.exit(0);
}
if (metadataResult.code !== 0) {
  throw new Error(
    `npm view failed\n${metadataResult.stdout}${metadataResult.stderr}`,
  );
}
const metadata = JSON.parse(metadataResult.stdout);
const temporaryRoot = await fs.promises.mkdtemp(
  path.join(repositoryRoot, ".context", "registry-verify-"),
);
try {
  const { stdout } = await runCommand(
    "npm",
    ["pack", spec, "--json", "--pack-destination", temporaryRoot],
    { cwd: repositoryRoot },
  );
  const reports = JSON.parse(stdout);
  if (reports.length !== 1)
    throw new Error(`npm pack returned ${reports.length} reports`);
  const commit = (
    await runCommand("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot })
  ).stdout.trim();
  comparePublishedPackage(localReport, reports[0], metadata, commit);
  if (options.distTag)
    await verifyDistTag(localReport, options.distTag, repositoryRoot);
  await verifySignatures(spec, temporaryRoot);
} finally {
  await fs.promises.rm(temporaryRoot, { force: true, recursive: true });
}
writeWorkflowOutput("published", "true");
process.stdout.write(
  `${spec} matches the immutable checked artifact and registry proof.\n`,
);

async function lookupWithRetry(spec, retry) {
  const attempts = retry ? 6 : 1;
  let result;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    result = await runCommandResult("npm", ["view", spec, "--json"], {
      cwd: repositoryRoot,
    });
    if (!isMissingPackage(result) || attempt === attempts) return result;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  return result;
}

async function verifyDistTag(report, distTag, cwd) {
  const { stdout } = await runCommand(
    "npm",
    ["view", report.name, "dist-tags", "--json"],
    { cwd },
  );
  const tags = JSON.parse(stdout);
  if (tags[distTag] !== report.version) {
    throw new Error(
      `npm dist-tag ${distTag} does not identify ${report.version}`,
    );
  }
}

async function verifySignatures(spec, temporaryRoot) {
  await fs.promises.writeFile(
    path.join(temporaryRoot, "package.json"),
    `${JSON.stringify({ name: "mokabook-registry-verification", private: true })}\n`,
  );
  await runCommand(
    "npm",
    [
      "install",
      "--package-lock-only",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--save-exact",
      spec,
    ],
    { cwd: temporaryRoot },
  );
  await runCommand("npm", ["audit", "signatures"], { cwd: temporaryRoot });
}

function parseOptions(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || !value)
      throw new Error("release registry options require values");
    values[key.slice(2)] = value;
  }
  if (!new Set(["guard", "verify"]).has(values.mode) || !values.report) {
    throw new Error(
      "usage: registry.mjs --mode guard|verify --report <path> [--dist-tag <tag>]",
    );
  }
  return {
    distTag: values["dist-tag"],
    mode: values.mode,
    report: values.report,
  };
}
