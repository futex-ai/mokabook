import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { compileCatalogue } from "../../dist/build/compile.js";
import { writeCompilation } from "../../dist/build/transaction.js";
import { loadConfig } from "../../dist/config/load.js";
import { serve } from "../../dist/server/serve.js";
import { createFixture, removeFixture } from "../helpers/fixture.js";
import { waitForClassifiedCount } from "../helpers/watched_catalogue.js";

const BASELINE_CSS = ".auth { color: black; }\n.guide { color: black; }\n";

/** One registered component plus two screens that link the same stylesheet. */
function evidenceEntrySource(): string {
  return `import React from "react";
import { defineCollection, defineComponent, defineScreen } from "@mokly/mokly";
const metadata = { dependencies: ["notes.md"], relatedDocs: [] };
const badge = defineComponent({ ...metadata,
  id: "badge", title: "Badge", description: "A shared badge", route: "components/badge.html",
  propSchema: { kind: "object", properties: { label: { schema: { kind: "string" } } } },
  render: (props) => <span className="badge">{props.label}</span>,
  variants: [{ id: "default", title: "Default", props: { label: "New" } }]
});
export const mockups = [
  defineCollection({ ...metadata, id: "fixture", title: "Fixture", description: "Fixture collection", childIds: ["badge", "home", "details"] }),
  badge.entry,
  defineScreen({ ...metadata, id: "home", title: "Home", description: "Home screen", route: "screens/home.html",
    mobile: <main id="home"><button className="auth">Sign in</button></main>,
    desktop: <main id="home"><button className="auth">Sign in</button></main> }),
  defineScreen({ ...metadata, id: "details", title: "Details", description: "Detail screen", route: "screens/details.html",
    mobile: <main id="details"><p className="guide">Guide</p></main>,
    desktop: <main id="details"><p className="guide">Guide</p></main> })
];
`;
}

/** Serve a Git-backed catalogue whose shared stylesheet gained `rule`. */
export async function cssEvidenceFixture(rule: string, changed: number) {
  const fixture = await createFixture(evidenceEntrySource(), {
    extraConfig:
      'colorSchemes: ["light", "dark"], stylesheets: [{ match: "**/*.html", stylesheets: ["shared.css"] }],',
  });
  const stylesheet = path.join(fixture.mockupsDir, "shared.css");
  await fs.writeFile(stylesheet, BASELINE_CSS);
  const config = await loadConfig(fixture.root);
  await writeCompilation(await compileCatalogue(config), config);
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: fixture.root, stdio: "pipe" });
  git("init", "-q", "-b", "main");
  git("config", "user.name", "Mokly Test");
  git("config", "user.email", "mokly@example.invalid");
  git("add", ".");
  git("commit", "-qm", "test: catalogue baseline");
  await fs.appendFile(stylesheet, rule);
  await writeCompilation(await compileCatalogue(config), config);
  const running = await serve(config, { base: "main", port: 0, watch: false });
  try {
    await waitForClassifiedCount(running.url, changed);
  } catch (error) {
    await running.close();
    await removeFixture(fixture);
    throw error;
  }
  return {
    url: running.url,
    async close() {
      await running.close();
      await removeFixture(fixture);
    },
  };
}
