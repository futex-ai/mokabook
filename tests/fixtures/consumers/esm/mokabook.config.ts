import { defineConfig } from "mokabook";

export default defineConfig({
  entriesDir: "entries",
  mockupsDir: "mockups",
  repoRoot: ".",
  review: {
    base: "HEAD",
    outDir: ".review",
    sharedImpact: ["notes.md"],
  },
  stylesheets: [{ match: "screens/**/*.html", stylesheets: ["fixture.css"] }],
});
