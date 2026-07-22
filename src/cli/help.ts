/** Stable CLI usage rendered by `mokabook --help`. */
export const HELP = `Mokabook — app-independent React mockup catalogues

Usage:
  mokabook [serve] [--config <path>] [--port <port>] [--base <ref>] [--no-watch]
  mokabook build [--config <path>]
  mokabook check [--config <path>]
  mokabook review [--config <path>] [--base <ref>] [--out <directory>]

Commands:
  serve    Build and serve Browse and Review; watch by default
  build    Generate static HTML fragments and the version 3 manifest
  check    Validate source and committed generated output without writing
  review   Compare checked output with a Git base and write a static artifact

Options:
  --config <path>  Use an explicit mokabook.config file
  --port <port>    Listening port; 0 selects an available stable port
  --base <ref>     Git base used by served and static Review
  --watch          Watch consumer inputs (serve default)
  --no-watch       Serve one deterministic snapshot
  --out <path>     Review artifact directory
  -h, --help       Show help
  -v, --version    Show installed version
`;
