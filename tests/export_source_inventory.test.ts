import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { exportCatalogue } from "../dist/export/run.js";

import { changedFixture } from "./helpers/changed_fixture.js";
import { directoryFiles } from "./helpers/export_fixture.js";
import { validEntrySource } from "./helpers/fixture.js";

test("consumer export omits unused reserved templates without treating them as public resources", async (context) => {
  const fixture = await changedFixture(context);
  await fs.writeFile(
    path.join(fixture.mockupsDir, "unused.source.html"),
    "Private authoring template",
  );
  const result = await exportCatalogue(fixture.config, {
    outDir: "site",
    base: "HEAD",
  });
  const files = await directoryFiles(result.outDir);
  assert.equal(files.has("static/unused.source.html"), false);
  assert.equal(files.has("static/mokly-manifest.json"), false);
  assert.equal(files.has("view/screens/home.html"), true);
});

test("consumer export keeps imported document templates private while publishing their registered page", async (context) => {
  const source = `${validEntrySource()}
import { definePage } from "@mokly/mokly";
import template from "../mockups/private-template.html";
mockups.push(definePage({ id: "handbook", title: "Handbook", description: "Guidance", dependencies: [], relatedDocs: [], route: "handbook.html", render: () => template }));`;
  const fixture = await changedFixture(
    context,
    source,
    {
      extraConfig: 'moduleResolution: { loaders: { ".html": "text" } },',
    },
    async ({ mockupsDir }) => {
      await fs.writeFile(
        path.join(mockupsDir, "private-template.html"),
        "<!doctype html><html><body><h1>Handbook</h1></body></html>",
      );
    },
  );
  const result = await exportCatalogue(fixture.config, {
    outDir: "site",
    base: "HEAD",
  });
  const files = await directoryFiles(result.outDir);
  assert.equal(files.has("static/private-template.html"), false);
  assert.match(
    files.get("static/handbook.html")!.toString(),
    /<h1>Handbook<\/h1>/,
  );
});
