# Mokabook xtask

`xtask` owns repository-local verification and review orchestration for the
Mokabook workspace. It is an internal binary and is not published to npm or
crates.io.

## Responsibilities

- Run the complete TypeScript, package, example, and Rust verification suite.
- Enforce the Rust file-length limit.
- Start the required read-only post-push AI review.

## What This Crate Does

The crate provides the implementation behind `cargo xtask check`,
`cargo xtask review`, and `cargo xtask rust-file-length-lint`.

## Quick Start

```bash
cargo xtask check
cargo xtask rust-file-length-lint --all
cargo xtask review
```

## Development

Run the crate tests directly when changing command orchestration:

```bash
cargo test --package xtask
```

### Key Code

- `src/cli.rs` parses and dispatches commands.
- `src/command.rs` defines the injected command-runner boundary.
- `src/check.rs` defines the complete local verification sequence.
- `src/review.rs` creates the read-only review prompt and process.

### Related Docs

- [Repository README](../README.md)
- [CI and npm release contract](../docs/protocol/npm-release.md)
