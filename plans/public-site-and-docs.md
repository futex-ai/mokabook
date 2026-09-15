# Public Site And Docs

Move the public Mokly website into this repository: a static marketing site,
canonical documentation for the CLI, catalogue and Mokly Cloud, a changelog
rendered from `CHANGELOG.md`, and the Terms and Privacy documents. The cloud
repository keeps only the logged-in application and its sign-in and sign-up
routes. This plan supersedes the marketing milestones of the cloud repository's
initial-scope plan.

The site is written ahead of the cloud product. It describes the product Mokly
is becoming (browse, review, edit, open foundation) and documents the cloud
from its protocol docs. A go-live alignment pass reconciles `status: ahead`
pages with shipped scope before the domain goes live.

## Shared Decisions

- **Location.** The site is an npm workspace package at `site/`, added through
  a root `workspaces` field so one lockfile and one `npm audit` cover it. The
  published `@mokly/mokly` package keeps its `files` allowlist; a package test
  proves the tarball contains nothing from `site/`. The site may import
  `@mokly/mokly` from the workspace; the package never depends on the site.
- **Framework.** Astro with static output, MDX content collections for docs,
  Pagefind indexed at build time, and React islands only where interaction is
  required. No documentation framework or theme. The docs layout is built from
  the same Folio tokens, header and footer as the marketing pages.
- **Design.** Folio, as selected in the cloud repository on 2026-09-15. Tokens
  are defined once as CSS custom properties on the document root; stylesheets
  never contain literal colors. Light and dark follow the OS preference with a
  `data-color-scheme` override for deterministic captures.
- **Mockups first.** The Folio marketing screens are ported into this
  repository's example design catalogue under `examples/basic` before the site
  is implemented, so the design source survives the cloud repository's
  planned removal and future refinements happen here.
- **Links to the app.** Sign in and Get started point at the app origin, a
  single build-time setting `SITE_APP_ORIGIN` (default `https://app.mokly.ai`,
  to be confirmed) with paths `/sign-in` and `/sign-up`. Nothing on the site
  calls the cloud API; there are no cookies and analytics is off by default.
- **Real content only.** The hero stage renders this repository's own example
  catalogue at build time. The changelog is parsed from `CHANGELOG.md`. The
  installed version is read from the workspace package. No invented customers,
  counts, integrations, dates or release facts.
- **Verified documentation.** Every command, flag, option and field in the
  docs is verified against the current code by a test, not by reading. Where a
  cloud protocol doc and this repository's code disagree about the CLI, this
  repository's code is right and the disagreement is reported to the user.
- **Checks.** Site build, typecheck, unit tests, link check and browser tests
  run inside `cargo xtask check`. Lighthouse runs as its own required CI job.

## Inputs From The Cloud Repository

Read as data from the cloud workspace on the user's machine
(`mokly-cloud/untitled`) and copied into `.context/cloud-inputs/` (ignored)
for reference during implementation:

- `docs/product-direction.md` — positioning and phases.
- `docs/protocol/design-tokens.md`, `product-copy.md`, `marketing-site.md`.
- `docs/protocol/product-navigation.md`, `viewer.md`, `settings-dialog.md`
  — cloud docs section.
- `docs/protocol/screen-comments.md`, `approvals.md` — review and edit
  section.
- `docs/mockups/src/screens/marketing/*.tsx`, `fixtures/product.ts`,
  `styles/marketing/folio-*.css` and the generated captures under
  `.context/mockups-served/output/marketing/` — Folio visual reference.

## Open Questions

Record answers in `docs/protocol/site.md` during Milestone 1.

1. **App origin.** Confirm `https://app.mokly.ai` for `SITE_APP_ORIGIN`.
2. **Host and domain.** Cloudflare Pages is recommended: the repository
   already deploys previews there with a pinned Wrangler and stored
   credentials, and it provides `pr-<number>` preview aliases. Confirm the
   host and the production domain (for example `mokly.ai` or `www.mokly.ai`).
3. **Mockups in this repository.** Confirm porting the five Folio marketing
   screens into `examples/basic` (recommended) rather than treating the cloud
   captures as the only reference.
4. **Hero stage caption.** The framed catalogue needs a real pull request
   label. Proposed: a merged pull request from this repository named in the
   site configuration and verified against `CHANGELOG.md` by a test.
5. **Lighthouse thresholds.** Proposed minimum category scores at 390px and
   1440px: performance 0.95, accessibility 1.0, best practices 0.95, SEO 0.95.
