#!/usr/bin/env node

import { errorMessage } from "../errors.js";
import { run } from "./run.js";

try {
  process.exitCode = await run(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${errorMessage(error)}\n`);
  if (
    process.env.MOKABOOK_DIAGNOSTIC === "1" &&
    error instanceof Error &&
    error.stack
  ) {
    process.stderr.write(`${error.stack}\n`);
  }
  process.exitCode = 1;
}
