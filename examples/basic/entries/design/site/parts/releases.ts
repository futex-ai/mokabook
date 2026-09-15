/**
 * Release facts depicted on the changelog. Every version, date,
 * note and compare link is taken from this repository's `CHANGELOG.md` at
 * the time of authoring; the mockup never states a release fact of its own.
 */

/** One group of notes inside a release, such as Features or Bug fixes. */
export interface ReleaseGroup {
  notes: readonly string[];
  title: string;
}

/** One published release of the Mokly CLI. */
export interface Release {
  compare: string;
  date: string;
  groups: readonly ReleaseGroup[];
  id: string;
  readableDate: string;
  version: string;
}

/** Every depicted release, newest first. */
export const RELEASES: readonly Release[] = [
  {
    compare: "https://github.com/mokly-ai/mokly/compare/v0.8.0...v0.9.0",
    date: "2026-09-15",
    groups: [
      {
        notes: [
          "Install and import @mokly/mokly. The unscoped name is not a package alias; the CLI remains mokly.",
        ],
        title: "Breaking changes",
      },
      {
        notes: [
          "Publish catalogues to upload services",
          "Add CSS change attribution",
          "Add derived baseline output",
          "Split catalogue navigation into sections",
        ],
        title: "Features",
      },
      {
        notes: [
          "Keep added and removed screens current-only",
          "Load selected comparisons and recover expired snapshots",
          "Preserve catalogue state on evidence updates",
        ],
        title: "Bug fixes",
      },
    ],
    id: "release-0-9-0",
    readableDate: "15 September 2026",
    version: "0.9.0",
  },
  {
    compare: "https://github.com/futex-ai/mokabook/compare/v0.7.1...v0.8.0",
    date: "2026-09-11",
    groups: [
      {
        notes: ["Unify catalogue pages and optional published Changes"],
        title: "Features",
      },
      {
        notes: ["Allow five-minute watched startup"],
        title: "Bug fixes",
      },
      {
        notes: ["Start large catalogues with on-demand previews"],
        title: "Performance",
      },
    ],
    id: "release-0-8-0",
    readableDate: "11 September 2026",
    version: "0.8.0",
  },
  {
    compare: "https://github.com/futex-ai/mokabook/compare/v0.7.0...v0.7.1",
    date: "2026-09-11",
    groups: [
      {
        notes: ["Isolate comparison test baselines"],
        title: "Bug fixes",
      },
    ],
    id: "release-0-7-1",
    readableDate: "11 September 2026",
    version: "0.7.1",
  },
];
