// Copies package-owned shell assets and bundles the dependency-free navigation
// resize client as a classic script for served and static catalogues.
import fs from "node:fs";
import path from "node:path";

import { build } from "esbuild";

import { bundleInspector } from "./inspector-bundle.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const source = path.join(repositoryRoot, "src", "server", "shell", "assets");
const target = path.join(repositoryRoot, "dist", "server", "shell", "assets");

await fs.promises.rm(target, { force: true, recursive: true });
await fs.promises.cp(source, target, { recursive: true });

await build({
  bundle: true,
  entryPoints: [path.join(repositoryRoot, "src", "client", "nav_resize.ts")],
  format: "iife",
  logLevel: "silent",
  outfile: path.join(repositoryRoot, "dist", "client", "navigation-resize.js"),
  platform: "browser",
  target: "es2023",
});

// Keep shell/navigation modules shared, while bundling their pure package data
// dependencies so browser clients use the same validators as artifact producers.
const clientRoot = path.join(repositoryRoot, "src", "client");
const browserRoot = path.join(repositoryRoot, "dist", "browser");
await fs.promises.rm(browserRoot, { force: true, recursive: true });
await build({
  bundle: true,
  entryPoints: (await fs.promises.readdir(clientRoot))
    .filter((name) => name.endsWith(".ts") && name !== "nav_resize.ts")
    .map((name) => path.join(clientRoot, name)),
  outdir: browserRoot,
  format: "esm",
  platform: "browser",
  target: "es2023",
  logLevel: "silent",
  plugins: [
    {
      name: "shared-shell-modules",
      setup(builder) {
        builder.onResolve({ filter: /^\.\.?\// }, (args) => {
          if (path.dirname(args.importer) !== clientRoot) return undefined;
          if (
            args.path.startsWith("./") ||
            args.path.startsWith("../navigation/")
          )
            return { external: true, path: args.path };
          return undefined;
        });
      },
    },
  ],
});
await fs.promises.copyFile(
  path.join(repositoryRoot, "dist", "client", "navigation-resize.js"),
  path.join(browserRoot, "navigation-resize.js"),
);

await bundleInspector(
  path.join(repositoryRoot, "src", "inspector", "index.ts"),
  path.join(browserRoot, "inspector.js"),
);
