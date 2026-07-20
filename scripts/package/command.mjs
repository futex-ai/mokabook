import { execFile, spawn } from "node:child_process";

const OUTPUT_LIMIT = 32 * 1024 * 1024;

export function runCommand(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        maxBuffer: OUTPUT_LIMIT,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `${file} ${args.join(" ")} failed\n${stdout}${stderr}`.trim(),
              { cause: error },
            ),
          );
          return;
        }
        resolve({ stderr, stdout });
      },
    );
  });
}

export function runCommandResult(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    let stdout = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      resolve({ code, signal, stderr, stdout });
    });
  });
}

export function startCommand(file, args, options = {}) {
  const child = spawn(file, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  let stdout = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });
  return {
    child,
    output: () => ({ stderr, stdout }),
  };
}

export async function stopCommand(running) {
  if (running.child.exitCode !== null) return running.child.exitCode;
  running.child.kill("SIGTERM");
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      running.child.kill("SIGKILL");
      reject(new Error("child process did not stop after SIGTERM"));
    }, 10_000);
    running.child.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
}

export async function waitForOutput(running, pattern, label) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const output = running.output();
    const combined = `${output.stdout}\n${output.stderr}`;
    const match = combined.match(pattern);
    if (match) return match;
    if (running.child.exitCode !== null) {
      throw new Error(`${label} exited early\n${combined}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const output = running.output();
  throw new Error(
    `${label} did not become ready\n${output.stdout}\n${output.stderr}`,
  );
}
