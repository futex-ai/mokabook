import { renderToStaticMarkup } from "react-dom/server";
import { createSharedUiTheme, SharedUiThemeProvider } from "@firna/ui/theme";
import { AppRegistry } from "react-native-web";
import type { RenderInput } from "mokly";
import { tokens, darkTokens } from "../../../examples/basic/theme.js";

const themes = {
  light: createSharedUiTheme(tokens),
  dark: createSharedUiTheme(darkTokens),
};
const Empty = () => null;

export default function render(input: RenderInput): string {
  const body = renderToStaticMarkup(
    <SharedUiThemeProvider theme={themes[input.colorScheme]}>
      {input.node}
    </SharedUiThemeProvider>,
  );
  AppRegistry.registerComponent("scale-styles", () => Empty);
  const nativeStyles = renderToStaticMarkup(
    AppRegistry.getApplication("scale-styles", {}).getStyleElement(),
  );
  const links = input.stylesheets
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join("");
  return `<!doctype html><html lang="en" data-color-scheme="${input.colorScheme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${input.entry.title}</title>${links}${nativeStyles}</head><body>${body}</body></html>`;
}
