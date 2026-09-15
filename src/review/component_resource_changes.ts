import type { ComponentMaterialReader } from "./component_resources.js";

/** Derived resources may be ignored by Git, so compare their retained bytes as well. */
export async function changedResourceBytes(
  before: ReadonlySet<string>,
  after: ReadonlySet<string>,
  beforeReader: ComponentMaterialReader,
  afterReader: ComponentMaterialReader,
): Promise<ReadonlySet<string>> {
  const changed = new Set<string>();
  for (const resource of new Set([...before, ...after])) {
    if (!before.has(resource) || !after.has(resource)) changed.add(resource);
    else {
      const [base, head] = await Promise.all([
        beforeReader.read(resource),
        afterReader.read(resource),
      ]);
      if (!Buffer.from(base).equals(head)) changed.add(resource);
    }
  }
  return changed;
}
