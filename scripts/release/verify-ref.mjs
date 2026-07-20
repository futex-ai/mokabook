import fs from "node:fs";
import path from "node:path";

import { runCommand } from "../package/command.mjs";
import { remoteTagCommit, validateTagVersion } from "./context.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const ref = process.argv[2];
if (!ref) throw new Error("usage: verify-ref.mjs <vX.Y.Z>");
const packageJson = JSON.parse(
  await fs.promises.readFile(path.join(repositoryRoot, "package.json"), "utf8"),
);
validateTagVersion(ref, packageJson.version);
const head = (
  await runCommand("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot })
).stdout.trim();
const localTag = (
  await runCommand("git", ["rev-parse", `${ref}^{commit}`], {
    cwd: repositoryRoot,
  })
).stdout.trim();
const remote = (
  await runCommand(
    "git",
    ["ls-remote", "origin", `refs/tags/${ref}`, `refs/tags/${ref}^{}`],
    { cwd: repositoryRoot },
  )
).stdout;
if (head !== localTag || head !== remoteTagCommit(remote, ref)) {
  throw new Error(
    `${ref}, the local checkout, and origin do not identify one commit`,
  );
}
await runCommand(
  "git",
  ["diff", "--quiet", "--ignore-submodules", "HEAD", "--"],
  {
    cwd: repositoryRoot,
  },
);
process.stdout.write(`Verified ${ref} at ${head}.\n`);
