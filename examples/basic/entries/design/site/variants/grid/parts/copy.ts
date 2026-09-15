/**
 * Approved home copy for the Grid direction, plus the product nouns the
 * definitions strip explains. Every line comes from the site contract; the
 * definitions restate the positioning paragraph in one sentence each.
 */

/** The three numbered features: browse, review and edit. */
export const FEATURES = [
  {
    anchor: "browse",
    body: "Each branch and pull request publishes a catalogue built from your real components. Changes shows what moved, and the check on the pull request counts it.",
    label: "BROWSE",
    name: "Browse",
    number: "01",
    title: "See every branch as screens.",
  },
  {
    anchor: "review",
    body: "Pin a comment to the component it is about and approve when it is right. The conversation stays in step with the pull request review.",
    label: "REVIEW",
    name: "Review",
    number: "02",
    title: "Comment on the screen itself.",
  },
  {
    anchor: "edit",
    body: "An agent edits the mockup source in a live branch session. Click an element to bring it into the conversation, then publish back to the branch.",
    label: "EDIT",
    name: "Edit",
    number: "03",
    title: "Ask for the change beside the screen.",
  },
] as const;

/** The three closing steps, rendered as one bordered strip. */
export const STEPS = [
  {
    body: "Author with React and your shared components.",
    number: "01",
    title: "Shape the next screen.",
  },
  {
    body: "Open the pull request check to review the screens that changed.",
    number: "02",
    title: "Publish the branch.",
  },
  {
    body: "Keep comments and approvals with the pull request.",
    number: "03",
    title: "Build from a shared decision.",
  },
] as const;

/** The product nouns the site uses, defined once in a row of facts. */
export const FACTS = [
  {
    body: "One component, rendered at mobile and desktop, light and dark.",
    term: "Screen",
  },
  {
    body: "A hosted catalogue, built from one branch.",
    term: "Publication",
  },
  {
    body: "Every branch publishes a catalogue of its own.",
    term: "Branch",
  },
  {
    body: "Where the team decides on the change.",
    term: "Pull request",
  },
  {
    body: "Your screens, browsable by everyone who reviews them.",
    term: "Catalogue",
  },
  {
    body: "The pull request check that counts the screens that changed.",
    term: "Check",
  },
] as const;
