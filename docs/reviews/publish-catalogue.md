# Publish Catalogue Review

## Findings

1. **P2 / Medium — Required ownership marker lacks a complete public schema.**
   [Upload validation](../protocol/mokly-upload.md#validation-and-limits),
   lines 189–191, requires receivers to validate `.mokly-export-artifact` and
   match its inventory to the archive. The linked export and delivery contracts
   describe a version and inventory but never define the JSON field names,
   field types, or unknown-field policy. Those details currently live in
   [the internal ownership parser](../../src/export/ownership.ts), lines 10–14
   and 32–65, and the internal staging writer. Independent receivers cannot
   implement this required validation from the documented artifacts alone;
   leaving it unchanged forces reverse engineering or inconsistent acceptance.

   Options: **A)** document the marker's exact JSON shape and validation rules
   in the export contract and link them from upload; **B)** do A and add public
   valid/invalid artifact fixtures exercised by the packed-consumer smoke;
   **C)** remove the receiver's marker-validation requirement. **Recommended:
   B.** The documentation closes the immediate gap, while fixtures give Cloud
   and self-hosters a stable compatibility check and guard future changes to
   mandatory artifacts. This adds fixture maintenance but preserves the
   intended package-and-files boundary without exporting internal modules.

2. **P2 / Medium — Valid bearer tokens beginning with a dash fail through the
   advertised flag.** [The new token parser branch](../../src/cli/arguments.ts),
   line 62, uses `takeValue`, which rejects all values starting with `-` at
   lines 87–90. Upload v1's bearer grammar explicitly permits those tokens.
   An in-memory probe confirmed that `--token -review-synthetic-credential`
   fails with `[mokly/cli-invalid] --token requires a value`; the unambiguous
   `--token=-review-synthetic-credential` form also fails as an unknown option.
   The same synthetic credential passes environment-option validation.
   Leaving this unchanged prevents some valid service credentials from being
   used through the documented flag. `MOKLY_TOKEN` is a working workaround,
   including in the composite action.

   Options: **A)** document the environment-only workaround for leading-dash
   credentials; **B)** support unambiguous `--name=value` parsing in the shared
   argument parser, document it, and test leading-dash values and redaction;
   **C)** special-case token value consumption. **Recommended: B.** A shared
   value-option rule also handles legitimate dash-prefixed paths, avoids an
   inconsistent token-only exception, and retains missing-value detection.
   Scope regressions to value options and ensure boolean flags still reject
   assigned values; a new parser dependency is not required.

No finding was applied. These recommendations require a subsequent user
decision and are not additional required milestones in the delivered plan.

## Scope And Delivery

Reviewed on 2026-09-14 using
[the implementation review prompt](../implementation-review-prompt.md), only
after implementation commit `e7d46d7` was pushed. The comparison baseline was
`origin/main` at `5b4c647b6138fa08d65a7573f01b1c342ec9b019`. The complete diff
contained 56 changed or added files and no deletions. The working tree, staged
diff and untracked-file list were empty at review start and completion.

The read-only review covered CLI parsing and secrecy, metadata, archive and
HTTP boundaries, export assembly and transactions, the composite action,
package allowlists and release fixtures, tests, documentation and the plan.
It used focused file/patch inspection and an in-memory compiled-parser probe;
it did not alter implementation, tests or generated artifacts. This report and
the plan's delivery checkboxes were recorded after that review.

## Verification And Remaining Release Work

The full `cargo xtask check` gate passed before commit and push, using Node
22.14.0: all 1,074 unit/integration tests, 247 Chromium tests and three Rust
tests passed, with none failed, skipped or cancelled. Package/example checks,
dependency audits, formatting, lint, types, Rust formatting/Clippy and the
Rust file-length audit also passed. The 30 focused publish tests passed on
Node 24.14.1. See [the plan](../../plans/publish-catalogue.md#verification-evidence)
for earlier-run failures and their resolution.

Packed-package smoke tests performed real local HTTP uploads in both comparison
modes and checked extracted bytes against the installed export. The action's
actual shell steps were tested with an injected npm installer; a complete
hosted GitHub Actions workflow and a production receiver were not exercised.
That integration remains the residual test risk.

The [composite action](../../.github/actions/publish/README.md) is delivered
under `.github/actions/publish`. Consumers must pin an npm release containing
this feature before using it remotely. No npm release, separate action
repository or PR was created. The plan remains active until PR merge.
