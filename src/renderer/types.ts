import type { ReactNode } from "react";

import type { ScreenDefinition, Viewport } from "../authoring/types.js";

/** Context passed by the builder to a consumer renderer. */
export interface RenderInput {
  entry: ScreenDefinition;
  node: ReactNode;
  stylesheets: readonly string[];
  viewport: Viewport;
}

/** Synchronous complete-document renderer contract. */
export type Renderer = (input: RenderInput) => string;
