# Rebuilt historical baselines

This internal module reproduces generated output using the merge-base commit's
own code and dependencies. Rebuilding executes trusted mainline code. It is not
a sandbox and must run outside HTTP requests. Public consumers configure the CLI;
this directory adds no supported JavaScript package exports.

`BaselineBuilder` in `types.ts` accepts `build(request)`, where the request names
one resolved commit, repository root, repository-relative `mockupsPath`, exact
argv commands, optional historical-v2 compatibility, and an `AbortSignal`.
`CachedBaselineBuilder` implements it with injected filesystem, process runner,
and clock interfaces. The Node implementations live in `filesystem.ts`,
`process.ts`, and `clock.ts`.

```ts
const prepared = await builder.build({
  repoRoot,
  commit,
  mockupsPath: "docs/mockups",
  commands: [
    ["npm", "ci"],
    ["npm", "run", "mockups:build"],
  ],
  signal,
  onProgress(event) {
    // Publish preparation state; keep typed diagnostics outside product copy.
    if (event.type === "start") preparing(event.commit);
    if (event.type === "complete") completed(event.commit, event.cacheHit);
    if (event.type === "fail") failed(event.commit, event.error);
  },
});
```

The observer is synchronous and must not throw. A cache hit emits only
`complete` with `cacheHit: true`; a miss or lock wait emits `start`, followed by
`complete` or `fail`. Waiters can complete with `cacheHit: true` after sharing
another caller's rebuild. Await `build()` to include lock release and cleanup.
Callers should keep their own sequence/commit guard to ignore superseded events.
Abort the request and await settlement before terminating a worker or shutting
down its host. Detailed timing phases and the Serve `preparing` presentation
belong to the later integration milestone.

`cache_layout.ts` owns `.mokabook-cache/baselines/<commit>`. The builder extracts
to `source`, runs commands, validates the historical manifest and output tree,
moves the generated directory to `output`, deletes the extraction, and writes
`complete.json`. `inputs.json` records the repository-relative output path;
the marker records the commands. A complete entry for different settings fails
explicitly and remains intact. Remove that commit's cache entry before changing
its catalogue/build settings. Partial entries are rebuilt under the entry lock.

Lock publication uses a fully written temporary file and an exclusive hard link.
Dead-holder reclamation retains an identity-specific hard-link tombstone so
simultaneous stale observers cannot unlink a replacement lock. Waiters poll every
100 ms for at most two minutes by default. Cleanup retains three completed
commits by default, always keeping the active entry and skipping locked entries.
Retired entries are moved beneath the active locked entry before removal.

`archive.ts` uses the tar parser without its filesystem extractor, validates all
paths and symlink chains before writing, and rejects hard links, device files,
cycles and traversal through symlink ancestors. Git archives are uncompressed
and bounded to 64 MiB. Commands run without a shell and receive only PATH, HOME,
locale/temp variables, CI=1 and MOKABOOK_BASELINE_COMMIT. Combined diagnostics
retain at most 64 KiB; command errors expose the last 40 lines and a zero-based
command index, argv, exit code and signal. Cancellation sends TERM then KILL to
the process group and waits for the process and pipes to close.

`RebuiltBaselineReader(fs, repoRoot, outputDir, commit, mockupsPath, signal?)`
reads only a completed output tree. Its `BaselineReader` API retains
repository-relative paths and the pinned commit; it strips the output prefix
internally. It rejects symlinks at every ancestor and non-regular files. Bulk
reads use the Git reader's 4,096-object / 48 MiB batch limits, with at most 32
filesystem reads in flight. The review asset reader additionally applies the
historical manifest's source inventory and reserved-name policy.

```bash
npm run build
node --import tsx --test tests/baseline*.test.ts
```

Unit tests use an in-memory filesystem, fake process runner and clock. The real
Git integration fixture exercises extraction, execution, cache sharing, recovery,
interruption and symlink rejection. See the
[derived-baseline contract](../../docs/protocol/mokabook-derived-baselines.md)
and [review boundaries](../review/README.md).
