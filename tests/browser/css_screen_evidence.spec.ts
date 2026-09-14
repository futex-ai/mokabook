import { expect, test } from "@playwright/test";

import { parseReviewResult } from "../../dist/review/result_validation.js";
import { cssEvidenceFixture } from "./css_evidence_fixture.js";

let fixture: Awaited<ReturnType<typeof cssEvidenceFixture>>;

test.use({ viewport: { width: 1440, height: 1000 } });
test.beforeAll(async () => {
  fixture = await cssEvidenceFixture(".auth { padding: 2px; }\n", 1, false);
});
test.afterAll(async () => fixture?.close());

test("screen-only catalogues deliver retained and excluded styles before and after comparison", async ({
  page,
}) => {
  let comparisonRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/review.json"))
      comparisonRequests++;
  });
  await page.goto(`${fixture.url}/view/screens/details.html`);
  await page.getByRole("tab", { name: "Details", exact: true }).click();
  const evidence = page.locator("[data-workspace-evidence]");
  await expect(page.locator("[data-workspace-status]")).toHaveText(
    "Unmodified",
  );
  await expect(evidence).toContainText("Examined and excluded:");
  await expect(evidence.getByRole("listitem")).toHaveText([
    "mockups/shared.css",
  ]);
  await expect(page.locator(".mbk-nav-filter-count")).toHaveText("1");
  await page.locator('[data-filter="changed"]').click();
  await expect(
    page.locator('[data-route="screens/details.html"]'),
  ).toBeHidden();

  await page.goto(`${fixture.url}/view/screens/home.html`);
  await page.getByRole("tab", { name: "Details", exact: true }).click();
  await expect(evidence).toContainText(
    "Changed styles that apply to this screen:",
  );
  await expect(evidence.locator("code.mbk-code")).toHaveText([".auth"]);
  expect(comparisonRequests).toBe(0);

  const response = page.waitForResponse(
    (response) =>
      response.status() === 200 &&
      new URL(response.url()).pathname.endsWith("/review.json"),
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Side by side", exact: true }).click();
  expect(parseReviewResult(await (await response).json()).schemaVersion).toBe(
    2,
  );
  await expect(page.locator(".mbk-diff-view").first()).toBeVisible();
  await expect(evidence.locator("code.mbk-code")).toHaveText([".auth"]);
  await expect(
    evidence.getByText("Comparison details", { exact: true }),
  ).toHaveCount(1);
  await expect(evidence).not.toContainText("Shared component changes");
  await page.getByRole("button", { name: "Current", exact: true }).click();
  await expect(evidence.locator("code.mbk-code")).toHaveText([".auth"]);
});
