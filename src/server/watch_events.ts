import path from "node:path";

import { minimatch } from "minimatch";

import { isOwned } from "../build/ownership.js";
import { isInside, toPosixPath } from "../config/paths.js";
import type { ResolvedConfig, WatchAction } from "../config/types.js";
import { MANIFEST_NAME } from "../registry/manifest.js";

const IGNORED_DIRECTORY_NAMES = new Set([
  ".context",
  ".git",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "target",
  "test-results",
]);
const IGNORED_TEMPORARY_PREFIXES = [
  ".mokabook-review-",
  ".mokabook-write-",
] as const;

/** Internal watch work, including package-owned configuration reloads. */
export type RuntimeWatchAction = "reconfigure" | WatchAction;

/** Buffer notifications until startup is ready to process them. */
export class NotificationGate<Value> {
  readonly #buffer: Value[] = [];
  #consumer: ((value: Value) => void) | undefined;

  /** Queue or immediately deliver one notification. */
  notify(value: Value): void {
    if (this.#consumer) this.#consumer(value);
    else this.#buffer.push(value);
  }

  /** Open the gate and flush startup notifications in arrival order. */
  open(consumer: (value: Value) => void): void {
    this.#consumer = consumer;
    for (const value of this.#buffer.splice(0)) consumer(value);
  }
}

/** Minimal clock seam for deterministic debounce tests. */
export interface DebounceClock {
  clear(handle: ReturnType<typeof setTimeout>): void;
  schedule(
    callback: () => void,
    milliseconds: number,
  ): ReturnType<typeof setTimeout>;
}

/** Runtime clock backed by Node timers. */
export const systemDebounceClock: DebounceClock = {
  clear: clearTimeout,
  schedule: setTimeout,
};

const ACTION_PRIORITY: readonly RuntimeWatchAction[] = [
  "reconfigure",
  "rebuild",
  "restart",
  "reload",
  "ignore",
];

/** Coalesce filesystem notifications into one highest-impact action. */
export class WatchDebouncer {
  readonly #actions = new Set<RuntimeWatchAction>();
  #handle: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly delay: number,
    private readonly callback: (action: RuntimeWatchAction) => void,
    private readonly clock: DebounceClock = systemDebounceClock,
  ) {}

  /** Add one classified notification to the current burst. */
  notify(action: RuntimeWatchAction): void {
    this.#actions.add(action);
    if (this.#handle) this.clock.clear(this.#handle);
    this.#handle = this.clock.schedule(() => this.flush(), this.delay);
  }

  /** Cancel pending work. */
  close(): void {
    if (this.#handle) this.clock.clear(this.#handle);
    this.#handle = undefined;
    this.#actions.clear();
  }

  private flush(): void {
    this.#handle = undefined;
    const action = ACTION_PRIORITY.find((candidate) =>
      this.#actions.has(candidate),
    );
    this.#actions.clear();
    if (action && action !== "ignore") this.callback(action);
  }
}

/** Serialize watch work and coalesce changes received during active work. */
export class WatchActionQueue {
  readonly #pending = new Set<RuntimeWatchAction>();
  #closed = false;
  #draining: Promise<void> | undefined;

  constructor(
    private readonly process: (action: RuntimeWatchAction) => Promise<void>,
    private readonly reportError: (error: unknown) => void,
  ) {}

  /** Queue one action; a stronger pending action subsumes weaker actions. */
  notify(action: RuntimeWatchAction): void {
    if (this.#closed || action === "ignore") return;
    this.#pending.add(action);
    if (!this.#draining) this.#draining = this.drain();
  }

  /** Wait until all currently queued work has completed. */
  async settled(): Promise<void> {
    while (this.#draining) await this.#draining;
  }

  /** Discard pending work and wait for the active operation to finish. */
  async close(): Promise<void> {
    this.#closed = true;
    this.#pending.clear();
    await this.#draining;
  }

  private async drain(): Promise<void> {
    try {
      while (!this.#closed && this.#pending.size > 0) {
        const action = ACTION_PRIORITY.find((candidate) =>
          this.#pending.has(candidate),
        );
        this.#pending.clear();
        if (!action || action === "ignore") continue;
        try {
          await this.process(action);
        } catch (error) {
          this.reportError(error);
        }
      }
    } finally {
      this.#draining = undefined;
      if (!this.#closed && this.#pending.size > 0) {
        this.#draining = this.drain();
      }
    }
  }
}

/** Classify one absolute consumer path using only resolved host config. */
export function classifyWatchPath(
  candidate: string,
  config: ResolvedConfig,
): RuntimeWatchAction {
  const absolute = path.resolve(candidate);
  if (absolute === config.configPath) return "reconfigure";
  if (isInside(config.entriesDir, absolute)) return "rebuild";
  if (config.legacy && isInside(config.legacy.pagesDir, absolute))
    return "rebuild";
  if (config.renderer === absolute || config.legacy?.components === absolute)
    return "rebuild";
  const relative = toPosixPath(path.relative(config.repoRoot, absolute));
  if (isPackageOwnedIgnoredWatchPath(absolute, config)) return "ignore";
  const stylesheetPaths = config.stylesheets.flatMap(
    (rule) => rule.stylesheets,
  );
  if (
    stylesheetPaths.some(
      (value) =>
        !/^https?:\/\//.test(value) &&
        path.resolve(config.mockupsDir, value) === absolute,
    )
  ) {
    return "reload";
  }
  for (const rule of config.watch.rules) {
    if (rule.paths.some((glob) => minimatch(relative, glob, { dot: true })))
      return rule.action;
  }
  return "ignore";
}

/** Return whether package-owned output should be pruned from a broad watch. */
export function isPackageOwnedIgnoredWatchPath(
  candidate: string,
  config: ResolvedConfig,
): boolean {
  const absolute = path.resolve(candidate);
  if (!isInside(config.repoRoot, absolute)) return false;
  if (isRequiredWatchPath(absolute, config)) return false;
  if (isGeneratedOutputPath(absolute, config)) return true;
  if (isInside(config.review.outDir, absolute)) return true;
  const parts = path.relative(config.repoRoot, absolute).split(path.sep);
  return parts.some(
    (part) =>
      IGNORED_DIRECTORY_NAMES.has(part) ||
      IGNORED_TEMPORARY_PREFIXES.some((prefix) => part.startsWith(prefix)),
  );
}

/** Resolve the finite roots/globs watched for this consumer. */
export function watchTargets(config: ResolvedConfig): string[] {
  const targets = [config.configPath, config.entriesDir];
  if (config.legacy) targets.push(config.legacy.pagesDir);
  if (config.renderer) targets.push(config.renderer);
  if (config.legacy?.components) targets.push(config.legacy.components);
  for (const stylesheet of config.stylesheets.flatMap(
    (rule) => rule.stylesheets,
  )) {
    if (!/^https?:\/\//.test(stylesheet))
      targets.push(path.resolve(config.mockupsDir, stylesheet));
  }
  for (const rule of config.watch.rules) {
    targets.push(
      ...rule.paths.map((glob) => globWatchRoot(config.repoRoot, glob)),
    );
  }
  return [...new Set(targets)].sort();
}

function globWatchRoot(repoRoot: string, glob: string): string {
  const parts = glob.split("/");
  const firstGlob = parts.findIndex((part) => /[*?{[(]/.test(part));
  const stable = firstGlob === -1 ? parts : parts.slice(0, firstGlob);
  return path.resolve(repoRoot, stable.length === 0 ? "." : stable.join("/"));
}

function isGeneratedOutputPath(
  candidate: string,
  config: ResolvedConfig,
): boolean {
  if (!isInside(config.mockupsDir, candidate)) return false;
  const relative = toPosixPath(path.relative(config.mockupsDir, candidate));
  return relative === MANIFEST_NAME || isOwned(candidate, config);
}

function isRequiredWatchPath(
  candidate: string,
  config: ResolvedConfig,
): boolean {
  const required = [
    config.configPath,
    config.entriesDir,
    ...(config.legacy ? [config.legacy.pagesDir] : []),
    ...(config.renderer ? [config.renderer] : []),
    ...(config.legacy?.components ? [config.legacy.components] : []),
    ...config.stylesheets.flatMap((rule) =>
      rule.stylesheets.flatMap((stylesheet) =>
        /^https?:\/\//.test(stylesheet)
          ? []
          : [path.resolve(config.mockupsDir, stylesheet)],
      ),
    ),
  ];
  return required.some(
    (target) => isInside(candidate, target) || isInside(target, candidate),
  );
}
