import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { repositoryRoot } from "./helpers/fixture.js";

interface CommandResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stderr: string;
  stdout: string;
}

interface PackageReport {
  files: Array<{ path: string; size: number }>;
  integrity: string;
  name: string;
  shasum: string;
  version: string;
}

interface RegistryContractModule {
  isMissingPackage(result: CommandResult): boolean;
}

interface RegistryVerifierModule {
  verifyRegistry(
    options: {
      distTag?: string;
      localReport: PackageReport;
      mode: "guard" | "verify";
      repositoryRoot: string;
    },
    dependencies: {
      execute: (
        file: string,
        args: readonly string[],
        options: { cwd: string },
      ) => Promise<CommandResult>;
      retryDelays: readonly number[];
      wait: (delay: number) => Promise<void>;
      write: (message: string) => void;
    },
  ): Promise<boolean>;
}

test("registry misses include a newly published tarball ETARGET", async () => {
  const registry = await registryContract();
  assert.equal(
    registry.isMissingPackage({
      code: 1,
      signal: null,
      stderr:
        "npm error code ETARGET\nnpm error notarget No matching version found",
      stdout: "",
    }),
    true,
  );
});

test("post-publish verification retries a propagating tarball", async (context) => {
  const temporaryRoot = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "mokabook-registry-test-"),
  );
  context.after(async () => {
    await fs.promises.rm(temporaryRoot, { force: true, recursive: true });
  });
  await fs.promises.mkdir(path.join(temporaryRoot, ".context"));
  const registry = await registryVerifier();
  const report = packageReport();
  const waits: number[] = [];
  let packAttempts = 0;
  const published = await registry.verifyRegistry(
    {
      distTag: "latest",
      localReport: report,
      mode: "verify",
      repositoryRoot: temporaryRoot,
    },
    {
      execute: async (file, args) => {
        if (file === "git") return commandResult("c".repeat(40));
        if (args[0] === "pack") {
          packAttempts += 1;
          if (packAttempts === 1) {
            return commandResult("", 1, "npm error code ETARGET");
          }
          return commandResult(JSON.stringify([report]));
        }
        if (args[0] === "view" && args[2] === "dist-tags") {
          return commandResult(JSON.stringify({ latest: report.version }));
        }
        if (args[0] === "view") {
          return commandResult(JSON.stringify({ gitHead: "c".repeat(40) }));
        }
        return commandResult("");
      },
      retryDelays: [2_000],
      wait: async (delay) => {
        waits.push(delay);
      },
      write: () => undefined,
    },
  );
  assert.equal(published, true);
  assert.equal(packAttempts, 2);
  assert.deepEqual(waits, [2_000]);
});

test("pre-publish guard treats ETARGET as an unpublished version", async () => {
  const registry = await registryVerifier();
  let attempts = 0;
  const published = await registry.verifyRegistry(
    {
      localReport: packageReport(),
      mode: "guard",
      repositoryRoot,
    },
    {
      execute: async () => {
        attempts += 1;
        return commandResult("", 1, "npm error code ETARGET");
      },
      retryDelays: [2_000],
      wait: async () => {
        assert.fail("the pre-publish guard must not wait");
      },
      write: () => undefined,
    },
  );
  assert.equal(published, false);
  assert.equal(attempts, 1);
});

test("post-publish verification fails closed on transport errors", async () => {
  const registry = await registryVerifier();
  let attempts = 0;
  await assert.rejects(
    registry.verifyRegistry(
      {
        localReport: packageReport(),
        mode: "verify",
        repositoryRoot,
      },
      {
        execute: async () => {
          attempts += 1;
          return commandResult("", 1, "network reset");
        },
        retryDelays: [2_000],
        wait: async () => {
          assert.fail("unexpected transport errors must not retry");
        },
        write: () => undefined,
      },
    ),
    /network reset/,
  );
  assert.equal(attempts, 1);
});

function commandResult(stdout: string, code = 0, stderr = ""): CommandResult {
  return { code, signal: null, stderr, stdout };
}

async function registryContract(): Promise<RegistryContractModule> {
  const url = pathToFileURL(
    path.join(repositoryRoot, "scripts/release/registry_contract.mjs"),
  ).href;
  return (await import(url)) as RegistryContractModule;
}

async function registryVerifier(): Promise<RegistryVerifierModule> {
  const url = pathToFileURL(
    path.join(repositoryRoot, "scripts/release/registry_verifier.mjs"),
  ).href;
  return (await import(url)) as RegistryVerifierModule;
}

function packageReport(): PackageReport {
  return {
    files: [
      { path: "dist/index.js", size: 1 },
      { path: "dist/index.d.ts", size: 1 },
      { path: "dist/cli/bin.js", size: 1 },
      { path: "README.md", size: 1 },
      { path: "LICENSE", size: 1 },
      { path: "CHANGELOG.md", size: 1 },
      { path: "package.json", size: 1 },
    ],
    integrity: `sha512-${"a".repeat(12)}`,
    name: "mokabook",
    shasum: "b".repeat(40),
    version: "1.2.3",
  };
}
