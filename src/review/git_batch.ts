import { MokabookError, errorMessage } from "../errors.js";
import type { GitCommandRunner, GitFile, GitFileKind } from "./git.js";

const MAX_BATCH_CONTENT_BYTES = 48 * 1024 * 1024;

interface TreeRecord {
  readonly kind: GitFileKind;
  readonly objectId?: string;
  readonly size?: number;
}

interface BlobRecord {
  readonly objectId: string;
  readonly size: number;
}

/** Read many regular files from one Git tree with bounded batch processes. */
export async function readGitFiles(
  runner: GitCommandRunner,
  commit: string,
  repoRelativePaths: readonly string[],
): Promise<ReadonlyMap<string, GitFile>> {
  const paths = [...new Set(repoRelativePaths)].sort();
  if (paths.length === 0) return new Map();
  const tree = await readTree(runner, commit, paths);
  const blobs = uniqueBlobs(tree);
  const contents = new Map<string, Uint8Array>();
  for (const batch of contentBatches(blobs)) {
    const batchContents = await readBlobBatch(runner, batch);
    for (const [objectId, bytes] of batchContents) {
      contents.set(objectId, bytes);
    }
  }
  const files = new Map<string, GitFile>();
  for (const repoPath of paths) {
    const record = tree.get(repoPath) ?? { kind: "missing" as const };
    if (record.kind !== "regular") {
      files.set(repoPath, { kind: record.kind });
      continue;
    }
    const bytes = record.objectId ? contents.get(record.objectId) : undefined;
    if (!bytes) {
      throw new MokabookError(
        "git-failed",
        `Git omitted regular file content for ${repoPath}`,
      );
    }
    files.set(repoPath, { bytes, kind: "regular" });
  }
  return files;
}

async function readTree(
  runner: GitCommandRunner,
  commit: string,
  paths: readonly string[],
): Promise<ReadonlyMap<string, TreeRecord>> {
  const commonParent = commonParentPath(paths);
  const pathspecs = (commonParent ? [commonParent] : paths).map(
    (repoPath) => `:(literal)${repoPath}`,
  );
  let output: string;
  try {
    output = await runner.run([
      "ls-tree",
      "-rztl",
      "--full-tree",
      commit,
      "--",
      ...pathspecs,
    ]);
  } catch (error) {
    throw gitBatchError(`inspect files at ${commit}`, error);
  }
  const requested = new Set(paths);
  const records = new Map<string, TreeRecord>();
  for (const rawRecord of output.split("\0")) {
    if (rawRecord === "") continue;
    const separator = rawRecord.indexOf("\t");
    if (separator < 0) {
      throw new MokabookError(
        "git-failed",
        `Git returned invalid tree metadata at ${commit}`,
      );
    }
    const repoPath = rawRecord.slice(separator + 1);
    if (!requested.has(repoPath)) continue;
    if (records.has(repoPath)) {
      throw new MokabookError(
        "git-failed",
        `Git returned multiple entries for ${repoPath}`,
      );
    }
    records.set(repoPath, parseTreeRecord(rawRecord.slice(0, separator)));
  }
  return records;
}

function parseTreeRecord(metadata: string): TreeRecord {
  const [mode = "", type = "", objectId = "", rawSize = ""] = metadata
    .trim()
    .split(/\s+/);
  const kind = fileKind(mode);
  if (kind !== "regular") return { kind };
  const size = Number(rawSize);
  if (
    type !== "blob" ||
    !/^[a-f0-9]{40,64}$/.test(objectId) ||
    !Number.isSafeInteger(size) ||
    size < 0
  ) {
    throw new MokabookError(
      "git-failed",
      "Git returned invalid regular-file metadata",
    );
  }
  return { kind, objectId, size };
}

function uniqueBlobs(tree: ReadonlyMap<string, TreeRecord>): BlobRecord[] {
  const blobs = new Map<string, BlobRecord>();
  for (const record of tree.values()) {
    if (
      record.kind === "regular" &&
      record.objectId !== undefined &&
      record.size !== undefined
    ) {
      blobs.set(record.objectId, {
        objectId: record.objectId,
        size: record.size,
      });
    }
  }
  return [...blobs.values()].sort((left, right) =>
    left.objectId.localeCompare(right.objectId),
  );
}

function contentBatches(blobs: readonly BlobRecord[]): BlobRecord[][] {
  const batches: BlobRecord[][] = [];
  let current: BlobRecord[] = [];
  let currentSize = 0;
  for (const blob of blobs) {
    if (
      current.length > 0 &&
      currentSize + blob.size > MAX_BATCH_CONTENT_BYTES
    ) {
      batches.push(current);
      current = [];
      currentSize = 0;
    }
    current.push(blob);
    currentSize += blob.size;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

async function readBlobBatch(
  runner: GitCommandRunner,
  blobs: readonly BlobRecord[],
): Promise<ReadonlyMap<string, Uint8Array>> {
  if (!runner.runBytesWithInput) {
    throw new MokabookError("git-failed", "Git batch input is unavailable");
  }
  let output: Uint8Array;
  try {
    output = await runner.runBytesWithInput(
      ["cat-file", "--batch"],
      Buffer.from(`${blobs.map((blob) => blob.objectId).join("\n")}\n`),
    );
  } catch (error) {
    throw gitBatchError("read base snapshot batch", error);
  }
  return parseBlobBatch(output, blobs);
}

function parseBlobBatch(
  output: Uint8Array,
  blobs: readonly BlobRecord[],
): ReadonlyMap<string, Uint8Array> {
  const contents = new Map<string, Uint8Array>();
  let cursor = 0;
  for (const blob of blobs) {
    const headerEnd = output.indexOf(10, cursor);
    if (headerEnd < 0) throw invalidBatchOutput();
    const header = Buffer.from(output.subarray(cursor, headerEnd)).toString(
      "utf8",
    );
    const [objectId = "", type = "", rawSize = ""] = header.split(" ");
    const size = Number(rawSize);
    if (
      objectId !== blob.objectId ||
      type !== "blob" ||
      size !== blob.size ||
      !Number.isSafeInteger(size)
    ) {
      throw invalidBatchOutput();
    }
    const contentStart = headerEnd + 1;
    const contentEnd = contentStart + size;
    if (contentEnd >= output.length || output[contentEnd] !== 10) {
      throw invalidBatchOutput();
    }
    contents.set(objectId, output.slice(contentStart, contentEnd));
    cursor = contentEnd + 1;
  }
  if (cursor !== output.length) throw invalidBatchOutput();
  return contents;
}

function commonParentPath(paths: readonly string[]): string {
  const [first, ...rest] = paths.map((repoPath) =>
    repoPath.split("/").slice(0, -1),
  );
  if (!first) return "";
  let length = first.length;
  for (const parts of rest) {
    length = Math.min(length, parts.length);
    for (let index = 0; index < length; index += 1) {
      if (first[index] !== parts[index]) {
        length = index;
        break;
      }
    }
  }
  return first.slice(0, length).join("/");
}

function fileKind(mode: string): GitFileKind {
  if (/^100[0-7]{3}$/.test(mode)) return "regular";
  if (mode === "120000") return "symlink";
  return "other";
}

function invalidBatchOutput(): MokabookError {
  return new MokabookError(
    "git-failed",
    "Git returned invalid base snapshot batch output",
  );
}

function gitBatchError(context: string, error: unknown): MokabookError {
  return new MokabookError("git-failed", `${context}: ${errorMessage(error)}`, {
    cause: error,
  });
}
