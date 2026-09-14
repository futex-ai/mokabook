import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { parseArguments } from "../dist/cli/arguments.js";
import { createExportFixture } from "./helpers/export_fixture.js";
import { repositoryRoot } from "./helpers/fixture.js";

const execute = promisify(execFile);
const cli = path.join(repositoryRoot, "dist/cli/bin.js");

test("publish accepts its options without making export an upload alias", () => {
  assert.deepEqual(
    parseArguments([
      "publish",
      "--endpoint",
      "https://example.com/uploads",
      "--token",
      "secret",
      "--config",
      "tools/config.ts",
      "--out",
      "site",
      "--base",
      "main",
      "--repository",
      "git.example.com/team/project",
    ]),
    {
      command: "publish",
      help: false,
      version: false,
      endpoint: "https://example.com/uploads",
      token: "secret",
      config: "tools/config.ts",
      out: "site",
      base: "main",
      repository: "git.example.com/team/project",
    },
  );
  assert.equal(parseArguments(["publish", "--no-changes"]).noChanges, true);
  assert.throws(
    () => parseArguments(["publish", "--no-changes", "--base", "HEAD"]),
    /cli-invalid/,
  );
  for (const option of ["--endpoint", "--token", "--repository"])
    assert.throws(
      () => parseArguments(["export", "--out", "site", option, "value"]),
      /cli-invalid/,
    );
  assert.throws(
    () => parseArguments(["export", "--out", "site", "--no-changes"]),
    /cli-invalid/,
  );
  assert.throws(() => parseArguments(["publish", "--watch"]), /cli-invalid/);
});

test("publish help and credential preflight need no config", async () => {
  const { stdout } = await execute(
    process.execPath,
    [cli, "publish", "--help"],
    { cwd: "/tmp" },
  );
  assert.match(stdout, /MOKLY_ENDPOINT/);
  await assert.rejects(
    execute(process.execPath, [cli, "publish"], {
      cwd: "/tmp",
      env: { ...process.env, MOKLY_ENDPOINT: "", MOKLY_TOKEN: "" },
    }),
    (error: unknown) => {
      assert.match(
        (error as { stderr: string }).stderr,
        /\[mokly\/cli-invalid\].*endpoint/,
      );
      return true;
    },
  );
});

test("publish POSTs gzip using environment credentials and keeps a replaceable owned manifest", async (context) => {
  const fixture = await createExportFixture();
  context.after(() => fixture.close());
  await fixture.git(
    "remote",
    "add",
    "origin",
    "git@github.com:sample/catalogue.git",
  );
  const ahead = (
    await fixture.git(
      "commit-tree",
      "HEAD^{tree}",
      "-p",
      "HEAD",
      "-m",
      "test: advance base",
    )
  ).stdout.trim();
  await fixture.git("update-ref", "refs/remotes/origin/main", ahead);
  const bodies: Buffer[] = [];
  const server = http.createServer(async (request, response) => {
    assert.equal(request.method, "POST");
    assert.equal(request.url, "/upload?scope=catalogue");
    assert.equal(request.headers.authorization, "Bearer fixture-token");
    assert.equal(request.headers["content-type"], "application/gzip");
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks);
    assert.equal(Number(request.headers["content-length"]), body.length);
    bodies.push(body);
    response.writeHead(204).end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(
    () => new Promise<void>((resolve) => server.close(() => resolve())),
  );
  const port = (server.address() as { port: number }).port;
  const env = {
    ...process.env,
    MOKLY_ENDPOINT: `http://127.0.0.1:${port}/upload?scope=catalogue`,
    MOKLY_TOKEN: "fixture-token",
    GITHUB_ACTIONS: "true",
    GITHUB_HEAD_REF: "feature/screens",
    GITHUB_REF: "refs/pull/42/merge",
  };
  const args = [cli, "publish", "--out", "site"];
  const { stdout, stderr } = await execute(process.execPath, args, {
    cwd: fixture.root,
    env,
  });
  assert.match(stdout, /Published Mokly catalogue/);
  assert.doesNotMatch(stdout + stderr, /fixture-token/);
  assert.equal(bodies[0]!.subarray(0, 2).toString("hex"), "1f8b");
  const manifestPath = path.join(fixture.output, "mokly-upload.json");
  const manifest = JSON.parse(await fs.promises.readFile(manifestPath, "utf8"));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.branch, "feature/screens");
  assert.equal(manifest.pullRequest, 42);
  assert.equal(manifest.configPath, "mokly.config.ts");
  assert.deepEqual(manifest.repository, {
    host: "github.com",
    owner: "sample",
    name: "catalogue",
  });
  assert.equal(
    manifest.headSha,
    (await fixture.git("rev-parse", "HEAD")).stdout.trim(),
  );
  const review = JSON.parse(
    await fs.promises.readFile(
      path.join(fixture.output, manifest.comparisonPath),
      "utf8",
    ),
  );
  assert.equal(manifest.baseSha, review.baseCommit);
  assert.notEqual(
    manifest.baseSha,
    ahead,
    "baseSha is the merge base, not the base branch tip",
  );
  assert.equal(manifest.baseRef, review.baseRef);
  await execute(process.execPath, [...args, "--no-changes"], {
    cwd: fixture.root,
    env,
  });
  const current = JSON.parse(await fs.promises.readFile(manifestPath, "utf8"));
  assert.equal(current.baseRef, null);
  assert.equal(current.baseSha, null);
  assert.equal(current.comparisonPath, null);
  assert.equal(
    fs.existsSync(path.join(fixture.output, "__mokly/diffs")),
    false,
  );
  await execute(process.execPath, [cli, "export", "--out", "site"], {
    cwd: fixture.root,
    env,
  });
  assert.equal(
    bodies.length,
    2,
    "export never uploads even with credentials in env",
  );
  assert.equal(fs.existsSync(manifestPath), false);
});

test("rejected uploads keep the export and redact secrets even in diagnostic errors", async (context) => {
  const fixture = await createExportFixture();
  context.after(() => fixture.close());
  const server = http.createServer((request, response) => {
    request.resume();
    response.writeHead(401).end("fixture-token");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(
    () => new Promise<void>((resolve) => server.close(() => resolve())),
  );
  const port = (server.address() as { port: number }).port;
  for (const suffix of [[], ["--unexpected=fixture-token"]]) {
    await assert.rejects(
      execute(
        process.execPath,
        [
          cli,
          "publish",
          "--endpoint",
          `http://127.0.0.1:${port}`,
          "--token",
          "fixture-token",
          "--repository",
          "github.com/sample/catalogue",
          "--no-changes",
          ...suffix,
        ],
        { cwd: fixture.root, env: { ...process.env, MOKLY_DIAGNOSTIC: "1" } },
      ),
      (error: unknown) => {
        const { stdout, stderr } = error as { stdout: string; stderr: string };
        assert.doesNotMatch(stdout + stderr, /fixture-token/);
        assert.match(
          stderr,
          suffix.length ? /cli-invalid/ : /upload-unauthorized/,
        );
        return true;
      },
    );
  }
  assert.ok(
    fs.existsSync(
      path.join(fixture.root, ".context/mokly-publish/mokly-upload.json"),
    ),
  );
});
