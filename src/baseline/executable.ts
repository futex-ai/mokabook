import fs from "node:fs/promises";
import path from "node:path";

import type { BaselineProcessRequest } from "./types.js";

/** Locate executable files without running an interactive shell or a package shim. */
export interface BaselineExecutableHost {
  readonly platform: NodeJS.Platform;
  readonly nodeExecutable: string;
  isFile(file: string): Promise<boolean>;
}

export interface BaselineExecutableResolver {
  resolve(request: BaselineProcessRequest): Promise<readonly string[]>;
}

class NodeExecutableHost implements BaselineExecutableHost {
  readonly platform = process.platform;
  readonly nodeExecutable = process.execPath;
  async isFile(file: string): Promise<boolean> {
    try {
      return (await fs.stat(file)).isFile();
    } catch (error) {
      if (
        ["ENOENT", "ENOTDIR"].includes(
          (error as NodeJS.ErrnoException).code ?? "",
        )
      )
        return false;
      throw error;
    }
  }
}

/** Windows npm/npx are cmd shims; invoke that installation's JavaScript entry point directly. */
export class NodeBaselineExecutableResolver implements BaselineExecutableResolver {
  constructor(
    private readonly host: BaselineExecutableHost = new NodeExecutableHost(),
  ) {}

  async resolve(request: BaselineProcessRequest): Promise<readonly string[]> {
    const [executable = "", ...args] = request.argv;
    const basename = path.win32.basename(executable);
    const command = /^(npm|npx)(?:\.cmd)?$/i.exec(basename)?.[1]?.toLowerCase();
    if (this.host.platform !== "win32" || !command) return request.argv;
    const pathKey = Object.keys(request.env)
      .sort()
      .find((key) => key.toUpperCase() === "PATH");
    const directories =
      basename !== executable
        ? [path.win32.dirname(path.win32.resolve(request.cwd, executable))]
        : (request.env[pathKey ?? "PATH"] ?? "")
            .split(";")
            .filter(Boolean)
            .map((directory) =>
              path.win32.resolve(
                request.cwd,
                directory.replace(/^"(.*)"$/, "$1"),
              ),
            );
    for (const directory of directories) {
      if (
        !(await this.host.isFile(path.win32.join(directory, `${command}.cmd`)))
      )
        continue;
      const scripts = [
        path.win32.join(
          directory,
          "node_modules",
          "npm",
          "bin",
          `${command}-cli.js`,
        ),
      ];
      if (path.win32.basename(directory).toLowerCase() === ".bin")
        scripts.push(
          path.win32.join(directory, "..", "npm", "bin", `${command}-cli.js`),
        );
      for (const script of scripts) {
        if (!(await this.host.isFile(script))) continue;
        const adjacentNode = path.win32.join(directory, "node.exe");
        const node = (await this.host.isFile(adjacentNode))
          ? adjacentNode
          : this.host.nodeExecutable;
        return [node, script, ...args];
      }
      throw new Error(
        `Cannot find the ${command} JavaScript entry point beside ${directory}`,
      );
    }
    throw new Error(`Cannot find ${command}.cmd on the baseline command PATH`);
  }
}
