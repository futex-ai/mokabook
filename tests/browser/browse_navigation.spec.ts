import { expect, test, type Page } from "@playwright/test";

import {
  startNavigationFixture,
  type NavigationFixture,
} from "./navigation_fixture.js";

let navigation: NavigationFixture;

test.beforeAll(async () => {
  navigation = await startNavigationFixture();
});

test.afterAll(async () => {
  await navigation.close();
});

test("MockLink navigation reveals the destination and preserves shell state", async ({
  page,
}) => {
  await page.goto(`${navigation.url}/view/screens/home.html`);
  await page.click('[data-viewport-option="mobile"]');
  await page.click('.mbk-topbar [data-color-scheme-option="dark"]');
  const detailsPanel = page.locator("details[data-mokabook-details]");
  if ((await detailsPanel.getAttribute("open")) !== null) {
    await detailsPanel.locator("summary").click();
  }
  const other = page.locator('details[data-nav-collection="collection:other"]');
  await other.evaluate((element: HTMLDetailsElement) => {
    element.open = true;
  });
  await page.fill("[data-mokabook-search]", "home");
  await page.click('[data-filter="changed"]');
  const detailsRow = page.locator(
    'a[data-nav-row][data-route="screens/details.html"]',
  );
  await expect(detailsRow).toBeHidden();
  await page
    .frameLocator(".mbk-frame-mobile iframe")
    .locator("#mock-link")
    .click();

  await expect(page).toHaveURL(
    /\/view\/screens\/details\.html\?fragment=section$/,
  );
  await expect(page.locator("#mb-main h2")).toHaveText("Details");
  await expect(page.locator(".mbk-crumbs")).toContainText("Nested");
  await expect(detailsRow).toHaveAttribute("aria-current", "page");
  await expect(detailsRow).toBeVisible();
  await expect(page.locator("[data-mokabook-search]")).toHaveValue("");
  await expect(page.locator('[data-filter="all"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(other).toHaveAttribute("open", "");
  for (const ancestor of await detailsRow
    .locator("xpath=ancestor::details")
    .all()) {
    await expect(ancestor).toHaveAttribute("open", "");
  }
  await expect(detailsPanel).not.toHaveAttribute("open", "");
  await expect(page.locator("[data-mokabook-stage]")).toHaveAttribute(
    "data-viewport",
    "mobile",
  );
  await expect(page.locator("body")).toHaveAttribute(
    "data-mokabook-color-scheme",
    "dark",
  );
  await expect(page.locator(".mbk-frame-mobile iframe")).toHaveAttribute(
    "src",
    /details\.mobile\.dark\.html#section$/,
  );

  await page.goBack();
  await expect(page.locator("#mb-main h2")).toHaveText("Home");
  await page.goForward();
  await expect(detailsRow).toHaveAttribute("aria-current", "page");
});

test("keyboard navigation retains constraints that already show the destination", async ({
  page,
}) => {
  await page.goto(`${navigation.url}/view/screens/home.html`);
  await page.fill("[data-mokabook-search]", "details");
  await page
    .frameLocator(".mbk-frame-mobile iframe")
    .locator("#mock-link")
    .focus();
  await page.keyboard.press("Enter");

  await expectDestination(page);
  await expect(page.locator("[data-mokabook-search]")).toHaveValue("details");
  await expect(page.locator('[data-filter="all"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.locator('a[data-nav-row][data-route="screens/details.html"]'),
  ).toHaveAttribute("aria-current", "page");
});

test("raw native links navigate from desktop, area, SVG, flow, and legacy frames", async ({
  page,
}) => {
  await navigateFrom(page, ".mbk-frame-desktop iframe", "#raw-link");
  await navigateFrom(page, ".mbk-frame-mobile iframe", "#area-link", true);
  await navigateFrom(page, ".mbk-frame-mobile iframe", "#svg-link");

  await page.goto(`${navigation.url}/view/user-flows/tour.html`);
  await page
    .frameLocator(".mbk-flow-screen iframe")
    .first()
    .locator("#raw-link")
    .click();
  await expectDestination(page);

  await page.goto(`${navigation.url}/view/guide.html`);
  await page
    .frameLocator(".mbk-stage-embed iframe")
    .locator("#legacy-link")
    .click();
  await expectDestination(page);
});

async function navigateFrom(
  page: Page,
  frameSelector: string,
  linkSelector: string,
  dispatch = false,
): Promise<void> {
  await page.goto(`${navigation.url}/view/screens/home.html`);
  const link = page.frameLocator(frameSelector).locator(linkSelector);
  if (dispatch) {
    await link.evaluate((element) =>
      element.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      ),
    );
  } else {
    await link.click();
  }
  await expectDestination(page);
}

async function expectDestination(page: Page): Promise<void> {
  await expect(page).toHaveURL(
    /\/view\/screens\/details\.html\?fragment=section$/,
  );
  await expect(page.locator("#mb-main h2")).toHaveText("Details");
}
