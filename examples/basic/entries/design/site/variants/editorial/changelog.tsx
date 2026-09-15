import { defineScreen } from "@mokly/mokly";

import { SITE_SCREENS } from "../../parts/links.js";
import { variantMetadata } from "../scaffold.js";

import { EditorialLayout } from "./parts/chrome.js";
import {
  EARLIER_RELEASES,
  JournalEntry,
  JournalIndex,
  RELEASE,
} from "./parts/journal.js";

function ChangelogRail() {
  return (
    <nav aria-label="Releases" className="ed-rail-nav">
      <a className="ed-rail-link" href={`#${RELEASE.anchor}`}>
        <span className="ed-rail-number">{RELEASE.version}</span>
        {RELEASE.readableDate}
      </a>
      {EARLIER_RELEASES.map((release) => (
        <a
          className="ed-rail-link"
          href={release.compare}
          key={release.version}
        >
          <span className="ed-rail-number">{release.version}</span>
          {release.readableDate}
        </a>
      ))}
    </nav>
  );
}

function EditorialChangelog({ viewport }: { viewport: "mobile" | "desktop" }) {
  return (
    <EditorialLayout
      active={SITE_SCREENS.changelog}
      rail={<ChangelogRail />}
      viewport={viewport}
    >
      <main className="ed-main ed-document" id="main">
        <div className="ed-measure">
          <div className="ed-doc-intro">
            <p className="ed-rubric">Changelog</p>
            <h1>
              What&#8217;s new in <span className="site-accent">Mokly</span>
            </h1>
          </div>
          <div className="ed-journal">
            <JournalEntry />
            <JournalIndex />
          </div>
        </div>
      </main>
    </EditorialLayout>
  );
}

/** The changelog with the version and date ruled beside every entry. */
export function EditorialChangelogDesktop() {
  return <EditorialChangelog viewport="desktop" />;
}

/** The changelog stacked for the mobile composition. */
export function EditorialChangelogMobile() {
  return <EditorialChangelog viewport="mobile" />;
}

export const editorialChangelogScreen = defineScreen({
  ...variantMetadata("editorial"),
  description:
    "The changelog as a dated journal: a ruled column of version and date beside the grouped notes, then the dated index of earlier releases. The facts are the real 0.9.0, 0.8.0 and 0.7.1 entries of this repository's CHANGELOG.md at the time of authoring.",
  desktop: <EditorialChangelogDesktop />,
  id: "design-site-editorial-changelog",
  mobile: <EditorialChangelogMobile />,
  route: "design/site/editorial/changelog.html",
  title: "Changelog",
  useCaseIds: [],
});
