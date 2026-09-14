/** Stable CLI usage rendered by `mokly --help`. */
export const HELP = `Mokly — app-independent React mockup catalogues

Usage:
  mokly [serve] [--config <path>] [--port <port>] [--base <ref>] [--no-watch]
  mokly build [--config <path>]
  mokly check [--config <path>]
  mokly export --out <path> [--config <path>] [--base <ref>]

Commands:
  serve    Build and serve the catalogue with on-demand diffs
  build    Transactionally generate static HTML documents and the manifest
  check    Validate source and generated output for the configured mode
  export   Build a complete static catalogue to deploy with your own host

Options:
  --config <path>  Use an explicit mokly.config file
  --debug-timings  Report phase timings and catalogue counts to stderr
  --port <port>    Starting port; advances if occupied, 0 selects any free port
  --base <ref>     Git base ref used to find the branch point
  --out <path>     Export directory, relative to the config file (export only)
  --watch          Watch consumer inputs (serve default)
  --no-watch       Serve one deterministic snapshot
  -h, --help       Show help
  -v, --version    Show installed version

Configuration:
  generatedOutput       "committed" (default) checks files match source;
                        "derived" checks generated files are untracked
  review.baselineBuild  Derived-only argv arrays run without a shell using
                        trusted historical code. Defaults: npm ci, then
                        npx --no-install mokly build --config <config-path>
`;
