# Mokly xtask

`xtask` owns repository-local verification for the Mokly workspace. It is an
internal binary and is not published to npm or crates.io.

## Responsibilities

- Run the current source-level TypeScript, package, example, and Rust suite.
- Fail verification when the live dependency audit reports an advisory or error.
- Enforce the Rust file-length limit.
- Enforce the 50-character commit-title limit for branch history.

## What This Crate Does

The crate provides `cargo xtask check`, `cargo xtask commit-title-lint`, and
`cargo xtask rust-file-length-lint`.
The Node unit/integration suite runs at most two test files concurrently;
individual concurrency tests and their existing timeouts remain unchanged.
The complete check starts with `npm run dependencies:check`, covering all
workspace dependency categories. It requires registry access; an audit or network
failure stops subsequent checks. Packed-consumer smokes separately audit the
consumer's resolved production dependencies without workspace overrides.

After the dependency audit, Check runs `commit-title-lint` against
`origin/main..HEAD`. The standalone command accepts `--base <ref>` to change
the excluded history. It reads Git subjects with `git log --format=%s`, counts
Unicode characters rather than UTF-8 bytes, allows exactly 50, and reports
every overlong title with its count. Commit bodies are not checked. An empty
range passes; an unavailable base, Git failure, or invalid UTF-8 output fails
the gate. The command only reads history and never rewrites commits.

## Quick Start

```bash
cargo xtask check
cargo xtask commit-title-lint
cargo xtask commit-title-lint --base HEAD~0
cargo xtask rust-file-length-lint --all
```

## Development

Run the crate tests directly when changing command orchestration:

```bash
cargo test --package xtask
```

### Key Code

- `src/cli.rs` parses and dispatches commands.
- `src/command.rs` defines the injected command-runner boundary.
- `src/commit_title.rs` audits captured Git subjects through that boundary.
- `src/check.rs` defines the complete source, packed-consumer, browser, and Rust
  verification sequence.

### Related Docs

- [Repository README](../README.md)
- [CI and npm release contract](../docs/protocol/npm-release.md)
- [Dependency security](../docs/protocol/dependency-security.md)
