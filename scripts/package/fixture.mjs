import fs from "node:fs";
import path from "node:path";

import {
  runCommand,
  startCommand,
  stopCommand,
  waitForOutput,
} from "./command.mjs";

export async function copyFixture(source, root) {
  await fs.promises.cp(source, root, { recursive: true });
}

export async function installConsumer(root, archivePath, packageJson) {
  await fs.promises.writeFile(
    path.join(root, "package.json"),
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );
  await runCommand(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund"],
    { cwd: root },
  );
  const installed = JSON.parse(
    await fs.promises.readFile(
      path.join(root, "node_modules/mokabook/package.json"),
      "utf8",
    ),
  );
  if (installed.name !== "mokabook") {
    throw new Error(`consumer did not install ${archivePath}`);
  }
}

export async function runBin(root, args, options = {}) {
  const bin = path.join(root, "node_modules/.bin/mokabook");
  return await runCommand(bin, args, { cwd: options.cwd ?? root });
}

export async function smokeServer(root, args = []) {
  const bin = path.join(root, "node_modules/.bin/mokabook");
  const running = startCommand(
    bin,
    ["serve", "--port", "0", "--no-watch", ...args],
    { cwd: root },
  );
  let failure;
  try {
    const match = await waitForOutput(
      running,
      /Mokabook listening at (http:\/\/[^\s]+)/,
      "packed Mokabook server",
    );
    const response = await fetch(match[1]);
    if (!response.ok) throw new Error(`server returned ${response.status}`);
    const html = await response.text();
    if (!html.includes("data-mokabook-shell")) {
      throw new Error("server response did not contain the Browse shell");
    }
  } catch (error) {
    failure = error;
  }
  const code = await stopCommand(running);
  if (failure !== undefined) throw failure;
  if (code !== 0) throw new Error(`server stopped with code ${code}`);
}

export async function initializeGit(root) {
  await runCommand("git", ["init", "-q"], { cwd: root });
  await runCommand("git", ["config", "user.name", "Mokabook Package Smoke"], {
    cwd: root,
  });
  await runCommand(
    "git",
    ["config", "user.email", "mokabook-package-smoke@example.invalid"],
    { cwd: root },
  );
  await runCommand("git", ["add", "."], { cwd: root });
  await runCommand("git", ["commit", "-qm", "test: fixture baseline"], {
    cwd: root,
  });
}
