import { MokabookError } from "../errors.js";

/** Supported user-visible and hidden process commands. */
export type CliCommand =
  "__serve-child" | "build" | "check" | "review" | "serve";

/** Fully validated CLI arguments. */
export interface CliArguments {
  base?: string;
  command: CliCommand;
  config?: string;
  help: boolean;
  out?: string;
  port?: number;
  updateVersion?: number;
  version: boolean;
  watch?: boolean;
}

const COMMANDS = new Set<CliCommand>([
  "__serve-child",
  "build",
  "check",
  "review",
  "serve",
]);

/** Parse Mokabook arguments without accepting silent positional values. */
export function parseArguments(argv: readonly string[]): CliArguments {
  const values = [...argv];
  let command: CliCommand = "serve";
  if (values[0] && !values[0].startsWith("-")) {
    const candidate = values.shift() as string;
    if (!COMMANDS.has(candidate as CliCommand)) {
      throw new MokabookError("cli-invalid", `unknown command: ${candidate}`);
    }
    command = candidate as CliCommand;
  }
  const parsed: CliArguments = { command, help: false, version: false };
  while (values.length > 0) {
    const option = values.shift();
    if (option === "--help" || option === "-h") parsed.help = true;
    else if (option === "--version" || option === "-v") parsed.version = true;
    else if (option === "--watch") parsed.watch = true;
    else if (option === "--no-watch") parsed.watch = false;
    else if (option === "--config") parsed.config = takeValue(option, values);
    else if (option === "--base") parsed.base = takeValue(option, values);
    else if (option === "--out") parsed.out = takeValue(option, values);
    else if (option === "--port")
      parsed.port = parsePort(takeValue(option, values));
    else if (option === "--update-version")
      parsed.updateVersion = parseUpdateVersion(takeValue(option, values));
    else
      throw new MokabookError("cli-invalid", `unknown option: ${option ?? ""}`);
  }
  validateCommandOptions(parsed);
  return parsed;
}

function parseUpdateVersion(value: string): number {
  const version = Number(value);
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new MokabookError(
      "cli-invalid",
      "--update-version must be a positive safe integer",
    );
  }
  return version;
}

function takeValue(option: string, values: string[]): string {
  const value = values.shift();
  if (!value || value.startsWith("-")) {
    throw new MokabookError("cli-invalid", `${option} requires a value`);
  }
  return value;
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new MokabookError(
      "cli-invalid",
      "--port must be an integer from 0 to 65535",
    );
  }
  return port;
}

function validateCommandOptions(arguments_: CliArguments): void {
  const serve =
    arguments_.command === "serve" || arguments_.command === "__serve-child";
  if (
    !serve &&
    (arguments_.port !== undefined || arguments_.watch !== undefined)
  ) {
    throw new MokabookError(
      "cli-invalid",
      "--port and --watch options belong to serve",
    );
  }
  if (arguments_.command !== "review" && arguments_.out !== undefined) {
    throw new MokabookError("cli-invalid", "--out belongs to review");
  }
  if (
    arguments_.command !== "__serve-child" &&
    arguments_.updateVersion !== undefined
  ) {
    throw new MokabookError(
      "cli-invalid",
      "--update-version is reserved for the watched server child",
    );
  }
  if (arguments_.command === "build" || arguments_.command === "check") {
    if (arguments_.base !== undefined)
      throw new MokabookError(
        "cli-invalid",
        "--base belongs to serve or review",
      );
  }
}