6. **Analytics.** Default off. If wanted later, name a cookie-free provider;
   it must be a build-time setting that defaults to disabled.

## Milestone 1: Protocol, Positioning And Plan

Define the complete site contract before any mockup or code lands. Stop for
review when the documents and the home copy are ready.

- [x] Create this plan and add it to `plans/README.md`.
- [ ] Copy the cloud inputs listed above into `.context/cloud-inputs/` and
      note any CLI statement in them that disagrees with this repository.
- [ ] Write `docs/protocol/site.md`: purpose and boundary with the cloud
      repository, route table (`/`, `/docs/…`, `/changelog`, `/terms`,
      `/privacy`), app-origin links, shared header and footer (desktop and
      mobile variants, skip link, `aria-current`), positioning and the four
      product phases, changelog rules (version, date, release link, Mokly CLI
      label, empty state), legal rules (Markdown files, exact placeholder
      bodies, no invented dates), the copy rules, the `status: ahead`
      frontmatter convention, the go-live alignment checklist, and the answers
      to the open questions.
- [ ] Draft the full home copy in `docs/protocol/site.md` against the
      positioning: eyebrow, two-line hero heading with the second line in the
      accent, lead, note, hero stage caption rules, four numbered features
      (browse, review, edit, open foundation), and the closing with the
      three-step workflow. Use the existing Folio copy as the tone reference.
- [ ] Write `docs/protocol/site-design.md`: Folio surface, accent, status and
      focus tokens for both schemes, type roles and the hero rule, spacing
      scale, layout constants, breakpoints, radii, focus ring, brand and
      wordmark, the scheme override attribute, and the rule that stylesheets
      never contain literal colors.
- [ ] Write `docs/protocol/site-docs.md`: docs information architecture
      (getting started, authoring, catalogue, CLI reference, continuous
      integration, Mokly Cloud, reference, review and edit), content
      collection frontmatter (`title`, `description`, `section`, `order`,
      `status`), the docs layout (sidebar from frontmatter, on-this-page from
      headings, previous and next, copyable code blocks, Pagefind search), the
      version source, the CLI reference verification rule, and the explicit
      allowlist for publishing `docs/protocol` documents from their Markdown
      source with link rewriting rules for excluded documents.
- [ ] Write `docs/protocol/site-delivery.md`: static-only rule, per-page
      metadata (title, description, canonical, Open Graph and Twitter cards
      with generated images), `sitemap.xml`, `robots.txt`, the changelog Atom
      feed, accessibility requirements, the test matrix (build, link check,
      Playwright at 390px and 1440px in light and dark, Lighthouse
      thresholds), the `cargo xtask check` and CI wiring, the deployment
      workflow, pull request previews and the release process.
- [ ] Add the four documents to `docs/protocol/README.md` and add a Website
      section to the root `README.md` that links to them and to this plan.
- [ ] Update `docs/protocol/npm-release.md` so its CI section describes the
      site jobs that later milestones add.
- [ ] Validate the changed Markdown with Prettier, review the diff, commit
      with Conventional Commits and push. Stop for review of the protocol
      documents and the home copy.

## Milestone 2: Folio Site Mockups

Tags: mockup

Port the Folio marketing screens into this repository's example design
catalogue so every site screen exists as a mockup before implementation. Stop
for review with generated pages inspected in both viewports and schemes.

- [ ] Add a `Site` collection under `examples/basic/entries/design/site/`
      with one component per screen and one screen-spec page of at most five
      screens: home, docs page, changelog, terms, privacy. Each screen renders
      mobile and desktop variants in light and dark.
- [ ] Port the Folio header, footer, wordmark, hero, feature grid, closing,
      document page, release entry and policy empty-state parts, reusing the
      example's registered `@firna/ui` components and adding the Folio tokens
      to the example's stylesheets without literal colors outside the token
      definitions.
- [ ] Broaden the home mockup to the approved copy from Milestone 1: four
      numbered features and the framed catalogue stage with a pull request
      label and a Ready for review badge.
- [ ] Design the docs page mockup with the left sidebar, on-this-page list,
      previous and next links, a code panel with a copy control and the search
      control, on both viewports.
- [ ] Add a `site` user flow that reuses the five screens in the order home →
      docs → changelog → terms → privacy, with links back to each screen.
- [ ] Update `docs/protocol/site-design.md` with the mockup ids and routes,
      and update the design catalogue docs that list collections.
