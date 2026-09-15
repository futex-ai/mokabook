/**
 * The documented information architecture: every section in order with its
 * pages. Destinations the design catalogue does not own are depicted as plain
 * text, the rule the rest of the design mockups follow.
 */

/** Every documentation section, in the order the sidebar renders them. */
export const DOCS_SECTIONS = [
  {
    pages: ["Install", "Configure", "Your first screen", "Build", "Serve"],
    title: "Getting started",
  },
  {
    pages: [
      "Config",
      "Screens",
      "Components",
      "Viewports and color schemes",
      "Collections and tags",
      "Use-case flows",
      "Pages",
      "Links",
      "Review-ignore",
    ],
    title: "Authoring",
  },
  {
    pages: [
      "Browse",
      "Search and filters",
      "Changes",
      "Details",
      "Export and host",
    ],
    title: "Catalogue",
  },
  {
    pages: [
      "serve",
      "build",
      "check",
      "export",
      "publish",
      "Options and exit status",
    ],
    title: "CLI reference",
  },
  {
    pages: [
      "GitHub Action",
      "Publish from CI",
      "Project tokens",
      "The upload",
      "The check on a pull request",
    ],
    title: "Continuous integration",
  },
  {
    pages: [
      "Overview",
      "Connect a repository",
      "Branches and pull requests",
      "Sharing and access",
      "Organizations and roles",
      "Settings",
    ],
    title: "Mokly Cloud",
  },
  {
    pages: [
      "Static export delivery",
      "Export ownership",
      "Catalogue upload",
      "Catalogue navigation",
      "Styled link controls",
      "Pages in the catalogue",
    ],
    title: "Reference",
  },
  {
    pages: [
      "Comments",
      "Approvals",
      "Pull request sync",
      "Agent sessions",
      "Click to reference",
    ],
    title: "Review and edit",
  },
] as const;

/** The section and page this documentation mockup renders. */
export const DOCS_PAGE = {
  page: "Install",
  section: "Getting started",
} as const;

/** The headings the document column carries, in order. */
export const DOCS_HEADINGS = [
  { id: "install-the-package", title: "Install the package" },
  { id: "add-the-configuration", title: "Add the configuration" },
  { id: "author-your-first-screen", title: "Author your first screen" },
] as const;
