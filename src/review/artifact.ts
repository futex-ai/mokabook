import path from "node:path";

import { encodeUrlPath } from "../config/paths.js";
import type {
  ReviewArtifact,
  ReviewArtifactContent,
  ReviewResult,
  ScreenReview,
  ViewportReview,
} from "./types.js";
import { addArtifactFile, comparisonPagePath } from "./paths.js";

/** Add self-contained diagnostic pages, JSON, and CI summary to pane artifacts. */
export function renderReviewArtifact(
  artifact: ReviewArtifact,
): ReadonlyMap<string, ReviewArtifactContent> {
  const files = new Map(artifact.files);
  addArtifactFile(
    files,
    "review.json",
    `${JSON.stringify(artifact.result, null, 2)}\n`,
  );
  addArtifactFile(files, "summary.md", summaryMarkdown(artifact.result));
  addArtifactFile(files, "index.html", indexPage(artifact.result));
  for (const screen of artifact.result.screens) {
    for (const viewport of screen.viewports) {
      addArtifactFile(
        files,
        comparisonPagePath(screen.route, viewport.viewport),
        comparePage(screen, viewport),
      );
    }
  }
  addArtifactFile(files, ".mokabook-review-artifact", "schemaVersion=1\n");
  return files;
}

/** Create a concise deterministic CI summary. */
export function summaryMarkdown(result: ReviewResult): string {
  const material = result.screens.filter(
    (screen) => screen.state !== "unchanged",
  );
  const counts = new Map<string, number>();
  for (const screen of result.screens)
    counts.set(screen.state, (counts.get(screen.state) ?? 0) + 1);
  const lines = [
    "## Mokabook Review",
    "",
    `Base: \`${result.baseRef}\` (\`${result.baseCommit.slice(0, 12)}\`)`,
    "",
    `Screens: ${result.screens.length}; material: ${material.length}; changed: ${counts.get("changed") ?? 0}; added: ${counts.get("added") ?? 0}; removed: ${counts.get("removed") ?? 0}; ignored-only: ${counts.get("ignored-only") ?? 0}.`,
  ];
  if (result.sharedImpact.length > 0) {
    lines.push(
      "",
      "Shared-impact paths:",
      ...result.sharedImpact.map((item) => `- \`${item}\``),
    );
  }
  return `${lines.join("\n")}\n`;
}

function indexPage(result: ReviewResult): string {
  const rows = result.screens
    .map((screen) => {
      const links = screen.viewports
        .map(
          (viewport) =>
            `<a href="${escape(encodeUrlPath(comparisonPagePath(screen.route, viewport.viewport)))}">${viewport.viewport}</a>`,
        )
        .join(" · ");
      return `<tr><td>${escape(screen.state)}</td><td>${escape(screen.title)}</td><td><code>${escape(screen.route)}</code></td><td>${links}</td></tr>`;
    })
    .join("");
  return page(
    "Mokabook Review",
    `<h1>Mokabook Review</h1><p>Compared with <code>${escape(result.baseRef)}</code>.</p><table><thead><tr><th>State</th><th>Screen</th><th>Route</th><th>Compare</th></tr></thead><tbody>${rows}</tbody></table>`,
  );
}

function comparePage(screen: ScreenReview, viewport: ViewportReview): string {
  const pagePath = comparisonPagePath(screen.route, viewport.viewport);
  const before = viewport.beforePath
    ? relativeLink(pagePath, viewport.beforePath)
    : undefined;
  const after = viewport.afterPath
    ? relativeLink(pagePath, viewport.afterPath)
    : undefined;
  const panes = [
    before
      ? `<section class="before"><h2>Before</h2><iframe sandbox="" title="Before" src="${escape(before)}"></iframe></section>`
      : "",
    after
      ? `<section class="after"><h2>After</h2><iframe sandbox="" title="After" src="${escape(after)}"></iframe></section>`
      : "",
  ].join("");
  const rootLink = relativeLink(pagePath, "index.html");
  return page(
    `${screen.title} · ${viewport.viewport}`,
    `<p><a href="${escape(rootLink)}">Review</a></p><h1>${escape(screen.title)}</h1><p>${escape(viewport.viewport)} · ${escape(viewport.state)}</p><div class="modes"><button data-mode="side">Side by side</button><button data-mode="overlay">Overlay</button><button data-mode="difference">Difference</button></div><div class="panes" data-compare-mode="side">${panes}</div><script>for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>document.querySelector('.panes').dataset.compareMode=button.dataset.mode)</script>`,
  );
}

function relativeLink(from: string, to: string): string {
  const relative = path.posix.relative(path.posix.dirname(from), to);
  const encoded = encodeUrlPath(relative);
  return encoded.startsWith(".") ? encoded : `./${encoded}`;
}

function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><style>body{font:15px system-ui;margin:2rem}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #ccc;padding:.6rem;text-align:left}.modes{display:flex;gap:.5rem;margin:1rem 0}.panes{display:grid;grid-template-columns:repeat(auto-fit,minmax(20rem,1fr));gap:1rem}.panes section{min-width:0}.panes iframe{width:100%;height:70vh;border:1px solid #aaa}.panes[data-compare-mode=overlay],.panes[data-compare-mode=difference]{display:grid;grid-template:1fr/1fr}.panes[data-compare-mode=overlay] section,.panes[data-compare-mode=difference] section{grid-area:1/1}.panes[data-compare-mode=overlay] .after{opacity:.5}.panes[data-compare-mode=difference] .after{mix-blend-mode:difference}.panes[data-compare-mode=overlay] h2,.panes[data-compare-mode=difference] h2{background:white;display:inline-block}code{font-size:.9em}</style></head><body>${body}</body></html>\n`;
}

function escape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
