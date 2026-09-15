import { defineScreen } from "@mokly/mokly";

import { SITE_SCREENS } from "../../parts/links.js";
import { variantMetadata } from "../scaffold.js";

import { GridLayout, GridSubhead } from "./parts/chrome.js";
import { EARLIER_RELEASES, RELEASE } from "./parts/releases.js";

const COLUMNS = ["Version", "Date", "Notes", "Release"] as const;

function ReleaseNotes({
  notes,
  title,
}: {
  notes: readonly string[];
  title: string;
}) {
  return (
    <div className="grid-notes-group">
      <h3>{title}</h3>
      <ul>
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}

function GridChangelog({ viewport }: { viewport: "mobile" | "desktop" }) {
  return (
    <GridLayout
      active={SITE_SCREENS.changelog}
      subhead={
        <GridSubhead crumbs={["Changelog"]}>
          <a className="grid-subhead-link" href="#latest">
            {RELEASE.version}
          </a>
          <a className="grid-subhead-link" href="#earlier">
            Earlier releases
          </a>
        </GridSubhead>
      }
      viewport={viewport}
    >
      <main className="grid-main grid-main--document" id="main">
        <div className="grid-inner grid-doc-head grid-doc-head--page">
          <p className="grid-eyebrow">Changelog</p>
          <h1>
            What&#8217;s new in <span className="site-accent">Mokly</span>
          </h1>
        </div>
        <div className="grid-inner">
          <div className="grid-table" id="latest">
            <div className="grid-table-head">
              {COLUMNS.map((column) => (
                <span key={column}>{column}</span>
              ))}
            </div>
            <article className="grid-table-row">
              <div className="grid-cell grid-cell--version">
                <h2>
                  <span className="site-badge site-badge--neutral">
                    Mokly CLI {RELEASE.version}
                  </span>
                </h2>
              </div>
              <div className="grid-cell grid-cell--date">
                <time dateTime={RELEASE.date}>{RELEASE.readableDate}</time>
              </div>
              <div className="grid-cell grid-cell--notes">
                <ReleaseNotes
                  notes={RELEASE.breaking}
                  title="Breaking changes"
                />
                <ReleaseNotes notes={RELEASE.features} title="Features" />
              </div>
              <div className="grid-cell grid-cell--link">
                <a className="site-link" href={RELEASE.compare}>
                  Read release details <span aria-hidden="true">&#8599;</span>
                </a>
              </div>
            </article>
          </div>
          <section className="grid-index" id="earlier">
            <h2 className="grid-index-title">Earlier releases</h2>
            <ul className="grid-index-list">
              {EARLIER_RELEASES.map((release) => (
                <li className="grid-index-row" key={release.version}>
                  <span className="grid-cell grid-cell--version">
                    Mokly CLI {release.version}
                  </span>
                  <span className="grid-cell grid-cell--date">
                    <time dateTime={release.date}>{release.readableDate}</time>
                  </span>
                  <span className="grid-cell grid-cell--link">
                    <a className="site-link" href={release.compare}>
                      Compare {release.previous} to {release.version}{" "}
                      <span aria-hidden="true">&#8599;</span>
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </GridLayout>
  );
}

/** The changelog as a bordered table: version, date, notes and release link. */
export function GridChangelogDesktop() {
  return <GridChangelog viewport="desktop" />;
}

/** The changelog table stacked into cells for the mobile composition. */
export function GridChangelogMobile() {
  return <GridChangelog viewport="mobile" />;
}

export const gridChangelogScreen = defineScreen({
  ...variantMetadata("grid"),
  description:
    "Grid changelog: a bordered table-like list of version, date, notes and release link, with the earlier releases indexed below it. The facts are the real 0.9.0, 0.8.0 and 0.7.1 entries of this repository's CHANGELOG.md at the time of authoring.",
  desktop: <GridChangelogDesktop />,
  id: "design-site-grid-changelog",
  mobile: <GridChangelogMobile />,
  route: "design/site/grid/changelog.html",
  title: "Changelog",
  useCaseIds: [],
});
