import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  runCommand,
  startCommand,
  stopCommand,
  waitForOutput,
} from "./command.mjs";
import {
  copyFixture,
  initializeGit,
  installConsumer,
  runBin,
  smokeServer,
} from "./fixture.mjs";

export async function smokeEsmConsumer(context) {
  const root = path.join(context.workingRoot, "esm-consumer");
  await copyFixture(path.join(context.fixturesRoot, "esm"), root);
  await installConsumer(
    root,
    context.archivePath,
    consumerPackage("packed-esm-consumer", context, true),
  );
  await runCommand("node", ["verify-api.mjs"], { cwd: root });
  const help = await runBin(root, ["--help"]);
  assert.match(help.stdout, /mokabook build/);
  const version = await runBin(root, ["--version"]);
  assert.equal(version.stdout.trim(), context.packageVersion);
  const nested = path.join(root, "nested/config/discovery");
  await fs.promises.mkdir(nested, { recursive: true });
  await runBin(root, ["build"], { cwd: nested });
  await runBin(root, ["check"]);
  const fragment = await fs.promises.readFile(
    path.join(root, "mockups/screens/home.desktop.html"),
    "utf8",
  );
  assert.match(fragment, /data-fixture="esm-desktop"/);
  assert.match(fragment, /href="\.\/detail\.desktop\.html"/);
  await smokeServer(root);
  await runCommand("npx", ["--no-install", "mokabook", "--help"], {
    cwd: root,
  });

  await initializeGit(root);
  const entryPath = path.join(root, "entries/catalogue.mockup.tsx");
  const entry = await fs.promises.readFile(entryPath, "utf8");
  await fs.promises.writeFile(
    entryPath,
    entry.replaceAll("Packed home", "Updated packed home"),
  );
  await runBin(root, ["build"]);
  await runBin(root, ["review", "--base", "HEAD"]);
  const review = JSON.parse(
    await fs.promises.readFile(path.join(root, ".review/review.json"), "utf8"),
  );
  assert.equal(
    review.screens.find((screen) => screen.id === "packed-home")?.state,
    "changed",
  );
}

export async function smokeNodeNextConsumer(context) {
  const root = path.join(context.workingRoot, "nodenext-consumer");
  await copyFixture(path.join(context.fixturesRoot, "nodenext"), root);
  await installConsumer(
    root,
    context.archivePath,
    consumerPackage("packed-nodenext-consumer", context, true),
  );
  await runCommand(
    path.join(root, "node_modules/.bin/tsc"),
    ["--project", "tsconfig.json"],
    { cwd: root },
  );
  await runCommand(
    "node",
    ["--input-type=module", "--eval", 'await import("mokabook")'],
    { cwd: root },
  );
}

export async function smokeCleanCacheExecution(context) {
  const root = path.join(context.workingRoot, "npx-consumer");
  await copyFixture(path.join(context.fixturesRoot, "esm"), root);
  const packageJson = consumerPackage(
    "clean-cache-npx-consumer",
    context,
    false,
  );
  await fs.promises.writeFile(
    path.join(root, "package.json"),
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );
  await runCommand(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund"],
    { cwd: root },
  );
  assert.equal(fs.existsSync(path.join(root, "node_modules/mokabook")), false);
  const cache = path.join(context.workingRoot, "empty-npx-cache");
  const packageSpec = `file:${context.archivePath}`;
  const npx = [
    "exec",
    "--yes",
    "--cache",
    cache,
    "--package",
    packageSpec,
    "--",
    "mokabook",
  ];
  await runCommand("npm", [...npx, "build"], { cwd: root });
  await runCommand("npm", [...npx, "check"], { cwd: root });
  assert.equal(
    fs.existsSync(path.join(root, "mockups/mokabook-manifest.json")),
    true,
  );
}

