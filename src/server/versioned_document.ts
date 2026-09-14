/** Update-version stamping for served HTML documents. */

const HTML_ELEMENT = /<html(?=[\s>])[^>]*>/i;
const UPDATE_VERSION_ATTRIBUTE =
  /\sdata-mokly-update-version=(?:"[^"]*"|'[^']*'|[^\s>]*)/i;

/** Set the server snapshot version on one complete HTML document. */
export function stampDocumentUpdateVersion(
  document: string,
  updateVersion: number,
): string {
  return document.replace(HTML_ELEMENT, (element) => {
    const attribute = ` data-mokly-update-version="${updateVersion}"`;
    if (UPDATE_VERSION_ATTRIBUTE.test(element))
      return element.replace(UPDATE_VERSION_ATTRIBUTE, attribute);
    return element.replace(/^<html/i, `<html${attribute}`);
  });
}
