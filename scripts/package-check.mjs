import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(
  await fs.promises.readFile(path.join(repositoryRoot, "package.json"), "utf8"),
);
const required = [
  "name",
  "version",
  "license",
  "repository",
  "exports",
  "bin",
  "files",
];
for (const field of required) {
  if (packageJson[field] === undefined)
    throw new Error(`package.json is missing ${field}`);
}
if (
  packageJson.name !== "mokabook" ||
  packageJson.bin?.mokabook !== "./dist/cli/bin.js"
) {
  throw new Error("package identity or executable is invalid");
}
const bin = await fs.promises.readFile(
  path.join(repositoryRoot, "dist/cli/bin.js"),
  "utf8",
);
if (!bin.startsWith("#!/usr/bin/env node"))
  throw new Error("built executable lost its shebang");
