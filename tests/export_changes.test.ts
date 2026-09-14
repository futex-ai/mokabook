import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { exportCatalogue } from "../dist/export/run.js";
import { capturedAssetReader } from "../dist/export/inputs.js";
import { readManifest } from "../dist/registry/manifest.js";
import {
  NodeGitCommandRunner,
  RepositoryGitClient,
} from "../dist/review/git.js";
import { computeChangedRoutes } from "../dist/server/changed.js";
import { changedContentPaths } from "../dist/server/changed_content.js";
import { changedFixture } from "./helpers/changed_fixture.js";
import { directoryFiles } from "./helpers/export_fixture.js";
import { validEntrySource } from "./helpers/fixture.js";

for (const resource of ["nested.css", "image.svg"]) {
  test(`exported Changes matches Serve for a transitive ${resource} edit`, async (context) => {
    const fixture = await changedFixture(
      context,
      validEntrySource(),
      {
        extraConfig:
          'stylesheets: [{ match: "screens/home.html", stylesheets: ["home.css"] }],',
      },
      async ({ mockupsDir }) => {
        await fs.writeFile(
          path.join(mockupsDir, "home.css"),
          '@import "nested.css";',
        );
        await fs.writeFile(
          path.join(mockupsDir, "nested.css"),
          '@import "home.css"; body { background: url("image.svg"); }',
        );
        await fs.writeFile(
          path.join(mockupsDir, "image.svg"),
          '<svg xmlns="http://www.w3.org/2000/svg"/>',
        );
      },
    );
    await fs.appendFile(
      path.join(fixture.mockupsDir, resource),
      resource.endsWith(".css") ? "\nmain { color: red; }" : "\n",
    );
    assert.deepEqual(await computeChangedRoutes(fixture.config, "HEAD"), [
      "screens/home.html",
      "user-flows/tour.html",
    ]);
    const result = await exportCatalogue(fixture.config, {
      outDir: "site",
      base: "HEAD",
    });
    const html = await fs.readFile(
      path.join(result.outDir, "index.html"),
      "utf8",
    );
    for (const id of ["home", "tour"])
      assert.match(
        html,
        new RegExp(`data-changed="true"[^>]*data-entry-id="${id}"`),
      );
    assert.doesNotMatch(
      html,
      /data-changed="true"[^>]*data-entry-id="details"/,
    );
  });
}

test("material Changes can use captured documents without reading current file bytes", async (context) => {
  const fixture = await changedFixture(context);
  const manifest = readManifest(fixture.config);
  const captured = await directoryFiles(fixture.mockupsDir);
  const fragment = "screens/home.mobile.html";
  captured.set(
    fragment,
    Buffer.from(captured.get(fragment)!.toString().replace("Details", "Next")),
  );
  const git = new RepositoryGitClient(new NodeGitCommandRunner(fixture.root));
  const commit = await git.mergeBase("HEAD", "HEAD");
  const reads: string[] = [];
  const result = await changedContentPaths(
    manifest,
    manifest,
    fixture.config,
    git,
    commit,
    [`mockups/${fragment}`],
    {
      ...capturedAssetReader(captured, fixture.config),
      read: async (route) => {
        reads.push(route);
        const bytes = captured.get(route);
        assert.ok(bytes);
        return bytes;
      },
      readIfExists: async (route) => captured.get(route),
    },
  );
  assert.deepEqual(result, [`mockups/${fragment}`]);
  assert.ok(reads.includes(fragment));
});
