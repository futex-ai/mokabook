/**
 * The Product changelog, read as the catalogue's Changes list: an index of
 * the published releases beside rows that pair a version badge and date with
 * the grouped notes of that release.
 */

import { defineScreen } from "@mokly/mokly";

import { SITE_SCREENS } from "../../parts/links.js";
import { variantMetadata } from "../scaffold.js";

import { ProductEyebrow, ProductLayout } from "./parts/chrome.js";
import { RELEASES } from "./parts/releases.js";

function ReleaseIndex() {
  return (
    <nav aria-label="Releases" className="pd-release-index">
      <p className="pd-tree-head">Releases</p>
      {RELEASES.map((release, index) => (
        <a
          className={
            index === 0
              ? "pd-release-index-link pd-release-index-link--current"
              : "pd-release-index-link"
          }
          href={`#${release.id}`}
          key={release.id}
        >
          <span className="pd-release-index-version">{release.version}</span>
          <span className="pd-release-index-date">{release.readableDate}</span>
        </a>
      ))}
    </nav>
  );
}

function ProductChangelog({ viewport }: { viewport: "mobile" | "desktop" }) {
  return (
    <ProductLayout active={SITE_SCREENS.changelog} viewport={viewport}>
      <main className="pd-document pd-changelog" id="main">
        <div className="pd-document-intro">
          <ProductEyebrow trail={["Changelog"]} />
          <h1>
            What&#8217;s new in <span className="site-accent">Mokly</span>
          </h1>
          <p className="site-lead">
            Every release of the Mokly CLI, newest first.
          </p>
        </div>
        <div className="pd-changelog-body">
          <ReleaseIndex />
          <div className="pd-releases">
            {RELEASES.map((release) => (
              <article className="pd-release" id={release.id} key={release.id}>
                <div className="pd-release-meta">
                  <h2>
                    <span className="site-badge site-badge--neutral">
                      Mokly CLI {release.version}
                    </span>
                  </h2>
                  <time dateTime={release.date}>{release.readableDate}</time>
                  <a className="pd-release-link" href={release.compare}>
                    Read release details <span aria-hidden="true">&#8599;</span>
                  </a>
                </div>
                <div className="pd-release-notes">
                  {release.groups.map((group) => (
                    <div className="pd-release-group" key={group.title}>
                      <p className="pd-release-group-head">{group.title}</p>
                      <ul>
                        {group.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </ProductLayout>
  );
}

/** The changelog with its release index beside the entries. */
export function ProductChangelogDesktop() {
  return <ProductChangelog viewport="desktop" />;
}

/** The changelog stacked, the index above the entries. */
export function ProductChangelogMobile() {
  return <ProductChangelog viewport="mobile" />;
}

export const productChangelogScreen = defineScreen({
  ...variantMetadata("product"),
  description:
    "Releases as a Changes-style list beside a release index. The 0.9.0, 0.8.0 and 0.7.1 facts are the real entries of this repository's CHANGELOG.md at the time of authoring.",
  desktop: <ProductChangelogDesktop />,
  id: "design-site-product-changelog",
  mobile: <ProductChangelogMobile />,
  route: "design/site/product/changelog.html",
  title: "Changelog",
  useCaseIds: [],
});
