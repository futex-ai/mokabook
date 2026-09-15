import { defineScreen, type Viewport } from "@mokly/mokly";

import { variantMetadata } from "../scaffold.js";

import { Band, BandsLayout } from "./parts/chrome.js";
import { BANDS_SCREENS } from "./parts/links.js";

const RELEASE = {
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

const EARLIER = [
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

function ReleaseMeta({
  date,
  readableDate,
  version,
}: {
  date: string;
  readableDate: string;
  version: string;
}) {
  return (
    <div className="bands-release-meta">
      <h2>
        <span className="site-badge site-badge--neutral">
          Mokly CLI {version}
        </span>
      </h2>
      <time dateTime={date}>{readableDate}</time>
    </div>
  );
}

function CompareLink({ href }: { href: string }) {
  return (
    <a className="site-link bands-compare" href={href}>
      Read release details <span aria-hidden="true">&#8599;</span>
    </a>
  );
}

function BandsChangelog({ viewport }: { viewport: Viewport }) {
  return (
    <BandsLayout active={BANDS_SCREENS.changelog} viewport={viewport}>
      <main className="bands-main" id="main">
        <Band className="bands-page-band" inner="bands-page-head" tone="muted">
          <p className="bands-eyebrow">Changelog</p>
          <h1 className="bands-page-title">
            What&#8217;s new in <span className="site-accent">Mokly</span>
          </h1>
        </Band>
        <Band inner="bands-timeline-inner" tone="folio">
          <ol className="bands-timeline">
            <li className="bands-release">
              <span aria-hidden="true" className="bands-release-dot" />
              <ReleaseMeta
                date={RELEASE.date}
                readableDate={RELEASE.readableDate}
                version={RELEASE.version}
              />
              <div className="bands-release-notes">
                <h3>Breaking changes</h3>
                <ul>
                  {RELEASE.breaking.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
                <h3>Features</h3>
                <ul>
                  {RELEASE.features.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
                <CompareLink href={RELEASE.compare} />
              </div>
            </li>
            {EARLIER.map((release) => (
              <li
                className="bands-release bands-release--brief"
                key={release.version}
              >
                <span aria-hidden="true" className="bands-release-dot" />
                <ReleaseMeta
                  date={release.date}
                  readableDate={release.readableDate}
                  version={release.version}
                />
                <div className="bands-release-notes">
                  <CompareLink href={release.compare} />
                </div>
              </li>
            ))}
          </ol>
        </Band>
      </main>
    </BandsLayout>
  );
}

/** The changelog as a timeline, version and date beside the notes. */
export function BandsChangelogDesktop() {
  return <BandsChangelog viewport="desktop" />;
}

/** The same timeline stacked against its spine for the mobile composition. */
export function BandsChangelogMobile() {
  return <BandsChangelog viewport="mobile" />;
}

export const bandsChangelogScreen = defineScreen({
  ...variantMetadata("bands"),
  description:
    "The releases as a timeline against a hairline spine. The facts are the real 0.9.0, 0.8.0 and 0.7.1 entries of this repository's CHANGELOG.md at the time of authoring.",
  desktop: <BandsChangelogDesktop />,
  id: "design-site-bands-changelog",
  mobile: <BandsChangelogMobile />,
  route: "design/site/bands/changelog.html",
  title: "Changelog",
  useCaseIds: [],
});
