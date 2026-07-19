import type {
  CollectionDefinition,
  CollectionInput,
  NestedChild,
  NestedCollectionInput,
  NestedCollectionMarker,
  NestedInherited,
  NestedScreenInput,
  NestedScreenMarker,
  RegistryDefinition,
  RootInput,
  ScreenDefinition,
  ScreenInput,
  UseCaseDefinition,
  UseCaseInput,
} from "./types.js";

/** Loader hook used by module-bound consumer authoring facades. */
export function __attributeDefinition<T extends object>(
  value: T,
  sourceRelativePath: string,
): T & { definedIn: string } {
  return { ...value, definedIn: sourceRelativePath };
}

/** Define one canonical screen. */
export function defineScreen(input: ScreenInput): ScreenDefinition {
  return branded({
    ...input,
    kind: "screen",
    useCaseIds: input.useCaseIds ?? [],
  });
}

/** Define a structural navigation collection. */
export function defineCollection(input: CollectionInput): CollectionDefinition {
  return branded({ ...input, kind: "collection" });
}

/** Define an ordered journey that references canonical screens. */
export function defineUseCase(input: UseCaseInput): UseCaseDefinition {
  return branded({ ...input, kind: "use-case" });
}

/** Create a screen marker inside a nested tree. */
export function screen(input: NestedScreenInput): NestedScreenMarker {
  return { ...input, __nested: "screen" };
}

/** Create a collection marker inside a nested tree. */
export function collection(
  input: NestedCollectionInput,
): NestedCollectionMarker {
  return { ...input, __nested: "collection" };
}

/** Flatten a nested tree into ordinary registry definitions. */
export function defineRoot(input: RootInput): RegistryDefinition[] {
  const definitions: RegistryDefinition[] = [];
  const inherited: NestedInherited = {
    ...(input.collection?.address ? { address: input.collection.address } : {}),
    ...(input.collection?.dependencies
      ? { dependencies: input.collection.dependencies }
      : {}),
    ...(input.collection?.relatedDocs
      ? { relatedDocs: input.collection.relatedDocs }
      : {}),
  };
  if (input.collection) {
    definitions.push(
      defineCollection({
        childIds: input.children.map((child) => child.id),
        dependencies: input.collection.dependencies ?? [],
        description: input.collection.description,
        id: input.collection.id,
        navPath: [...input.navPath],
        ...(input.collection.rationale
          ? { rationale: input.collection.rationale }
          : {}),
        relatedDocs: input.collection.relatedDocs ?? [],
        title: input.title,
      }),
    );
  }
  for (const child of input.children) {
    flattenChild(
      child,
      input.path,
      [...input.navPath, input.title],
      inherited,
      definitions,
    );
  }
  return definitions;
}

function flattenChild(
  node: NestedChild,
  directory: string,
  navPath: readonly string[],
  inherited: NestedInherited,
  definitions: RegistryDefinition[],
): void {
  const effective = mergeInherited(inherited, node);
  if (node.__nested === "screen") {
    const definition = defineScreen({
      ...(effective.address ? { address: effective.address } : {}),
      dependencies: effective.dependencies ?? [],
      description: node.description,
      desktop: node.desktop,
      id: node.id,
      mobile: node.mobile,
      navPath: [...navPath],
      ...(node.rationale ? { rationale: node.rationale } : {}),
      relatedDocs: effective.relatedDocs ?? [],
      route: `${directory}/${node.slug}.html`,
      title: node.title,
      useCaseIds: node.useCaseIds ?? [],
    });
    if (node.definedIn) definition.definedIn = node.definedIn;
    definitions.push(definition);
    return;
  }
  const definition = defineCollection({
    childIds: node.children.map((child) => child.id),
    dependencies: effective.dependencies ?? [],
    description: node.description,
    id: node.id,
    navPath: [...navPath],
    ...(node.rationale ? { rationale: node.rationale } : {}),
    relatedDocs: effective.relatedDocs ?? [],
    title: node.title,
  });
  if (node.definedIn) definition.definedIn = node.definedIn;
  definitions.push(definition);
  for (const child of node.children) {
    flattenChild(
      child,
      `${directory}/${node.segment}`,
      [...navPath, node.title],
      effective,
      definitions,
    );
  }
}

function mergeInherited(
  parent: NestedInherited,
  child: NestedInherited,
): NestedInherited {
  return {
    ...((child.address ?? parent.address)
      ? { address: child.address ?? parent.address }
      : {}),
    ...((child.dependencies ?? parent.dependencies)
      ? { dependencies: child.dependencies ?? parent.dependencies }
      : {}),
    ...((child.relatedDocs ?? parent.relatedDocs)
      ? { relatedDocs: child.relatedDocs ?? parent.relatedDocs }
      : {}),
  };
}

function branded<T extends object>(
  value: T,
): T & { __viaDefine: true; definedIn?: string } {
  return { ...value, __viaDefine: true };
}
