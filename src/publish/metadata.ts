import { MoklyError } from "../errors.js";
import type { GitCommandRunner } from "../review/git.js";

import type { UploadIdentity, UploadRepository } from "./types.js";
import {
  boundedText,
  GIT_SHA,
  repositoryHost,
  repositorySegment,
} from "./validation.js";

/** Parse a remote URL or explicit host/owner/name without retaining credentials. */
export function parseRepository(source: string): UploadRepository {
  let host: string;
  let repositoryPath: string;
  if (source.includes("://")) {
    const parts = /^(https?|ssh):\/\/[^/?#]+\/([^?#]+)$/.exec(source);
    if (!parts) throw identityError();
    try {
      host = new URL(source).hostname.toLowerCase();
    } catch {
      throw identityError();
    }
    repositoryPath = parts[2]!;
  } else {
    const scp = /^(?:[^@/\s]+@)?([^:/\s]+):(.+)$/.exec(source);
    if (scp) {
      host = scp[1]!.toLowerCase();
      repositoryPath = scp[2]!;
    } else {
      const slash = source.indexOf("/");
      host = source.slice(0, slash).toLowerCase();
      repositoryPath = source.slice(slash + 1);
    }
  }
  const parts = repositoryPath.replace(/\.git$/, "").split("/");
  const name = parts.pop() ?? "";
  const owner = parts.join("/");
  if (
    !repositoryHost(host) ||
    !boundedText(owner, 255) ||
    !parts.every(repositorySegment) ||
    !boundedText(name, 255) ||
    !repositorySegment(name)
  )
    throw identityError();
  return { host, owner, name };
}

/** Read actual checkout identity with injectable Git operations and CI context. */
export async function readUploadIdentity(
  runner: GitCommandRunner,
  env: Readonly<Record<string, string | undefined>>,
  repository?: string,
): Promise<UploadIdentity> {
  try {
    const gitRoot = (await runner.run(["rev-parse", "--show-toplevel"])).trim();
    const headSha = await readHeadSha(runner);
    let remote = repository;
    if (remote === undefined) {
      const names = (await runner.run(["remote"]))
        .trim()
        .split("\n")
        .filter(Boolean);
      const name = names.includes("origin")
        ? "origin"
        : names.length === 1
          ? names[0]
          : undefined;
      if (!name) throw identityError();
      remote = (await runner.run(["remote", "get-url", name])).trim();
    }
    let branch = "HEAD";
    try {
      branch = (
        await runner.run(["symbolic-ref", "--quiet", "--short", "HEAD"])
      ).trim();
    } catch {
      branch = "HEAD";
    }
    let pullRequest: number | null = null;
    if (env["GITHUB_ACTIONS"] === "true") {
      branch =
        env["GITHUB_HEAD_REF"] ||
        (env["GITHUB_REF_TYPE"] === "branch"
          ? env["GITHUB_REF_NAME"]
          : undefined) ||
        branch;
      const pr = /^refs\/pull\/([1-9]\d*)\/(?:merge|head)$/.exec(
        env["GITHUB_REF"] ?? "",
      );
      if (pr) pullRequest = Number(pr[1]);
    }
    if (
      !boundedText(branch, 255) ||
      (pullRequest !== null && !Number.isSafeInteger(pullRequest))
    )
      throw identityError();
    return {
      repository: parseRepository(remote),
      branch,
      headSha,
      pullRequest,
      gitRoot,
    };
  } catch {
    throw identityError();
  }
}

/** Resolve one committed HEAD without leaking subprocess output. */
export async function readHeadSha(runner: GitCommandRunner): Promise<string> {
  try {
    const sha = (await runner.run(["rev-parse", "--verify", "HEAD"])).trim();
    if (!GIT_SHA.test(sha)) throw identityError();
    return sha;
  } catch {
    throw identityError();
  }
}

function identityError(): MoklyError {
  return new MoklyError(
    "git-failed",
    "Publish needs a committed Git checkout and a valid remote; use --repository <host>/<owner>/<name> to set repository identity.",
  );
}
