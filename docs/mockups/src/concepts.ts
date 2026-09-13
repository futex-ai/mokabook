export const concepts = [
  {
    id: "fieldnotes",
    number: "01",
    name: "Fieldnotes",
    tone: "Warm · editorial · grounded",
    headline: "The design layer that feels like part of your craft.",
    description:
      "Paper tones, expressive serif type, and a tangible product canvas. Leads with shared understanding and ownership of your work.",
    audience: "Founders and engineering-led product teams",
    focus:
      "Real components, screens, flows, and Git-based comparison. The closest to what the open-source tool does today.",
    status: "Current capability positioning",
    path: "website/fieldnotes/index.html",
  },
  {
    id: "signal",
    number: "02",
    name: "Signal",
    tone: "Dark · precise · agent-focused",
    headline: "A clearer starting point for agent-built products.",
    description:
      "Charcoal, electric green, and a working design bench. Leads with giving coding agents a better picture of what to build.",
    audience: "Developers building with coding agents",
    focus:
      "Future direction: the chat and agent-assisted edit are scripted illustrations. An integrated agent or MCP service is not shipped by this mockup.",
    status: "Future agent-workflow positioning",
    path: "website/signal/index.html",
  },
  {
    id: "common-ground",
    number: "03",
    name: "Common Ground",
    tone: "Light · collaborative · product-led",
    headline: "The whole team, looking at the same next step.",
    description:
      "Soft lilac, open space, and a shared review workspace. Leads with better product conversations across design and engineering.",
    audience: "Product leads and cross-functional teams",
    focus:
      "Future cloud direction: the team workspace, pinned discussion, and approval are illustrative. Hosting, accounts, and review services are not implemented here.",
    status: "Future team-review positioning",
    path: "website/common-ground/index.html",
  },
] as const;

export type ConceptId = (typeof concepts)[number]["id"];
