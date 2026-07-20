import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { compileCatalogue } from "../dist/build/compile.js";
import { writeCompilation } from "../dist/build/transaction.js";
import { loadConfig } from "../dist/config/load.js";
import {
  createFixture,
  removeFixture,
  validEntrySource,
} from "./helpers/fixture.js";

test("migration compatibility transforms documents and legacy id links", async (context) => {
  const fixture = await createFixture(
    validEntrySource({
      body: '<a href="#">Menu</a><a href="./details.html">Details</a><span data-nav-href="mock:details">Open</span>',
    }),
  );
  context.after(() => removeFixture(fixture));
  const legacyDir = path.join(fixture.root, "legacy");
  await fs.promises.mkdir(path.join(legacyDir, "retired"), {
    recursive: true,
  });
  await fs.promises.writeFile(
    path.join(legacyDir, "notice.source.ts"),
    'export const source = () => "<!doctype html><html><body><a href=\\"mock:details\\">Details</a></body></html>";\n',
  );
  await fs.promises.writeFile(
    path.join(legacyDir, "retired", "skip.source.ts"),
    'export const source = () => "<!doctype html><html><body>Skip</body></html>";\n',
  );
  await fs.promises.writeFile(
    path.join(fixture.root, "compatibility.ts"),
    `import path from "node:path";
import type { CompatibilityTransformInput } from "mokabook";
export default function transform(input: CompatibilityTransformInput): string {
  const logicalTarget = input.logicalRoutes["screens/details.html"];
  const relative = logicalTarget
    ? path.posix.relative(path.posix.dirname(input.route), logicalTarget)
    : "missing";
  return input.content
    .replace('href="./details.html"', \`href="./\${relative}"\`)
    .replace("<body", \`<body data-output-path="\${input.outputPath}"\`);
}
`,
  );
  await fs.promises.writeFile(
    fixture.configPath,
    `export default {
  compatibility: { transformer: "compatibility.ts" },
  entriesDir: "entries",
  legacy: { exclude: ["retired/**"], pagesDir: "legacy" },
  mockupsDir: "mockups",
  repoRoot: "."
};\n`,
  );

  const compilation = await compileCatalogue(await loadConfig(fixture.root));
  const mobile = compilation.outputs.get("screens/home.mobile.html") ?? "";
  const legacy = compilation.outputs.get("notice.html") ?? "";

  assert.match(mobile, /href="#"/);
  assert.match(mobile, /href="\.\/details\.mobile\.html"/);
  assert.match(mobile, /data-nav-href="\.\/details\.mobile\.html"/);
  assert.match(
    mobile,
    /data-output-path="mockups\/screens\/home\.mobile\.html"/,
  );
  assert.match(legacy, /href="\.\/screens\/details\.desktop\.html"/);
  assert.equal(compilation.outputs.has("retired/skip.html"), false);
});

test("configured compatibility transformers are typed complete-document functions", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  await fs.promises.writeFile(
    fixture.configPath,
    'export default { compatibility: { transformer: "compatibility.ts" }, entriesDir: "entries", mockupsDir: "mockups", repoRoot: "." };\n',
  );
  await fs.promises.writeFile(
    path.join(fixture.root, "compatibility.ts"),
    "export default 42;\n",
  );
  let config = await loadConfig(fixture.root);
  await assert.rejects(
    () => compileCatalogue(config),
    /compatibility transformer module must default-export a function/,
  );

  await fs.promises.writeFile(
    path.join(fixture.root, "compatibility.ts"),
    'export default () => "not a document";\n',
  );
  config = await loadConfig(fixture.root);
  await assert.rejects(
    () => compileCatalogue(config),
    /must return a complete HTML document/,
  );
});

test("compatibility output fails closed on unresolved navigation links", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  await fs.promises.writeFile(
    path.join(fixture.root, "compatibility.ts"),
    `import type { CompatibilityTransformInput } from "mokabook";
export default function transform(input: CompatibilityTransformInput): string {
  return input.content.replace("<body", '<body data-nav-href="mock:missing"');
}
`,
  );
  await fs.promises.writeFile(
    fixture.configPath,
    'export default { compatibility: { transformer: "compatibility.ts" }, entriesDir: "entries", mockupsDir: "mockups", repoRoot: "." };\n',
  );

  await assert.rejects(
    async () => compileCatalogue(await loadConfig(fixture.root)),
    /unresolved id link mock:missing/,
  );
});

test("compatibility routes exclude generated files pending orphan removal", async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture));
  await fs.promises.writeFile(
    path.join(fixture.root, "compatibility.ts"),
    `import type { CompatibilityTransformInput } from "mokabook";
export default function transform(input: CompatibilityTransformInput): string {
  if (input.availableRoutes.some((route) => route.includes("details."))) {
    throw new Error("pending orphan was exposed");
  }
  return input.content;
}
`,
  );
  await fs.promises.writeFile(
    fixture.configPath,
    'export default { entriesDir: "entries", mockupsDir: "mockups", repoRoot: "." };\n',
  );
  const initial = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(initial), initial);
  await fs.promises.writeFile(fixture.entryPath, oneScreenSource());
  await fs.promises.writeFile(
    fixture.configPath,
    'export default { compatibility: { transformer: "compatibility.ts" }, entriesDir: "entries", mockupsDir: "mockups", repoRoot: "." };\n',
  );

  await compileCatalogue(await loadConfig(fixture.root));
});

function oneScreenSource(): string {
  return `import { defineScreen } from "mokabook";
import React from "react";
export const mockups = [defineScreen({
  dependencies: [],
  description: "Home",
  desktop: <main>Home</main>,
  id: "home",
  mobile: <main>Home</main>,
  navPath: ["Fixture"],
  relatedDocs: [],
  route: "screens/home.html",
  title: "Home"
})];
`;
}
