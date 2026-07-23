import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { parse } from "yaml";

import { repositoryRoot } from "./helpers/fixture.js";

interface WorkflowStep {
  env?: Readonly<Record<string, string>>;
  id?: string;
  name?: string;
  run?: string;
  uses?: string;
  with?: Readonly<Record<string, unknown>>;
}

interface WorkflowJob {
  environment?: string;
  needs?: readonly string[];
  permissions?: Readonly<Record<string, string>>;
  steps: readonly WorkflowStep[];
}

interface Workflow {
  concurrency: { "cancel-in-progress": boolean };
  jobs: Readonly<Record<string, WorkflowJob>>;
  on: Readonly<Record<string, unknown>>;
  permissions: Readonly<Record<string, string>>;
}

interface ReleaseContextModule {
  remoteTagCommit(output: string, ref: string): string;
  resolvePublishRef(input: {
    eventName: string;
    manualRef: string;
    releaseCreated: string;
    releaseTag: string;
  }): string | undefined;
  validateTagVersion(ref: string, version: string): void;
}

interface PackageReport {
  files: Array<{ path: string; size: number }>;
  integrity: string;
  name: string;
  shasum: string;
  version: string;
}

interface RegistryContractModule {
  comparePublishedPackage(
    local: PackageReport,
    remote: PackageReport,
    metadata: { gitHead?: string },
    commit: string,
  ): void;
  isMissingPackage(result: {
    code: number | null;
    stderr: string;
    stdout: string;
  }): boolean;
}

test("CI pins actions and gates both supported Node runtimes", async () => {
  const source = await workflowSource("ci.yml");
  const workflow = parse(source) as Workflow;
  assert.deepEqual(Object.keys(workflow.on).sort(), ["pull_request", "push"]);
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.equal(workflow.concurrency["cancel-in-progress"], true);
  assert.match(source, /node-version: 22\.14\.0/);
  assert.match(source, /node-version: 24\n/);
  assert.equal((source.match(/cargo xtask check/g) ?? []).length, 2);
  assert.match(source, /playwright install --with-deps chromium/);
  const required = workflow.jobs.required;
  const minimumRuntime = workflow.jobs["minimum-runtime"];
  const releaseRuntime = workflow.jobs["release-runtime"];
  assert.ok(required);
  assert.ok(minimumRuntime);
  assert.ok(releaseRuntime);
  assert.deepEqual(required.needs, ["minimum-runtime", "release-runtime"]);
  assertFullHistoryCheckout(minimumRuntime);
  assertFullHistoryCheckout(releaseRuntime);
  assertPinnedActions(workflow);
});

test("release workflow selects only releases and isolates OIDC publish", async () => {
  const source = await workflowSource("release.yml");
  const workflow = parse(source) as Workflow;
  const publish = workflow.jobs.publish;
  assert.ok(publish);
  assert.ok(workflow.on.workflow_dispatch);
  assert.equal(workflow.concurrency["cancel-in-progress"], false);
  assert.equal(publish.environment, "npm");
  assert.deepEqual(publish.permissions, {
    contents: "read",
    "id-token": "write",
  });
  assert.equal(source.includes("NPM_TOKEN"), false);
  assert.equal(source.includes("NODE_AUTH_TOKEN"), false);
  assert.match(source, /package-manager-cache: false/);
  assert.match(source, /npm publish "\$ARCHIVE_PATH" --access public/);
  assert.match(source, /--mode guard/);
  assert.match(source, /--mode verify/);
  assert.match(source, /release-please-action@[a-f0-9]{40}/);
  const names = publish.steps.map((step) => step.name);
  assert.ok(
    names.indexOf("Run complete verification") <
      names.indexOf("Prepare exact publish artifact"),
  );
  assert.ok(
    names.indexOf("Guard an existing npm version") <
      names.indexOf("Publish with npm trusted publishing"),
  );
  assertPinnedActions(workflow);
});