- [ ] Run `npm run build`, `npm run example:build`, `npm run example:check`
      and smoke-test the pages through `npm run dev`; capture screenshots at
      390px and 1440px in both schemes for the review.
- [ ] Run `cargo xtask check`, commit and push. Stop for review.

## Milestone 3: Site Workspace Package And Checks

Create the site package and wire its checks into the repository gate before
any page is styled. At the end the site builds an unstyled placeholder index
and every check passes locally and in CI.

- [ ] Add `site/` with its own `package.json`, `astro.config.mjs`,
      `tsconfig.json` and `README.md`; add `workspaces: ["site"]` to the root
      `package.json`; install Astro, MDX, the React integration and Pagefind
      with `npm install` in the workspace so the newest versions are used.
- [ ] Add the `SITE_APP_ORIGIN` build-time setting with its default and a
      typed accessor; fail the build on a malformed origin.
- [ ] Add root ignore entries for `site/dist`, `site/.astro` and
      `site/node_modules` to `.gitignore`, `.prettierignore` and the ESLint
      config; keep root Prettier and ESLint covering site sources; use
      `astro check` for `.astro` files.
- [ ] Add site scripts: `site:build`, `site:typecheck`, `site:test`,
      `site:links`, `site:browser` and a `site:check` aggregate; add
      `site/scripts/check-links.mjs` walking `site/dist` for internal hrefs,
      anchors and asset references.
- [ ] Add a site Playwright configuration that serves `site/dist` and a
      smoke test that loads the placeholder at 390px and 1440px.
- [ ] Extend `xtask/src/check.rs` and its tests so `cargo xtask check` runs
      `site:check` after the package checks; update the README developer setup
      and `docs/protocol/npm-release.md`.
- [ ] Add a package test proving the packed tarball contains no `site/`
      entries and that the root package's dependencies are unchanged.
- [ ] Run `cargo xtask check`, commit and push. Stop for review.

## Milestone 4: Design System, Header, Footer And Empty Routes

Tags: ui

Implement Folio as CSS custom properties and the shared chrome, with an empty
page for every route. Stop for review with screenshots at both viewports and
schemes.

- [ ] Emit the Folio tokens as `--site-*` custom properties on the document
      root for light and dark, following the OS preference and the
      `data-color-scheme` override; add a test that no site stylesheet
      contains a literal color outside the token file.
- [ ] Implement base typography, spacing and layout utilities from the type
      roles, spacing scale, `contentMax`, prose measure, gutters and section
      rhythm; add the visible focus ring and 44px target rules.
- [ ] Implement the wordmark and mark, the desktop and mobile header, the
      footer, the skip link, `aria-current` marking and the page layout.
- [ ] Add empty pages for `/`, `/docs`, `/changelog`, `/terms` and `/privacy`
      with per-page metadata, `sitemap.xml` and `robots.txt`.
- [ ] Extend the browser test to walk every header and footer link at 390px
      and 1440px in light and dark and to assert the app-origin links.
- [ ] Capture screenshots at both viewports and schemes; compare with the
      Milestone 2 mockups.
- [ ] Run `cargo xtask check`, commit and push. Stop for review.

## Milestone 5: Home, Changelog, Terms And Privacy

Tags: ui

Build the marketing pages from the approved copy and real sources. Stop for
review with screenshots.

- [ ] Implement the home page: hero with the approved copy and both actions,
      the framed catalogue stage, four numbered features in a column grid on
      desktop, and the closing with the three-step workflow and both actions.
- [ ] Render the stage from this repository's example catalogue at build
      time: run the example build, copy the chosen screen documents and their
      stylesheets for mobile and desktop in light and dark into the site
      output, and embed them in the framed stage with the configured pull
      request label and Ready for review status; add a test that the label
      names a pull request present in `CHANGELOG.md`.
- [ ] Parse `CHANGELOG.md` into typed release entries (version, date,
      compare or release link, grouped notes); render `/changelog` with the
      Mokly CLI label, the empty state, and the Atom feed; add unit tests
      including the empty file and a malformed heading.
- [ ] Add `site/src/content/legal/terms.md` and `privacy.md` with the exact
      placeholder bodies, render the readable document layout with navigation
      between the two policies, and show a date only when the file declares an
      approved one.
- [ ] Generate Open Graph images at build time from the page title using
      the Folio tokens; add card metadata to every page.
- [ ] Extend the browser test to exercise both home actions and the
      changelog, terms and privacy pages at both viewports and schemes.
- [ ] Add the Lighthouse configuration with the agreed thresholds and a
      `site:lighthouse` script; run it locally against `site/dist`.
