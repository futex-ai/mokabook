import { MoklyError } from "../errors.js";

import { referencedRoutes } from "./asset_references.js";
import type { ReviewAssetReader } from "./assets.js";
import { ResourceGraph } from "./resource_graph.js";

/** One immutable read cache per source side; it never copies or writes snapshots. */
export class ComponentMaterialReader {
  private readonly files = new Map<string, Promise<Uint8Array>>();
  private readonly graph: ResourceGraph;
  constructor(private readonly reader: ReviewAssetReader) {
    this.graph = new ResourceGraph({
      readReferences: async (route) =>
        referencedRoutes(route, await this.read(route), {
          resourceHints: false,
        }),
    });
  }
  /** Load known view documents together without changing lazy resource discovery. */
  async prefetch(routes: readonly string[]): Promise<void> {
    if (!this.reader.readMany) return;
    const missing = [...new Set(routes)].filter(
      (route) => !this.files.has(route),
    );
    if (missing.length === 0) return;
    const loaded = await this.reader.readMany(missing);
    for (const route of missing) {
      const content = loaded.get(route);
      if (content === undefined)
        throw new MoklyError(
          "review-invalid",
          `could not retain Review asset ${route}: batch reader omitted the file`,
        );
      this.files.set(route, Promise.resolve(content));
    }
  }
  read(route: string): Promise<Uint8Array> {
    let result = this.files.get(route);
    if (!result) {
      result = this.reader.read(route);
      this.files.set(route, result);
    }
    return result;
  }
  async text(route: string): Promise<string> {
    return Buffer.from(await this.read(route)).toString("utf8");
  }
  async resources(
    route: string,
    html: string,
    excluded: (route: string) => boolean,
  ): Promise<ReadonlySet<string>> {
    const seeds = referencedRoutes(route, html, {
      resourceHints: false,
    }).filter((path) => !excluded(path));
    return this.graph.collect(seeds);
  }
}
