import { expect, test, type Locator, type Page } from "@playwright/test";

import { cssEvidenceFixture } from "./css_evidence_fixture.js";
import { chooseScheme, chooseViewport } from "./workspace_actions.js";

const STYLESHEET = "mockups/shared.css";
const FILES_LEAD = "Changes to these files may affect this screen:";
const MATCHED_LEAD = "Changed styles that apply to this screen:";
const UNRESOLVED_LEAD =
  "This change can apply anywhere on the screen, so the screen stays in Changes:";
const EXCLUDED_LEAD =
  "This stylesheet changed, but none of the changed styles apply to this screen.";

let matched: Awaited<ReturnType<typeof cssEvidenceFixture>>;
let unresolved: Awaited<ReturnType<typeof cssEvidenceFixture>>;

test.beforeAll(async () => {
  matched = await cssEvidenceFixture(".auth { padding: 2px; }\n", 1);
  unresolved = await cssEvidenceFixture(".guide { --tone: red; }\n", 3);
});
test.afterAll(async () => {
  await matched?.close();
  await unresolved?.close();
});

for (const [name, size] of [
  ["desktop", { width: 1440, height: 1000 }],
  ["mobile", { width: 390, height: 844 }],
] as const) {
  test.describe(`${name} stylesheet evidence`, () => {
    test.use({ viewport: size });

    test("a screen the changed styles reach names them in Details", async ({
      page,
    }) => {
      await page.goto(`${matched.url}/view/screens/home.html`);
      await expect(page.locator("[data-workspace-status]")).toHaveText(
        "Changed",
      );
      const evidence = await openEvidence(page);
      await expect(
        evidence.getByText(FILES_LEAD, { exact: true }),
      ).toBeVisible();
      await expect(evidence.getByRole("listitem").first()).toHaveText(
        STYLESHEET,
      );
      await expect(
        evidence.getByText(MATCHED_LEAD, { exact: true }),
      ).toBeVisible();
      await expect(evidence.locator("code.mbk-code")).toHaveText([".auth"]);
      await expect(evidence).not.toContainText(EXCLUDED_LEAD);
      await expect(evidence).not.toContainText("no-matching-rule");
      await expect(page.locator("h2")).toHaveText("Home");
      await expect(page.locator(".mbk-screen-head")).not.toContainText(".auth");

      for (const scheme of ["dark", "light"] as const)
        for (const size of ["mobile", "desktop"] as const) {
          await chooseScheme(page, scheme);
          await chooseViewport(page, size);
          await expect(
            evidence.getByText(MATCHED_LEAD, { exact: true }),
          ).toBeVisible();
          await expect(evidence.locator("code.mbk-code")).toHaveText([".auth"]);
        }
    });

    test("an excluded screen stays out of Changes and explains why", async ({
      page,
    }) => {
      await page.goto(`${matched.url}/view/screens/details.html`);
      await expect(page.locator("[data-workspace-status]")).toHaveText(
        "Unmodified",
      );
      const evidence = await openEvidence(page);
      await expect(
        evidence.getByText(EXCLUDED_LEAD, { exact: true }),
      ).toBeVisible();
      await expect(
        evidence.getByText("Examined and excluded:", { exact: true }),
      ).toBeVisible();
      await expect(evidence.getByRole("listitem")).toHaveText([STYLESHEET]);
      await expect(evidence).not.toContainText(FILES_LEAD);
      await expect(evidence).not.toContainText(MATCHED_LEAD);
      await expect(evidence.locator("code.mbk-code")).toHaveCount(0);

      await expect(page.locator(".mbk-nav-filter-count")).toHaveText("1");
      await openCatalogue(page, name);
      await page.locator('[data-filter="changed"]').click();
      await expect(
        page.locator('[data-route="screens/home.html"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-route="screens/details.html"]'),
      ).toBeHidden();
      await expect(page.locator(".mbk-nav-scroll")).not.toContainText(".auth");
      await expect(page.locator(".mbk-nav-scroll")).not.toContainText(
        "stylesheet",
      );
    });

    test("a change that can reach anything says so without naming a status", async ({
      page,
    }) => {
      await page.goto(`${unresolved.url}/view/screens/home.html`);
      const evidence = await openEvidence(page);
      await expect(
        evidence.getByText(UNRESOLVED_LEAD, { exact: true }),
      ).toBeVisible();
      await expect(evidence.locator("code.mbk-code")).toHaveText([".guide"]);
      await expect(evidence).not.toContainText("unresolved");
      await expect(evidence).not.toContainText("matched");
    });

    test("the comparison heading leads with the style outcome", async ({
      page,
    }) => {
      await page.goto(`${matched.url}/view/screens/home.html`);
      await page
        .getByRole("button", { name: "Side by side", exact: true })
        .click();
      const headings = page.locator(".mbk-diff-view h3");
      await expect(headings.first()).toBeVisible();
      for (const heading of await headings.allTextContents())
        expect(heading).toMatch(/· Styles this screen uses changed$/);
      expect(
        await page.locator("[data-diff-stage] iframe").count(),
      ).toBeGreaterThanOrEqual(2);
    });
  });
}

async function openEvidence(page: Page): Promise<Locator> {
  await page.getByRole("tab", { name: "Details", exact: true }).click();
  const evidence = page.locator("[data-workspace-evidence]");
  await expect(evidence).toContainText("Comparison details");
  return evidence;
}

async function openCatalogue(page: Page, viewport: string): Promise<void> {
  if (viewport === "desktop") return;
  await page.getByRole("button", { name: "Open catalogue navigation" }).click();
}