export async function smokeAccountingFixture(context) {
  const root = path.join(context.workingRoot, "accounting-consumer");
  await copyFixture(path.join(context.fixturesRoot, "accounting"), root);
  const packageJson = consumerPackage(
    "accounting-shaped-consumer",
    context,
    true,
  );
  packageJson.workspaces = ["packages/*"];
  packageJson.dependencies["@firna/ui"] = "file:packages/firna-ui";
  packageJson.dependencies["react-native-web"] =
    "file:packages/react-native-web";
  await installConsumer(root, context.archivePath, packageJson);
  await runBin(root, ["build"]);
  await runBin(root, ["check"]);
  const appFragment = await fs.promises.readFile(
    path.join(root, "docs/mockups/app/dashboard.desktop.html"),
    "utf8",
  );
  const campaignFragment = await fs.promises.readFile(
    path.join(root, "docs/mockups/marketing/campaign.desktop.html"),
    "utf8",
  );
  assert.match(appFragment, /data-accounting-renderer="desktop"/);
  assert.match(appFragment, /data-theme="fixture-theme"/);
  assert.match(appFragment, /href="\.\.\/app\.css"/);
  assert.match(campaignFragment, /href="\.\.\/marketing\.css"/);
  assert.equal(
    fs.existsSync(path.join(root, "docs/mockups/archive/legacy-notice.html")),
    true,
  );
  await smokeServer(root);
  await smokeExternalWatch(root);

  await initializeGit(root);
  await fs.promises.writeFile(
    path.join(root, "shared/tokens.ts"),
    'export const accent = "#6b4eff";\n',
  );
  await runBin(root, ["build"]);
  await runBin(root, ["review", "--base", "HEAD"]);
  const review = JSON.parse(
    await fs.promises.readFile(
      path.join(root, ".context/mokabook-review/review.json"),
      "utf8",
    ),
  );
  assert.deepEqual(review.sharedImpact, ["shared/tokens.ts"]);
  assert.ok(review.screens.every((screen) => screen.sharedImpact.length === 1));
}

export async function smokeJunoFixture(context) {
  const root = path.join(context.workingRoot, "juno-consumer");
  await copyFixture(path.join(context.fixturesRoot, "juno"), root);
  await installConsumer(
    root,
    context.archivePath,
    consumerPackage("juno-shaped-consumer", context, true),
  );
  const config = ["--config", "tools/mokabook.config.ts"];
  await runBin(root, ["build", ...config]);
  await runBin(root, ["check", ...config]);
  const fragment = await fs.promises.readFile(
    path.join(root, "site/mockups/workspace/overview.mobile.html"),
    "utf8",
  );
  assert.match(fragment, /data-juno-layout="compact"/);
  assert.match(fragment, /href="\.\.\/juno\.css"/);
  await smokeServer(root, config);
}

function consumerPackage(name, context, installMokabook) {
  return {
    name,
    private: true,
    type: "module",
    dependencies: {
      ...(installMokabook ? { mokabook: `file:${context.archivePath}` } : {}),
      react: context.versions.react,
      "react-dom": context.versions.reactDom,
    },
    devDependencies: {
      "@types/react": context.versions.reactTypes,
      "@types/react-dom": context.versions.reactDomTypes,
      typescript: context.versions.typescript,
    },
  };
}

async function smokeExternalWatch(root) {
  const bin = path.join(root, "node_modules/.bin/mokabook");
  const running = startCommand(bin, ["serve", "--port", "0"], { cwd: root });
  try {
    const match = await waitForOutput(
      running,
      /Mokabook listening at (http:\/\/[^\s]+)/,
      "Accounting-shaped watched server",
    );
    const response = await fetch(`${match[1]}/__mokabook/events`);
    assert.ok(response.body);
    const reader = response.body.getReader();
    await readServerEvent(reader, "ready");
    await fs.promises.writeFile(
      path.join(root, "external/templates.json"),
      '{"template":"updated"}\n',
    );
    await readServerEvent(reader, "update");
    await reader.cancel();
  } finally {
    const code = await stopCommand(running);
    assert.equal(code, 0);
  }
}

async function readServerEvent(reader, expected) {
  const decoder = new TextDecoder();
  let pending = "";
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const result = await readWithTimeout(reader, expected);
    if (result.done) throw new Error("update stream closed unexpectedly");
    pending += decoder.decode(result.value, { stream: true });
    const boundary = pending.indexOf("\n\n");
    if (boundary === -1) continue;
    const event = pending.slice(0, boundary);
    if (event.includes(`event: ${expected}`)) return;
    pending = pending.slice(boundary + 2);
  }
  throw new Error(`timed out waiting for ${expected}`);
}

function readWithTimeout(reader, expected) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out waiting for ${expected}`)),
      20_000,
    );
    reader.read().then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
