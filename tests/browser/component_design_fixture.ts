import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { repositoryRoot } from "../helpers/fixture.js";
import type { ManifestV5 } from "../../dist/registry/types.js";

const generated = path.join(repositoryRoot, "examples/basic/generated");
const manifest = JSON.parse(
  fs.readFileSync(path.join(generated, "mokly-manifest.json"), "utf8"),
) as ManifestV5;

export const componentDesignRoutes = manifest.entries.flatMap((entry) =>
  entry.kind === "screen" && entry.route.startsWith("design/components/")
    ? [entry.route.slice("design/components/".length, -".html".length)]
    : [],
);

export function componentDesignUrl(route: string, viewport: string): string {
  return pathToFileURL(
    path.join(
      repositoryRoot,
      "examples/basic/generated/design/components",
      `${route}.${viewport}.html`,
    ),
  ).href;
}
