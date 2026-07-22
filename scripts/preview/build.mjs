import fs from "node:fs";
import path from "node:path";

import { isPublicStaticFile } from "../../dist/config/public_files.js";
import { loadConfig } from "../../dist/config/load.js";
import { isInside, projectRealPath } from "../../dist/config/paths.js";
import { readManifest } from "../../dist/registry/manifest.js";
import { startCatalogueServer } from "../../dist/server/http.js";
import {
  captureReviewArtifact,
  readReviewArtifactFile,
} from "../../dist/server/review_artifact_files.js";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const contextRoot = path.join(repositoryRoot, ".context");
const configPath = path.join(
  repositoryRoot,
  "examples/basic/mokabook.config.ts",
);
const markerName = ".mokabook-preview-artifact";
const liveUpdateScript =
  '<script src="/__mokabook/client/browser.js" type="module"></script>';
const outputDir = outputArgument(process.argv.slice(2));

await buildPreview(outputDir);
process.stdout.write(`Built Mokabook preview at ${outputDir}.\n`);

async function buildPreview(output) {
  await fs.promises.mkdir(contextRoot, { recursive: true });
  const resolvedOutput = resolveSafeOutput(output);
  assertOwnedOutput(resolvedOutput);
  await fs.promises.mkdir(path.dirname(resolvedOutput), { recursive: true });
  const stage = await fs.promises.mkdtemp(
    path.join(path.dirname(resolvedOutput), ".mokabook-preview-stage-"),
  );
  try {
    const config = await loadConfig(repositoryRoot, configPath);
    const manifest = readManifest(config);
    const server = await startCatalogueServer(config, {
      base: "origin/main",
      port: 0,
    });
    let reviewArtifact;
    try {
      await capturePage(server.url, "/", stage, "index.html");
      await generateReview(server.url);
      reviewArtifact = captureReviewArtifact(config);
      for (const entry of manifest.entries) {
        if (entry.kind === "collection") continue;
        await capturePage(
          server.url,
          `/view/${encodePath(entry.route)}`,
          stage,
          `view/${entry.route}`,
        );
      }
      for (const page of manifest.legacyPages) {
        await capturePage(
          server.url,
          `/view/${encodePath(page.route)}`,
          stage,
          `view/${page.route}`,
        );
      }
      await capturePage(
        server.url,
        "/preview-route-that-does-not-exist",
        stage,
        "404.html",
        404,
      );
      await captureAssets(server.url, stage);
    } finally {
      await server.close();
    }
    if (!reviewArtifact) throw new Error("preview Review was not captured");
    await copyReviewArtifact(config, reviewArtifact, stage);
    await copyPublicFiles(config, stage);
    await writeText(stage, "_headers", headers());
    await writeText(stage, "_redirects", redirects(manifest.entries));
    await writeText(stage, markerName, "schemaVersion=1\n");
    await installArtifact(stage, resolvedOutput);
  } catch (error) {
    await fs.promises.rm(stage, { force: true, recursive: true });
    throw error;
  }
}

async function generateReview(serverUrl) {
  const response = await fetch(`${serverUrl}/review/index.html`);
  if (!response.ok) {
    throw new Error(`preview Review returned ${response.status}`);
  }
  await response.arrayBuffer();
}

async function captureAssets(serverUrl, stage) {
  for (const asset of [
    "/__mokabook/shell.css",
    "/__mokabook/client/browse.js",
    "/__mokabook/client/browse_frames.js",
    "/__mokabook/client/browse_state.js",
    "/__mokabook/fonts/InterVariable.woff2",
    "/__mokabook/fonts/Inter-OFL.txt",
  ]) {
    const response = await fetch(`${serverUrl}${asset}`);
    if (!response.ok)
      throw new Error(`preview asset ${asset} returned ${response.status}`);
    await writeFile(
      stage,
      asset.slice(1),
      Buffer.from(await response.arrayBuffer()),
    );
  }
}

