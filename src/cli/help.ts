/** Stable CLI usage rendered by `mokabook --help`. */
export const HELP = `Mokabook — app-independent React mockup catalogues

Usage:
  mokabook [serve] [--config <path>] [--port <port>] [--base <ref>] [--no-watch]
  mokabook build [--config <path>]
  mokabook check [--config <path>]
  mokabook review [--config <path>] [--base <ref>] [--out <directory>]

Commands:
  serve    Build and serve Browse; watch by default
  build    Generate static HTML fragments and the version 3 manifest
  check    Validate source and committed generated output without writing
  review   Compare checked output with a Git base and write a static artifact

Options:
  --config <path>  Use an explicit mokabook.config file
  --port <port>    Starting port; advances if occupied, 0 selects any free port
  --base <ref>     Git base used by Browse Review or review
  --watch          Watch consumer inputs (serve default)
  --no-watch       Serve one deterministic snapshot
  --out <path>     Review artifact directory
  -h, --help       Show help
  -v, --version    Show installed version
`;
