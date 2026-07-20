import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { compileCatalogue } from "../dist/build/compile.js";
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
