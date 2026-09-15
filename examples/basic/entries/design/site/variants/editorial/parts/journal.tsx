/**
 * Release facts read from this repository's CHANGELOG.md at the time of
 * authoring: the 0.9.0 entry in full and the two releases before it.
 */

/** The newest release, shown as a full journal entry. */
export const RELEASE = {
  anchor: "mokly-cli-0-9-0",
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
  ],
  readableDate: "15 September 2026",
  version: "0.9.0",
} as const;

/** The releases before it, listed as a dated index with their release links. */
export const EARLIER_RELEASES = [
  {
    compare: "https://github.com/futex-ai/mokabook/compare/v0.7.1...v0.8.0",
    date: "2026-09-11",
    readableDate: "11 September 2026",
    version: "0.8.0",
  },
  {
    compare: "https://github.com/futex-ai/mokabook/compare/v0.7.0...v0.7.1",
    date: "2026-09-11",
    readableDate: "11 September 2026",
    version: "0.7.1",
  },
] as const;

/** One dated journal entry: version and date ruled beside the grouped notes. */
export function JournalEntry() {
  return (
    <article className="ed-entry" id={RELEASE.anchor}>
      <div className="ed-entry-meta">
        <h2>
          <span className="site-badge site-badge--neutral">
            Mokly CLI {RELEASE.version}
          </span>
        </h2>
        <time dateTime={RELEASE.date}>{RELEASE.readableDate}</time>
      </div>
      <div className="ed-entry-notes">
        {RELEASE.groups.map((group) => (
          <section key={group.title}>
            <h3 className="ed-rubric">{group.title}</h3>
            <ul>
              {group.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
        ))}
        <a className="site-link" href={RELEASE.compare}>
          Read release details <span aria-hidden="true">&#8599;</span>
        </a>
      </div>
    </article>
  );
}

/** The dated index of the releases that came before the newest one. */
export function JournalIndex() {
  return (
    <section className="ed-index">
      <div className="ed-entry-meta">
        <h2 className="ed-rubric">Earlier releases</h2>
      </div>
      <ol className="ed-index-list">
        {EARLIER_RELEASES.map((release) => (
          <li className="ed-index-row" key={release.version}>
            <a className="ed-index-link" href={release.compare}>
              Mokly CLI {release.version}{" "}
              <span aria-hidden="true">&#8599;</span>
            </a>
            <time dateTime={release.date}>{release.readableDate}</time>
          </li>
        ))}
      </ol>
    </section>
  );
}
