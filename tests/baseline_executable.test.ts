import assert from "node:assert/strict";
import test from "node:test";

import { NodeBaselineExecutableResolver } from "../dist/baseline/executable.js";

for (const command of ["npm", "npx", "npm.cmd", "npx.cmd"]) {
  test(`Windows ${command} uses the selected installation and preserves literal argv`, async () => {
    const name = command.split(".")[0]!;
    const directory = "C:\\Program Files\\npm";
    const script = `${directory}\\node_modules\\npm\\bin\\${name}-cli.js`;
    const resolver = new NodeBaselineExecutableResolver({
      platform: "win32",
      nodeExecutable: "C:\\node\\node.exe",
      isFile: async (file) =>
        [script, `${directory}\\${name}.cmd`].includes(file),
    });
    const args = ["run", "a & b", "%PATH%", "", 'quote"value'];
    assert.deepEqual(
      await resolver.resolve({
        argv: [command, ...args],
        cwd: "C:\\source",
        env: { Path: `C:\\empty;${directory}` },
      }),
      ["C:\\node\\node.exe", script, ...args],
    );
  });
}

test("an unsupported npm shim fails without silently choosing a different installation", async () => {
  const resolver = new NodeBaselineExecutableResolver({
    platform: "win32",
    nodeExecutable: "C:\\node.exe",
    isFile: async (file) => file.endsWith("npm.cmd"),
  });
  await assert.rejects(
    resolver.resolve({
      argv: ["npm", "ci"],
      cwd: "C:\\source",
      env: { PATH: "C:\\custom;C:\\fallback" },
    }),
    /JavaScript entry point/,
  );
});
