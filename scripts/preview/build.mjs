import path from "node:path";

import { buildPreview } from "./catalogue.mjs";
import { loadConfig } from "../../dist/config/load.js";
import { publicationArguments } from "../../dist/publication/options.js";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const configPath = path.join(repositoryRoot, "examples/basic/mokly.config.ts");
const parsed = publicationArguments(process.argv.slice(2));
const output = path.resolve(
  repositoryRoot,
  parsed.output ?? ".context/mokly-preview",
);
const config = await loadConfig(repositoryRoot, configPath);

await buildPreview(config, output, parsed.options);
process.stdout.write(`Built Mokly preview at ${output}.\n`);
