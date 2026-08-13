import { defineConfig } from "mokabook";

export default defineConfig({
  entriesDir: "../spec/catalogue",
  mockupsDir: "../site/mockups",
  repoRoot: "..",
  changes: {
    sharedImpact: ["spec/ui/**"],
  },
  stylesheets: [{ match: "workspace/**/*.html", stylesheets: ["juno.css"] }],
});
