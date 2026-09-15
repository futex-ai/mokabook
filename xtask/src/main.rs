//! Repository automation entry point.

#![warn(unreachable_pub)]

mod check;
mod cli;
mod command;
mod commit_title;
mod error;
mod rust_file_length;

fn main() -> std::process::ExitCode {
    cli::main()
}
