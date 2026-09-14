/** The resource resolver and browser-safe result schema share stylesheet identity. */
export function isStylesheetPath(path: string): boolean {
  return /\.css$/i.test(path);
}
