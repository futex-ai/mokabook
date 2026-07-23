import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { parse } from "yaml";

import { repositoryRoot } from "./helpers/fixture.js";

interface WorkflowStep {
  name?: string;
  run?: string;
  uses?: string;
  with?: Readonly<Record<string, unknown>>;
}

interface WorkflowJob {
  if?: string;
  steps: readonly WorkflowStep[];
}

interface Workflow {
  env: Readonly<Record<string, string>>;
  jobs: Readonly<Record<string, WorkflowJob>>;
  on: Readonly<Record<string, unknown>>;
  permissions: Readonly<Record<string, string>>;
}

test("preview workflow deploys main and same-repository pull requests", async () => {
  const source = await fs.promises.readFile(
    path.join(repositoryRoot, ".github", "workflows", "preview.yml"),
    "utf8",
  );
  const workflow = parse(source) as Workflow;

  assert.deepEqual(Object.keys(workflow.on).sort(), ["pull_request", "push"]);
  assert.deepEqual(workflow.permissions, {
    contents: "read",
    "pull-requests": "write",
  });
  assert.equal(workflow.env.CLOUDFLARE_PROJECT_NAME, "mokabook");
  assert.equal(
    workflow.env.MOKABOOK_COMMENT_MARKER,
    "<!-- mokabook-preview -->",
  );
  assert.deepEqual(Object.keys(workflow.jobs).sort(), [
    "close-pr",
    "deploy-main",
    "deploy-pr",
  ]);

  const deployMain = workflow.jobs["deploy-main"];
  const deployPullRequest = workflow.jobs["deploy-pr"];
  const closePullRequest = workflow.jobs["close-pr"];
  assert.ok(deployMain);
  assert.ok(deployPullRequest);
  assert.ok(closePullRequest);
  assert.match(deployMain.if ?? "", /github\.event_name == 'push'/);
  assert.match(deployPullRequest.if ?? "", /head\.repo\.full_name/);
  assert.match(deployPullRequest.if ?? "", /release-please--/);
  assert.match(closePullRequest.if ?? "", /github\.event\.action == 'closed'/);
  assert.equal((source.match(/npm run preview:build/g) ?? []).length, 2);
  assert.match(source, /--branch main/);
  assert.match(source, /branch="pr-\$\{\{/);
  assert.match(source, /Mokabook preview/);
  assert.match(source, /deployment_trigger\.metadata\.branch/);
  for (const job of [deployMain, deployPullRequest]) {
    const checkout = job.steps.find((step) =>
      step.uses?.startsWith("actions/checkout@"),
    );
    assert.equal(checkout?.with?.["fetch-depth"], 0);
  }
  assertPinnedActions(workflow);
});

test("CI fetches the Git base used by Review verification", async () => {
  const source = await fs.promises.readFile(
    path.join(repositoryRoot, ".github", "workflows", "ci.yml"),
    "utf8",
  );
  const workflow = parse(source) as Workflow;

  for (const name of ["minimum-runtime", "release-runtime"]) {
    const job = workflow.jobs[name];
    assert.ok(job);
    const checkout = job.steps.find((step) =>
      step.uses?.startsWith("actions/checkout@"),
    );
    assert.equal(checkout?.with?.["fetch-depth"], 0);
  }
});

test("browser checks support an isolated workspace port", async () => {
  const [config, browseTest] = await Promise.all([
    fs.promises.readFile(
      path.join(repositoryRoot, "playwright.config.ts"),
      "utf8",
    ),
    fs.promises.readFile(
      path.join(repositoryRoot, "tests", "browser", "browse.spec.ts"),
      "utf8",
    ),
  ]);
  assert.match(config, /process\.env\["MOKABOOK_PLAYWRIGHT_PORT"\]/);
  assert.match(browseTest, /browser\.newContext\(\{\s+baseURL,/);
  assert.doesNotMatch(browseTest, /127\.0\.0\.1:4517/);
});

function assertPinnedActions(workflow: Workflow): void {
  const actions = Object.values(workflow.jobs).flatMap((job) =>
    job.steps.flatMap((step) => (step.uses ? [step.uses] : [])),
  );
  assert.ok(actions.length > 0);
  for (const action of actions) assert.match(action, /@[a-f0-9]{40}$/);
}