- [ ] Run `cargo xtask check`, commit and push. Stop for review.

## Milestone 6: Docs Layout And CLI Documentation

Tags: ui

Build the docs layout and write the sections that can be verified against this
repository today. Stop for review.

- [ ] Implement the docs layout: sidebar generated from the content
      collection (section, order, title), on-this-page list from MDX headings,
      previous and next links, copyable code blocks in the Folio code panel
      style, and Pagefind search indexed after the build with a small island
      for the search control.
- [ ] Add the content collection schema with `status: ahead` support hidden
      from readers, and read the current version from the workspace package
      for every install snippet.
- [ ] Write Getting started: install, configure, author a first screen,
      `mokly build`, `mokly serve`.
- [ ] Write Authoring, one page per concept: `defineConfig`, `screen` and
      `defineScreen`, `defineComponent`, viewports and color schemes,
      collections and tags, use-case flows, pages, links, fixtures and
      Review-ignore.
- [ ] Write Catalogue: the Browse shell, search, the All and Changes filter,
      the details inspector, `mokly export` and hosting a static catalogue.
- [ ] Write the CLI reference, one page per command, with exit codes and file
      outputs; add a test that every documented command and option exists in
      `src/cli/help.ts` and the argument parser, and that no CLI option in the
      code is undocumented.
- [ ] Write Continuous integration: the publish GitHub Action, the `publish`
      command, project tokens, the upload at the level a user needs, and how
      the check appears on a pull request.
- [ ] Publish the allowlisted `docs/protocol` documents from their Markdown
      source under Reference, rewriting links to excluded documents to their
      GitHub URLs; add a test for the allowlist and the link rewriting.
- [ ] Extend the link check to docs anchors and Pagefind output; extend the
      browser test to open a docs page, use the sidebar, on-this-page and
      previous and next links, copy a code block and run a search.
- [ ] Run `cargo xtask check`, commit and push. Stop for review.

## Milestone 7: Cloud Documentation Ahead Of Release

Tags: ui

Write the cloud sections from the cloud protocol docs, marked `status: ahead`.
Stop for review.

- [ ] Write Mokly Cloud: what the hosted service adds, connecting a GitHub
      repository through the GitHub App, project tokens, how a branch and pull
      request map to publications, the check on the pull request, sharing
      links and private access, organizations, projects and roles, settings.
- [ ] Write Review and edit: comments on screens, approvals and pull request
      sync, the agent session and click-to-reference.
- [ ] Record every page in the go-live alignment checklist in
      `docs/protocol/site.md` and report any disagreement between the cloud
      docs and this repository's CLI to the user.
- [ ] Run `cargo xtask check`, commit and push. Stop for review.

## Milestone 8: Deployment

Deploy the site on every push to `main` with pull request previews, and
document the release process.

- [ ] Add `.github/workflows/site.yml`: build the site on `main` and deploy
      to the chosen host; deploy same-repository pull requests to a preview
      alias with a sticky comment, following the existing preview workflow's
      credential and fork rules; clean up on close.
- [ ] Add a required `site-lighthouse` job to `ci.yml` and include it in the
      `Required CI` aggregator.
- [ ] Document the host project setup, the domain, `SITE_APP_ORIGIN` and the
      release process in the root `README.md`, `site/README.md` and
      `docs/protocol/site-delivery.md`.
- [ ] Run `cargo xtask check`, commit and push. Stop for review.

## Milestone 9: Verification, Commit, Push And Review

Close the plan on the branch; merge is the completion boundary.

- [ ] Inspect the complete diff and the deletion list against `origin/main`;
      confirm nothing already on `main` is removed without approval.
- [ ] Run `cargo xtask check` and resolve any failures.
- [ ] After checks pass, `git add -A`, commit remaining work with
      Conventional Commits and push with every new file tracked.
- [ ] After the push, use
      [the implementation review prompt](../docs/implementation-review-prompt.md)
      against `origin/main` and report numbered findings with severity,
      context, impact, lettered options and a recommendation, without changing
      the implementation.

## Post-merge follow-up (non-blocking)

- [ ] Create the host project, attach the production domain and confirm the
      first `main` deployment serves every route.
- [ ] Run the go-live alignment pass with the cloud repository against every
      `status: ahead` page before the domain goes live.
- [ ] Replace the Terms and Privacy placeholders with approved legal text.
- [ ] In the cloud repository, remove the marketing mockups and routes and
      point its Home, Docs and Changelog links at this site.
