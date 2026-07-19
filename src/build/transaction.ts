import fs from "node:fs";
import path from "node:path";

import type { ResolvedConfig } from "../config/types.js";
import { MokabookError, errorMessage } from "../errors.js";
import type { Compilation } from "./compile.js";
import { isOwned, ownedGeneratedRoutes } from "./ownership.js";

/** Atomically replace owned generated files with rollback on any failure. */
export async function writeCompilation(
  compilation: Compilation,
  config: ResolvedConfig,
): Promise<void> {
  rejectUnsafeTargets(compilation, config);
  const temporaryRoot = await fs.promises.mkdtemp(
    path.join(path.dirname(config.mockupsDir), ".mokabook-write-"),
  );
  const stageRoot = path.join(temporaryRoot, "stage");
  const backupRoot = path.join(temporaryRoot, "backup");
  const expected = [...compilation.outputs.keys()].sort();
  const expectedSet = new Set(expected);
  const orphan = ownedGeneratedRoutes(config).filter(
    (route) => !expectedSet.has(route),
  );
  const affected = [...new Set([...expected, ...orphan])].sort();
  const backedUp: string[] = [];
  const installed: string[] = [];
  try {
    for (const route of expected) {
      const staged = path.join(stageRoot, route);
      await fs.promises.mkdir(path.dirname(staged), { recursive: true });
      await fs.promises.writeFile(
        staged,
        compilation.outputs.get(route) ?? "",
        "utf8",
      );
    }
    for (const route of affected) {
      const target = path.join(config.mockupsDir, route);
      if (!fs.existsSync(target)) continue;
      const backup = path.join(backupRoot, route);
      await fs.promises.mkdir(path.dirname(backup), { recursive: true });
      await fs.promises.rename(target, backup);
      backedUp.push(route);
    }
    for (const route of expected) {
      const target = path.join(config.mockupsDir, route);
      await fs.promises.mkdir(path.dirname(target), { recursive: true });
      await fs.promises.rename(path.join(stageRoot, route), target);
      installed.push(route);
    }
  } catch (error) {
    await rollback(config, backupRoot, installed, backedUp);
    throw new MokabookError(
      "build-invalid",
      `could not commit generated output: ${errorMessage(error)}`,
      {
        cause: error,
      },
    );
  } finally {
    await fs.promises.rm(temporaryRoot, { force: true, recursive: true });
  }
}

function rejectUnsafeTargets(
  compilation: Compilation,
  config: ResolvedConfig,
): void {
  for (const route of compilation.outputs.keys()) {
    const target = path.join(config.mockupsDir, route);
    if (fs.existsSync(target) && !isOwned(target, config)) {
      throw new MokabookError(
        "build-invalid",
        `refusing to overwrite unowned file: ${route}`,
      );
    }
  }
}

async function rollback(
  config: ResolvedConfig,
  backupRoot: string,
  installed: readonly string[],
  backedUp: readonly string[],
): Promise<void> {
  for (const route of [...installed].reverse()) {
    await fs.promises.rm(path.join(config.mockupsDir, route), { force: true });
  }
  for (const route of [...backedUp].reverse()) {
    const target = path.join(config.mockupsDir, route);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await fs.promises.rename(path.join(backupRoot, route), target);
  }
}