test("release selection handles ordinary pushes, releases, and manual retries", async () => {
  const context = await releaseContext();
  assert.equal(
    context.resolvePublishRef({
      eventName: "push",
      manualRef: "",
      releaseCreated: "false",
      releaseTag: "",
    }),
    undefined,
  );
  assert.equal(
    context.resolvePublishRef({
      eventName: "push",
      manualRef: "",
      releaseCreated: "true",
      releaseTag: "v0.1.0",
    }),
    "v0.1.0",
  );
  assert.equal(
    context.resolvePublishRef({
      eventName: "workflow_dispatch",
      manualRef: "v1.2.3",
      releaseCreated: "",
      releaseTag: "",
    }),
    "v1.2.3",
  );
  assert.throws(
    () => context.validateTagVersion("v1.2.4", "1.2.3"),
    /does not match package version/,
  );
  assert.equal(
    context.remoteTagCommit(
      `${"a".repeat(40)}\trefs/tags/v1.2.3\n${"b".repeat(40)}\trefs/tags/v1.2.3^{}\n`,
      "v1.2.3",
    ),
    "b".repeat(40),
  );
});

test("published-version guard compares bytes, inventory, and commit", async () => {
  const registry = await registryContract();
  const report = packageReport();
  registry.comparePublishedPackage(
    report,
    structuredClone(report),
    { gitHead: "c".repeat(40) },
    "c".repeat(40),
  );
  const mismatched = structuredClone(report);
  mismatched.integrity = `sha512-${"d".repeat(12)}`;
  assert.throws(
    () =>
      registry.comparePublishedPackage(
        report,
        mismatched,
        { gitHead: "c".repeat(40) },
        "c".repeat(40),
      ),
    /integrity differs/,
  );
  assert.equal(
    registry.isMissingPackage({
      code: 1,
      stderr: "npm error E404",
      stdout: "",
    }),
    true,
  );
  assert.equal(
    registry.isMissingPackage({ code: 1, stderr: "network reset", stdout: "" }),
    false,
  );
});

test("release-please owns the Node manifest and first release state", async () => {
  const config = JSON.parse(
    await fs.promises.readFile(
      path.join(repositoryRoot, "release-please-config.json"),
      "utf8",
    ),
  );
  const manifest = JSON.parse(
    await fs.promises.readFile(
      path.join(repositoryRoot, ".release-please-manifest.json"),
      "utf8",
    ),
  );
  assert.equal(
    config.packages["."].releaseType ?? config.packages["."]["release-type"],
    "node",
  );
  assert.equal(config.packages["."]["include-v-in-tag"], true);
  assert.equal(
    config["bootstrap-sha"],
    "896a6ecfd26236b1695c7683e7acac73dc4efbc9",
  );
  assert.equal(config.packages["."]["bump-minor-pre-major"], true);
  const releaseAs = config.packages["."]["release-as"];
  if (releaseAs !== undefined) {
    assert.match(releaseAs, /^0\.\d+\.\d+$/);
  }
  assert.equal(config.packages["."]["include-component-in-tag"], false);
  assert.deepEqual(
    Object.keys(config.packages["."])
      .filter((key) => key !== "release-as")
      .sort(),
    [
      "bump-minor-pre-major",
      "changelog-path",
      "include-component-in-tag",
      "include-v-in-tag",
      "release-type",
    ],
  );
  const packageVersion = JSON.parse(
    await fs.promises.readFile(
      path.join(repositoryRoot, "package.json"),
      "utf8",
    ),
  ).version;
  assert.deepEqual(manifest, { ".": packageVersion });
});

async function workflowSource(name: string): Promise<string> {
  return await fs.promises.readFile(
    path.join(repositoryRoot, ".github", "workflows", name),
    "utf8",
  );
}

function assertPinnedActions(workflow: Workflow): void {
  const actions = Object.values(workflow.jobs).flatMap((job) =>
    job.steps.flatMap((step) => (step.uses ? [step.uses] : [])),
  );
  assert.ok(actions.length > 0);
  for (const action of actions) assert.match(action, /@[a-f0-9]{40}$/);
}

function assertFullHistoryCheckout(job: WorkflowJob): void {
  const checkout = job.steps.find((step) =>
    step.uses?.startsWith("actions/checkout@"),
  );
  assert.ok(checkout);
  assert.equal(checkout.with?.["fetch-depth"], 0);
}

async function releaseContext(): Promise<ReleaseContextModule> {
  const url = pathToFileURL(
    path.join(repositoryRoot, "scripts/release/context.mjs"),
  ).href;
  return (await import(url)) as ReleaseContextModule;
}

async function registryContract(): Promise<RegistryContractModule> {
  const url = pathToFileURL(
    path.join(repositoryRoot, "scripts/release/registry_contract.mjs"),
  ).href;
  return (await import(url)) as RegistryContractModule;
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
