/** Record the checked bytes so later comparisons cannot silently use edited output. */
import { createHash } from "node:crypto";

import { MoklyError } from "../errors.js";

import { type LocatedReviewAsset, type ReviewAssetReader } from "./assets.js";
import { CompiledReviewAssetReader } from "./head_assets.js";

export class EvidenceAssetReader extends CompiledReviewAssetReader {
  readonly digests: Record<string, string> = Object.create(null);

  override async readLocated(route: string): Promise<LocatedReviewAsset> {
    const asset = await super.readLocated(route);
    if (asset.content !== undefined) {
      const digest = assetDigest(asset.content);
      if (this.digests[route] && this.digests[route] !== digest)
        throw changedAsset(route);
      this.digests[route] = digest;
    }
    return asset;
  }
}

/** Bounded capture shared by all reads on a snapshot side, including transitive assets. */
export class SelectedAssetReader implements ReviewAssetReader {
  private readonly files = new Map<string, Uint8Array>();
  private bytes = 0;
  constructor(
    private readonly reader: ReviewAssetReader,
    private readonly signal: AbortSignal,
    private readonly digests?: Readonly<Record<string, string>>,
  ) {}

  async read(route: string): Promise<Uint8Array> {
    return (await this.readMany([route])).get(route)!;
  }

  async readMany(
    routes: readonly string[],
  ): Promise<ReadonlyMap<string, Uint8Array>> {
    this.signal.throwIfAborted();
    const missing = [...new Set(routes)].filter(
      (route) => !this.files.has(route),
    );
    const loaded =
      this.reader.readMany && missing.length
        ? await this.reader.readMany(missing)
        : undefined;
    for (const route of missing) {
      this.signal.throwIfAborted();
      const content = loaded
        ? loaded.get(route)
        : await this.reader.read(route);
      if (content === undefined)
        throw new MoklyError(
          "review-invalid",
          `Snapshot file is missing: ${route}`,
        );
      const expected =
        this.digests && Object.hasOwn(this.digests, route)
          ? this.digests[route]
          : undefined;
      if (expected && assetDigest(content) !== expected)
        throw changedAsset(route);
      this.bytes += content.byteLength;
      if (this.bytes > 64 * 1024 * 1024)
        throw new MoklyError(
          "review-invalid",
          "Selected comparison exceeds 64 MiB",
        );
      this.files.set(route, content);
    }
    this.signal.throwIfAborted();
    return new Map(routes.map((route) => [route, this.files.get(route)!]));
  }
}

function assetDigest(content: Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

function changedAsset(route: string): MoklyError {
  return new MoklyError(
    "review-invalid",
    `Comparison input changed since the catalogue was checked: ${route}`,
  );
}
