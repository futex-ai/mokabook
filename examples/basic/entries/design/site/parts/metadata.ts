/** Shared entry metadata for the public site screens. */

/** Folio stylesheets owned by the site screens in this example catalogue. */
export const SITE_STYLESHEETS = [
  "examples/basic/generated/site-tokens.css",
  "examples/basic/generated/site.css",
];

/** Dependencies and protocol documents recorded by every site entry. */
export const SITE_METADATA = {
  dependencies: SITE_STYLESHEETS,
  relatedDocs: [
    "docs/protocol/site.md",
    "docs/protocol/site-design.md",
    "docs/protocol/site-docs.md",
  ],
};
