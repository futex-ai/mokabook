use super::CommandSpec;

#[test]
fn display_quotes_arguments_with_spaces() {
    let command = CommandSpec::new("npm").args(["run", "an odd script"]);

    assert_eq!(command.display(), "npm run \"an odd script\"");
}
