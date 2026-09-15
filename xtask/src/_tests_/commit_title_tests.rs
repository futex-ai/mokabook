//! Commit-title limits and Git capture failures at the injected boundary.

use std::io;
use std::sync::Arc;

use unimock::{MockFn, Unimock, matching};

use crate::command::{CommandRunnerCaptureMock, CommandSpec};
use crate::error::Error;

use super::{CommitTitleAuditor, DefaultCommitTitleAuditor};

#[test]
fn accepts_empty_history() {
    let runner: Arc<dyn CommitTitleAuditor> =
        Arc::new(DefaultCommitTitleAuditor::new(Arc::new(Unimock::new(
            CommandRunnerCaptureMock
                .next_call(matching!((command) if *command == &git_log("HEAD~0")))
                .returns(Ok(String::new())),
        ))));

    runner.run("HEAD~0").expect("an empty commit range passes");
}

#[test]
fn accepts_titles_through_fifty_unicode_characters() {
    let titles = format!("fix: short title\n{}\n{}\n", "x".repeat(50), "é".repeat(50));
    let runner = auditor(titles);

    runner
        .run("origin/main")
        .expect("titles fit the character limit");
}

#[test]
fn reports_every_overlong_title_and_its_character_count() {
    let first = "x".repeat(51);
    let second = "é".repeat(52);
    let runner = auditor(format!("{first}\nfix: valid title\n{second}\n"));

    let error = runner
        .run("origin/main")
        .expect_err("long titles must fail");
    assert_eq!(
        error.to_string(),
        format!(
            "[xtask/commit_title] commit titles exceed 50 characters:\n51 characters: {first}\n52 characters: {second}"
        )
    );
    assert!(matches!(error, Error::CommitTitleLength { .. }));
}

#[test]
fn preserves_git_capture_failures() {
    for error in [
        Error::CommandStart {
            command: "git".to_owned(),
            source: io::Error::from(io::ErrorKind::NotFound),
        },
        Error::CommandFailed {
            command: "git".to_owned(),
            status: "128".to_owned(),
        },
        Error::CommandOutputEncoding {
            command: "git".to_owned(),
            source: String::from_utf8(vec![0xff]).expect_err("fixture is invalid UTF-8"),
        },
    ] {
        let expected = std::mem::discriminant(&error);
        let command_runner = Arc::new(Unimock::new(
            CommandRunnerCaptureMock
                .next_call(matching!((command) if *command == &git_log("missing")))
                .returns(Err(error)),
        ));
        let runner: Arc<dyn CommitTitleAuditor> =
            Arc::new(DefaultCommitTitleAuditor::new(command_runner));

        let actual = runner
            .run("missing")
            .expect_err("capture failure must fail the gate");
        assert_eq!(std::mem::discriminant(&actual), expected);
    }
}

fn auditor(titles: String) -> Arc<dyn CommitTitleAuditor> {
    let command_runner = Arc::new(Unimock::new(
        CommandRunnerCaptureMock
            .next_call(matching!((command) if *command == &git_log("origin/main")))
            .returns(Ok(titles)),
    ));
    Arc::new(DefaultCommitTitleAuditor::new(command_runner))
}

fn git_log(base: &str) -> CommandSpec {
    CommandSpec::new("git").args([
        "log",
        "--format=%s",
        "--end-of-options",
        &format!("{base}..HEAD"),
        "--",
    ])
}
