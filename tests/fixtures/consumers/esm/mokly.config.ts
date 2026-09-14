import { defineConfig } from "@mokly/mokly";

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
