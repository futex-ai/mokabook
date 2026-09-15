//! CLI parsing and dependency composition.

use std::path::{Path, PathBuf};
use std::process::ExitCode;
use std::sync::Arc;

use clap::{Parser, Subcommand};

use crate::check::{CheckRunner, DefaultCheckRunner};
use crate::command::{CommandRunner, SystemCommandRunner};
use crate::commit_title::{CommitTitleAuditor, DefaultCommitTitleAuditor};
use crate::error::{Error, Result};
use crate::rust_file_length::{RustFileLengthAuditor, SystemRustFileLengthAuditor};

#[derive(Debug, Parser)]
#[command(name = "xtask", about = "Mokly repository automation")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// Run every local verification gate.
    Check,
    /// Enforce the 50-character commit-title limit for branch history.
    CommitTitleLint {
        /// Exclude commits reachable from this Git reference.
        #[arg(long, default_value = "origin/main")]
        base: String,
    },
    /// Enforce the 300-line Rust source limit.
    RustFileLengthLint {
        /// Audit every Rust file; retained for workspace command compatibility.
        #[arg(long)]
        all: bool,
    },
}

/// Side-effecting xtask application boundary.
trait Xtask: Send + Sync {
    /// Dispatch a parsed repository task.
    fn run(&self, command: Command) -> Result<()>;
}

struct Application {
    check_runner: Arc<dyn CheckRunner>,
    commit_title_auditor: Arc<dyn CommitTitleAuditor>,
    rust_file_length_auditor: Arc<dyn RustFileLengthAuditor>,
    workspace: PathBuf,
}

impl Xtask for Application {
    fn run(&self, command: Command) -> Result<()> {
        match command {
            Command::Check => {
                self.check_runner.run()?;
                self.rust_file_length_auditor.run(&self.workspace)
            }
            Command::CommitTitleLint { base } => self.commit_title_auditor.run(&base),
            Command::RustFileLengthLint { all: _ } => {
                self.rust_file_length_auditor.run(&self.workspace)
            }
        }
    }
}

/// Parse arguments, compose real dependencies, and return a process exit code.
pub(crate) fn main() -> ExitCode {
    let workspace = match workspace_root() {
        Ok(workspace) => workspace,
        Err(error) => {
            eprintln!("{error}");
            return ExitCode::FAILURE;
        }
    };
    let command_runner: Arc<dyn CommandRunner> = Arc::new(SystemCommandRunner);
    let app: Arc<dyn Xtask> = Arc::new(Application {
        check_runner: Arc::new(DefaultCheckRunner::new(command_runner.clone())),
        commit_title_auditor: Arc::new(DefaultCommitTitleAuditor::new(command_runner)),
        rust_file_length_auditor: Arc::new(SystemRustFileLengthAuditor),
        workspace,
    });
    match app.run(Cli::parse().command) {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("{error}");
            ExitCode::FAILURE
        }
    }
}

fn workspace_root() -> Result<PathBuf> {
    let manifest = Path::new(env!("CARGO_MANIFEST_DIR"));
    manifest
        .parent()
        .map(Path::to_path_buf)
        .ok_or(Error::WorkspaceRoot)
}
