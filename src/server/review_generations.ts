/** Immutable filesystem generations for served Review artifacts. */

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { MokabookError, errorMessage } from "../errors.js";

const GENERATION_RETENTION_MS = 60_000;

/** Provider that replaces one configured Review artifact directory. */
export interface ReviewArtifactProvider {
  /** Replace {@link outDir} with one complete Review artifact. */
  generate(): Promise<void>;
  /** Configured directory holding the current Review artifact. */
  outDir: string;
}

/** One immutable artifact directory addressable by its server URL version. */
export interface ReviewGeneration {
  readonly directory: string;
  readonly version: string;
}

/** Preserve replaced artifacts briefly so in-flight pages remain coherent. */
export class ReviewGenerationStore {
  private archiveRoot: string | undefined;
  private readonly generations = new Map<string, ReviewGeneration>();
  private readonly retentionTimers = new Map<string, NodeJS.Timeout>();
  private readonly removals = new Set<Promise<void>>();
  private currentGeneration: ReviewGeneration | undefined;

  constructor(private readonly provider: ReviewArtifactProvider) {}

  /** Most recently completed generation, if the provider has run. */
  current(): ReviewGeneration | undefined {
    return this.currentGeneration;
  }

  /** Find a retained generation and extend its idle retention window. */
  get(version: string): ReviewGeneration | undefined {
    const generation = this.generations.get(version);
    if (generation && generation.version !== this.currentGeneration?.version)
      this.scheduleExpiry(generation);
    return generation;
  }

  /** Replace the current artifact while retaining its immutable predecessor. */
  async generate(): Promise<ReviewGeneration> {
    const previous = this.currentGeneration;
    const archived = previous ? await this.archive(previous) : undefined;
    try {
      await this.provider.generate();
      const output = await fs.promises.stat(this.provider.outDir);
      if (!output.isDirectory()) {
        throw new MokabookError(
          "server-failed",
          `Review provider did not generate a directory at ${this.provider.outDir}`,
        );
      }
    } catch (error) {
      if (archived) await this.restore(archived, error);
      throw error;
    }
    const generation = {
      directory: path.resolve(this.provider.outDir),
      version: randomUUID(),
    };
    this.currentGeneration = generation;
    this.generations.set(generation.version, generation);
    if (archived) this.scheduleExpiry(archived);
    return generation;
  }

  /** Remove only temporary archives owned by this server instance. */
  async close(): Promise<void> {
    for (const timer of this.retentionTimers.values()) clearTimeout(timer);
    this.retentionTimers.clear();
    await Promise.allSettled([...this.removals]);
    if (this.archiveRoot) {
      await fs.promises.rm(this.archiveRoot, { force: true, recursive: true });
    }
  }

  private async archive(
    generation: ReviewGeneration,
  ): Promise<ReviewGeneration> {
    const archiveRoot = await this.ensureArchiveRoot();
    const archived = {
      directory: path.join(archiveRoot, generation.version),
      version: generation.version,
    };
    fs.renameSync(this.provider.outDir, archived.directory);
    this.currentGeneration = archived;
    this.generations.set(archived.version, archived);
    return archived;
  }

  private async ensureArchiveRoot(): Promise<string> {
    if (!this.archiveRoot) {
      await fs.promises.mkdir(path.dirname(this.provider.outDir), {
        recursive: true,
      });
      this.archiveRoot = await fs.promises.mkdtemp(
        path.join(
          path.dirname(this.provider.outDir),
          ".mokabook-review-served-",
        ),
      );
    }
    return this.archiveRoot;
  }

  private async restore(
    archived: ReviewGeneration,
    generationError: unknown,
  ): Promise<void> {
    try {
      await fs.promises.rm(this.provider.outDir, {
        force: true,
        recursive: true,
      });
      fs.renameSync(archived.directory, this.provider.outDir);
      const restored = {
        directory: path.resolve(this.provider.outDir),
        version: archived.version,
      };
      this.currentGeneration = restored;
      this.generations.set(restored.version, restored);
    } catch (restoreError) {
      throw new MokabookError(
        "server-failed",
        `Review generation failed (${errorMessage(generationError)}) and its ` +
          `previous artifact could not be restored: ${errorMessage(restoreError)}`,
        { cause: restoreError },
      );
    }
  }

  private scheduleExpiry(generation: ReviewGeneration): void {
    const existing = this.retentionTimers.get(generation.version);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(
      () => this.expire(generation),
      GENERATION_RETENTION_MS,
    );
    timer.unref();
    this.retentionTimers.set(generation.version, timer);
  }

  private expire(generation: ReviewGeneration): void {
    this.retentionTimers.delete(generation.version);
    if (generation.version === this.currentGeneration?.version) return;
    this.generations.delete(generation.version);
    const removal = fs.promises.rm(generation.directory, {
      force: true,
      recursive: true,
    });
    this.removals.add(removal);
    void removal.then(
      () => this.removals.delete(removal),
      () => this.removals.delete(removal),
    );
  }
}