async function capturePage(
  serverUrl,
  route,
  stage,
  relativePath,
  expectedStatus = 200,
) {
  const response = await fetch(`${serverUrl}${route}`);
  if (response.status !== expectedStatus) {
    throw new Error(
      `preview page ${route} returned ${response.status}, expected ${expectedStatus}`,
    );
  }
  const html = await response.text();
  if (!html.includes(liveUpdateScript)) {
    throw new Error(`preview page ${route} is missing its live-update script`);
  }
  await writeText(stage, relativePath, staticPage(html));
}

async function copyReviewArtifact(config, artifact, stage) {
  for (const relative of [...artifact.files.keys()].sort()) {
    const content = readReviewArtifactFile(config, artifact, relative);
    if (!content) {
      throw new Error(
        `preview Review file changed after generation: ${relative}`,
      );
    }
    await writeFile(stage, path.join("review", relative), content);
  }
}

async function copyPublicFiles(config, stage) {
  for (const candidate of await regularFiles(config.mockupsDir)) {
    if (!isPublicStaticFile(candidate, config)) continue;
    const relative = path.relative(config.mockupsDir, candidate);
    const target = path.join(stage, "static", relative);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await fs.promises.copyFile(candidate, target);
  }
}

async function regularFiles(root) {
  const files = [];
  const entries = await fs.promises.readdir(root, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const candidate = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await regularFiles(candidate)));
    else if (entry.isFile()) files.push(candidate);
  }
  return files;
}

function headers() {
  return "/static/*\n  Content-Security-Policy: sandbox\n\n/review/snapshots/*\n  Content-Security-Policy: sandbox\n";
}

function redirects(entries) {
  const lines = entries.flatMap((entry) =>
    entry.kind === "collection"
      ? []
      : [
          `/id/${encodeURIComponent(entry.id)} /view/${pagesPath(entry.route)} 302`,
        ],
  );
  return `${lines.join("\n")}\n`;
}

function staticPage(html) {
  return html
    .replace(liveUpdateScript, "")
    .replace(/(href|src)="\/(static|view)\/([^"]+)\.html"/g, '$1="/$2/$3"');
}

async function installArtifact(stage, output) {
  if (!fs.existsSync(output)) {
    await fs.promises.rename(stage, output);
    return;
  }
  const backup = await fs.promises.mkdtemp(
    path.join(path.dirname(output), ".mokabook-preview-backup-"),
  );
  await fs.promises.rmdir(backup);
  await fs.promises.rename(output, backup);
  try {
    await fs.promises.rename(stage, output);
  } catch (error) {
    await fs.promises.rename(backup, output);
    throw error;
  }
  await fs.promises.rm(backup, { force: true, recursive: true });
}

function assertOwnedOutput(output) {
  if (fs.existsSync(output) && !fs.existsSync(path.join(output, markerName))) {
    throw new Error(`refusing to replace unowned preview directory: ${output}`);
  }
}

function resolveSafeOutput(output) {
  const relative = path.relative(contextRoot, output);
  if (
    relative === "" ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`preview output must be inside ${contextRoot}`);
  }
  const realContextRoot = fs.realpathSync(contextRoot);
  const realOutput = projectRealPath(output);
  if (
    realOutput === realContextRoot ||
    !isInside(realContextRoot, realOutput)
  ) {
    throw new Error(
      `preview output resolves outside ${contextRoot} through a symlink`,
    );
  }
  return realOutput;
}

function outputArgument(arguments_) {
  if (arguments_.length === 0)
    return path.join(contextRoot, "mokabook-preview");
  if (arguments_.length === 2 && arguments_[0] === "--out")
    return path.resolve(repositoryRoot, arguments_[1]);
  throw new Error("usage: node scripts/preview/build.mjs [--out <path>]");
}

function encodePath(value) {
  return value.split("/").map(encodeURIComponent).join("/");
}

function pagesPath(value) {
  return encodePath(value).replace(/\.html$/, "");
}

async function writeText(root, relative, content) {
  await writeFile(root, relative, Buffer.from(content));
}

async function writeFile(root, relative, content) {
  const target = path.join(root, relative);
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  await fs.promises.writeFile(target, content);
}
