import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { createExportFixture } from "./helpers/export_fixture.js";
import { repositoryRoot } from "./helpers/fixture.js";

const execute = promisify(execFile);
const cli = path.join(repositoryRoot, "dist/cli/bin.js");
const token = "-synthetic/credential+padding==";

test("publish sends assigned leading-dash credentials and paths, preserving secrecy on rejection", async (context) => {
  const fixture = await createExportFixture();
  context.after(() => fixture.close());
  await fs.rename(
    fixture.config.configPath,
    path.join(fixture.root, "-catalogue.config.ts"),
  );
  let status = 204;
  const requests: string[] = [];
  const server = http.createServer((request, response) => {
    requests.push(request.headers.authorization ?? "");
    request.resume();
    response.writeHead(status).end(status === 204 ? undefined : token);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(
    () => new Promise<void>((resolve) => server.close(() => resolve())),
  );
  const port = (server.address() as { port: number }).port;
  const argv = [
    cli,
    "publish",
    `--endpoint=http://127.0.0.1:${port}/upload`,
    `--token=${token}`,
    "--config=-catalogue.config.ts",
    "--out=-site",
    "--repository=github.com/sample/catalogue",
    "--no-changes",
  ];
  const options = {
    cwd: fixture.root,
    env: {
      ...process.env,
      MOKLY_DIAGNOSTIC: "1",
      MOKLY_TOKEN: "ignored-env-token",
    },
  };
  const { stdout, stderr } = await execute(process.execPath, argv, options);
  assert.match(stdout, /Published Mokly catalogue/);
  assert.equal((stdout + stderr).includes(token), false);
  const marker = JSON.parse(
    await fs.readFile(
      path.join(fixture.root, "-site/mokly-upload.json"),
      "utf8",
    ),
  );
  assert.equal(marker.configPath, "-catalogue.config.ts");
  status = 401;
  await assert.rejects(
    execute(process.execPath, argv, options),
    (error: unknown) => {
      const { stdout, stderr } = error as { stdout: string; stderr: string };
      assert.match(stderr, /\[mokly\/upload-unauthorized\]/);
      assert.equal((stdout + stderr).includes(token), false);
      return true;
    },
  );
  assert.deepEqual(requests, [`Bearer ${token}`, `Bearer ${token}`]);
});

test("CLI redacts assigned tokens when parsing fails before any config is loaded", async () => {
  for (const exposed of [token, encodeURIComponent(token)])
    await assert.rejects(
      execute(
        process.execPath,
        [cli, "publish", `--token=${token}`, `--unknown=${exposed}`],
        {
          cwd: "/tmp",
          env: { ...process.env, MOKLY_DIAGNOSTIC: "1" },
        },
      ),
      (error: unknown) => {
        const { stdout, stderr } = error as { stdout: string; stderr: string };
        assert.match(
          stderr,
          /\[mokly\/cli-invalid\].*unknown option: --unknown=/,
        );
        assert.equal((stdout + stderr).includes(token), false);
        assert.equal(
          (stdout + stderr).includes(encodeURIComponent(token)),
          false,
        );
        return true;
      },
    );
});
