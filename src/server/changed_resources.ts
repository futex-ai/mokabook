/** Resource impact follows rendered references rather than source dependencies. */

import path from "node:path";

import { MoklyError } from "../errors.js";
import { referencedRoutes } from "../review/asset_references.js";
import type {
  OptionalReviewAssetReader,
  ReviewAssetReader,
} from "../review/assets.js";
import { normalizeReviewPair } from "../review/ignore.js";
import { ResourceGraph } from "../review/resource_graph.js";

/** Cache shared resource edges for one immutable changed-route calculation. */
export class ChangedResourceGraph {
  readonly #physicalRoutes = new Map<string, string>();
  readonly #graph = new ResourceGraph({
    readReferences: (route) => this.references(route),
  });

  constructor(
    private readonly reader: OptionalReviewAssetReader,
    private readonly baseline: ReviewAssetReader,
    private readonly changed: ReadonlySet<string>,
    private readonly documents: ReadonlyMap<string, string>,
  ) {}

  /** Inspect transitive local references, terminating even for cyclic imports. */
  async affects(source: string, document: string): Promise<boolean> {
    const seeds = referencedRoutes(source, document, {
      resourceHints: false,
    });
    const resources = await this.#graph.collect(seeds);
    return [...resources].some((route) => this.isChanged(route));
  }

  private isChanged(route: string): boolean {
    return (
      this.changed.has(route) ||
      this.changed.has(this.#physicalRoutes.get(route) ?? route)
    );
  }

  private async references(route: string): Promise<readonly string[]> {
    let content = this.documents.get(route);
    if (content === undefined) {
      const asset = await this.reader.readLocated(route);
      this.#physicalRoutes.set(route, asset.location.physicalRelativePath);
      const bytes = asset.content;
      if (bytes === undefined) {
        if (!this.isChanged(route))
          throw new MoklyError(
            "review-invalid",
            `referenced resource is missing: ${route}`,
          );
        await this.baseline.read(route);
        return [];
      }
      const extension = path.posix.extname(route).toLowerCase();
      if (![".css", ".html", ".htm"].includes(extension)) return [];
      content = Buffer.from(bytes).toString("utf8");
      if (extension !== ".css")
        content = normalizeReviewPair(content, content, route).head;
    }
    return referencedRoutes(route, content, { resourceHints: false });
  }
}
