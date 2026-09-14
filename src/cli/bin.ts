#!/usr/bin/env node

import { errorMessage } from "../errors.js";

import { run } from "./run.js";
import { redactCliSecrets } from "./secrets.js";

try {
  process.exitCode = await run(process.argv.slice(2));
} catch (error) {
  const redact = (message: string) =>
    redactCliSecrets(message, process.argv.slice(2), process.env);
  process.stderr.write(`${redact(errorMessage(error))}\n`);
  if (
    process.env.MOKLY_DIAGNOSTIC === "1" &&
    error instanceof Error &&
    error.stack
  ) {
    process.stderr.write(`${redact(error.stack)}\n`);
  }
  process.exitCode = 1;
}
