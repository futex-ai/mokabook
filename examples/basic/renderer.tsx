import { createContext, type ReactNode, useContext } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { RenderInput } from "mokabook";

const ViewportContext = createContext("unknown");

function RenderBody({ children }: { children: ReactNode }) {
  const viewport = useContext(ViewportContext);
  return <div data-example-renderer={viewport}>{children}</div>;
}

export default function render(input: RenderInput): string {
  const body = renderToStaticMarkup(
    <ViewportContext.Provider value={input.viewport}>
      <RenderBody>{input.node}</RenderBody>
    </ViewportContext.Provider>,
  );
  const links = input.stylesheets
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${input.entry.title}</title>${links}<style>body{margin:0}</style></head><body>${body}</body></html>\n`;
}
