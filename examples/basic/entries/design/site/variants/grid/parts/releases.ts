/**
 * Release facts read from this repository's CHANGELOG.md at the time of
 * authoring: the 0.9.0 entry in full, and the 0.8.0 and 0.7.1 headings with
 * their dates and compare links for the index below it.
 */

/** The newest release rendered as the full table row. */
export const RELEASE = {
  breaking: [
    "Install and import @mokly/mokly. The unscoped name is not a package alias; the CLI remains mokly.",
  ],
  compare: "https://github.com/mokly-ai/mokly/compare/v0.8.0...v0.9.0",
  date: "2026-09-15",
  features: [
    "Publish catalogues to upload services",
    "Add CSS change attribution",
    "Add derived baseline output",
    "Split catalogue navigation into sections",
  ],
  readableDate: "15 September 2026",
  version: "0.9.0",
};

/** The releases before it, indexed by version, date and compare link. */
export const EARLIER_RELEASES = [
  {
    compare: "https://github.com/futex-ai/mokabook/compare/v0.7.1...v0.8.0",
    date: "2026-09-11",
    previous: "0.7.1",
    readableDate: "11 September 2026",
    version: "0.8.0",
  },
  {
    compare: "https://github.com/futex-ai/mokabook/compare/v0.7.0...v0.7.1",
    date: "2026-09-11",
    previous: "0.7.0",
    readableDate: "11 September 2026",
    version: "0.7.1",
  },
] as const;
