//! Repository automation entry point.

mod check;
mod cli;
mod command;
mod error;
mod review;
mod rust_file_length;

fn main() -> std::process::ExitCode {
    cli::main()
}
