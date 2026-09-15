import { defineScreen } from "@mokly/mokly";

import { SiteLayout } from "./parts/chrome.js";
import { CodePanel } from "./parts/code_panel.js";
import {
  DocsDisclosure,
  DocsPager,
  DocsSidebar,
} from "./parts/docs_navigation.js";
import { DocumentIntro } from "./parts/document.js";
import { SITE_SCREENS } from "./parts/links.js";
import { SITE_METADATA } from "./parts/metadata.js";

const SECTIONS = [
  { id: "install-the-package", title: "Install the package" },
  { id: "add-the-configuration", title: "Add the configuration" },
  { id: "author-your-first-screen", title: "Author your first screen" },
] as const;

function OnThisPage() {
  return (
    <nav aria-labelledby="on-this-page" className="site-onpage">
      <h2 id="on-this-page">On this page</h2>
      {SECTIONS.map((section) => (
        <a href={`#${section.id}`} key={section.id}>
          {section.title}
        </a>
      ))}
    </nav>
  );
}

function SiteDocs({ viewport }: { viewport: "mobile" | "desktop" }) {
  const desktop = viewport === "desktop";
  return (
    <SiteLayout active={SITE_SCREENS.docs} search viewport={viewport}>
      <div className="site-docs">
        {desktop ? <DocsSidebar /> : <DocsDisclosure />}
        <main className="site-document site-docs-document" id="main">
          <DocumentIntro
            eyebrow="Documentation"
            lead="Add Mokly to the repository that holds your components."
            title="Install"
          />
          {desktop ? null : <OnThisPage />}
          <div className="site-docs-body">
            <section id={SECTIONS[0].id}>
              <h2>{SECTIONS[0].title}</h2>
              <p>
                Mokly runs from your repository as a development dependency.
                React and React DOM render your screens.
              </p>
              <CodePanel
                code="npm install --save-dev @mokly/mokly react react-dom"
                language="shell"
              />
            </section>
            <section id={SECTIONS[1].id}>
              <h2>{SECTIONS[1].title}</h2>
              <p>
                Create <code>mokly.config.ts</code> at the repository root.
                Point <code>entriesDir</code> at the folder holding your entry
                modules and <code>mockupsDir</code> at the folder that receives
                the generated catalogue.
              </p>
            </section>
            <section id={SECTIONS[2].id}>
              <h2>{SECTIONS[2].title}</h2>
              <p>
                Add an entry module ending in <code>.mockup.tsx</code> that
                exports <code>mockups</code>, then define a screen with a mobile
                and a desktop view.
              </p>
            </section>
          </div>
          <DocsPager />
        </main>
        {desktop ? <OnThisPage /> : null}
      </div>
    </SiteLayout>
  );
}

/** The documentation page with its sidebar and on-this-page column. */
export function SiteDocsDesktop() {
  return <SiteDocs viewport="desktop" />;
}

/** The documentation page with the sidebar as a disclosure above it. */
export function SiteDocsMobile() {
  return <SiteDocs viewport="mobile" />;
}

export const docsScreen = defineScreen({
  ...SITE_METADATA,
  description:
    "A documentation page: search control, section sidebar, copyable code panel, on-this-page list and previous and next links.",
  desktop: <SiteDocsDesktop />,
  id: "design-site-docs",
  mobile: <SiteDocsMobile />,
  route: "design/site/docs.html",
  title: "Documentation",
  useCaseIds: ["design-site-tour"],
});
