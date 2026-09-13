# Mokly website directions

Open [the HTML comparison gallery](./index.html) directly from disk. Choose a
direction, switch between desktop and mobile, or open/save a full website. The
three landing pages are self-contained HTML with embedded styles, JavaScript,
and the repository's Inter font, including its license. No server or network is
needed to view them. GitHub and documentation links require internet access.

| Direction     | Positioning                                               | Standalone website                              |
| ------------- | --------------------------------------------------------- | ----------------------------------------------- |
| Fieldnotes    | Warm, editorial; the shared product picture and ownership | [Open HTML](./website/fieldnotes/index.html)    |
| Signal        | Dark, technical; better context for coding agents         | [Open HTML](./website/signal/index.html)        |
| Common Ground | Light, collaborative; the team review conversation        | [Open HTML](./website/common-ground/index.html) |

## Scope and review

These are alternative marketing concepts for discussion, not approved product
contracts or production routes. They explore the productisation conversation
supplied with this task: real components, screens and flows, Git-based change
evidence, agent context, and a future cloud review layer. Fieldnotes is closest
to the current open-source capability. Signal's chat and Common Ground's shared
workspace, comments, and approval depict proposed capabilities. No agent, MCP,
hosting, accounts, billing, or review service is implemented by these designs.

The website copy uses the product name Mokly and links to
[`mokly-ai/mokly`](https://github.com/mokly-ai/mokly). The install snippet still
uses the published `mokabook` npm package, and the documentation link uses the
existing `#use-mokabook` heading. Update these when the package and its
documentation are renamed.

All depicted product content uses illustrative fixtures under `docs/mockups`.
There are no customer endorsements, usage claims, pricing, or live signup forms.
Review explanations stay in the gallery, outside the website screen itself.

Each direction has its own responsive screen component. The gallery renders it
at 1160 × 780 for desktop and 390 × 844 for mobile, scaling the frame to fit the
reviewer's browser. The standalone page adapts to the actual viewport. The
gallery is a catalogue index; thumbnails link to their owning screen pages.

Supported interactions:

- Gallery: direction selection, desktop/mobile switch, full-page links, and
  HTML download. Keep the gallery's `website/` directory beside `index.html`.
- Websites: section navigation, mobile navigation disclosure, and real project
  documentation links. Headline calls to action either reveal a section or open
  the existing documentation.
- Signal: “Show the update” moves the illustrated task action beside the title;
  “Back to the original” resets it. This is a fixed illustration, not an agent.
- Common Ground: Before/After switches between the same two designs.
- Fieldnotes and Signal: copy the real installation command; denied clipboard
  access selects the command and announces manual copy instructions.

## Authoring and validation

Edit React-backed `.source.tsx` pages in `src/pages`, reusable screen pieces in
`src/components`, styles in `src/styles`, and interactions in `src/browser.ts`.
Do not hand-edit generated HTML. The directory hierarchy of each source page
matches its generated website. The small documentation builder uses existing
workspace dependencies; this catalogue is not part of the published npm package.

```sh
npm ci
npm run mockups:build
npm run mockups:check
npm run mockups:typecheck
npm run mockups:test
cargo xtask check
```

The check rebuilds in memory and fails on any generated-byte mismatch. Browser
tests open every website directly with `file://`, including offline checks at
1440, 390, and 320 pixels. They verify navigation targets, no horizontal
overflow, gallery controls, demo transitions, and clipboard failure handling.
Readability checks enforce text contrast for website and gallery copy; miniature
product illustrations are outside that check's scope.
Screenshots for visual inspection are written to `.context/mockups-review`.
The tests use the repository's Chrome/`PLAYWRIGHT_CHANNEL` convention.

Related: [project README](../../README.md),
[implementation review instructions](../implementation-review-prompt.md).
