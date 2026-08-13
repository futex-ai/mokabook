import { defineConfig } from "mokabook";

export default defineConfig({
  entriesDir: "entries",
  mockupsDir: "mockups",
  repoRoot: ".",
  changes: {
    base: "HEAD",
    sharedImpact: ["notes.md"],
  },
  stylesheets: [{ match: "screens/**/*.html", stylesheets: ["fixture.css"] }],
});
