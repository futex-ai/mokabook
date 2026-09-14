import { expect, type Locator, type Page } from "@playwright/test";

/** The one changed stylesheet every evidence fixture screen links. */
export const STYLESHEET = "mockups/shared.css";
/** Inspector copy fixed by docs/protocol/mokly-css-attribution.md. */
export const FILES_LEAD = "Changes to these files may affect this screen:";
export const MATCHED_LEAD = "Changed styles that apply to this screen:";
export const UNRESOLVED_LEAD =
  "This change can apply anywhere on the screen, so the screen stays in Changes:";
export const EXCLUDED_LEAD =
  "This stylesheet changed, but none of the changed styles apply to this screen.";
export const EXAMINED_LEAD = "Examined and excluded:";
/** Comparison stage headings derived from the view's own evidence. */
export const STYLE_HEADING = "Styles this screen uses changed";
export const UNCHANGED_HEADING = "No changes to this screen";
/** The mobile inspector sheet and the desktop inspector dock. */
export const INSPECTOR_VIEWPORTS = [
  ["desktop", { width: 1440, height: 1000 }],
  ["mobile", { width: 390, height: 844 }],
] as const;

/** Open the Details tab and return the evidence panel it reveals. */
export async function openEvidence(page: Page): Promise<Locator> {
  await page.getByRole("tab", { name: "Details", exact: true }).click();
  const evidence = page.locator("[data-workspace-evidence]");
  await expect(evidence).toContainText("Comparison details");
  return evidence;
}

/** Reveal the catalogue tree, which the mobile shell keeps behind a control. */
export async function openCatalogue(
  page: Page,
  viewport: string,
): Promise<void> {
  if (viewport === "desktop") return;
  await page.getByRole("button", { name: "Open catalogue navigation" }).click();
}

/** Load the side-by-side comparison and return its per-viewport headings. */
export async function openComparison(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "Side by side", exact: true }).click();
  const headings = page.locator(".mbk-diff-view h3");
  await expect(headings.first()).toBeVisible();
  return headings;
}
