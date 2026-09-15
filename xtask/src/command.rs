//! Injected subprocess boundary used by repository tasks.

use std::ffi::OsStr;
use std::process::{Command, ExitStatus, Stdio};

use crate::error::{Error, Result};

/// One deterministic subprocess invocation.
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct CommandSpec {
    program: String,
    args: Vec<String>,
}

impl CommandSpec {
    /// Create a command for one executable.
    pub(crate) fn new(program: impl Into<String>) -> Self {
        Self {
            program: program.into(),
            args: Vec::new(),
        }
    }

    /// Append command arguments.
    pub(crate) fn args(mut self, args: impl IntoIterator<Item = impl Into<String>>) -> Self {
        self.args.extend(args.into_iter().map(Into::into));
        self
    }

    /// Format the command for developer-facing output.
    pub(crate) fn display(&self) -> String {
        std::iter::once(self.program.as_str())
            .chain(self.args.iter().map(String::as_str))
            .map(shell_quote)
            .collect::<Vec<_>>()
            .join(" ")
    }
}

/// Runs subprocesses for an xtask operation.
#[cfg_attr(
    test,
    unimock::unimock(api = [CommandRunnerRunMock, CommandRunnerCaptureMock])
)]
pub(crate) trait CommandRunner: Send + Sync {
    /// Run a command and require a successful status.
    fn run(&self, spec: &CommandSpec) -> Result<()>;
    /// Capture UTF-8 stdout, inherit stderr, and require a successful status.
    fn capture(&self, spec: &CommandSpec) -> Result<String>;
}

/// Operating-system subprocess implementation.
pub(crate) struct SystemCommandRunner;

impl CommandRunner for SystemCommandRunner {
    fn run(&self, spec: &CommandSpec) -> Result<()> {
        eprintln!("$ {}", spec.display());
        let status = match Command::new(&spec.program)
            .args(spec.args.iter().map(OsStr::new))
            .status()
        {
            Ok(status) => status,
            Err(source) => {
                return Err(Error::CommandStart {
                    command: spec.display(),
                    source,
                });
            }
        };
        require_success(spec, status)
    }

    fn capture(&self, spec: &CommandSpec) -> Result<String> {
        eprintln!("$ {}", spec.display());
        let output = match Command::new(&spec.program)
            .args(spec.args.iter().map(OsStr::new))
            .stderr(Stdio::inherit())
            .output()
        {
            Ok(output) => output,
            Err(source) => {
                return Err(Error::CommandStart {
                    command: spec.display(),
                    source,
                });
            }
        };
        require_success(spec, output.status)?;
        match String::from_utf8(output.stdout) {
            Ok(output) => Ok(output),
            Err(source) => Err(Error::CommandOutputEncoding {
                command: spec.display(),
                source,
            }),
        }
    }
}

fn require_success(spec: &CommandSpec, status: ExitStatus) -> Result<()> {
    if !status.success() {
        return Err(Error::CommandFailed {
            command: spec.display(),
            status: status.code().map_or_else(
                || "terminated by signal".to_owned(),
                |code| code.to_string(),
            ),
        });
    }
    Ok(())
}

fn shell_quote(value: &str) -> String {
    if value
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '/' | '.' | ':' | '='))
    {
        value.to_owned()
    } else {
        format!("{value:?}")
    }
}

#[cfg(test)]
#[path = "_tests_/command_tests.rs"]
mod command_tests;
