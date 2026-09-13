import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { concepts } from "../src/concepts.js";

const pages = ["index.html", ...concepts.map((concept) => concept.path)];

for (const path of pages) {
  test(`${path} keeps website and gallery copy readable`, async ({ page }) => {
    await page.goto(new URL(`../${path}`, import.meta.url).href);
    const violations = await page.evaluate(() => {
      const rgb = (value: string) => (value.match(/[\d.]+/g) ?? []).map(Number);
      const luminance = (channels: number[]) =>
        channels.slice(0, 3).reduce((sum, channel, index) => {
          const value = channel / 255;
          const linear =
            value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          return sum + linear * [0.2126, 0.7152, 0.0722][index]!;
        }, 0);
      const illustrations = [
        ".catalogue-illustration",
        ".feature-art",
        ".foundation-stamp",
        ".agent-demo",
        ".review-demo",
        ".bento-visual",
        ".foundation-symbol",
        ".signal-coordinate",
        ".concept-thumbnail",
        '[aria-hidden="true"]',
      ].join(",");
      const failures = new Set<string>();
      for (const element of document.querySelectorAll("body *")) {
        if (
          !(element instanceof HTMLElement) ||
          !element.getClientRects().length ||
          element.closest(illustrations)
        )
          continue;
        const text = Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent?.trim() ?? "")
          .join("");
        if (!text) continue;
        const style = getComputedStyle(element);
        let background = element;
        while (
          background.parentElement &&
          (rgb(getComputedStyle(background).backgroundColor)[3] ?? 1) === 0
        )
          background = background.parentElement;
        const foregroundLuminance = luminance(rgb(style.color));
        const backgroundLuminance = luminance(
          rgb(getComputedStyle(background).backgroundColor),
        );
        const ratio =
          (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
          (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
        const large =
          Number.parseFloat(style.fontSize) >= 24 ||
          (Number.parseFloat(style.fontSize) >= 18.66 &&
            Number.parseInt(style.fontWeight) >= 700);
        if (ratio < (large ? 3 : 4.5))
          failures.add(`${text.slice(0, 55)} (${ratio.toFixed(2)}:1)`);
      }
      return [...failures];
    });
    expect(
      violations,
      fileURLToPath(new URL(`../${path}`, import.meta.url)),
    ).toEqual([]);
  });
}
