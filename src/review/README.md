# Historical catalogue comparisons

This internal module compares current validated output with a historical
baseline. The supported consumer interface remains the catalogue and CLI;
these modules are not public package exports.

`git.ts` defines separate `RepositoryEvidence` (merge base and changed paths)
and `BaselineReader` (historical files) interfaces. Paths at the reader boundary
are repository-relative and reads identify their commit. `ReviewRepository`
groups those independent dependencies for comparison orchestration.
`CommittedRepository` composes `GitRepositoryEvidence` with
`CommittedBaselineReader` using an injected `GitCommandRunner`.

`git_batch.ts` bounds literal tree queries and blob reads by pathspec bytes,
object count and output bytes. `assets.ts` applies the baseline manifest's
source policy and rejects non-regular files before using historical resources.
`compare.ts` builds complete comparisons; `selected.ts` retains only a requested
view's checked snapshot closure. Neither reader executes historical code.

Server classification and export use the same interfaces. Export pins only
repository evidence and retains the same baseline reader, including its optional
bulk-read capability. Current output and public assets have separate readers.

```bash
npm run build
node --import tsx --test tests/review*.test.ts tests/server_changed.test.ts
```

See the [Changes contract](../../docs/protocol/mokabook-changes.md),
[derived baselines contract](../../docs/protocol/mokabook-derived-baselines.md),
and [export boundary](../export/README.md).
