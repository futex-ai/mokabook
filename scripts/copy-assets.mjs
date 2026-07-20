// Copies non-TypeScript shell assets (the packaged Inter variable font and
// its OFL license) into dist so the compiled server can serve them at
// /__mokabook/fonts/ from the installed package.
import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const source = path.join(repositoryRoot, "src", "server", "shell", "assets");
const target = path.join(repositoryRoot, "dist", "server", "shell", "assets");

await fs.promises.rm(target, { force: true, recursive: true });
await fs.promises.cp(source, target, { recursive: true });
