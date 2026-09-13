import { expect, type Page, type Request } from "@playwright/test";

/** Await on-demand snapshot generation before applying UI assertion deadlines. */
export async function loadComparison(
  page: Page,
  action: "Overlay" | "Side by side" | "Try again" | "Refresh comparison",
): Promise<void> {
  const origin = new URL(page.url()).origin;
  const refresh = action === "Try again" || action === "Refresh comparison";
  let initiatingRequest: Request | undefined;
  const request = page.waitForRequest(
    (candidate) => {
      const url = new URL(candidate.url());
      const matches =
        candidate.redirectedFrom() === null &&
        candidate.frame() === page.mainFrame() &&
        candidate.method() === "GET" &&
        candidate.resourceType() === "fetch" &&
        url.origin === origin &&
        url.pathname === "/__mokly/diffs/review.json" &&
        (url.searchParams.get("refresh") === "1") === refresh;
      if (matches) initiatingRequest = candidate;
      return matches;
    },
    { timeout: 30_000 },
  );
  const [response] = await Promise.all([
    page.waitForResponse(
      (result) => {
        let root = result.request();
        while (root.redirectedFrom()) root = root.redirectedFrom()!;
        return (
          root === initiatingRequest &&
          (result.status() < 300 || result.status() >= 400)
        );
      },
      { timeout: 30_000 },
    ),
    request,
    page.getByRole("button", { name: action, exact: true }).click(),
  ]);
  expect(response.ok()).toBe(true);
  expect(await response.finished()).toBeNull();
}
