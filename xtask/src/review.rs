//! Read-only AI review orchestration.

use std::io::Write;
use std::path::Path;
use std::process::{Command, Stdio};

use crate::error::{Error, Result};

/// Runs the repository's post-push review operation.
pub(crate) trait ReviewRunner: Send + Sync {
    /// Review the complete local diff against `origin/main`.
    fn run(&self, workspace: &Path) -> Result<()>;
}

/// Codex-backed read-only reviewer.
pub(crate) struct CodexReviewRunner;

impl ReviewRunner for CodexReviewRunner {
    fn run(&self, workspace: &Path) -> Result<()> {
        let mut child = match Command::new("codex")
            .args([
                "--ask-for-approval",
                "never",
                "exec",
                "--ephemeral",
                "--ignore-rules",
                "--model",
                "gpt-5.5",
                "--config",
                "model_reasoning_effort=\"xhigh\"",
                "--sandbox",
                "read-only",
                "--skip-git-repo-check",
                "--cd",
            ])
            .arg(workspace)
            .arg("-")
            .stdin(Stdio::piped())
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .spawn()
        {
            Ok(child) => child,
            Err(source) => {
                return Err(Error::CommandStart {
                    command: "codex exec review".to_owned(),
                    source,
                });
            }
        };
        {
            let Some(mut stdin) = child.stdin.take() else {
                return Err(Error::ReviewStdin);
            };
            if let Err(source) = stdin.write_all(prompt(workspace).as_bytes()) {
                return Err(Error::CommandStart {
                    command: "write Codex review prompt".to_owned(),
                    source,
                });
            }
        }
        let status = match child.wait() {
            Ok(status) => status,
            Err(source) => {
                return Err(Error::CommandStart {
                    command: "wait for Codex review".to_owned(),
                    source,
                });
            }
        };
        if !status.success() {
            return Err(Error::CommandFailed {
                command: "codex exec review".to_owned(),
                status: status.code().map_or_else(
                    || "terminated by signal".to_owned(),
                    |code| code.to_string(),
                ),
            });
        }
        Ok(())
    }
}

fn prompt(workspace: &Path) -> String {
    format!(
        "Review the complete committed Mokabook diff against origin/main at {}. \
Inspect the repository read-only. Report numbered actionable findings first, \
including severity, codebase context, impact of doing nothing, lettered solution \
options, and a recommended option. Focus on correctness, security, missing tests, \
app-independence, generated-output safety, server/watch lifecycle, Review behavior, \
and documentation drift. If there are no findings, say so and identify residual risk.",
        workspace.display()
    )
}

#[cfg(test)]
#[path = "_tests_/review_tests.rs"]
mod review_tests;
