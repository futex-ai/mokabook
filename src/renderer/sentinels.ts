import { assertReviewIgnoreId } from "../authoring/review_ignore.js";

const BOUNDARY =
  /<template data-mokabook-review-ignore-(start|end)="([^"]*)"><\/template>/g;
const MATERIAL =
  /<template data-mokabook-review-material="([^"]*)"><\/template>/g;

/** Convert React's inert templates into layout-neutral Review comments. */
export function serializeReviewSentinels(html: string): string {
  const boundaries = html.replace(
    BOUNDARY,
    (_all, boundary: string, id: string) => {
      assertReviewIgnoreId(id);
      return `<!--mokabook-review-ignore:${boundary}:${id}-->`;
    },
  );
  const serialized = boundaries.replace(MATERIAL, (_all, value: string) => {
    const split = value.indexOf(":");
    const id = value.slice(0, split);
    const key = value.slice(split + 1);
    assertReviewIgnoreId(id, key);
    return `<!--mokabook-review-material:${id}:${key}-->`;
  });
  if (serialized.includes("data-mokabook-review-")) {
    throw new Error("[mokabook/review-ignore] could not serialize a sentinel");
  }
  return serialized;
}
