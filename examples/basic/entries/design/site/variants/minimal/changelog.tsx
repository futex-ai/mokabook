import { Fragment } from "react";

import { SITE_SCREENS } from "../../parts/links.js";

import { MinimalLayout } from "./parts/chrome.js";
import { RELEASES } from "./parts/releases.js";

function MinimalChangelog({ viewport }: { viewport: "mobile" | "desktop" }) {
  return (
    <MinimalLayout active={SITE_SCREENS.changelog} viewport={viewport}>
      <main className="mn-document" id="main">
        <div className="mn-document-intro">
          <p className="site-eyebrow">Changelog</p>
          <h1>
            What&#8217;s new in <span className="site-accent">Mokly</span>
          </h1>
        </div>
        <div className="mn-releases">
          {RELEASES.map((release) => (
            <article className="mn-release" key={release.version}>
              <div className="mn-release-head">
                <h2>Mokly CLI {release.version}</h2>
                <time dateTime={release.date}>{release.readableDate}</time>
              </div>
              <div className="mn-release-notes">
                {release.groups.map((group) => (
                  <Fragment key={group.title}>
                    <h3>{group.title}</h3>
                    <ul>
                      {group.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </Fragment>
                ))}
                <a className="site-link mn-release-link" href={release.compare}>
                  Read the {release.version} release details{" "}
                  <span aria-hidden="true">&#8599;</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </main>
    </MinimalLayout>
  );
}

/** The changelog as one centered column of releases at the desktop measure. */
export function MinimalChangelogDesktop() {
  return <MinimalChangelog viewport="desktop" />;
}

/** The same centered column of releases at the mobile measure. */
export function MinimalChangelogMobile() {
  return <MinimalChangelog viewport="mobile" />;
}
