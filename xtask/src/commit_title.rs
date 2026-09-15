//! Commit subject-length audit for branch history.

use std::sync::Arc;

use crate::command::{CommandRunner, CommandSpec};
use crate::error::{Error, Result};

const MAX_CHARACTERS: usize = 50;

/// Audits the titles of commits reachable from HEAD but not a chosen base.
pub(crate) trait CommitTitleAuditor: Send + Sync {
    /// Require every commit title in `base..HEAD` to fit within 50 characters.
    fn run(&self, base: &str) -> Result<()>;
}

/// Commit-title audit backed by an injected command runner.
pub(crate) struct DefaultCommitTitleAuditor {
    command_runner: Arc<dyn CommandRunner>,
}

impl DefaultCommitTitleAuditor {
    /// Construct the auditor with its Git subprocess boundary.
    pub(crate) fn new(command_runner: Arc<dyn CommandRunner>) -> Self {
        Self { command_runner }
    }
}

impl CommitTitleAuditor for DefaultCommitTitleAuditor {
    fn run(&self, base: &str) -> Result<()> {
        let command = CommandSpec::new("git").args([
            "log",
            "--format=%s",
            "--end-of-options",
            &format!("{base}..HEAD"),
            "--",
        ]);
        let titles = self.command_runner.capture(&command)?;
        let violations = titles
            .lines()
            .filter_map(title_violation)
            .collect::<Vec<_>>();
        if violations.is_empty() {
            eprintln!(
                "Commit-title audit passed for {} commit(s).",
                titles.lines().count()
            );
            return Ok(());
        }
        Err(Error::CommitTitleLength {
            details: violations.join("\n"),
        })
    }
}

fn title_violation(title: &str) -> Option<String> {
    let characters = title.chars().count();
    (characters > MAX_CHARACTERS).then(|| format!("{characters} characters: {title}"))
}

#[cfg(test)]
#[path = "_tests_/commit_title_tests.rs"]
mod commit_title_tests;
