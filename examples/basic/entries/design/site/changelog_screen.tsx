import { defineScreen } from "@mokly/mokly";

import { SiteLayout } from "./parts/chrome.js";
import { SiteDocument } from "./parts/document.js";
import { SITE_SCREENS } from "./parts/links.js";
import { SITE_METADATA } from "./parts/metadata.js";

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

function SiteChangelog({ viewport }: { viewport: "mobile" | "desktop" }) {
  return (
    <SiteLayout active={SITE_SCREENS.changelog} viewport={viewport}>
      <SiteDocument
        eyebrow="Changelog"
        title={
          <>
            What&#8217;s new in <span className="site-accent">Mokly</span>
          </>
        }
      >
        <article className="site-release">
          <div className="site-release-meta">
            <h2>
              <span className="site-badge site-badge--neutral">
                Mokly CLI {RELEASE.version}
              </span>
            </h2>
            <time dateTime={RELEASE.date}>{RELEASE.readableDate}</time>
          </div>
          <div className="site-release-notes">
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
            <a className="site-link" href={RELEASE.compare}>
              Read release details <span aria-hidden="true">&#8599;</span>
            </a>
          </div>
        </article>
      </SiteDocument>
    </SiteLayout>
  );
}

/** The changelog at the desktop composition, version and date beside the notes. */
export function SiteChangelogDesktop() {
  return <SiteChangelog viewport="desktop" />;
}

/** The changelog stacked for the mobile composition. */
export function SiteChangelogMobile() {
  return <SiteChangelog viewport="mobile" />;
}

export const changelogScreen = defineScreen({
  ...SITE_METADATA,
  description:
    "One release entry with its Mokly CLI label, date, grouped notes and release link. The facts are the real 0.9.0 entry of this repository's CHANGELOG.md at the time of authoring.",
  desktop: <SiteChangelogDesktop />,
  id: "design-site-changelog",
  mobile: <SiteChangelogMobile />,
  route: "design/site/changelog.html",
  title: "Changelog",
  useCaseIds: ["design-site-tour"],
});
